"""Restic client, transfer channel management, lock inspection, and snapshot verification.

Strict compliance rules enforced in code:
  1. ``FORBIDDEN_SUBCOMMANDS`` ('unlock', 'repair', 'prune', 'forget', 'restore', 'rebuild-index')
     are rejected unconditionally before any subprocess is spawned.
  2. ``backup`` is gated by BOTH ``cfg.repository_writes_authorized`` and the caller's
     explicit execution mode; preflight / lock-inspect / stage-only modes never invoke
     ``restic backup``.
  3. All repository inspection commands use ``--no-lock`` so zero lock files are created,
     modified, or deleted in the repository during inspection or verification.
"""

import datetime as _dt
import json
import os
import re
import socket
import subprocess
import time

from .errors import BackupError, ExitCode
from .proc import iso, run, utcnow

FORBIDDEN_SUBCOMMANDS = frozenset({
    "unlock",
    "repair",
    "prune",
    "forget",
    "restore",
    "rebuild-index",
    "key",
    "migrate",
})

ALLOWED_READONLY_SUBCOMMANDS = frozenset({
    "version",
    "cat",
    "list",
    "snapshots",
    "ls",
    "dump",
    "stats",
})

HEX_ID_RE = re.compile(r"^[0-9a-f]{64}$")


def parse_restic_timestamp(ts_str):
    """Parse RFC3339 timestamp with nanosecond precision emitted by Restic."""
    if not ts_str or not isinstance(ts_str, str):
        return None
    s = ts_str.strip()
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    # Truncate fractional seconds to 6 digits for Python fromisoformat compatibility
    m = re.match(r"^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d+))?([+-]\d{2}:\d{2})$", s)
    if m:
        base, frac, tz = m.groups()
        frac6 = (frac or "0")[:6].ljust(6, "0")
        s = f"{base}.{frac6}{tz}"
    try:
        return _dt.datetime.fromisoformat(s).astimezone(_dt.timezone.utc)
    except ValueError:
        return None


class TransferSession:
    """Manages the transport channel to the Restic repository.

    Supports:
      - ``sftp``: dedicated SSH key + strict known_hosts passed via ``-o sftp.args=...``
      - ``rest-ssh-tunnel``: ephemeral loopback SSH local-forward (`127.0.0.1:localPort ->
        127.0.0.1:remoteRestPort`) to an append-only `rest-server` on the Administration VPS.
      - ``local-test``: local disposable directory (only permitted when ``testMode=true``).
    """

    def __init__(self, cfg, logger):
        self.cfg = cfg
        self.log = logger
        self._tunnel_proc = None

    def __enter__(self):
        if self.cfg.mechanism == "rest-ssh-tunnel":
            self._start_ssh_tunnel()
        return self

    def __exit__(self, exc_type, exc, tb):
        self.close()

    def close(self):
        if self._tunnel_proc is not None:
            try:
                self._tunnel_proc.terminate()
                self._tunnel_proc.wait(timeout=5)
            except Exception:
                try:
                    self._tunnel_proc.kill()
                except Exception:
                    pass
            self._tunnel_proc = None

    def sftp_args(self):
        t = self.cfg.transport
        port = int(t.get("sshPort", 22))
        timeout = int(t.get("connectTimeoutSeconds", 15))
        return (
            f"-i {t['sshKeyFile']} "
            f"-p {port} "
            f"-o BatchMode=yes "
            f"-o IdentitiesOnly=yes "
            f"-o StrictHostKeyChecking=yes "
            f"-o UserKnownHostsFile={t['knownHostsFile']} "
            f"-o ConnectTimeout={timeout} "
            f"-o ServerAliveInterval=15 "
            f"-o ServerAliveCountMax=3"
        )

    def _start_ssh_tunnel(self):
        t = self.cfg.transport
        local_port = int(t["localPort"])
        remote_host = t.get("remoteRestHost", "127.0.0.1")
        remote_port = int(t["remoteRestPort"])
        ssh_port = int(t.get("sshPort", 22))
        timeout = int(t.get("connectTimeoutSeconds", 15))

        argv = [
            self.cfg.ssh_binary,
            "-N",
            "-T",
            "-p", str(ssh_port),
            "-i", t["sshKeyFile"],
            "-o", "BatchMode=yes",
            "-o", "IdentitiesOnly=yes",
            "-o", "StrictHostKeyChecking=yes",
            "-o", f"UserKnownHostsFile={t['knownHostsFile']}",
            "-o", "ExitOnForwardFailure=yes",
            "-o", f"ConnectTimeout={timeout}",
            "-o", "ServerAliveInterval=15",
            "-o", "ServerAliveCountMax=3",
            "-L", f"127.0.0.1:{local_port}:{remote_host}:{remote_port}",
            f"{t['sshUser']}@{t['sshHost']}",
        ]
        self._tunnel_proc = subprocess.Popen(
            argv,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
        )
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            if self._tunnel_proc.poll() is not None:
                _, stderr_bytes = self._tunnel_proc.communicate(timeout=2)
                self.log.stderr_tail("ssh-tunnel", stderr_bytes)
                self._tunnel_proc = None
                raise BackupError(
                    "transfer",
                    "ssh_tunnel_failed",
                    "failed to establish loopback SSH tunnel to Administration VPS",
                    ExitCode.TRANSFER,
                )
            try:
                with socket.create_connection(("127.0.0.1", local_port), timeout=0.5):
                    return
            except OSError:
                time.sleep(0.15)
        self.close()
        raise BackupError(
            "transfer",
            "ssh_tunnel_timeout",
            "timed out waiting for local SSH tunnel port",
            ExitCode.TRANSFER,
        )

    def repository_spec_and_env(self):
        """Return (repo_url_for_restic, extra_args, extra_env)."""
        t = self.cfg.transport
        env = os.environ.copy()
        env["RESTIC_PASSWORD_FILE"] = self.cfg.restic_password_file
        env["RESTIC_CACHE_DIR"] = self.cfg.cache_dir
        env["RESTIC_PROGRESS_FPS"] = "0.0166"

        extra_args = [
            "--cache-dir", self.cfg.cache_dir,
            "--password-file", self.cfg.restic_password_file,
        ]
        if self.cfg.restic_limit_upload_kib > 0:
            extra_args += ["--limit-upload", str(self.cfg.restic_limit_upload_kib)]

        if self.cfg.mechanism == "sftp":
            repo = f"sftp:{t['sshUser']}@{t['sshHost']}:{t['remoteRepositoryPath']}"
            extra_args += ["-o", f"sftp.args={self.sftp_args()}"]
            return repo, extra_args, env

        if self.cfg.mechanism == "rest-ssh-tunnel":
            with open(t["restPasswordFile"], "r", encoding="utf-8") as fh:
                rest_pw = fh.read().strip()
            env["RESTIC_REST_USERNAME"] = t["restUsername"]
            env["RESTIC_REST_PASSWORD"] = rest_pw
            repo_path = t["repositoryPath"].strip("/")
            repo = f"rest:http://127.0.0.1:{int(t['localPort'])}/{repo_path}/"
            return repo, extra_args, env

        if self.cfg.mechanism == "local-test":
            if not self.cfg.test_mode:
                raise BackupError(
                    "preflight",
                    "local_test_forbidden",
                    "local-test mechanism prohibited outside testMode",
                    ExitCode.CONFIG,
                )
            return t["localRepositoryPath"], extra_args, env

        raise BackupError("preflight", "unknown_mechanism", "unsupported mechanism", ExitCode.CONFIG)


class ResticClient:
    def __init__(self, cfg, session, logger):
        self.cfg = cfg
        self.session = session
        self.log = logger

    def _build_argv(self, subcommand, sub_args, *, read_only=True):
        if subcommand in FORBIDDEN_SUBCOMMANDS:
            raise BackupError(
                "preflight",
                "forbidden_restic_command",
                f"restic subcommand '{subcommand}' is prohibited by Phase 11B policy",
                ExitCode.CONFIG,
            )
        if read_only and subcommand not in ALLOWED_READONLY_SUBCOMMANDS:
            raise BackupError(
                "preflight",
                "unexpected_restic_command",
                f"subcommand '{subcommand}' is not in the read-only allowlist",
                ExitCode.CONFIG,
            )
        repo, base_args, env = self.session.repository_spec_and_env()
        argv = [self.cfg.restic_binary, "-r", repo] + base_args
        if read_only and subcommand != "version":
            argv.append("--no-lock")
        argv.append(subcommand)
        argv.extend(sub_args)
        return argv, env

    def version(self):
        res = run([self.cfg.restic_binary, "version"], timeout=15)
        if res.returncode != 0:
            raise BackupError("preflight", "restic_binary_failed", "restic version failed", ExitCode.PREFLIGHT)
        return res.stdout.decode("utf-8", "replace").strip()

    def probe_repository(self):
        """Read repository config via `restic cat config --no-lock` (zero writes)."""
        argv, env = self._build_argv("cat", ["config", "--json"], read_only=True)
        res = run(argv, env=env, timeout=60)
        if res.returncode != 0:
            self.log.stderr_tail("restic cat config", res.stderr)
            raise BackupError(
                "repository_preflight",
                "repository_unreachable",
                "unable to read remote Restic repository config",
                ExitCode.TRANSFER,
            )
        try:
            cfg_obj = json.loads(res.stdout.decode("utf-8"))
        except ValueError:
            raise BackupError(
                "repository_preflight",
                "repository_config_malformed",
                "remote Restic repository returned invalid config JSON",
                ExitCode.TRANSFER,
            )
        repo_id = cfg_obj.get("id", "")
        return {
            "reachable": True,
            "repositoryVersion": cfg_obj.get("version"),
            "repositoryIdPrefix": repo_id[:12] if isinstance(repo_id, str) else None,
        }

    def inspect_locks(self, now=None):
        """Non-destructive lock inspection (`list locks --no-lock` + `cat lock <id> --no-lock`).

        Never calls `restic unlock` and never deletes or modifies any lock file.
        """
        now = now or utcnow()
        argv, env = self._build_argv("list", ["locks", "--quiet"], read_only=True)
        res = run(argv, env=env, timeout=60)
        if res.returncode != 0:
            self.log.stderr_tail("restic list locks", res.stderr)
            raise BackupError(
                "lock_inspection",
                "lock_list_failed",
                "failed to list repository locks",
                ExitCode.TRANSFER,
            )
        lock_ids = [
            ln.strip() for ln in res.stdout.decode("utf-8").splitlines()
            if HEX_ID_RE.match(ln.strip())
        ]

        records = []
        for lid in sorted(lock_ids):
            c_argv, c_env = self._build_argv("cat", ["lock", lid], read_only=True)
            c_res = run(c_argv, env=c_env, timeout=60)
            if c_res.returncode != 0:
                self.log.stderr_tail(f"restic cat lock {lid[:8]}", c_res.stderr)
                raise BackupError(
                    "lock_inspection",
                    "lock_inspect_failed",
                    f"failed to read repository lock {lid[:12]}",
                    ExitCode.TRANSFER,
                )
            try:
                meta = json.loads(c_res.stdout.decode("utf-8"))
            except ValueError:
                raise BackupError(
                    "lock_inspection",
                    "lock_malformed",
                    f"repository lock {lid[:12]} returned malformed JSON",
                    ExitCode.LOCK_CONFLICT,
                )
            records.append((lid, meta))

        return evaluate_locks(
            records,
            now=now,
            stale_after_seconds=self.cfg.lock_stale_after,
            allow_stale_shared=self.cfg.lock_allow_stale_shared,
            local_hostname=socket.gethostname(),
        )

    def create_backup(self, paths, *, run_tag):
        """Execute `restic backup --json` with controlled retry on transient transport errors.

        Refuses to run unless ``cfg.repository_writes_authorized`` is True.
        """
        if not self.cfg.repository_writes_authorized:
            raise BackupError(
                "snapshot",
                "writes_not_authorized",
                "repositoryWritesAuthorized is false; refusing to execute restic backup",
                ExitCode.CONFIG,
            )

        sub_args = [
            "--json",
            "--host", self.cfg.restic_host,
            "--exclude-file", self.cfg.exclude_file,
        ]
        for tag in self.cfg.restic_tags:
            sub_args += ["--tag", tag]
        sub_args += ["--tag", run_tag]
        sub_args.extend(paths)

        attempts = self.cfg.restic_backup_attempts
        last_rc = None
        for attempt in range(1, attempts + 1):
            argv, env = self._build_argv("backup", sub_args, read_only=False)
            self.log.info(f"starting restic backup attempt {attempt}/{attempts} with tag {run_tag}")
            res = run(argv, env=env, timeout=self.cfg.restic_timeout)
            last_rc = res.returncode
            summary = _parse_backup_summary(res.stdout.decode("utf-8", "replace"))

            if res.returncode in (0, 3) and summary and summary.get("snapshot_id"):
                return {
                    "exitCode": res.returncode,
                    "attempts": attempt,
                    "summary": summary,
                }

            self.log.stderr_tail(f"restic backup (attempt {attempt})", res.stderr)
            if res.returncode == 11:
                raise BackupError(
                    "snapshot",
                    "repository_locked",
                    "restic reported repository lock contention (exit 11)",
                    ExitCode.LOCK_CONFLICT,
                )
            if res.returncode == 3:
                raise BackupError(
                    "snapshot",
                    "restic_incomplete_no_snapshot",
                    "restic exited with code 3 without committing a snapshot ID",
                    ExitCode.RESTIC_INCOMPLETE,
                )
            if attempt < attempts:
                self.log.warn(
                    f"restic backup attempt {attempt} failed with exit code {res.returncode}; "
                    f"retrying in {self.cfg.restic_retry_delay}s"
                )
                time.sleep(self.cfg.restic_retry_delay)

        raise BackupError(
            "snapshot",
            "restic_backup_failed",
            f"restic backup failed after {attempts} attempt(s) (last exit code {last_rc})",
            ExitCode.RESTIC_BACKUP,
        )

    def verify_snapshot(
        self,
        snapshot_id,
        *,
        run_tag,
        stage_dir,
        expected_manifest_txt_sha256,
        expected_manifest_json_sha256,
        expected_tenant_count,
        expected_non_secret_paths,
    ):
        """Independent read-only verification of the newly created snapshot.

        Does NOT run `restic check`. Uses only `snapshots --no-lock`, `ls --no-lock`,
        and `dump --no-lock` on the two metadata files (`manifest.txt` and `tenant-registry.json`).
        """
        # 1. Lookup snapshot metadata
        s_argv, s_env = self._build_argv("snapshots", [snapshot_id, "--json"], read_only=True)
        s_res = run(s_argv, env=s_env, timeout=120)
        if s_res.returncode != 0:
            self.log.stderr_tail("restic snapshots", s_res.stderr)
            raise BackupError(
                "verification",
                "snapshot_lookup_failed",
                "unable to query committed snapshot metadata",
                ExitCode.VERIFICATION,
            )
        try:
            snaps = json.loads(s_res.stdout.decode("utf-8"))
        except ValueError:
            raise BackupError(
                "verification",
                "snapshot_json_malformed",
                "restic snapshots returned invalid JSON",
                ExitCode.VERIFICATION,
            )
        if not isinstance(snaps, list) or len(snaps) != 1:
            raise BackupError(
                "verification",
                "snapshot_not_found",
                f"expected exactly 1 snapshot record for {snapshot_id[:12]}, found {len(snaps) if isinstance(snaps, list) else 0}",
                ExitCode.VERIFICATION,
            )
        snap = snaps[0]
        full_id = snap.get("id", "")
        short_id = snap.get("short_id") or full_id[:8]
        tags = snap.get("tags") or []
        snap_paths = snap.get("paths") or []
        snap_host = snap.get("hostname")

        if not full_id.startswith(snapshot_id) or not HEX_ID_RE.match(full_id):
            raise BackupError(
                "verification",
                "snapshot_id_mismatch",
                "returned snapshot ID does not match candidate ID",
                ExitCode.VERIFICATION,
            )
        if run_tag not in tags:
            raise BackupError(
                "verification",
                "snapshot_tag_missing",
                f"committed snapshot is missing run tag {run_tag}",
                ExitCode.VERIFICATION,
            )
        for req_tag in self.cfg.restic_tags:
            if req_tag not in tags:
                raise BackupError(
                    "verification",
                    "snapshot_tag_missing",
                    f"committed snapshot is missing required tag {req_tag}",
                    ExitCode.VERIFICATION,
                )
        if snap_host != self.cfg.restic_host:
            raise BackupError(
                "verification",
                "snapshot_host_mismatch",
                f"snapshot hostname '{snap_host}' != expected '{self.cfg.restic_host}'",
                ExitCode.VERIFICATION,
            )
        if os.path.normpath(stage_dir) not in [os.path.normpath(p) for p in snap_paths]:
            raise BackupError(
                "verification",
                "snapshot_stage_path_missing",
                "snapshot paths list does not contain the staging root",
                ExitCode.VERIFICATION,
            )

        # 2. Inspect snapshot file tree via JSON Lines (`restic ls --no-lock --json <id>`)
        #    Follows Admin-Dash v3.2 Section 3 strict path resolution rules.
        ls_argv, ls_env = self._build_argv("ls", [full_id, "--json"], read_only=True)
        ls_res = run(ls_argv, env=ls_env, timeout=180)
        if ls_res.returncode != 0:
            self.log.stderr_tail("restic ls", ls_res.stderr)
            raise BackupError(
                "verification",
                "snapshot_ls_failed",
                "unable to list snapshot file tree",
                ExitCode.VERIFICATION,
            )

        norm_stage = os.path.normpath(stage_dir)
        manifest_txt_matches = []
        manifest_json_matches = []
        registry_matches = []
        observed_paths = set()

        for line in ls_res.stdout.decode("utf-8", "replace").splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                node = json.loads(line)
            except ValueError:
                continue
            if node.get("type") != "file":
                if node.get("path"):
                    observed_paths.add(node["path"])
                continue
            npath = node.get("path")
            if not npath:
                continue
            observed_paths.add(npath)
            if npath.startswith(norm_stage):
                if npath.endswith("/metadata/manifest.txt"):
                    manifest_txt_matches.append(npath)
                elif npath.endswith("/metadata/manifest.json"):
                    manifest_json_matches.append(npath)
                elif npath.endswith("/metadata/tenant-registry.json"):
                    registry_matches.append(npath)

        if len(manifest_txt_matches) != 1 or len(manifest_json_matches) != 1 or len(registry_matches) != 1:
            raise BackupError(
                "verification",
                "snapshot_metadata_nodes_ambiguous_or_missing",
                "expected exactly one manifest.txt, manifest.json, and tenant-registry.json in snapshot tree",
                ExitCode.VERIFICATION,
            )

        for exp_path in expected_non_secret_paths:
            norm_exp = os.path.normpath(exp_path)
            if not any(p == norm_exp or p.startswith(norm_exp + "/") for p in observed_paths):
                raise BackupError(
                    "verification",
                    "snapshot_scope_path_missing",
                    "an expected non-secret backup path is absent from snapshot tree",
                    ExitCode.VERIFICATION,
                )

        # 3. Dump manifest.txt, manifest.json, and tenant-registry.json from the snapshot and verify SHA-256
        import hashlib

        dumped_txt = self._dump_node(full_id, manifest_txt_matches[0])
        if hashlib.sha256(dumped_txt).hexdigest() != expected_manifest_txt_sha256:
            raise BackupError(
                "verification",
                "remote_manifest_txt_hash_mismatch",
                "dumped manifest.txt SHA-256 does not match pre-upload digest",
                ExitCode.VERIFICATION,
            )

        dumped_json = self._dump_node(full_id, manifest_json_matches[0])
        if hashlib.sha256(dumped_json).hexdigest() != expected_manifest_json_sha256:
            raise BackupError(
                "verification",
                "remote_manifest_json_hash_mismatch",
                "dumped manifest.json SHA-256 does not match pre-upload digest",
                ExitCode.VERIFICATION,
            )

        dumped_reg_bytes = self._dump_node(full_id, registry_matches[0])
        try:
            dumped_reg = json.loads(dumped_reg_bytes.decode("utf-8"))
        except ValueError:
            raise BackupError(
                "verification",
                "remote_registry_unparseable",
                "dumped tenant-registry.json is not valid JSON",
                ExitCode.VERIFICATION,
            )
        if not isinstance(dumped_reg, list) or len(dumped_reg) != expected_tenant_count:
            raise BackupError(
                "verification",
                "remote_registry_count_mismatch",
                "dumped tenant-registry.json count does not match expected tenant count",
                ExitCode.VERIFICATION,
            )

        return {
            "status": "verified",
            "snapshotId": full_id,
            "shortId": short_id,
            "snapshotTime": snap.get("time"),
            "tagsVerified": True,
            "pathsVerified": True,
            "manifestTxtVerified": True,
            "manifestJsonVerified": True,
            "tenantRegistryVerified": True,
            "evidence": {
                "presenceStatus": "Present",
                "readabilityStatus": "Readable",
                "parsingStatus": "Parsed",
                "integrityStatus": "Verified",
            },
        }

    def _dump_node(self, snapshot_id, exact_node_path):
        d_argv, d_env = self._build_argv("dump", [snapshot_id, exact_node_path], read_only=True)
        d_res = run(d_argv, env=d_env, timeout=120)
        if d_res.returncode != 0:
            self.log.stderr_tail("restic dump", d_res.stderr)
            raise BackupError(
                "verification",
                "snapshot_dump_failed",
                "restic dump failed during metadata verification",
                ExitCode.VERIFICATION,
            )
        return d_res.stdout


def _parse_backup_summary(stdout_text):
    summary = None
    for line in stdout_text.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except ValueError:
            continue
        if isinstance(obj, dict) and obj.get("message_type") == "summary":
            summary = obj
    return summary


def _local_pid_alive(pid):
    if not isinstance(pid, int) or pid <= 0:
        return False
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True


def evaluate_locks(
    lock_records,
    *,
    now,
    stale_after_seconds,
    allow_stale_shared,
    local_hostname,
):
    """Classify Restic repository locks without touching or removing them.

    Classification rules:
      - ``active_exclusive`` or ``active_shared``: created < ``stale_after_seconds`` ago,
        OR hosted on ``local_hostname`` with a live PID. Blocks backup unconditionally.
      - ``stale_exclusive``: ``exclusive == true`` and age >= ``stale_after_seconds``
        (and local PID not alive). Blocks backup because Restic refuses to acquire a
        lock against any exclusive lock until an explicitly authorized unlock is run.
      - ``stale_shared``: ``exclusive == false`` and age >= ``stale_after_seconds``
        (and local PID not alive). Restic allows shared ``backup`` locks alongside stale
        non-exclusive locks; permitted when ``allow_stale_shared`` is True, recorded in
        telemetry with a warning.
    """
    details = []
    counts = {
        "total": len(lock_records),
        "activeExclusive": 0,
        "activeShared": 0,
        "staleExclusive": 0,
        "staleShared": 0,
    }
    blocking_reasons = []

    for lid, meta in lock_records:
        exclusive = bool(meta.get("exclusive", False))
        host = meta.get("hostname") or "unknown"
        pid = meta.get("pid")
        ts = parse_restic_timestamp(meta.get("time"))
        age_sec = int(max(0, (now - ts).total_seconds())) if ts else 0
        same_host_alive = (host == local_hostname) and _local_pid_alive(pid)
        is_stale = (ts is not None) and (age_sec >= stale_after_seconds) and (not same_host_alive)

        if exclusive and not is_stale:
            classification = "active_exclusive"
            counts["activeExclusive"] += 1
            blocking_reasons.append(f"active_exclusive:{lid[:12]}")
        elif not exclusive and not is_stale:
            classification = "active_shared"
            counts["activeShared"] += 1
            blocking_reasons.append(f"active_shared:{lid[:12]}")
        elif exclusive and is_stale:
            classification = "stale_exclusive"
            counts["staleExclusive"] += 1
            blocking_reasons.append(f"stale_exclusive:{lid[:12]}")
        else:
            classification = "stale_shared"
            counts["staleShared"] += 1
            if not allow_stale_shared:
                blocking_reasons.append(f"stale_shared_disallowed:{lid[:12]}")

        details.append({
            "lockIdPrefix": lid[:12],
            "exclusive": exclusive,
            "classification": classification,
            "createdAt": iso(ts) if ts else meta.get("time"),
            "ageSeconds": age_sec,
            "hostname": host,
            "pid": pid,
            "sameHostPidAlive": same_host_alive,
        })

    can_proceed = len(blocking_reasons) == 0
    if counts["total"] == 0:
        status = "clean"
    elif can_proceed:
        status = "stale_shared_only"
    else:
        status = "blocked"

    return {
        "status": status,
        "canProceedWithBackup": can_proceed,
        "unlockPerformed": False,
        "staleThresholdSeconds": stale_after_seconds,
        "counts": counts,
        "blockingReasons": blocking_reasons,
        "locks": details,
    }


"""Main 12-stage orchestration pipeline for the ACYA Phase 11B backup runner."""

import csv
import fcntl
import json
import os
import shutil
import signal
import socket
import stat
import tempfile
import uuid

from . import RUNNER_VERSION
from .errors import BackupError, ExitCode, Interrupted
from .manifest import (
    build_and_verify_manifest,
    collect_and_validate_sources,
    load_exclude_patterns,
)
from .postgres import (
    Docker,
    PostgresInstance,
    evaluate_coverage,
    parse_registry,
    toc_schemas,
)
from .proc import Logger, iso, utcnow
from .restic import ResticClient, TransferSession
from .telemetry import (
    RunTelemetry,
    atomic_write_json,
    record_interrupted_previous,
)


def make_run_id():
    ts = utcnow().strftime("%Y%m%dT%H%M%SZ")
    short = uuid.uuid4().hex[:8]
    return f"{ts}-{short}"


def _check_secret_file(path, label):
    try:
        st = os.lstat(path)
    except FileNotFoundError:
        raise BackupError("preflight", "credential_missing", f"missing required file: {label}", ExitCode.CONFIG)
    if not stat.S_ISREG(st.st_mode) or st.st_size <= 0:
        raise BackupError("preflight", "credential_empty", f"empty or non-regular file: {label}", ExitCode.CONFIG)
    if (st.st_mode & 0o077) != 0:
        raise BackupError(
            "preflight",
            "credential_permissions_unsafe",
            f"{label} must not be group/world accessible (mode {oct(st.st_mode & 0o777)})",
            ExitCode.CONFIG,
        )


def sweep_abandoned_staging(cfg, logger):
    """Remove any leftover staging directories from a previous SIGKILL/power-loss."""
    removed = 0
    if not os.path.isdir(cfg.staging_parent):
        return 0
    prefix = cfg.staging_prefix + "-"
    for name in os.listdir(cfg.staging_parent):
        if not name.startswith(prefix):
            continue
        full = os.path.join(cfg.staging_parent, name)
        try:
            if os.path.isdir(full) and not os.path.islink(full):
                shutil.rmtree(full)
                removed += 1
        except OSError:
            pass
    if removed:
        logger.warn(f"cleaned up {removed} leftover staging directory(ies) from an earlier interrupted run")
    return removed


def prune_old_logs(cfg):
    if not os.path.isdir(cfg.log_dir):
        return
    cutoff = utcnow().timestamp() - (cfg.log_retention_days * 86400)
    for name in os.listdir(cfg.log_dir):
        if not (name.startswith("run-") and name.endswith(".log")):
            continue
        full = os.path.join(cfg.log_dir, name)
        try:
            if os.path.getmtime(full) < cutoff:
                os.unlink(full)
        except OSError:
            pass


def _write_tenant_registry_csv(dest_csv, registry):
    fields = ["Id", "Slug", "SchemaName", "IsActive", "Status", "Plan", "CreatedAt", "ActivatedAt"]
    fd = os.open(dest_csv, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        for row in registry:
            writer.writerow(row)


class BackupRunner:
    """Executes the Phase 11B backup pipeline in one of four explicit modes:

      - ``lock-inspect``: stages 1..2 (preflight + repository probe + lock inspection).
      - ``preflight``: stages 1..2 plus read-only database/tenant discovery and file scope validation.
      - ``stage-only``: stages 1..7 (builds and verifies dumps + manifest in ephemeral staging, then purges staging; zero repository writes).
      - ``full``: stages 1..10 (requires ``repositoryWritesAuthorized == true``).
    """

    def __init__(self, cfg, *, mode="full", trigger="manual", skip_remote=False):
        self.cfg = cfg
        self.mode = mode
        self.trigger = trigger
        self.skip_remote = skip_remote
        self.run_id = make_run_id()
        self.stage_dir = None
        self.lock_fd = None

    def execute(self):
        os.umask(0o077)
        os.makedirs(self.cfg.state_dir, mode=0o755, exist_ok=True)
        os.makedirs(self.cfg.log_dir, mode=0o750, exist_ok=True)
        os.makedirs(self.cfg.cache_dir, mode=0o700, exist_ok=True)
        os.makedirs(self.cfg.staging_parent, mode=0o700, exist_ok=True)

        log_path = os.path.join(self.cfg.log_dir, f"run-{self.run_id}.log")
        logger = Logger(log_path)
        telemetry = RunTelemetry(self.cfg, self.run_id, self.mode, self.trigger)

        # Acquire non-blocking flock before touching state files
        self.lock_fd = os.open(self.cfg.runner_lock_path, os.O_WRONLY | os.O_CREAT, 0o600)
        try:
            fcntl.flock(self.lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            logger.warn("concurrent execution rejected: runner.lock is already held")
            skipped = {
                "schema": telemetry.record["schema"],
                "event": "run.skipped_concurrent",
                "runId": self.run_id,
                "timestamp": iso(utcnow()),
                "mode": self.mode,
                "trigger": self.trigger,
                "exitCode": ExitCode.CONCURRENT,
            }
            atomic_write_json(os.path.join(self.cfg.state_dir, "last-skipped-concurrent.json"), skipped)
            logger.close()
            os.close(self.lock_fd)
            return ExitCode.CONCURRENT, skipped

        prev_handlers = {}

        def _sig_handler(signum, _frame):
            code = {
                signal.SIGHUP: ExitCode.SIGHUP,
                signal.SIGINT: ExitCode.SIGINT,
                signal.SIGTERM: ExitCode.SIGTERM,
            }.get(signum, ExitCode.SIGTERM)
            raise Interrupted(signum, code)

        for sig in (signal.SIGHUP, signal.SIGINT, signal.SIGTERM):
            prev_handlers[sig] = signal.signal(sig, _sig_handler)

        try:
            record_interrupted_previous(self.cfg, logger)
            sweep_abandoned_staging(self.cfg, logger)
            prune_old_logs(self.cfg)
            telemetry.emit_started()
            logger.info(f"started run {self.run_id} (mode={self.mode}, trigger={self.trigger})")

            if self.mode == "full" and not self.cfg.repository_writes_authorized:
                raise BackupError(
                    "preflight",
                    "writes_not_authorized",
                    "full backup execution is blocked while repositoryWritesAuthorized is false",
                    ExitCode.CONFIG,
                )

            exit_code, outcome = self._run_stages(logger, telemetry)
            telemetry.finish(outcome, exit_code, failure=None)
            logger.info(f"finished run {self.run_id} with outcome={outcome} exit_code={exit_code}")
            return exit_code, telemetry.snapshot_copy()

        except Interrupted as intr:
            logger.error(f"run {self.run_id} interrupted by signal {intr.signum}")
            failure = {
                "stage": self._active_stage(telemetry),
                "category": f"signal_{intr.signum}",
                "message": f"backup run interrupted by signal {intr.signum}",
            }
            telemetry.finish("interrupted", intr.exit_code, failure=failure)
            return intr.exit_code, telemetry.snapshot_copy()

        except BackupError as berr:
            logger.error(f"run {self.run_id} failed at stage={berr.stage} category={berr.category}: {berr.message}")
            failure = {
                "stage": berr.stage,
                "category": berr.category,
                "message": berr.message,
            }
            outcome = "partial" if berr.exit_code == ExitCode.RESTIC_INCOMPLETE else "failed"
            telemetry.finish(outcome, berr.exit_code, failure=failure)
            return berr.exit_code, telemetry.snapshot_copy()

        except Exception as exc:
            logger.error(f"run {self.run_id} encountered unexpected internal error ({type(exc).__name__})")
            failure = {
                "stage": self._active_stage(telemetry),
                "category": "internal_error",
                "message": f"unexpected internal error: {type(exc).__name__}",
            }
            telemetry.finish("failed", ExitCode.INTERNAL, failure=failure)
            return ExitCode.INTERNAL, telemetry.snapshot_copy()

        finally:
            if self.stage_dir and os.path.exists(self.stage_dir):
                try:
                    shutil.rmtree(self.stage_dir)
                    logger.info("cleaned up ephemeral staging directory")
                except OSError:
                    logger.warn("failed to remove ephemeral staging directory on exit")
            for sig, handler in prev_handlers.items():
                try:
                    signal.signal(sig, handler)
                except Exception:
                    pass
            logger.close()
            try:
                fcntl.flock(self.lock_fd, fcntl.LOCK_UN)
            except OSError:
                pass
            try:
                os.close(self.lock_fd)
            except OSError:
                pass

    @staticmethod
    def _active_stage(telemetry):
        for name, st in telemetry.record["stages"].items():
            if st.get("status") == "running":
                return name
        return "preflight"

    # ------------------------------------------------------------------
    def _run_stages(self, logger, telemetry):
        cfg = self.cfg

        # Stage 1: Host, credential, space, and container preflight
        telemetry.stage_start("preflight")
        if cfg.require_root and os.geteuid() != 0:
            raise BackupError("preflight", "not_root", "backup runner must run as root (UID 0)", ExitCode.CONFIG)

        for bin_path, label in (
            (cfg.restic_binary, "restic"),
            (cfg.docker_binary, "docker"),
            (cfg.ssh_binary, "ssh"),
            (cfg.sha256sum_binary, "sha256sum"),
        ):
            if not (os.path.isfile(bin_path) and os.access(bin_path, os.X_OK)):
                raise BackupError("preflight", "binary_missing", f"executable missing: {label}", ExitCode.PREFLIGHT)

        _check_secret_file(cfg.restic_password_file, "restic.passwordFile")
        if cfg.mechanism in ("sftp", "rest-ssh-tunnel"):
            _check_secret_file(cfg.transport["sshKeyFile"], "transport.sshKeyFile")
            _check_secret_file(cfg.transport["knownHostsFile"], "transport.knownHostsFile")
        if cfg.mechanism == "rest-ssh-tunnel":
            _check_secret_file(cfg.transport["restPasswordFile"], "transport.restPasswordFile")

        exclude_patterns = load_exclude_patterns(cfg.exclude_file)

        st_vfs = os.statvfs(cfg.staging_parent)
        free_before = st_vfs.f_bavail * st_vfs.f_frsize
        if free_before < cfg.min_free_bytes:
            raise BackupError(
                "preflight",
                "insufficient_disk_space",
                f"available staging space ({free_before} bytes) is below minimum ({cfg.min_free_bytes} bytes)",
                ExitCode.DISK_SPACE,
            )

        docker = Docker(cfg, logger)
        excluded_ids = docker.excluded_container_ids()
        pg_instances = []
        for spec in cfg.postgres:
            cid, cname = docker.resolve_container(spec["composeProject"], spec["composeService"])
            if cid in excluded_ids:
                raise BackupError(
                    "preflight",
                    "excluded_container_targeted",
                    f"resolved container {cname} matches excluded container ID",
                    ExitCode.CONFIG,
                )
            pg_instances.append(PostgresInstance(docker, spec, cid, cname, logger))

        telemetry.stage_end(
            "preflight",
            freeBytesBefore=free_before,
            minFreeBytes=cfg.min_free_bytes,
            resolvedContainers=[p.name for p in pg_instances],
            excludedContainersUntouched=list(cfg.excluded_containers),
        )

        # Stage 2 & 3: Remote repository reachability + non-destructive lock inspection
        restic_ver = "unknown"
        if self.skip_remote:
            telemetry.stage_skip("repository_preflight", "skip_remote_enabled")
            telemetry.stage_skip("lock_inspection", "skip_remote_enabled")
            telemetry.record["locks"] = {"status": "skipped", "unlockPerformed": False}
        else:
            with TransferSession(cfg, logger) as session:
                rclient = ResticClient(cfg, session, logger)
                restic_ver = rclient.version()

                telemetry.stage_start("repository_preflight")
                probe = rclient.probe_repository()
                telemetry.stage_end("repository_preflight", **probe)

                telemetry.stage_start("lock_inspection")
                lock_report = rclient.inspect_locks()
                telemetry.record["locks"] = lock_report
                for l_item in lock_report["locks"]:
                    if l_item["classification"] == "stale_shared":
                        telemetry.warn("stale_shared_lock_present", l_item["lockIdPrefix"])
                if not lock_report["canProceedWithBackup"]:
                    telemetry.stage_end(
                        "lock_inspection",
                        status="blocked",
                        totalLocks=lock_report["counts"]["total"],
                        blockingReasons=lock_report["blockingReasons"],
                    )
                    if self.mode == "full":
                        raise BackupError(
                            "lock_inspection",
                            "repository_lock_conflict",
                            "conflicting or exclusive Restic lock detected; refusing to start backup",
                            ExitCode.LOCK_CONFLICT,
                        )
                else:
                    telemetry.stage_end(
                        "lock_inspection",
                        totalLocks=lock_report["counts"]["total"],
                        staleShared=lock_report["counts"]["staleShared"],
                    )

        if self.mode == "lock-inspect":
            for skipped_stage in (
                "database_export",
                "tenant_coverage",
                "file_collection",
                "secret_collection",
                "manifest",
                "size_assertions",
                "transfer",
                "snapshot",
                "verification",
            ):
                telemetry.stage_skip(skipped_stage, "lock_inspect_mode")
            return ExitCode.SUCCESS, "success"

        # If mode == preflight, perform read-only DB/tenant discovery and file scope validation without writing dumps
        if self.mode == "preflight":
            self._preflight_readonly_checks(pg_instances, docker, exclude_patterns, logger, telemetry)
            for skipped_stage in ("manifest", "size_assertions", "transfer", "snapshot", "verification"):
                telemetry.stage_skip(skipped_stage, "preflight_mode")
            return ExitCode.SUCCESS, "success"

        # Create ephemeral mode-0700 staging directory for stage-only or full execution
        self.stage_dir = tempfile.mkdtemp(prefix=f"{cfg.staging_prefix}-{self.run_id}-", dir=cfg.staging_parent)
        os.chmod(self.stage_dir, 0o700)
        for sub in ("databases", "tenants", "metadata"):
            os.makedirs(os.path.join(self.stage_dir, sub), mode=0o700, exist_ok=True)

        # Stage 4: PostgreSQL database export
        telemetry.stage_start("database_export")
        expected_dbs = []
        exported_dbs = []
        missing_dbs = []
        unlisted_dbs = []
        tenant_pg = None
        tenant_db_name = None
        full_dump_path = None
        pg_version_str = "unknown"

        for pg in pg_instances:
            inst_id = pg.spec["id"]
            inst_dir = os.path.join(self.stage_dir, "databases", inst_id)
            os.makedirs(inst_dir, mode=0o700, exist_ok=True)
            ver = pg.server_version()
            if pg.spec.get("tenantDatabase"):
                tenant_pg = pg
                tenant_db_name = pg.spec["tenantDatabase"]
                pg_version_str = ver

            live_dbs = set(pg.list_databases())
            configured_dbs = list(pg.spec["databases"])
            ignored_dbs = set(pg.spec.get("ignoreDatabases", ["postgres"]))

            for db_name in configured_dbs:
                expected_dbs.append(f"{inst_id}/{db_name}")
                if db_name not in live_dbs:
                    missing_dbs.append(f"{inst_id}/{db_name}")
                    raise BackupError(
                        "database_export",
                        "configured_database_missing",
                        f"configured database '{db_name}' does not exist on instance '{inst_id}'",
                        ExitCode.DATABASE_EXPORT,
                    )

            extra_dbs = sorted(live_dbs - set(configured_dbs) - ignored_dbs)
            if extra_dbs:
                for edb in extra_dbs:
                    unlisted_dbs.append(f"{inst_id}/{edb}")
                    telemetry.warn("unlisted_database_discovered", f"{inst_id}/{edb}")
                if pg.spec.get("autoDiscover", True):
                    configured_dbs.extend(extra_dbs)

            if pg.spec.get("dumpGlobals", True):
                globals_path = os.path.join(inst_dir, f"{inst_id}.globals.sql")
                pg.dump_globals(globals_path)

            for db_name in configured_dbs:
                dump_file = os.path.join(inst_dir, f"{db_name}.full.dump")
                logger.info(f"exporting database {inst_id}/{db_name}")
                pg.dump_database(db_name, dump_file, stage="database_export")
                toc = pg.archive_toc(dump_file, "database_export")
                if db_name == tenant_db_name and pg is tenant_pg:
                    full_dump_path = dump_file
                    full_dump_toc = toc
                exported_dbs.append({
                    "instance": inst_id,
                    "database": db_name,
                    "sizeBytes": os.path.getsize(dump_file),
                })

        telemetry.record["databases"] = {
            "status": "complete",
            "expected": expected_dbs,
            "exported": exported_dbs,
            "missing": missing_dbs,
            "unlisted": unlisted_dbs,
        }
        telemetry.stage_end("database_export", exportedCount=len(exported_dbs))

        # Stage 5: Tenant schema coverage validation & per-tenant dumps
        telemetry.stage_start("tenant_coverage")
        from .postgres import REGISTRY_SQL, TENANT_SCHEMAS_SQL

        reg_raw = tenant_pg.query(tenant_db_name, REGISTRY_SQL, "tenant_coverage")
        registry = parse_registry(reg_raw)
        cat_raw = tenant_pg.query(tenant_db_name, TENANT_SCHEMAS_SQL, "tenant_coverage")
        catalog_schemas = {s.strip() for s in cat_raw.splitlines() if s.strip()}

        # Export sanitized metadata files into stage/metadata/
        reg_json_path = os.path.join(self.stage_dir, "metadata", "tenant-registry.json")
        fd_rj = os.open(reg_json_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd_rj, "w", encoding="utf-8") as fh:
            json.dump(registry, fh, indent=2)
            fh.write("\n")
        reg_csv_path = os.path.join(self.stage_dir, "metadata", "tenant-registry.csv")
        _write_tenant_registry_csv(reg_csv_path, registry)

        # Dump every tenant schema present in catalog (union of registry + any orphan tenant_* schema)
        dumped_schemas = set()
        for schema_name in sorted(catalog_schemas):
            tdump_path = os.path.join(self.stage_dir, "tenants", f"{schema_name}.dump")
            tenant_pg.dump_database(tenant_db_name, tdump_path, schema=schema_name, stage="tenant_coverage")
            ttoc = tenant_pg.archive_toc(tdump_path, "tenant_coverage")
            if schema_name not in toc_schemas(ttoc):
                raise BackupError(
                    "tenant_coverage",
                    "tenant_dump_toc_missing_schema",
                    f"per-tenant dump TOC did not contain schema {schema_name}",
                    ExitCode.TENANT_COVERAGE,
                )
            dumped_schemas.add(schema_name)

        full_schemas = toc_schemas(full_dump_toc)
        cov = evaluate_coverage(
            registry,
            catalog_schemas,
            dumped_schemas,
            full_schemas,
            cfg.min_tenant_count,
        )
        telemetry.record["tenants"] = cov
        for w in cov["warnings"]:
            telemetry.warn(w)
        if cov["status"] != "complete":
            telemetry.stage_end("tenant_coverage", status="failed", problems=cov["problems"])
            raise BackupError(
                "tenant_coverage",
                cov["problems"][0],
                f"tenant coverage validation failed ({', '.join(cov['problems'])})",
                ExitCode.TENANT_COVERAGE,
            )
        telemetry.stage_end(
            "tenant_coverage",
            registryCount=cov["registryCount"],
            dumpedCount=cov["dumpedCount"],
        )

        # Stage 6 & 7: Persistent file collection + configuration & secret validation
        telemetry.stage_start("file_collection")
        telemetry.stage_start("secret_collection")
        scope_info = collect_and_validate_sources(cfg, docker, exclude_patterns, logger)
        telemetry.stage_end(
            "file_collection",
            files=scope_info["data_files"],
            bytes=scope_info["data_bytes"],
        )
        telemetry.stage_end(
            "secret_collection",
            files=scope_info["secret_files"],
            bytes=scope_info["secret_bytes"],
        )

        # Stage 8 & 9: SHA-256 manifest generation + non-zero size assertions
        telemetry.stage_start("manifest")
        telemetry.stage_start("size_assertions")
        manifest_info = build_and_verify_manifest(
            self.stage_dir,
            run_id=self.run_id,
            host_name=socket.gethostname(),
            pg_version=pg_version_str,
            restic_version=restic_ver,
            tenant_Database=tenant_db_name,
            tenant_schemas=cov["schemas"],
        )
        telemetry.record["manifest"] = {
            "status": manifest_info["status"],
            "entryCount": manifest_info["entryCount"],
            "manifestTxtSha256": manifest_info["manifestTxtSha256"],
            "manifestJsonSha256": manifest_info["manifestJsonSha256"],
        }
        total_files = manifest_info["stagedFileCount"] + scope_info["data_files"] + scope_info["secret_files"]
        total_bytes = manifest_info["stagedBytes"] + scope_info["data_bytes"] + scope_info["secret_bytes"]
        telemetry.record["artifacts"] = {
            "staged": {"count": manifest_info["stagedFileCount"], "bytes": manifest_info["stagedBytes"]},
            "files": {"count": scope_info["data_files"], "bytes": scope_info["data_bytes"]},
            "secrets": {"count": scope_info["secret_files"], "bytes": scope_info["secret_bytes"]},
            "total": {"count": total_files, "bytes": total_bytes},
            "nonSecretSources": scope_info["non_secret_sources"],
            "zeroSizeViolations": 0,
        }
        telemetry.stage_end("manifest", entryCount=manifest_info["entryCount"])
        telemetry.stage_end("size_assertions", zeroSizeViolations=0)

        if self.mode == "stage-only":
            for skipped_stage in ("transfer", "snapshot", "verification"):
                telemetry.stage_skip(skipped_stage, "stage_only_mode")
            return ExitCode.SUCCESS, "success"

        # Stage 10, 11, 12: Secure transfer, Restic snapshot creation, and independent verification
        backup_paths = [self.stage_dir] + scope_info["backup_paths"]
        run_tag = f"run-{self.run_id}"

        telemetry.stage_start("transfer")
        telemetry.stage_start("snapshot")
        with TransferSession(cfg, logger) as session:
            rclient = ResticClient(cfg, session, logger)

            # Re-verify locks immediately before committing backup
            pre_backup_locks = rclient.inspect_locks()
            telemetry.record["locks"] = pre_backup_locks
            if not pre_backup_locks["canProceedWithBackup"]:
                raise BackupError(
                    "snapshot",
                    "repository_lock_conflict",
                    "conflicting or exclusive Restic lock detected prior to backup",
                    ExitCode.LOCK_CONFLICT,
                )

            bk_res = rclient.create_backup(backup_paths, run_tag=run_tag)
            summary = bk_res["summary"]
            snap_id = summary.get("snapshot_id")

            telemetry.record["transfer"] = {
                "status": "completed",
                "mechanism": cfg.mechanism,
                "attempts": bk_res["attempts"],
                "dataAddedBytes": summary.get("data_added"),
                "dataAddedPackedBytes": summary.get("data_added_packed"),
                "totalBytesProcessed": summary.get("total_bytes_processed"),
                "totalFilesProcessed": summary.get("total_files_processed"),
            }
            telemetry.stage_end("transfer", attempts=bk_res["attempts"], dataAddedPackedBytes=summary.get("data_added_packed"))

            telemetry.record["restic"] = {
                "snapshotId": snap_id,
                "shortId": snap_id[:8] if snap_id else None,
                "exitCode": bk_res["exitCode"],
                "filesNew": summary.get("files_new"),
                "filesChanged": summary.get("files_changed"),
                "filesUnmodified": summary.get("files_unmodified"),
                "dataBlobs": summary.get("data_blobs"),
                "treeBlobs": summary.get("tree_blobs"),
            }
            telemetry.stage_end("snapshot", snapshotId=snap_id, resticExitCode=bk_res["exitCode"])

            telemetry.stage_start("verification")
            ver_res = rclient.verify_snapshot(
                snap_id,
                run_tag=run_tag,
                stage_dir=self.stage_dir,
                expected_manifest_txt_sha256=manifest_info["manifestTxtSha256"],
                expected_manifest_json_sha256=manifest_info["manifestJsonSha256"],
                expected_tenant_count=cov["registryCount"],
                expected_non_secret_paths=scope_info["expected_snapshot_paths"],
            )
            telemetry.record["verification"] = ver_res
            telemetry.record["recoveryPoint"] = {
                "snapshotId": ver_res["snapshotId"],
                "shortId": ver_res["shortId"],
                "runId": self.run_id,
                "runTag": run_tag,
                "timestamp": ver_res["snapshotTime"],
                "tenantCount": cov["registryCount"],
                "databases": [d["database"] for d in exported_dbs],
                "manifestTxtSha256": manifest_info["manifestTxtSha256"],
            }
            telemetry.stage_end("verification", snapshotId=ver_res["snapshotId"])

            if bk_res["exitCode"] == 3:
                raise BackupError(
                    "snapshot",
                    "restic_incomplete_snapshot",
                    "restic exited with code 3 (incomplete snapshot)",
                    ExitCode.RESTIC_INCOMPLETE,
                )

        return ExitCode.SUCCESS, "success"

    # ------------------------------------------------------------------
    def _preflight_readonly_checks(self, pg_instances, docker, exclude_patterns, logger, telemetry):
        """Read-only database & tenant checks + file scope validation for `--mode preflight`."""
        telemetry.stage_start("database_export")
        expected_dbs = []
        unlisted_dbs = []
        tenant_pg = None
        tenant_db_name = None

        for pg in pg_instances:
            inst_id = pg.spec["id"]
            if pg.spec.get("tenantDatabase"):
                tenant_pg = pg
                tenant_db_name = pg.spec["tenantDatabase"]
            live_dbs = set(pg.list_databases())
            configured_dbs = list(pg.spec["databases"])
            ignored_dbs = set(pg.spec.get("ignoreDatabases", ["postgres"]))
            for db_name in configured_dbs:
                expected_dbs.append(f"{inst_id}/{db_name}")
                if db_name not in live_dbs:
                    raise BackupError(
                        "database_export",
                        "configured_database_missing",
                        f"configured database '{db_name}' missing on '{inst_id}'",
                        ExitCode.DATABASE_EXPORT,
                    )
            for edb in sorted(live_dbs - set(configured_dbs) - ignored_dbs):
                unlisted_dbs.append(f"{inst_id}/{edb}")
                telemetry.warn("unlisted_database_discovered", f"{inst_id}/{edb}")

        telemetry.record["databases"] = {
            "status": "preflight_verified",
            "expected": expected_dbs,
            "exported": [],
            "missing": [],
            "unlisted": unlisted_dbs,
        }
        telemetry.stage_end("database_export", status="preflight_verified", checkedCount=len(expected_dbs))

        telemetry.stage_start("tenant_coverage")
        from .postgres import REGISTRY_SQL, TENANT_SCHEMAS_SQL

        reg_raw = tenant_pg.query(tenant_db_name, REGISTRY_SQL, "tenant_coverage")
        registry = parse_registry(reg_raw)
        cat_raw = tenant_pg.query(tenant_db_name, TENANT_SCHEMAS_SQL, "tenant_coverage")
        catalog_schemas = {s.strip() for s in cat_raw.splitlines() if s.strip()}
        cov = evaluate_coverage(
            registry,
            catalog_schemas,
            catalog_schemas,
            catalog_schemas,
            self.cfg.min_tenant_count,
        )
        cov["dumpedCount"] = 0
        cov["status"] = "preflight_verified" if not cov["problems"] else "incomplete"
        telemetry.record["tenants"] = cov
        if cov["problems"]:
            raise BackupError(
                "tenant_coverage",
                cov["problems"][0],
                f"tenant coverage preflight failed ({', '.join(cov['problems'])})",
                ExitCode.TENANT_COVERAGE,
            )
        telemetry.stage_end("tenant_coverage", status="preflight_verified", registryCount=cov["registryCount"])

        telemetry.stage_start("file_collection")
        telemetry.stage_start("secret_collection")
        scope_info = collect_and_validate_sources(self.cfg, docker, exclude_patterns, logger)
        telemetry.record["artifacts"] = {
            "staged": {"count": 0, "bytes": 0},
            "files": {"count": scope_info["data_files"], "bytes": scope_info["data_bytes"]},
            "secrets": {"count": scope_info["secret_files"], "bytes": scope_info["secret_bytes"]},
            "total": {
                "count": scope_info["data_files"] + scope_info["secret_files"],
                "bytes": scope_info["data_bytes"] + scope_info["secret_bytes"],
            },
            "nonSecretSources": scope_info["non_secret_sources"],
            "zeroSizeViolations": 0,
        }
        telemetry.stage_end("file_collection", status="preflight_verified", files=scope_info["data_files"])
        telemetry.stage_end("secret_collection", status="preflight_verified", files=scope_info["secret_files"])


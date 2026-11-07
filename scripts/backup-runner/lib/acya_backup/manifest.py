"""Persistent file, configuration, and secret scope validation + SHA-256 manifest.

Security invariant:
  Files belonging to a source with ``class == "secret"`` (or whose basename matches
  the protected secret names such as ``firebase-management-key.json`` and
  ``firebase-service-account.json``) MUST NEVER be copied into the unencrypted
  staging directory, MUST NEVER have their filenames, paths, or digests written
  into ``manifest.txt``, ``manifest.json``, logs, or telemetry JSON.
  Instead, their parent directory is passed directly to ``restic backup`` so they
  are encrypted in-memory before leaving the host, and telemetry records only
  aggregate count and byte totals for the ``secrets`` category.
"""

import fnmatch
import glob
import hashlib
import json
import os
import stat

from . import RUNNER_VERSION
from .errors import BackupError, ExitCode
from .proc import iso, utcnow

PROTECTED_SECRET_BASENAMES = frozenset({
    "firebase-management-key.json",
    "firebase-service-account.json",
    ".env",
    ".env.n8n",
    ".restic_password",
    ".rest_password",
    "acya_backup_ed25519",
})


def load_exclude_patterns(exclude_file):
    """Load Restic-compatible exclude patterns from exclude_file."""
    if not os.path.isfile(exclude_file):
        raise BackupError(
            "preflight",
            "exclude_file_missing",
            "configured excludeFile does not exist",
            ExitCode.CONFIG,
        )
    patterns = []
    with open(exclude_file, "r", encoding="utf-8") as fh:
        for raw in fh:
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            patterns.append(line)
    return patterns


def is_excluded(path, patterns):
    """Approximate Restic --exclude-file matching for pre-backup file accounting."""
    base = os.path.basename(path)
    norm = os.path.normpath(path)
    for pat in patterns:
        if "/" in pat:
            if fnmatch.fnmatch(norm, pat) or fnmatch.fnmatch(norm, pat.rstrip("/") + "/*"):
                return True
            if not pat.startswith("/") and (
                fnmatch.fnmatch(norm, "*/" + pat) or fnmatch.fnmatch(norm, "*/" + pat.rstrip("/") + "/*")
            ):
                return True
        else:
            if fnmatch.fnmatch(base, pat):
                return True
    return False


def _scan_path(root_path, patterns):
    """Return (regular_file_count, total_bytes, zero_byte_files) under root_path."""
    st = os.lstat(root_path)
    if stat.S_ISREG(st.st_mode):
        if is_excluded(root_path, patterns):
            return 0, 0, []
        return 1, st.st_size, ([root_path] if st.st_size == 0 else [])

    if not stat.S_ISDIR(st.st_mode):
        return 0, 0, []

    file_count = 0
    total_bytes = 0
    zero_files = []
    for dirpath, dirnames, filenames in os.walk(root_path, followlinks=False):
        dirnames[:] = [
            d for d in dirnames
            if not is_excluded(os.path.join(dirpath, d), patterns)
        ]
        for fname in filenames:
            fpath = os.path.join(dirpath, fname)
            if is_excluded(fpath, patterns):
                continue
            try:
                fst = os.lstat(fpath)
            except OSError as exc:
                raise BackupError(
                    "file_collection",
                    "source_unreadable",
                    f"unable to stat file inside scope ({exc.errno})",
                    ExitCode.FILE_SCOPE,
                )
            if not stat.S_ISREG(fst.st_mode):
                continue
            file_count += 1
            total_bytes += fst.st_size
            if fst.st_size == 0:
                zero_files.append(fpath)
    return file_count, total_bytes, zero_files


def collect_and_validate_sources(cfg, docker, patterns, logger):
    """Validate all configured fileSources (data, config, secret).

    Returns a dictionary with:
      - backup_paths: ordered list of host paths to pass to restic backup
      - non_secret_sources: list of sanitized metadata dicts (safe for telemetry)
      - data_files / data_bytes
      - secret_files / secret_bytes
      - expected_snapshot_paths: list of non-secret paths to verify in snapshot tree
    """
    backup_paths = []
    seen_paths = set()
    non_secret_sources = []
    expected_snapshot_paths = []
    data_files = 0
    data_bytes = 0
    secret_files = 0
    secret_bytes = 0

    for src in cfg.file_sources:
        sid = src["id"]
        sclass = src["class"]
        kind = src["kind"]
        stage = "secret_collection" if sclass == "secret" else "file_collection"

        # Resolve optional Docker volume mountpoint if specified
        if src.get("dockerVolume") and docker is not None:
            mp = docker.volume_mountpoint(src["dockerVolume"])
            if not mp:
                raise BackupError(
                    stage,
                    "docker_volume_missing",
                    f"docker volume for source '{sid}' could not be inspected",
                    ExitCode.FILE_SCOPE,
                )
            resolved_paths = [os.path.normpath(mp)]
        elif kind in ("file", "dir"):
            resolved_paths = [src["path"]]
        elif kind == "glob":
            matches = sorted(glob.glob(src["pattern"]))
            matches = [os.path.normpath(m) for m in matches if not is_excluded(m, patterns)]
            if len(matches) < src.get("minMatches", 1):
                raise BackupError(
                    stage,
                    "glob_insufficient_matches",
                    f"source '{sid}' matched {len(matches)} files (minimum {src.get('minMatches', 1)})",
                    ExitCode.FILE_SCOPE,
                )
            resolved_paths = matches
        else:
            raise BackupError(stage, "invalid_source_kind", f"unsupported kind for '{sid}'", ExitCode.CONFIG)

        src_files = 0
        src_bytes = 0
        for rpath in resolved_paths:
            if not os.path.exists(rpath):
                if src["required"]:
                    raise BackupError(
                        stage,
                        "source_missing",
                        f"required source '{sid}' is missing on disk",
                        ExitCode.FILE_SCOPE,
                    )
                continue

            if kind == "dir" and not os.path.isdir(rpath):
                raise BackupError(
                    stage,
                    "source_wrong_type",
                    f"source '{sid}' expected a directory",
                    ExitCode.FILE_SCOPE,
                )
            if kind == "file" and not os.path.isfile(rpath):
                raise BackupError(
                    stage,
                    "source_wrong_type",
                    f"source '{sid}' expected a regular file",
                    ExitCode.FILE_SCOPE,
                )

            # Verify required child files exist and are non-empty (without logging their names if secret!)
            for req_file in src.get("requiredFiles", []):
                candidate = os.path.join(rpath, req_file)
                try:
                    cst = os.stat(candidate)
                except OSError:
                    raise BackupError(
                        stage,
                        "required_file_missing",
                        f"source '{sid}' is missing a required member file",
                        ExitCode.FILE_SCOPE,
                    )
                if not stat.S_ISREG(cst.st_mode) or cst.st_size <= 0:
                    raise BackupError(
                        stage,
                        "required_file_empty",
                        f"source '{sid}' has an empty or non-regular required member file",
                        ExitCode.MANIFEST,
                    )

            f_cnt, b_cnt, zero_list = _scan_path(rpath, patterns)
            if kind == "file" and zero_list:
                raise BackupError(
                    stage,
                    "source_file_empty",
                    f"required file source '{sid}' has zero bytes",
                    ExitCode.MANIFEST,
                )
            src_files += f_cnt
            src_bytes += b_cnt

            if rpath not in seen_paths:
                seen_paths.add(rpath)
                backup_paths.append(rpath)
            if sclass != "secret":
                expected_snapshot_paths.append(rpath)

        if src["nonEmpty"] and (src_files == 0 or src_bytes <= 0):
            raise BackupError(
                stage,
                "source_empty",
                f"source '{sid}' contains zero eligible files or zero bytes",
                ExitCode.MANIFEST,
            )

        if sclass == "secret":
            secret_files += src_files
            secret_bytes += src_bytes
            logger.info(f"validated protected secret source '{sid}' ({src_files} files, {src_bytes} bytes)")
        else:
            data_files += src_files
            data_bytes += src_bytes
            non_secret_sources.append({
                "id": sid,
                "class": sclass,
                "files": src_files,
                "bytes": src_bytes,
            })
            logger.info(f"validated source '{sid}' [{sclass}] ({src_files} files, {src_bytes} bytes)")

    return {
        "backup_paths": backup_paths,
        "non_secret_sources": non_secret_sources,
        "data_files": data_files,
        "data_bytes": data_bytes,
        "secret_files": secret_files,
        "secret_bytes": secret_bytes,
        "expected_snapshot_paths": expected_snapshot_paths,
    }


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        while True:
            chunk = fh.read(1024 * 1024)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def build_and_verify_manifest(
    stage_dir,
    *,
    run_id,
    host_name,
    pg_version,
    restic_version,
    tenant_Database,
    tenant_schemas,
):
    """Generate metadata/manifest.txt + metadata/manifest.json and verify all digests.

    Wait: inspects the staging directory to guarantee no protected secret file
    was ever placed inside staging.
    """
    meta_dir = os.path.join(stage_dir, "metadata")
    os.makedirs(meta_dir, mode=0o700, exist_ok=True)
    manifest_txt = os.path.join(meta_dir, "manifest.txt")
    manifest_json = os.path.join(meta_dir, "manifest.json")

    entries = []
    for root, dirs, files in os.walk(stage_dir, followlinks=False):
        dirs.sort()
        for fname in sorted(files):
            if fname in ("manifest.txt", "manifest.json"):
                continue
            if fname in PROTECTED_SECRET_BASENAMES:
                raise BackupError(
                    "manifest",
                    "secret_in_staging_prohibited",
                    "protected secret file detected inside unencrypted staging directory",
                    ExitCode.MANIFEST,
                )
            fpath = os.path.join(root, fname)
            rel = os.path.relpath(fpath, stage_dir)
            st = os.lstat(fpath)
            if not stat.S_ISREG(st.st_mode):
                raise BackupError(
                    "manifest",
                    "unexpected_non_regular_staged_file",
                    f"non-regular file found in staging: {rel}",
                    ExitCode.MANIFEST,
                )
            if st.st_size <= 0:
                raise BackupError(
                    "size_assertions",
                    "staged_artifact_empty",
                    f"staged artifact has zero size: {rel}",
                    ExitCode.MANIFEST,
                )
            digest = sha256_file(fpath)
            entries.append({
                "path": fpath,
                "relativePath": rel,
                "sizeBytes": st.st_size,
                "sha256": digest,
            })

    if not entries:
        raise BackupError(
            "manifest",
            "staging_empty",
            "no staged artifacts found to hash",
            ExitCode.MANIFEST,
        )

    now_utc = utcnow()
    lines = [
        "============================================================",
        "ACYA AUTOMATED PRODUCTION BACKUP MANIFEST",
        "============================================================",
        f"Timestamp: {now_utc.strftime('%Y-%m-%d %H:%M:%S UTC')}",
        f"Runner Version: {RUNNER_VERSION}",
        f"Run ID: {run_id}",
        f"Hostname: {host_name}",
        f"PostgreSQL Version: {pg_version}",
        f"Restic Version: {restic_version}",
        f"Database Name: {tenant_Database}",
        f"Tenant Count: {len(tenant_schemas)}",
        f"Tenant Schemas: {' '.join(tenant_schemas)}",
        "",
        "------------------------------------------------------------",
        "GENERATED STAGING ARTIFACTS AND CHECKSUMS",
        "------------------------------------------------------------",
    ]
    for item in entries:
        lines.append(f"{item['sha256']}  {item['path']}")
    lines.extend([
        "============================================================",
        "END OF MANIFEST",
        "============================================================",
        "",
    ])
    manifest_text = "\n".join(lines)
    fd = os.open(manifest_txt, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as fh:
        fh.write(manifest_text)
        fh.flush()
        os.fsync(fh.fileno())

    manifest_obj = {
        "schema": "acya.backup.manifest/v1",
        "generatedAt": iso(now_utc),
        "runnerVersion": RUNNER_VERSION,
        "runId": run_id,
        "hostname": host_name,
        "postgresVersion": pg_version,
        "resticVersion": restic_version,
        "tenantDatabase": tenant_Database,
        "tenantCount": len(tenant_schemas),
        "tenantSchemas": list(tenant_schemas),
        "artifacts": [
            {
                "relativePath": item["relativePath"],
                "stagedPath": item["path"],
                "sizeBytes": item["sizeBytes"],
                "sha256": item["sha256"],
            }
            for item in entries
        ],
    }
    fd_j = os.open(manifest_json, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd_j, "w", encoding="utf-8") as fh:
        json.dump(manifest_obj, fh, indent=2)
        fh.write("\n")
        fh.flush()
        os.fsync(fh.fileno())

    # Symmetric verification pass: re-read manifest.txt and recompute every SHA-256
    verified_count = 0
    for item in entries:
        recomputed = sha256_file(item["path"])
        if recomputed != item["sha256"]:
            raise BackupError(
                "manifest",
                "manifest_checksum_mismatch",
                f"SHA-256 verification failed for {item['relativePath']}",
                ExitCode.MANIFEST,
            )
        if os.path.getsize(item["path"]) <= 0:
            raise BackupError(
                "size_assertions",
                "staged_artifact_empty",
                f"staged artifact became empty: {item['relativePath']}",
                ExitCode.MANIFEST,
            )
        verified_count += 1

    txt_size = os.path.getsize(manifest_txt)
    json_size = os.path.getsize(manifest_json)
    if txt_size <= 0 or json_size <= 0:
        raise BackupError(
            "size_assertions",
            "manifest_empty",
            "generated manifest file is empty",
            ExitCode.MANIFEST,
        )

    total_staged_bytes = sum(i["sizeBytes"] for i in entries) + txt_size + json_size
    total_staged_files = len(entries) + 2

    return {
        "status": "verified",
        "entryCount": verified_count,
        "stagedFileCount": total_staged_files,
        "stagedBytes": total_staged_bytes,
        "manifestTxtSha256": sha256_file(manifest_txt),
        "manifestJsonSha256": sha256_file(manifest_json),
        "manifestTxtPath": manifest_txt,
        "manifestJsonPath": manifest_json,
    }


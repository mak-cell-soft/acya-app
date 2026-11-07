"""Read-only tenant backup history indexer for ACYA Restic snapshots (Phase 11C.1.7b).

Scans existing global Restic snapshots using read-only `--no-lock` commands,
inspects only snapshot metadata files (`tenant-registry.json`, `manifest.txt`,
`manifest.json`) and directory listings (`restic ls --json`), and atomically
writes `/opt/acya-backup/state/tenant-backup-history.json` (`0644`).

Safety invariants:
- Never extracts database dumps (`*.dump`).
- Never modifies the Restic repository.
- Never invokes `pg_dump` or `pg_restore`.
- Never fabricates checksum verification: manifest-recorded SHA-256 values are
  explicitly labeled `manifest_recorded_unverified` until post-extraction
  verification occurs during an actual restore workflow.
"""

from __future__ import annotations

import json
import os
import pathlib
import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Set, Tuple, Union

from . import RUNNER_VERSION
from .errors import BackupError, ExitCode
from .postgres import TENANT_SCHEMA_RE, expected_schema_for_slug
from .proc import iso, run, utcnow
from .telemetry import atomic_write_json

CATALOG_SCHEMA = "acya.backup.tenant-history/v1"
DEFAULT_HISTORY_PATH = pathlib.Path("/opt/acya-backup/state/tenant-backup-history.json")

SNAPSHOT_ID_RE = re.compile(r"^[0-9a-f]{8,64}$")
FULL_SNAPSHOT_ID_RE = re.compile(r"^[0-9a-f]{64}$")
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{0,59}$")

STAGE_ROOT_RE = re.compile(
    r"^("
    r"/opt/acya-backup/staging/stage-[A-Za-z0-9_-]+"
    r"|/var/backups/acya-backup-stage-[A-Za-z0-9_-]+"
    r"|/home/ubuntu/acya-backup-stage"
    r")$"
)

TENANT_DUMP_REL_RE = re.compile(r"^tenants/(tenant_[a-z0-9_]{1,60})\.dump$")
ALLOWED_METADATA_FILENAMES = frozenset({
    "metadata/tenant-registry.json",
    "metadata/manifest.txt",
    "metadata/manifest.json",
})


@dataclass(frozen=True)
class KnownTenant:
    tenant_id: Optional[int]
    slug: str
    schema_name: str
    mapping_valid: bool
    mapping_error: Optional[str] = None


def validate_snapshot_id(snapshot_id: Any) -> str:
    """Validate that a snapshot ID is a lowercase hexadecimal string (8..64 chars)."""
    if not isinstance(snapshot_id, str) or not SNAPSHOT_ID_RE.match(snapshot_id):
        raise BackupError(
            "history_index",
            "invalid_snapshot_id",
            f"Invalid Restic snapshot ID: {snapshot_id!r}",
            ExitCode.VERIFICATION,
        )
    return snapshot_id


class ResticHistoryReader:
    """Read-only adapter around `ResticClient` enforcing `--no-lock` and metadata-only dumps."""

    def __init__(self, restic_client: Any):
        self._client = restic_client

    def snapshots(self) -> List[Dict[str, Any]]:
        argv, env = self._client._build_argv("snapshots", ["--json"], read_only=True)
        res = run(argv, env=env, timeout=120)
        if res.returncode != 0:
            if getattr(self._client, "log", None):
                self._client.log.stderr_tail("restic snapshots", res.stderr)
            raise BackupError(
                "history_index",
                "snapshots_query_failed",
                "restic snapshots --no-lock --json failed",
                ExitCode.VERIFICATION,
            )
        try:
            data = json.loads(res.stdout.decode("utf-8"))
        except ValueError:
            raise BackupError(
                "history_index",
                "snapshots_json_malformed",
                "restic snapshots returned invalid JSON",
                ExitCode.VERIFICATION,
            )
        if not isinstance(data, list):
            raise BackupError(
                "history_index",
                "snapshots_json_malformed",
                "restic snapshots output is not a JSON array",
                ExitCode.VERIFICATION,
            )
        return data

    def ls(self, snapshot_id: str) -> List[Dict[str, Any]]:
        validate_snapshot_id(snapshot_id)
        argv, env = self._client._build_argv("ls", [snapshot_id, "--json"], read_only=True)
        res = run(argv, env=env, timeout=180)
        if res.returncode != 0:
            if getattr(self._client, "log", None):
                self._client.log.stderr_tail(f"restic ls {snapshot_id[:8]}", res.stderr)
            raise BackupError(
                "history_index",
                "snapshot_ls_failed",
                f"restic ls --no-lock failed for snapshot {snapshot_id[:12]}",
                ExitCode.VERIFICATION,
            )
        entries: List[Dict[str, Any]] = []
        for raw_line in res.stdout.decode("utf-8", "replace").splitlines():
            line = raw_line.strip()
            if not line:
                continue
            try:
                node = json.loads(line)
            except ValueError:
                raise BackupError(
                    "history_index",
                    "snapshot_ls_malformed",
                    f"restic ls returned malformed JSON line for snapshot {snapshot_id[:12]}",
                    ExitCode.VERIFICATION,
                )
            if isinstance(node, dict) and node.get("struct_type") == "snapshot":
                continue
            if isinstance(node, dict):
                entries.append(node)
        return entries

    def dump(self, snapshot_id: str, exact_node_path: str) -> bytes:
        validate_snapshot_id(snapshot_id)
        if exact_node_path.endswith(".dump") or not any(
            exact_node_path.endswith("/" + allowed) for allowed in ALLOWED_METADATA_FILENAMES
        ):
            raise BackupError(
                "history_index",
                "forbidden_dump_target",
                f"Refusing to extract non-metadata path {exact_node_path!r} during history indexing",
                ExitCode.CONFIG,
            )
        return self._client._dump_node(snapshot_id, exact_node_path)


def discover_staging_root(
    snapshot: Dict[str, Any],
    ls_entries: Optional[List[Dict[str, Any]]] = None,
) -> Tuple[Optional[str], Optional[str]]:
    """Discover the single staging root path for a snapshot.

    Returns (staging_root, error_reason). If zero or multiple candidate staging
    roots exist, returns (None, reason).
    """
    candidates: Set[str] = set()
    raw_paths = snapshot.get("paths")
    if isinstance(raw_paths, list):
        for p in raw_paths:
            if isinstance(p, str):
                norm = p.rstrip("/")
                if STAGE_ROOT_RE.match(norm):
                    candidates.add(norm)

    if ls_entries:
        for entry in ls_entries:
            if not isinstance(entry, dict):
                continue
            path = entry.get("path")
            if isinstance(path, str):
                norm = path.rstrip("/")
                if STAGE_ROOT_RE.match(norm):
                    candidates.add(norm)
                else:
                    if norm.startswith("/opt/acya-backup/staging/"):
                        parts = norm.split("/")
                        if len(parts) >= 5:
                            root_cand = "/".join(parts[:5])
                            if STAGE_ROOT_RE.match(root_cand):
                                candidates.add(root_cand)
                    elif norm.startswith("/var/backups/"):
                        parts = norm.split("/")
                        if len(parts) >= 4:
                            root_cand = "/".join(parts[:4])
                            if STAGE_ROOT_RE.match(root_cand):
                                candidates.add(root_cand)
                    elif norm.startswith("/home/ubuntu/acya-backup-stage/"):
                        candidates.add("/home/ubuntu/acya-backup-stage")

    if len(candidates) == 0:
        return None, "staging_root_missing"
    if len(candidates) > 1:
        return None, "staging_root_ambiguous"
    return next(iter(candidates)), None


MANIFEST_ENTRY_RE = re.compile(r"^([0-9a-f]{64})\s+(.+)$")
MANIFEST_BANNER_RE = re.compile(r"^([=-]{3,}|#[^{\n]*|[A-Z][A-Z0-9 _/.-]{2,}(\([A-Za-z0-9 _.-]+\))?)$")
MANIFEST_KEYVAL_RE = re.compile(r"^[A-Za-z][A-Za-z0-9 _()/.-]{0,60}:\s*.*$")
MANIFEST_LEGACY_LS_RE = re.compile(
    r"^("
    r"-rw[-rwx]{7}\s+\d+\s+\S+\s+\S+\s+[0-9.]+[KMGTP]?\s+.+"
    r"|total\s+[0-9.]+[KMGTP]?"
    r"|[0-9.]+[KMGTP]?\s+/.*"
    r"|-\s+/.*"
    r")$"
)


def parse_manifest_txt(raw_text: str, staging_root: str) -> Tuple[Optional[Dict[str, str]], Optional[str]]:
    """Parse `metadata/manifest.txt` into a map of relative_path -> sha256.

    Supports:
      1. Header-annotated SHA-256 manifests (Phase 11B / legacy v1.2) and plain
         `sha256sum` manifests -> returns (non-empty dict, None).
      2. Legacy Phase 3C-2B `ls -lh` manifest (`5a78f673`, which recorded file
         listings without SHA-256 digests) -> returns ({}, None) so individual
         tenant dumps are still inventoried by presence/size while marked
         ineligible due to `manifest_entry_missing`.
      3. Malformed/corrupted manifests -> returns (None, "snapshot_metadata_malformed").
    """
    if not raw_text or not raw_text.strip():
        return None, "snapshot_metadata_malformed"

    prefix = staging_root.rstrip("/") + "/"
    entries: Dict[str, str] = {}
    saw_legacy_ls_line = False

    for raw_line in raw_text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        m = MANIFEST_ENTRY_RE.match(line)
        if m:
            digest, raw_path = m.group(1), m.group(2).strip()
            if raw_path.startswith("./"):
                raw_path = raw_path[2:]
            if raw_path.startswith(prefix):
                rel_path = raw_path[len(prefix):]
            else:
                rel_path = raw_path.lstrip("/")
            if not rel_path or ".." in rel_path.split("/"):
                return None, "snapshot_metadata_malformed"
            if rel_path in entries and entries[rel_path] != digest:
                return None, "snapshot_metadata_malformed"
            entries[rel_path] = digest
            continue

        if MANIFEST_BANNER_RE.match(line) or MANIFEST_KEYVAL_RE.match(line):
            continue

        if MANIFEST_LEGACY_LS_RE.match(line):
            saw_legacy_ls_line = True
            continue

        # Any unrecognized non-header line makes the manifest malformed
        return None, "snapshot_metadata_malformed"

    if not entries:
        if saw_legacy_ls_line:
            return {}, None
        return None, "snapshot_metadata_malformed"
    return entries, None


def parse_manifest_json(raw_text: str) -> Tuple[Optional[Dict[str, Dict[str, Any]]], Optional[str]]:
    """Parse `metadata/manifest.json` (when present) into a map of relative_path -> entry dict."""
    try:
        doc = json.loads(raw_text)
    except Exception:
        return None, "snapshot_metadata_malformed"

    if not isinstance(doc, dict):
        return None, "snapshot_metadata_malformed"
    entries_list = doc.get("artifacts") if "artifacts" in doc else doc.get("entries")
    if not isinstance(entries_list, list) or not entries_list:
        return None, "snapshot_metadata_malformed"

    result: Dict[str, Dict[str, Any]] = {}
    for item in entries_list:
        if not isinstance(item, dict):
            return None, "snapshot_metadata_malformed"
        rel_path = item.get("relativePath") or item.get("path")
        sha256 = item.get("sha256")
        size_bytes = item.get("sizeBytes") if "sizeBytes" in item else item.get("size")
        if (
            not isinstance(rel_path, str)
            or not rel_path
            or ".." in rel_path.split("/")
            or not isinstance(sha256, str)
            or not SHA256_RE.match(sha256)
            or not isinstance(size_bytes, int)
            or isinstance(size_bytes, bool)
            or size_bytes < 0
        ):
            return None, "snapshot_metadata_malformed"
        result[rel_path] = {
            "relativePath": rel_path,
            "sha256": sha256,
            "sizeBytes": size_bytes,
        }
    return result, None


def parse_tenant_registry_json(raw_text: str) -> Tuple[Optional[List[KnownTenant]], Optional[str]]:
    """Parse `metadata/tenant-registry.json` into a list of KnownTenant records."""
    try:
        doc = json.loads(raw_text)
    except Exception:
        return None, "snapshot_metadata_malformed"

    if not isinstance(doc, list):
        return None, "snapshot_metadata_malformed"

    tenants: List[KnownTenant] = []
    for row in doc:
        if not isinstance(row, dict):
            return None, "snapshot_metadata_malformed"
        raw_id = row.get("Id") if "Id" in row else row.get("id")
        slug = row.get("Slug") if "Slug" in row else row.get("slug")
        schema_name = (
            row.get("SchemaName")
            if "SchemaName" in row
            else (row.get("schemaName") if "schemaName" in row else row.get("schema_name"))
        )
        if not isinstance(slug, str) or not slug.strip() or not isinstance(schema_name, str) or not schema_name.strip():
            return None, "snapshot_metadata_malformed"

        tenant_id: Optional[int] = None
        if isinstance(raw_id, int) and not isinstance(raw_id, bool):
            tenant_id = raw_id

        slug_clean = slug.strip()
        schema_clean = schema_name.strip()
        mapping_valid, mapping_error = validate_tenant_schema_mapping(slug_clean, schema_clean)
        tenants.append(
            KnownTenant(
                tenant_id=tenant_id,
                slug=slug_clean,
                schema_name=schema_clean,
                mapping_valid=mapping_valid,
                mapping_error=mapping_error,
            )
        )
    return tenants, None


def validate_tenant_schema_mapping(slug: str, schema_name: str) -> Tuple[bool, Optional[str]]:
    """Verify that `slug` and `schema_name` obey ACYA's canonical mapping."""
    if not isinstance(slug, str) or not SLUG_RE.match(slug):
        return False, "invalid_tenant_schema_mapping"
    if not isinstance(schema_name, str) or not TENANT_SCHEMA_RE.match(schema_name):
        return False, "invalid_tenant_schema_mapping"
    expected = expected_schema_for_slug(slug)
    if schema_name != expected:
        return False, "invalid_tenant_schema_mapping"
    return True, None


def _safe_dump_metadata_file(reader: Any, snapshot_id: str, staging_root: str, rel_metadata_path: str) -> bytes:
    """Read a metadata file from Restic after enforcing the metadata-only allowlist.

    Guarantees that no `.dump` database artifact can ever be extracted by the
    history indexer.
    """
    if rel_metadata_path not in ALLOWED_METADATA_FILENAMES or rel_metadata_path.endswith(".dump"):
        raise BackupError(
            "history_index",
            "forbidden_dump_target",
            f"Refusing to extract non-metadata path {rel_metadata_path!r} during history indexing",
            ExitCode.CONFIG,
        )
    full_path = f"{staging_root.rstrip('/')}/{rel_metadata_path}"
    return reader.dump(snapshot_id, full_path)


class TenantBackupHistoryIndexer:
    """Builds the multi-snapshot tenant backup history catalog from Restic metadata."""

    def __init__(self, restic_client_or_reader: Any, logger: Any = None):
        if (
            hasattr(restic_client_or_reader, "snapshots")
            and hasattr(restic_client_or_reader, "ls")
            and hasattr(restic_client_or_reader, "dump")
        ):
            self._reader = restic_client_or_reader
        else:
            self._reader = ResticHistoryReader(restic_client_or_reader)
        self._log = logger

    def _info(self, msg: str) -> None:
        if self._log is not None and hasattr(self._log, "info"):
            self._log.info(msg)

    def _warn(self, msg: str) -> None:
        if self._log is not None and hasattr(self._log, "warn"):
            self._log.warn(msg)

    def build_catalog(self) -> Dict[str, Any]:
        """Inspect all Restic snapshots read-only and construct the catalog dictionary."""
        raw_snapshots = self._reader.snapshots()
        if not isinstance(raw_snapshots, list):
            raise BackupError(
                "history_index",
                "snapshots_json_malformed",
                "Restic snapshots output is not a JSON list",
                ExitCode.VERIFICATION,
            )

        # Sort snapshots chronologically (oldest first, then newest first for output)
        sorted_snapshots = sorted(
            raw_snapshots,
            key=lambda s: str(s.get("time") or "") if isinstance(s, dict) else "",
        )

        parsed_snapshots: List[Dict[str, Any]] = []
        known_tenants_by_slug: Dict[str, KnownTenant] = {}
        schema_to_slug: Dict[str, str] = {}

        for snap in sorted_snapshots:
            snap_info = self._inspect_single_snapshot(snap)
            parsed_snapshots.append(snap_info)

            for kt in snap_info["registry_tenants"]:
                existing = known_tenants_by_slug.get(kt.slug)
                if (
                    existing is None
                    or (existing.tenant_id is None and kt.tenant_id is not None)
                    or not kt.mapping_valid
                    or kt.tenant_id is not None
                ):
                    known_tenants_by_slug[kt.slug] = kt
                if kt.mapping_valid:
                    schema_to_slug[kt.schema_name] = kt.slug

        # Second pass: register any tenant dump file present in `tenants/tenant_*.dump`
        # that wasn't already covered by `tenant-registry.json`
        for snap_info in parsed_snapshots:
            for schema_name in sorted(snap_info["dump_files_by_schema"].keys()):
                if schema_name in schema_to_slug:
                    continue
                already_known = any(
                    t.schema_name == schema_name for t in known_tenants_by_slug.values()
                )
                if not already_known:
                    inferred_slug = schema_name[len("tenant_"):]
                    valid, err = validate_tenant_schema_mapping(inferred_slug, schema_name)
                    known_tenants_by_slug[inferred_slug] = KnownTenant(
                        tenant_id=None,
                        slug=inferred_slug,
                        schema_name=schema_name,
                        mapping_valid=valid,
                        mapping_error=err,
                    )
                    schema_to_slug[schema_name] = inferred_slug

        ordered_tenants = sorted(
            known_tenants_by_slug.values(),
            key=lambda t: (t.tenant_id is None, t.tenant_id or 0, t.slug),
        )

        snapshots_newest_first = list(reversed(parsed_snapshots))
        catalog_entries: List[Dict[str, Any]] = []
        snapshot_summaries: List[Dict[str, Any]] = []
        tenants_index: Dict[str, Dict[str, Any]] = {}

        for kt in ordered_tenants:
            tenants_index[kt.slug] = {
                "tenantId": kt.tenant_id,
                "tenantSlug": kt.slug,
                "schemaName": kt.schema_name,
                "mappingValid": kt.mapping_valid,
                "eligibleSnapshotCount": 0,
                "latestRestoreEligibleSnapshotId": None,
                "latestRestoreEligibleTimestamp": None,
                "history": [],
            }

        for snap_info in snapshots_newest_first:
            present_count = 0
            eligible_count = 0
            for kt in ordered_tenants:
                entry = self._evaluate_tenant_in_snapshot(snap_info, kt)
                catalog_entries.append(entry)
                tenants_index[kt.slug]["history"].append(entry)
                if entry["tenantPresenceStatus"] == "present":
                    present_count += 1
                if entry["restoreEligibility"]:
                    eligible_count += 1
                    if tenants_index[kt.slug]["latestRestoreEligibleSnapshotId"] is None:
                        tenants_index[kt.slug]["latestRestoreEligibleSnapshotId"] = entry["snapshotId"]
                        tenants_index[kt.slug]["latestRestoreEligibleTimestamp"] = entry["snapshotTimestamp"]
                    tenants_index[kt.slug]["eligibleSnapshotCount"] += 1

            snapshot_summaries.append({
                "snapshotId": snap_info["snapshot_id"],
                "snapshotShortId": snap_info["snapshot_short_id"],
                "snapshotTimestamp": snap_info["snapshot_timestamp"],
                "stagingRoot": snap_info["staging_root"],
                "snapshotVerificationStatus": snap_info["snapshot_verification_status"],
                "snapshotError": snap_info["snapshot_error"],
                "hasTenantRegistry": snap_info["has_tenant_registry"],
                "hasManifestTxt": snap_info["has_manifest_txt"],
                "hasManifestJson": snap_info["has_manifest_json"],
                "presentTenantCount": present_count,
                "eligibleTenantCount": eligible_count,
            })

        return {
            "schema": CATALOG_SCHEMA,
            "runnerVersion": RUNNER_VERSION,
            "generatedAt": iso(utcnow()),
            "snapshotCount": len(snapshot_summaries),
            "knownTenantCount": len(ordered_tenants),
            "totalEntries": len(catalog_entries),
            "snapshots": snapshot_summaries,
            "tenants": [tenants_index[kt.slug] for kt in ordered_tenants],
            "entries": catalog_entries,
        }

    def _inspect_single_snapshot(self, snap: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(snap, dict):
            return {
                "snapshot_id": "",
                "snapshot_short_id": "invalid",
                "snapshot_timestamp": "",
                "staging_root": None,
                "snapshot_verification_status": "invalid",
                "snapshot_error": "snapshot_metadata_malformed",
                "has_tenant_registry": False,
                "has_manifest_txt": False,
                "has_manifest_json": False,
                "registry_tenants": [],
                "registry_by_slug": {},
                "registry_by_schema": {},
                "manifest_txt_map": {},
                "manifest_json_map": None,
                "dump_files_by_schema": {},
            }

        raw_id = snap.get("id")
        raw_short_id = snap.get("short_id")
        snap_time = str(snap.get("time") or "")

        try:
            full_id = validate_snapshot_id(raw_id)
            if not FULL_SNAPSHOT_ID_RE.match(full_id):
                raise BackupError(
                    "history_index",
                    "invalid_snapshot_id",
                    f"Snapshot ID must be 64 hex chars, got {full_id!r}",
                    ExitCode.VERIFICATION,
                )
        except BackupError as exc:
            short_fallback = str(raw_short_id or raw_id or "invalid")
            self._warn(f"Invalid snapshot ID in repository listing ({short_fallback}): {exc.message}")
            return {
                "snapshot_id": str(raw_id or ""),
                "snapshot_short_id": short_fallback,
                "snapshot_timestamp": snap_time,
                "staging_root": None,
                "snapshot_verification_status": "invalid",
                "snapshot_error": "invalid_snapshot_id",
                "has_tenant_registry": False,
                "has_manifest_txt": False,
                "has_manifest_json": False,
                "registry_tenants": [],
                "registry_by_slug": {},
                "registry_by_schema": {},
                "manifest_txt_map": {},
                "manifest_json_map": None,
                "dump_files_by_schema": {},
            }

        short_id = (
            raw_short_id
            if isinstance(raw_short_id, str) and SNAPSHOT_ID_RE.match(raw_short_id)
            else full_id[:8]
        )

        try:
            ls_entries = self._reader.ls(full_id)
        except Exception as exc:
            self._warn(f"Failed to list snapshot {short_id}: {exc}")
            return {
                "snapshot_id": full_id,
                "snapshot_short_id": short_id,
                "snapshot_timestamp": snap_time,
                "staging_root": None,
                "snapshot_verification_status": "invalid",
                "snapshot_error": "snapshot_ls_failed",
                "has_tenant_registry": False,
                "has_manifest_txt": False,
                "has_manifest_json": False,
                "registry_tenants": [],
                "registry_by_slug": {},
                "registry_by_schema": {},
                "manifest_txt_map": {},
                "manifest_json_map": None,
                "dump_files_by_schema": {},
            }

        staging_root, root_err = discover_staging_root(snap, ls_entries)
        if staging_root is None:
            self._warn(f"Snapshot {short_id} staging root invalid: {root_err}")
            return {
                "snapshot_id": full_id,
                "snapshot_short_id": short_id,
                "snapshot_timestamp": snap_time,
                "staging_root": None,
                "snapshot_verification_status": "invalid",
                "snapshot_error": root_err,
                "has_tenant_registry": False,
                "has_manifest_txt": False,
                "has_manifest_json": False,
                "registry_tenants": [],
                "registry_by_slug": {},
                "registry_by_schema": {},
                "manifest_txt_map": {},
                "manifest_json_map": None,
                "dump_files_by_schema": {},
            }

        prefix = staging_root.rstrip("/") + "/"
        files_in_snapshot: Dict[str, Dict[str, Any]] = {}
        dump_files_by_schema: Dict[str, Dict[str, Any]] = {}

        for node in ls_entries:
            if not isinstance(node, dict) or node.get("type") != "file":
                continue
            path = node.get("path")
            if not isinstance(path, str) or not path.startswith(prefix):
                continue
            rel_path = path[len(prefix):]
            size = int(node.get("size") or 0)
            files_in_snapshot[rel_path] = {
                "relative_path": rel_path,
                "full_path": path,
                "size": size,
            }
            m = TENANT_DUMP_REL_RE.match(rel_path)
            if m:
                schema_name = m.group(1)
                dump_files_by_schema[schema_name] = {
                    "relative_path": rel_path,
                    "full_path": path,
                    "size": size,
                }

        has_manifest_txt = "metadata/manifest.txt" in files_in_snapshot
        has_manifest_json = "metadata/manifest.json" in files_in_snapshot
        has_tenant_registry = "metadata/tenant-registry.json" in files_in_snapshot

        snapshot_error: Optional[str] = None
        manifest_txt_map: Dict[str, str] = {}
        manifest_json_map: Optional[Dict[str, Dict[str, Any]]] = None
        registry_tenants: List[KnownTenant] = []

        if not has_manifest_txt:
            snapshot_error = "snapshot_metadata_malformed"
        else:
            try:
                raw_manifest_txt = _safe_dump_metadata_file(
                    self._reader, full_id, staging_root, "metadata/manifest.txt"
                ).decode("utf-8")
                parsed_txt, txt_err = parse_manifest_txt(raw_manifest_txt, staging_root)
                if txt_err or parsed_txt is None:
                    snapshot_error = txt_err or "snapshot_metadata_malformed"
                else:
                    manifest_txt_map = parsed_txt
            except Exception:
                snapshot_error = "snapshot_metadata_malformed"

        if snapshot_error is None and has_manifest_json:
            try:
                raw_manifest_json = _safe_dump_metadata_file(
                    self._reader, full_id, staging_root, "metadata/manifest.json"
                ).decode("utf-8")
                parsed_json, json_err = parse_manifest_json(raw_manifest_json)
                if json_err or parsed_json is None:
                    snapshot_error = json_err or "snapshot_metadata_malformed"
                else:
                    manifest_json_map = parsed_json
            except Exception:
                snapshot_error = "snapshot_metadata_malformed"

        if snapshot_error is None and has_tenant_registry:
            try:
                raw_registry = _safe_dump_metadata_file(
                    self._reader, full_id, staging_root, "metadata/tenant-registry.json"
                ).decode("utf-8")
                parsed_reg, reg_err = parse_tenant_registry_json(raw_registry)
                if reg_err or parsed_reg is None:
                    snapshot_error = reg_err or "snapshot_metadata_malformed"
                else:
                    registry_tenants = parsed_reg
            except Exception:
                snapshot_error = "snapshot_metadata_malformed"

        registry_by_slug: Dict[str, KnownTenant] = {t.slug: t for t in registry_tenants}
        registry_by_schema: Dict[str, KnownTenant] = {
            t.schema_name: t for t in registry_tenants if t.mapping_valid
        }

        if snapshot_error is not None:
            verification_status = "invalid"
        elif has_manifest_txt and manifest_txt_map:
            verification_status = "verified"
        else:
            verification_status = "degraded"

        return {
            "snapshot_id": full_id,
            "snapshot_short_id": short_id,
            "snapshot_timestamp": snap_time,
            "staging_root": staging_root,
            "snapshot_verification_status": verification_status,
            "snapshot_error": snapshot_error,
            "has_tenant_registry": has_tenant_registry,
            "has_manifest_txt": has_manifest_txt,
            "has_manifest_json": has_manifest_json,
            "registry_tenants": registry_tenants,
            "registry_by_slug": registry_by_slug,
            "registry_by_schema": registry_by_schema,
            "manifest_txt_map": manifest_txt_map,
            "manifest_json_map": manifest_json_map,
            "dump_files_by_schema": dump_files_by_schema,
        }

    def _evaluate_tenant_in_snapshot(self, snap_info: Dict[str, Any], known_tenant: KnownTenant) -> Dict[str, Any]:
        full_id = snap_info["snapshot_id"]
        short_id = snap_info["snapshot_short_id"]
        snap_time = snap_info["snapshot_timestamp"]
        snap_status = snap_info["snapshot_verification_status"]
        snap_error = snap_info["snapshot_error"]

        reg_tenant = snap_info["registry_by_slug"].get(known_tenant.slug)
        effective_tenant = reg_tenant if reg_tenant is not None else known_tenant
        tenant_id = effective_tenant.tenant_id if effective_tenant.tenant_id is not None else known_tenant.tenant_id
        slug = effective_tenant.slug
        schema_name = effective_tenant.schema_name
        expected_rel_dump = f"tenants/{schema_name}.dump"

        # 1. If snapshot itself is structurally invalid (missing/ambiguous staging root or malformed metadata)
        if snap_error is not None:
            return {
                "snapshotId": full_id,
                "snapshotShortId": short_id,
                "snapshotTimestamp": snap_time,
                "tenantId": tenant_id,
                "tenantSlug": slug,
                "schemaName": schema_name,
                "dumpFilename": None,
                "dumpSize": None,
                "manifestSha256": None,
                "checksumVerificationStatus": "missing",
                "snapshotVerificationStatus": snap_status,
                "tenantPresenceStatus": "unavailable",
                "restoreEligibility": False,
                "restoreEligible": False,
                "ineligibilityReason": snap_error,
            }

        # 2. Validate tenant -> schema mapping first
        if not effective_tenant.mapping_valid or not known_tenant.mapping_valid:
            return {
                "snapshotId": full_id,
                "snapshotShortId": short_id,
                "snapshotTimestamp": snap_time,
                "tenantId": tenant_id,
                "tenantSlug": slug,
                "schemaName": schema_name,
                "dumpFilename": None,
                "dumpSize": None,
                "manifestSha256": None,
                "checksumVerificationStatus": "missing",
                "snapshotVerificationStatus": snap_status,
                "tenantPresenceStatus": "invalid_mapping",
                "restoreEligibility": False,
                "restoreEligible": False,
                "ineligibilityReason": "invalid_tenant_schema_mapping",
            }

        dump_info = snap_info["dump_files_by_schema"].get(schema_name)
        manifest_sha256 = snap_info["manifest_txt_map"].get(expected_rel_dump)
        in_snapshot_registry = reg_tenant is not None

        # 3. Historical snapshot taken before tenant existed (neither in snapshot registry, nor in manifest, nor in dump tree)
        if dump_info is None and not in_snapshot_registry and manifest_sha256 is None:
            return {
                "snapshotId": full_id,
                "snapshotShortId": short_id,
                "snapshotTimestamp": snap_time,
                "tenantId": tenant_id,
                "tenantSlug": slug,
                "schemaName": schema_name,
                "dumpFilename": None,
                "dumpSize": None,
                "manifestSha256": None,
                "checksumVerificationStatus": "missing",
                "snapshotVerificationStatus": snap_status,
                "tenantPresenceStatus": "unavailable",
                "restoreEligibility": False,
                "restoreEligible": False,
                "ineligibilityReason": "tenant_not_present_in_snapshot",
            }

        # 4. Tenant was expected in this snapshot (in registry or manifest), but dump file is missing
        if dump_info is None:
            return {
                "snapshotId": full_id,
                "snapshotShortId": short_id,
                "snapshotTimestamp": snap_time,
                "tenantId": tenant_id,
                "tenantSlug": slug,
                "schemaName": schema_name,
                "dumpFilename": expected_rel_dump,
                "dumpSize": None,
                "manifestSha256": manifest_sha256,
                "checksumVerificationStatus": "manifest_recorded_unverified" if manifest_sha256 else "missing",
                "snapshotVerificationStatus": "degraded",
                "tenantPresenceStatus": "missing_dump",
                "restoreEligibility": False,
                "restoreEligible": False,
                "ineligibilityReason": "dump_file_missing",
            }

        dump_size = int(dump_info["size"])
        dump_rel_path = dump_info["relative_path"]

        # 5. Dump file is empty (0 bytes)
        if dump_size <= 0:
            return {
                "snapshotId": full_id,
                "snapshotShortId": short_id,
                "snapshotTimestamp": snap_time,
                "tenantId": tenant_id,
                "tenantSlug": slug,
                "schemaName": schema_name,
                "dumpFilename": dump_rel_path,
                "dumpSize": dump_size,
                "manifestSha256": manifest_sha256,
                "checksumVerificationStatus": "manifest_recorded_unverified" if manifest_sha256 else "missing",
                "snapshotVerificationStatus": "degraded",
                "tenantPresenceStatus": "present",
                "restoreEligibility": False,
                "restoreEligible": False,
                "ineligibilityReason": "dump_file_empty",
            }

        # 6. Dump file is present, check manifest.txt SHA-256 entry
        if manifest_sha256 is None:
            return {
                "snapshotId": full_id,
                "snapshotShortId": short_id,
                "snapshotTimestamp": snap_time,
                "tenantId": tenant_id,
                "tenantSlug": slug,
                "schemaName": schema_name,
                "dumpFilename": dump_rel_path,
                "dumpSize": dump_size,
                "manifestSha256": None,
                "checksumVerificationStatus": "missing",
                "snapshotVerificationStatus": "degraded",
                "tenantPresenceStatus": "present",
                "restoreEligibility": False,
                "restoreEligible": False,
                "ineligibilityReason": "manifest_entry_missing",
            }

        # 7. If manifest.json is also present in snapshot, cross-check SHA-256 and sizeBytes
        manifest_json_map = snap_info["manifest_json_map"]
        if manifest_json_map is not None:
            json_entry = manifest_json_map.get(dump_rel_path)
            if (
                json_entry is None
                or json_entry.get("sha256") != manifest_sha256
                or int(json_entry.get("sizeBytes", -1)) != dump_size
            ):
                return {
                    "snapshotId": full_id,
                    "snapshotShortId": short_id,
                    "snapshotTimestamp": snap_time,
                    "tenantId": tenant_id,
                    "tenantSlug": slug,
                    "schemaName": schema_name,
                    "dumpFilename": dump_rel_path,
                    "dumpSize": dump_size,
                    "manifestSha256": manifest_sha256,
                    "checksumVerificationStatus": "manifest_mismatch",
                    "snapshotVerificationStatus": "degraded",
                    "tenantPresenceStatus": "present",
                    "restoreEligibility": False,
                    "restoreEligible": False,
                    "ineligibilityReason": "manifest_json_mismatch",
                }

        # 8. If snapshot has a populated tenant-registry.json, require the tenant to be present in it
        if snap_info["has_tenant_registry"] and len(snap_info["registry_tenants"]) > 0 and not in_snapshot_registry:
            return {
                "snapshotId": full_id,
                "snapshotShortId": short_id,
                "snapshotTimestamp": snap_time,
                "tenantId": tenant_id,
                "tenantSlug": slug,
                "schemaName": schema_name,
                "dumpFilename": dump_rel_path,
                "dumpSize": dump_size,
                "manifestSha256": manifest_sha256,
                "checksumVerificationStatus": "manifest_recorded_unverified",
                "snapshotVerificationStatus": "degraded",
                "tenantPresenceStatus": "present",
                "restoreEligibility": False,
                "restoreEligible": False,
                "ineligibilityReason": "tenant_missing_from_snapshot_registry",
            }

        # All metadata checks passed. Note: checksumVerificationStatus is explicitly
        # 'manifest_recorded_unverified' because no database dump was extracted.
        return {
            "snapshotId": full_id,
            "snapshotShortId": short_id,
            "snapshotTimestamp": snap_time,
            "tenantId": tenant_id,
            "tenantSlug": slug,
            "schemaName": schema_name,
            "dumpFilename": dump_rel_path,
            "dumpSize": dump_size,
            "manifestSha256": manifest_sha256,
            "checksumVerificationStatus": "manifest_recorded_unverified",
            "snapshotVerificationStatus": snap_status,
            "tenantPresenceStatus": "present",
            "restoreEligibility": True,
            "restoreEligible": True,
            "ineligibilityReason": None,
        }


def write_tenant_backup_history(
    catalog: Dict[str, Any],
    output_path: Union[str, pathlib.Path] = DEFAULT_HISTORY_PATH,
) -> None:
    """Atomically write `tenant-backup-history.json` with `0644` permissions."""
    target = str(output_path)
    parent = os.path.dirname(target)
    if parent:
        os.makedirs(parent, exist_ok=True)
    atomic_write_json(target, catalog, mode=0o644)

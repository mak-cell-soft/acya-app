"""ACYA Phase 11C.1.8 Individual Tenant Restore Engine.

Restores exactly one tenant schema from an existing verified global Restic
snapshot while preserving full isolation of all other tenants.

State Machine:
  Normal progression:
    Pending -> Extracting -> Verifying -> Staging -> Prepared
            -> BackingUpCurrent -> CuttingOver -> Validating -> Completed
  Failure & rollback states:
    Failed, RollingBack, RolledBack, RollbackFailed

Critical Architectural Invariants:
  - Never uses SQL text substitution to remap schema names.
  - Never trusts a tenant schema name or filesystem path supplied by a caller.
  - Resolves tenant/schema mapping exclusively from the trusted history catalog
    (`/opt/acya-backup/state/tenant-backup-history.json`) and live tenant
    registry (`public.bo_tbl_enterprise`).
  - Rejects unavailable, degraded, or ineligible snapshots before extraction.
  - Extracts only the selected tenant dump and snapshot metadata via read-only
    Restic (`--no-lock`).
  - Verifies extracted dump SHA-256 against the snapshot manifest and catalog,
    and inspects `pg_restore -l` TOC to reject global objects/roles or foreign
    schemas.
  - Restores into an isolated temporary PostgreSQL database first (`Staging` ->
    `Prepared`) and validates schema objects, tables, constraints, and data.
  - Creates and checksum-verifies a pre-restore backup of the live tenant schema
    before any production cutover (`BackingUpCurrent`).
  - Keeps the target tenant inactive (`IsActive = false`) during `CuttingOver`
    and `Validating`, and reactivates only after all checks pass.
  - Verifies that all 15 unaffected tenants remain completely unchanged.
  - Never silently discards recovery artifacts when a restoration fails.
  - Records every state transition and operation in an immutable append-only
    audit log (`restore-audit.jsonl`).
"""

from __future__ import annotations

import fcntl
import hashlib
import json
import os
import pathlib
import re
import shutil
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Set, Tuple

from . import RUNNER_VERSION
from .errors import BackupError, ExitCode
from .history import (
    ALLOWED_METADATA_FILENAMES,
    FULL_SNAPSHOT_ID_RE,
    SHA256_RE,
    SLUG_RE,
    SNAPSHOT_ID_RE,
    STAGE_ROOT_RE,
    parse_manifest_json,
    parse_manifest_txt,
    parse_tenant_registry_json,
    validate_snapshot_id,
    validate_tenant_schema_mapping,
)
from .manifest import sha256_file
from .postgres import TENANT_SCHEMA_RE, expected_schema_for_slug
from .proc import iso, redact, run, utcnow
from .telemetry import atomic_write_json

RESTORE_AUDIT_SCHEMA = "acya.backup.tenant-restore-audit/v1"
RESTORE_STATE_SCHEMA = "acya.backup.tenant-restore-state/v1"

OPERATION_ID_RE = re.compile(r"^restore-\d{8}T\d{6}Z-[0-9a-f]{8}$")
STAGING_DB_NAME_RE = re.compile(r"^acya_restore_stage_[a-z0-9_]{6,40}$")
ROLLBACK_SCHEMA_RE = re.compile(r"^tenant_[a-z0-9_]{1,45}__rb_[a-z0-9]{6,12}$")

FORBIDDEN_TOC_TYPES = frozenset({
    "ROLE",
    "DATABASE",
    "TABLESPACE",
    "EXTENSION",
    "EVENT TRIGGER",
    " PUBLICATION",
    "SUBSCRIPTION",
    "CAST",
    "FOREIGN DATA WRAPPER",
    "SERVER",
})

TOC_LINE_RE = re.compile(r"^\s*\d+;\s+\d+\s+\d+\s+([A-Z][A-Z ]*?)\s+(\S+)\s+(\S+)\s+(\S+)\s*$")


class RestoreState(str, Enum):
    PENDING = "Pending"
    EXTRACTING = "Extracting"
    VERIFYING = "Verifying"
    STAGING = "Staging"
    PREPARED = "Prepared"
    BACKING_UP_CURRENT = "BackingUpCurrent"
    CUTTING_OVER = "CuttingOver"
    VALIDATING = "Validating"
    COMPLETED = "Completed"
    FAILED = "Failed"
    ROLLING_BACK = "RollingBack"
    ROLLED_BACK = "RolledBack"
    ROLLBACK_FAILED = "RollbackFailed"


VALID_STATE_TRANSITIONS: Dict[RestoreState, Set[RestoreState]] = {
    RestoreState.PENDING: {
        RestoreState.EXTRACTING,
        RestoreState.FAILED,
    },
    RestoreState.EXTRACTING: {
        RestoreState.VERIFYING,
        RestoreState.FAILED,
    },
    RestoreState.VERIFYING: {
        RestoreState.STAGING,
        RestoreState.FAILED,
    },
    RestoreState.STAGING: {
        RestoreState.PREPARED,
        RestoreState.FAILED,
    },
    RestoreState.PREPARED: {
        RestoreState.BACKING_UP_CURRENT,
        RestoreState.FAILED,
    },
    RestoreState.BACKING_UP_CURRENT: {
        RestoreState.CUTTING_OVER,
        RestoreState.FAILED,
    },
    RestoreState.CUTTING_OVER: {
        RestoreState.VALIDATING,
        RestoreState.ROLLING_BACK,
        RestoreState.FAILED,
    },
    RestoreState.VALIDATING: {
        RestoreState.COMPLETED,
        RestoreState.ROLLING_BACK,
    },
    RestoreState.ROLLING_BACK: {
        RestoreState.ROLLED_BACK,
        RestoreState.ROLLBACK_FAILED,
    },
    RestoreState.COMPLETED: set(),
    RestoreState.FAILED: set(),
    RestoreState.ROLLED_BACK: set(),
    RestoreState.ROLLBACK_FAILED: set(),
}


class RestoreError(BackupError):
    """Typed error raised by a specific restore stage."""

    def __init__(self, stage: str, category: str, message: str, exit_code: int = ExitCode.VERIFICATION):
        super().__init__(stage, category, redact(message), exit_code)


@dataclass(frozen=True)
class ValidatedRestoreTarget:
    tenant_id: int
    tenant_slug: str
    schema_name: str
    snapshot_id: str
    snapshot_short_id: str
    snapshot_timestamp: str
    staging_root: str
    dump_relative_path: str
    expected_dump_size: int
    expected_sha256: str
    original_is_active: bool
    original_status: str
    original_plan: str


@dataclass(frozen=True)
class TenantSchemaFingerprint:
    schema_name: str
    schema_oid: int
    owner: str
    table_count: int
    sequence_count: int
    constraint_count: int
    table_names: Tuple[str, ...]
    total_live_rows: int


@dataclass
class RestoreOperationResult:
    operation_id: str
    tenant_id: int
    snapshot_id: str
    final_state: RestoreState
    state_history: List[str] = field(default_factory=list)
    tenant_slug: Optional[str] = None
    schema_name: Optional[str] = None
    extracted_dump_sha256: Optional[str] = None
    pre_restore_backup_path: Optional[str] = None
    pre_restore_backup_sha256: Optional[str] = None
    staging_database: Optional[str] = None
    staging_table_count: Optional[int] = None
    restored_table_count: Optional[int] = None
    unaffected_tenant_count: Optional[int] = None
    recovery_artifacts_retained: bool = False
    work_dir: Optional[str] = None
    error_category: Optional[str] = None
    error_message: Optional[str] = None
    rollback_performed: bool = False
    rollback_succeeded: Optional[bool] = None
    started_at: Optional[str] = None
    finished_at: Optional[str] = None


class RestoreAuditLogger:
    """Immutable append-only audit trail with SHA-256 hash chaining."""

    def __init__(self, audit_log_path: str, state_file_path: Optional[str] = None, logger: Any = None):
        self.audit_log_path = audit_log_path
        self.state_file_path = state_file_path
        self.log = logger
        self._prev_hash = self._read_last_entry_hash()

    def _read_last_entry_hash(self) -> str:
        if not os.path.exists(self.audit_log_path):
            return "0" * 64
        last_line = ""
        try:
            with open(self.audit_log_path, "r", encoding="utf-8") as fh:
                for line in fh:
                    if line.strip():
                        last_line = line.strip()
            if last_line:
                doc = json.loads(last_line)
                h = doc.get("entryHash")
                if isinstance(h, str) and SHA256_RE.match(h):
                    return h
        except Exception:
            pass
        return "0" * 64

    def record_event(
        self,
        *,
        operation_id: str,
        state: RestoreState,
        event: str,
        tenant_id: int,
        snapshot_id: str,
        actor: str,
        tenant_slug: Optional[str] = None,
        schema_name: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        error: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        parent = os.path.dirname(self.audit_log_path)
        if parent:
            os.makedirs(parent, mode=0o750, exist_ok=True)

        sanitized_details = json.loads(redact(json.dumps(details or {}, sort_keys=True)))
        sanitized_error = json.loads(redact(json.dumps(error, sort_keys=True))) if error else None

        payload = {
            "schema": RESTORE_AUDIT_SCHEMA,
            "timestamp": iso(utcnow()),
            "operationId": operation_id,
            "state": state.value,
            "event": event,
            "actor": redact(str(actor)),
            "tenantId": tenant_id,
            "tenantSlug": tenant_slug,
            "schemaName": schema_name,
            "snapshotId": redact(str(snapshot_id)),
            "details": sanitized_details,
            "error": sanitized_error,
            "previousEntryHash": self._prev_hash,
        }
        canonical = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
        entry_hash = hashlib.sha256(canonical).hexdigest()
        payload["entryHash"] = entry_hash
        self._prev_hash = entry_hash

        fd = os.open(self.audit_log_path, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o640)
        with os.fdopen(fd, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(payload, separators=(",", ":")) + "\n")
            fh.flush()
            os.fsync(fh.fileno())

        if self.log is not None and hasattr(self.log, "info"):
            self.log.info(
                f"restore_audit op={operation_id} state={state.value} event={event} "
                f"tenant={tenant_id} snapshot={str(snapshot_id)[:12]}"
            )
        return payload

    def write_state_summary(self, summary: Dict[str, Any]) -> None:
        if not self.state_file_path:
            return
        parent = os.path.dirname(self.state_file_path)
        if parent:
            os.makedirs(parent, mode=0o750, exist_ok=True)
        atomic_write_json(self.state_file_path, summary, mode=0o644)
        op_id = summary.get("operationId")
        if isinstance(op_id, str) and OPERATION_ID_RE.match(op_id) and parent:
            jobs_dir = os.path.join(parent, "restore-jobs")
            os.makedirs(jobs_dir, mode=0o750, exist_ok=True)
            atomic_write_json(os.path.join(jobs_dir, f"{op_id}.json"), summary, mode=0o644)


class RestoreRequestValidator:
    """Validates tenant ID and snapshot ID exclusively against trusted catalog and live registry."""

    def __init__(self, history_catalog_path: str):
        self.history_catalog_path = history_catalog_path

    def validate_and_resolve(
        self,
        tenant_id: Any,
        snapshot_id: Any,
        live_registry_rows: List[Dict[str, Any]],
    ) -> ValidatedRestoreTarget:
        # 1. Validate tenant_id type and range
        if isinstance(tenant_id, bool) or not isinstance(tenant_id, int) or tenant_id <= 0:
            raise RestoreError(
                RestoreState.PENDING.value,
                "invalid_tenant_id",
                f"Tenant ID must be a positive integer, got {tenant_id!r}",
                ExitCode.CONFIG,
            )

        # 2. Validate snapshot_id format
        if not isinstance(snapshot_id, str) or not SNAPSHOT_ID_RE.match(snapshot_id):
            raise RestoreError(
                RestoreState.PENDING.value,
                "invalid_snapshot_id",
                f"Snapshot ID must be 8..64 lowercase hex characters, got {snapshot_id!r}",
                ExitCode.CONFIG,
            )

        # 3. Load trusted history catalog
        if not os.path.isfile(self.history_catalog_path):
            raise RestoreError(
                RestoreState.PENDING.value,
                "history_catalog_missing",
                "Trusted tenant backup history catalog file does not exist",
                ExitCode.CONFIG,
            )
        try:
            with open(self.history_catalog_path, "r", encoding="utf-8") as fh:
                catalog = json.load(fh)
        except Exception:
            raise RestoreError(
                RestoreState.PENDING.value,
                "history_catalog_malformed",
                "Trusted tenant backup history catalog is not valid JSON",
                ExitCode.CONFIG,
            )

        if not isinstance(catalog, dict) or not isinstance(catalog.get("entries"), list):
            raise RestoreError(
                RestoreState.PENDING.value,
                "history_catalog_malformed",
                "Trusted tenant backup history catalog is missing 'entries' array",
                ExitCode.CONFIG,
            )

        # 4. Resolve tenant in live registry (`public.bo_tbl_enterprise`)
        live_matches = [
            r for r in live_registry_rows
            if isinstance(r, dict) and r.get("Id") == tenant_id and not isinstance(r.get("Id"), bool)
        ]
        if len(live_matches) != 1:
            raise RestoreError(
                RestoreState.PENDING.value,
                "tenant_not_found_in_registry",
                f"Tenant ID {tenant_id} does not exist in live enterprise registry",
                ExitCode.TENANT_COVERAGE,
            )
        live_tenant = live_matches[0]
        live_slug = str(live_tenant.get("Slug") or "").strip()
        live_schema = str(live_tenant.get("SchemaName") or "").strip()
        mapping_ok, _ = validate_tenant_schema_mapping(live_slug, live_schema)
        if not mapping_ok:
            raise RestoreError(
                RestoreState.PENDING.value,
                "invalid_tenant_schema_mapping",
                f"Live registry mapping for tenant {tenant_id} ({live_slug} -> {live_schema}) is invalid",
                ExitCode.TENANT_COVERAGE,
            )

        # 5. Match snapshot in catalog `snapshots` list
        snapshots_list = catalog.get("snapshots") or []
        matching_snaps = [
            s for s in snapshots_list
            if isinstance(s, dict)
            and (
                s.get("snapshotId") == snapshot_id
                or s.get("snapshotShortId") == snapshot_id
                or (isinstance(s.get("snapshotId"), str) and s["snapshotId"].startswith(snapshot_id))
            )
        ]
        if len(matching_snaps) == 0:
            raise RestoreError(
                RestoreState.PENDING.value,
                "snapshot_not_found",
                f"Snapshot {snapshot_id} is not indexed in trusted backup history catalog",
                ExitCode.VERIFICATION,
            )
        if len(matching_snaps) > 1:
            raise RestoreError(
                RestoreState.PENDING.value,
                "snapshot_id_ambiguous",
                f"Snapshot prefix {snapshot_id} matched multiple snapshots in catalog",
                ExitCode.VERIFICATION,
            )
        snap_summary = matching_snaps[0]
        full_snapshot_id = str(snap_summary.get("snapshotId") or "")
        short_snapshot_id = str(snap_summary.get("snapshotShortId") or full_snapshot_id[:8])
        staging_root = str(snap_summary.get("stagingRoot") or "")

        if not FULL_SNAPSHOT_ID_RE.match(full_snapshot_id):
            raise RestoreError(
                RestoreState.PENDING.value,
                "invalid_snapshot_id",
                "Catalog snapshotId is not a valid 64-character hex digest",
                ExitCode.VERIFICATION,
            )

        if snap_summary.get("snapshotVerificationStatus") != "verified":
            raise RestoreError(
                RestoreState.PENDING.value,
                "snapshot_not_verified",
                f"Snapshot {short_snapshot_id} has verification status "
                f"{snap_summary.get('snapshotVerificationStatus')!r} and cannot be used for restoration",
                ExitCode.VERIFICATION,
            )

        if not STAGE_ROOT_RE.match(staging_root):
            raise RestoreError(
                RestoreState.PENDING.value,
                "staging_root_invalid",
                f"Snapshot {short_snapshot_id} has invalid staging root in catalog",
                ExitCode.VERIFICATION,
            )

        # 6. Match `(full_snapshot_id, tenant_id)` in catalog `entries`
        matching_entries = [
            e for e in catalog["entries"]
            if isinstance(e, dict)
            and e.get("snapshotId") == full_snapshot_id
            and e.get("tenantId") == tenant_id
        ]
        if len(matching_entries) != 1:
            raise RestoreError(
                RestoreState.PENDING.value,
                "tenant_entry_not_found_in_catalog",
                f"Tenant {tenant_id} has no catalog entry for snapshot {short_snapshot_id}",
                ExitCode.VERIFICATION,
            )
        entry = matching_entries[0]

        # 7. Reject unavailable, degraded, or ineligible entries
        if entry.get("snapshotVerificationStatus") != "verified":
            raise RestoreError(
                RestoreState.PENDING.value,
                "snapshot_degraded_or_invalid",
                f"Snapshot {short_snapshot_id} is {entry.get('snapshotVerificationStatus')!r}",
                ExitCode.VERIFICATION,
            )
        if entry.get("tenantPresenceStatus") != "present":
            reason = entry.get("ineligibilityReason") or entry.get("tenantPresenceStatus") or "tenant_unavailable"
            raise RestoreError(
                RestoreState.PENDING.value,
                "tenant_not_present_in_snapshot",
                f"Tenant {tenant_id} is not present in snapshot {short_snapshot_id} ({reason})",
                ExitCode.VERIFICATION,
            )
        if entry.get("restoreEligibility") is not True:
            reason = entry.get("ineligibilityReason") or "snapshot_ineligible"
            raise RestoreError(
                RestoreState.PENDING.value,
                "snapshot_restore_ineligible",
                f"Snapshot {short_snapshot_id} is ineligible for restoring tenant {tenant_id}: {reason}",
                ExitCode.VERIFICATION,
            )

        # 8. Cross-verify catalog slug/schema against live registry slug/schema
        cat_slug = str(entry.get("tenantSlug") or "").strip()
        cat_schema = str(entry.get("schemaName") or "").strip()
        if cat_slug != live_slug or cat_schema != live_schema:
            raise RestoreError(
                RestoreState.PENDING.value,
                "catalog_registry_mapping_mismatch",
                f"Catalog mapping ({cat_slug}/{cat_schema}) does not match live registry ({live_slug}/{live_schema})",
                ExitCode.TENANT_COVERAGE,
            )

        expected_rel_dump = f"tenants/{live_schema}.dump"
        dump_filename = str(entry.get("dumpFilename") or "")
        dump_size = entry.get("dumpSize")
        manifest_sha256 = str(entry.get("manifestSha256") or "")

        if dump_filename != expected_rel_dump:
            raise RestoreError(
                RestoreState.PENDING.value,
                "unexpected_dump_filename",
                f"Catalog dumpFilename {dump_filename!r} does not match expected {expected_rel_dump!r}",
                ExitCode.VERIFICATION,
            )
        if not isinstance(dump_size, int) or isinstance(dump_size, bool) or dump_size <= 0:
            raise RestoreError(
                RestoreState.PENDING.value,
                "invalid_dump_size",
                f"Catalog dumpSize for tenant {tenant_id} must be a positive integer",
                ExitCode.VERIFICATION,
            )
        if not SHA256_RE.match(manifest_sha256):
            raise RestoreError(
                RestoreState.PENDING.value,
                "missing_manifest_sha256",
                f"Catalog entry for tenant {tenant_id} has no valid 64-hex manifestSha256",
                ExitCode.VERIFICATION,
            )

        return ValidatedRestoreTarget(
            tenant_id=tenant_id,
            tenant_slug=live_slug,
            schema_name=live_schema,
            snapshot_id=full_snapshot_id,
            snapshot_short_id=short_snapshot_id,
            snapshot_timestamp=str(entry.get("snapshotTimestamp") or snap_summary.get("snapshotTimestamp") or ""),
            staging_root=staging_root,
            dump_relative_path=expected_rel_dump,
            expected_dump_size=dump_size,
            expected_sha256=manifest_sha256,
            original_is_active=bool(live_tenant.get("IsActive", False)),
            original_status=str(live_tenant.get("Status") or "Active"),
            original_plan=str(live_tenant.get("Plan") or "Trial"),
        )


def validate_archive_toc_single_schema(toc_text: str, expected_schema: str) -> Dict[str, Any]:
    """Inspect `pg_restore -l` TOC output to verify schema isolation and reject global objects.

    Enforces:
      - At least one object belonging to `expected_schema`.
      - Zero forbidden global object types (`ROLE`, `DATABASE`, `TABLESPACE`, `EXTENSION`, etc.).
      - Zero objects in any schema other than `expected_schema`.
    """
    if not toc_text or not toc_text.strip():
        raise RestoreError(
            RestoreState.VERIFYING.value,
            "archive_toc_empty",
            "Archive TOC (`pg_restore -l`) is empty",
            ExitCode.VERIFICATION,
        )

    observed_schemas: Set[str] = set()
    table_names: List[str] = []
    sequence_names: List[str] = []
    constraint_names: List[str] = []
    total_entries = 0

    for raw_line in toc_text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith(";"):
            continue
        m = TOC_LINE_RE.match(line)
        if not m:
            continue
        total_entries += 1
        obj_type, obj_schema, obj_name, _owner = (
            m.group(1).strip(),
            m.group(2).strip(),
            m.group(3).strip(),
            m.group(4).strip(),
        )

        if obj_type in FORBIDDEN_TOC_TYPES:
            raise RestoreError(
                RestoreState.VERIFYING.value,
                "forbidden_global_object_in_dump",
                f"Tenant dump archive contains forbidden global object type {obj_type!r} ({obj_name})",
                ExitCode.VERIFICATION,
            )

        if obj_type == "SCHEMA":
            if obj_name != expected_schema:
                raise RestoreError(
                    RestoreState.VERIFYING.value,
                    "foreign_schema_in_dump",
                    f"Tenant dump archive attempts to create foreign schema {obj_name!r} (expected {expected_schema!r})",
                    ExitCode.VERIFICATION,
                )
            observed_schemas.add(obj_name)
            continue

        if obj_schema != "-" and obj_schema != expected_schema:
            raise RestoreError(
                RestoreState.VERIFYING.value,
                "foreign_schema_object_in_dump",
                f"Tenant dump archive contains {obj_type} in schema {obj_schema!r} (expected {expected_schema!r})",
                ExitCode.VERIFICATION,
            )

        if obj_schema == expected_schema:
            observed_schemas.add(obj_schema)
            if obj_type == "TABLE":
                table_names.append(obj_name)
            elif obj_type == "SEQUENCE":
                sequence_names.append(obj_name)
            elif "CONSTRAINT" in obj_type:
                constraint_names.append(obj_name)

    if expected_schema not in observed_schemas or not table_names:
        raise RestoreError(
            RestoreState.VERIFYING.value,
            "expected_schema_missing_in_dump",
            f"Archive TOC does not contain tables for expected schema {expected_schema!r}",
            ExitCode.VERIFICATION,
        )

    return {
        "totalTocEntries": total_entries,
        "schemas": sorted(observed_schemas),
        "tableCount": len(table_names),
        "sequenceCount": len(sequence_names),
        "constraintCount": len(constraint_names),
        "tables": sorted(table_names),
    }


class SnapshotArtifactExtractor:
    """Extracts only snapshot metadata and the single validated tenant dump via read-only Restic."""

    def __init__(self, restic_extractor: Any):
        self._restic = restic_extractor

    def extract_tenant_artifacts(
        self,
        target: ValidatedRestoreTarget,
        work_dir: str,
    ) -> Dict[str, Any]:
        os.makedirs(work_dir, mode=0o700, exist_ok=True)
        os.chmod(work_dir, 0o700)

        staging_root = target.staging_root.rstrip("/")
        expected_dump_full_path = f"{staging_root}/tenants/{target.schema_name}.dump"
        manifest_txt_full_path = f"{staging_root}/metadata/manifest.txt"
        registry_json_full_path = f"{staging_root}/metadata/tenant-registry.json"
        manifest_json_full_path = f"{staging_root}/metadata/manifest.json"

        try:
            ls_entries = self._restic.ls(target.snapshot_id)
        except Exception as exc:
            raise RestoreError(
                RestoreState.EXTRACTING.value,
                "restic_ls_failed",
                f"Failed to list snapshot {target.snapshot_short_id} via read-only Restic: {exc}",
                ExitCode.TRANSFER,
            )

        files_by_path: Dict[str, int] = {}
        for node in ls_entries:
            if isinstance(node, dict) and node.get("type") == "file" and isinstance(node.get("path"), str):
                files_by_path[node["path"]] = int(node.get("size") or 0)

        if expected_dump_full_path not in files_by_path:
            raise RestoreError(
                RestoreState.EXTRACTING.value,
                "tenant_dump_missing_in_snapshot",
                f"Expected dump path {expected_dump_full_path} is absent from snapshot {target.snapshot_short_id}",
                ExitCode.VERIFICATION,
            )
        if manifest_txt_full_path not in files_by_path or registry_json_full_path not in files_by_path:
            raise RestoreError(
                RestoreState.EXTRACTING.value,
                "snapshot_metadata_missing",
                f"Snapshot {target.snapshot_short_id} is missing manifest.txt or tenant-registry.json",
                ExitCode.VERIFICATION,
            )

        try:
            manifest_txt_bytes = self._restic.dump(target.snapshot_id, manifest_txt_full_path)
            registry_json_bytes = self._restic.dump(target.snapshot_id, registry_json_full_path)
            manifest_json_bytes = (
                self._restic.dump(target.snapshot_id, manifest_json_full_path)
                if manifest_json_full_path in files_by_path
                else None
            )
            dump_bytes = self._restic.dump(target.snapshot_id, expected_dump_full_path)
        except Exception as exc:
            raise RestoreError(
                RestoreState.EXTRACTING.value,
                "restic_extraction_failed",
                f"Failed to extract artifact from snapshot {target.snapshot_short_id}: {exc}",
                ExitCode.TRANSFER,
            )

        extracted_dump_path = os.path.join(work_dir, f"{target.schema_name}.dump")
        extracted_manifest_txt = os.path.join(work_dir, "manifest.txt")
        extracted_registry_json = os.path.join(work_dir, "tenant-registry.json")

        self._write_private_file(extracted_manifest_txt, manifest_txt_bytes)
        self._write_private_file(extracted_registry_json, registry_json_bytes)
        if manifest_json_bytes is not None:
            self._write_private_file(os.path.join(work_dir, "manifest.json"), manifest_json_bytes)
        self._write_private_file(extracted_dump_path, dump_bytes)

        return {
            "extractedDumpPath": extracted_dump_path,
            "extractedDumpBytes": len(dump_bytes),
            "manifestTxtText": manifest_txt_bytes.decode("utf-8", "replace"),
            "registryJsonText": registry_json_bytes.decode("utf-8", "replace"),
            "manifestJsonText": manifest_json_bytes.decode("utf-8", "replace") if manifest_json_bytes else None,
        }

    @staticmethod
    def _write_private_file(path: str, content: bytes) -> None:
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "wb") as fh:
            fh.write(content)
            fh.flush()
            os.fsync(fh.fileno())


class ArtifactChecksumVerifier:
    """Verifies extracted dump SHA-256, size, snapshot metadata consistency, and archive TOC."""

    def verify_extracted_artifacts(
        self,
        target: ValidatedRestoreTarget,
        extraction: Dict[str, Any],
        db_backend: Any,
    ) -> Dict[str, Any]:
        dump_path = extraction["extractedDumpPath"]
        if not os.path.isfile(dump_path):
            raise RestoreError(
                RestoreState.VERIFYING.value,
                "extracted_dump_missing",
                "Extracted tenant dump file does not exist on disk",
                ExitCode.VERIFICATION,
            )

        actual_size = os.path.getsize(dump_path)
        if actual_size <= 0 or actual_size != target.expected_dump_size:
            raise RestoreError(
                RestoreState.VERIFYING.value,
                "extracted_dump_size_mismatch",
                f"Extracted dump size ({actual_size}) does not match expected size ({target.expected_dump_size})",
                ExitCode.VERIFICATION,
            )

        # Parse extracted manifest.txt and verify it matches target.expected_sha256
        manifest_map, txt_err = parse_manifest_txt(extraction["manifestTxtText"], target.staging_root)
        if txt_err or manifest_map is None:
            raise RestoreError(
                RestoreState.VERIFYING.value,
                "snapshot_manifest_malformed",
                "Extracted manifest.txt is malformed",
                ExitCode.VERIFICATION,
            )
        manifest_digest = manifest_map.get(target.dump_relative_path)
        if manifest_digest != target.expected_sha256:
            raise RestoreError(
                RestoreState.VERIFYING.value,
                "manifest_catalog_sha256_mismatch",
                "Snapshot manifest.txt SHA-256 does not match catalog expected SHA-256",
                ExitCode.VERIFICATION,
            )

        if extraction.get("manifestJsonText") is not None:
            mjson_map, json_err = parse_manifest_json(extraction["manifestJsonText"])
            if json_err or mjson_map is None:
                raise RestoreError(
                    RestoreState.VERIFYING.value,
                    "snapshot_manifest_json_malformed",
                    "Extracted manifest.json is malformed",
                    ExitCode.VERIFICATION,
                )
            j_entry = mjson_map.get(target.dump_relative_path)
            if not j_entry or j_entry.get("sha256") != target.expected_sha256 or j_entry.get("sizeBytes") != actual_size:
                raise RestoreError(
                    RestoreState.VERIFYING.value,
                    "manifest_json_mismatch",
                    "Extracted manifest.json entry disagrees with manifest.txt or dump size",
                    ExitCode.VERIFICATION,
                )

        # Verify tenant-registry.json inside snapshot matches tenant ID, slug, and schema
        reg_tenants, reg_err = parse_tenant_registry_json(extraction["registryJsonText"])
        if reg_err or reg_tenants is None:
            raise RestoreError(
                RestoreState.VERIFYING.value,
                "snapshot_registry_malformed",
                "Extracted tenant-registry.json is malformed",
                ExitCode.VERIFICATION,
            )
        matched_reg = [
            t for t in reg_tenants
            if t.tenant_id == target.tenant_id and t.slug == target.tenant_slug and t.schema_name == target.schema_name
        ]
        if len(matched_reg) != 1 or not matched_reg[0].mapping_valid:
            raise RestoreError(
                RestoreState.VERIFYING.value,
                "snapshot_registry_tenant_mismatch",
                f"Snapshot tenant-registry.json does not match tenant {target.tenant_id} ({target.tenant_slug}/{target.schema_name})",
                ExitCode.VERIFICATION,
            )

        # Compute actual SHA-256 of the extracted dump file
        actual_sha256 = sha256_file(dump_path)
        if actual_sha256 != target.expected_sha256:
            raise RestoreError(
                RestoreState.VERIFYING.value,
                "checksum_mismatch",
                f"Extracted dump SHA-256 ({actual_sha256}) != manifest SHA-256 ({target.expected_sha256})",
                ExitCode.VERIFICATION,
            )

        # Inspect archive TOC (`pg_restore -l`) to ensure no global objects or foreign schemas exist
        try:
            toc_text = db_backend.inspect_archive_toc(dump_path)
        except RestoreError:
            raise
        except Exception as exc:
            raise RestoreError(
                RestoreState.VERIFYING.value,
                "archive_toc_failed",
                f"Failed to read custom-format dump TOC via pg_restore -l: {exc}",
                ExitCode.VERIFICATION,
            )

        toc_summary = validate_archive_toc_single_schema(toc_text, target.schema_name)
        return {
            "verifiedSha256": actual_sha256,
            "verifiedSizeBytes": actual_size,
            "tocSummary": toc_summary,
        }


class StagingDatabaseValidator:
    """Restores the verified tenant dump into an isolated temporary PostgreSQL database and validates it."""

    def __init__(self, db_backend: Any, required_tables: Optional[Tuple[str, ...]] = None):
        self._db = db_backend
        self._required_tables = required_tables or ()

    def stage_and_validate(
        self,
        target: ValidatedRestoreTarget,
        dump_path: str,
        staging_db_name: str,
    ) -> Dict[str, Any]:
        if not STAGING_DB_NAME_RE.match(staging_db_name):
            raise RestoreError(
                RestoreState.STAGING.value,
                "invalid_staging_db_name",
                f"Invalid temporary staging database name {staging_db_name!r}",
                ExitCode.CONFIG,
            )

        try:
            self._db.create_staging_database(staging_db_name)
            self._db.restore_dump_to_database(
                database_name=staging_db_name,
                schema_name=target.schema_name,
                dump_path=dump_path,
            )
            fingerprint = self._db.inspect_schema_fingerprint(
                database_name=staging_db_name,
                schema_name=target.schema_name,
            )
            extra_schemas = self._db.list_non_system_schemas(staging_db_name)
        except RestoreError:
            raise
        except Exception as exc:
            raise RestoreError(
                RestoreState.STAGING.value,
                "staging_restore_failed",
                f"Staging database restoration failed in {staging_db_name}: {exc}",
                ExitCode.DATABASE_EXPORT,
            )

        unexpected_schemas = sorted(set(extra_schemas) - {target.schema_name, "public"})
        if unexpected_schemas:
            raise RestoreError(
                RestoreState.STAGING.value,
                "staging_unexpected_schemas",
                f"Staging restore created unexpected schema(s): {unexpected_schemas}",
                ExitCode.VERIFICATION,
            )

        if fingerprint is None or fingerprint.table_count <= 0:
            raise RestoreError(
                RestoreState.STAGING.value,
                "staging_schema_empty",
                f"Restored schema {target.schema_name} in staging database contains 0 tables",
                ExitCode.VERIFICATION,
            )

        missing_required = sorted(set(self._required_tables) - set(fingerprint.table_names))
        if missing_required:
            raise RestoreError(
                RestoreState.STAGING.value,
                "staging_missing_essential_tables",
                f"Restored schema {target.schema_name} is missing essential tables: {missing_required}",
                ExitCode.VERIFICATION,
            )

        if fingerprint.constraint_count <= 0:
            raise RestoreError(
                RestoreState.STAGING.value,
                "staging_constraints_missing",
                f"Restored schema {target.schema_name} has 0 constraints in staging database",
                ExitCode.VERIFICATION,
            )

        return {
            "stagingDatabase": staging_db_name,
            "schemaName": fingerprint.schema_name,
            "tableCount": fingerprint.table_count,
            "sequenceCount": fingerprint.sequence_count,
            "constraintCount": fingerprint.constraint_count,
            "totalLiveRows": fingerprint.total_live_rows,
            "fingerprint": fingerprint,
        }


class PreRestoreBackupManager:
    """Exports and checksum-verifies the live tenant schema prior to cutover."""

    def __init__(self, db_backend: Any):
        self._db = db_backend

    def backup_and_verify_live_schema(
        self,
        target: ValidatedRestoreTarget,
        work_dir: str,
    ) -> Dict[str, Any]:
        pre_restore_dump = os.path.join(work_dir, f"pre_restore_{target.schema_name}.dump")
        pre_restore_sha_file = pre_restore_dump + ".sha256"

        try:
            self._db.dump_live_tenant_schema(
                schema_name=target.schema_name,
                dest_path=pre_restore_dump,
            )
        except RestoreError:
            raise
        except Exception as exc:
            raise RestoreError(
                RestoreState.BACKING_UP_CURRENT.value,
                "pre_restore_backup_failed",
                f"Failed to export pre-restore backup of live schema {target.schema_name}: {exc}",
                ExitCode.DATABASE_EXPORT,
            )

        if not os.path.isfile(pre_restore_dump):
            raise RestoreError(
                RestoreState.BACKING_UP_CURRENT.value,
                "pre_restore_backup_missing",
                "Pre-restore backup file was not created on disk",
                ExitCode.DATABASE_EXPORT,
            )

        size_bytes = os.path.getsize(pre_restore_dump)
        if size_bytes <= 0:
            raise RestoreError(
                RestoreState.BACKING_UP_CURRENT.value,
                "pre_restore_backup_empty",
                "Pre-restore backup file has 0 bytes",
                ExitCode.DATABASE_EXPORT,
            )

        digest = sha256_file(pre_restore_dump)
        fd = os.open(pre_restore_sha_file, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(f"{digest}  {pre_restore_dump}\n")
            fh.flush()
            os.fsync(fh.fileno())

        # Re-read and verify checksum symmetrically
        recomputed = sha256_file(pre_restore_dump)
        if recomputed != digest:
            raise RestoreError(
                RestoreState.BACKING_UP_CURRENT.value,
                "pre_restore_checksum_mismatch",
                "Pre-restore backup SHA-256 verification failed",
                ExitCode.MANIFEST,
            )

        # Validate pre-restore backup TOC via pg_restore -l
        try:
            toc_text = self._db.inspect_archive_toc(pre_restore_dump)
        except Exception as exc:
            raise RestoreError(
                RestoreState.BACKING_UP_CURRENT.value,
                "pre_restore_toc_invalid",
                f"Pre-restore backup archive failed pg_restore -l TOC check: {exc}",
                ExitCode.VERIFICATION,
            )
        toc_summary = validate_archive_toc_single_schema(toc_text, target.schema_name)

        return {
            "preRestoreBackupPath": pre_restore_dump,
            "preRestoreSha256Path": pre_restore_sha_file,
            "preRestoreSha256": digest,
            "preRestoreSizeBytes": size_bytes,
            "tocSummary": toc_summary,
        }


class TenantRestoreEngine:
    """Orchestrates single-tenant restoration with strict isolation, validation, and rollback."""

    def __init__(
        self,
        *,
        validator: RestoreRequestValidator,
        extractor: SnapshotArtifactExtractor,
        verifier: ArtifactChecksumVerifier,
        staging_validator: StagingDatabaseValidator,
        pre_backup_manager: PreRestoreBackupManager,
        db_backend: Any,
        audit_logger: RestoreAuditLogger,
        work_root_dir: str = "/opt/acya-backup/restore-work",
        lock_file_path: str = "/opt/acya-backup/locks/tenant-restore.lock",
    ):
        self._validator = validator
        self._extractor = extractor
        self._verifier = verifier
        self._staging_validator = staging_validator
        self._pre_backup = pre_backup_manager
        self._db = db_backend
        self._audit = audit_logger
        self._work_root_dir = work_root_dir
        self._lock_file_path = lock_file_path

    def execute_restore(
        self,
        *,
        tenant_id: Any,
        snapshot_id: Any,
        actor: str = "system",
        operation_id: Optional[str] = None,
    ) -> RestoreOperationResult:
        if operation_id is not None:
            if not isinstance(operation_id, str) or not OPERATION_ID_RE.match(operation_id):
                raise RestoreError(
                    RestoreState.PENDING.value,
                    "invalid_operation_id",
                    f"Operation ID must match {OPERATION_ID_RE.pattern}",
                    ExitCode.CONFIG,
                )
        else:
            operation_id = f"restore-{utcnow().strftime('%Y%m%dT%H%M%SZ')}-{uuid.uuid4().hex[:8]}"
        short_token = operation_id.rsplit("-", 1)[-1]
        started_iso = iso(utcnow())

        lock_fd = self._acquire_exclusive_lock(operation_id, tenant_id, snapshot_id, actor)
        try:
            return self._run_state_machine(
                operation_id=operation_id,
                short_token=short_token,
                started_iso=started_iso,
                tenant_id=tenant_id,
                snapshot_id=snapshot_id,
                actor=actor,
            )
        finally:
            try:
                fcntl.flock(lock_fd, fcntl.LOCK_UN)
            except OSError:
                pass
            try:
                os.close(lock_fd)
            except OSError:
                pass

    def _acquire_exclusive_lock(
        self,
        operation_id: str,
        tenant_id: Any,
        snapshot_id: Any,
        actor: str,
    ) -> int:
        lock_dir = os.path.dirname(self._lock_file_path)
        if lock_dir:
            os.makedirs(lock_dir, mode=0o750, exist_ok=True)
        fd = os.open(self._lock_file_path, os.O_WRONLY | os.O_CREAT, 0o600)
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            os.close(fd)
            self._audit.record_event(
                operation_id=operation_id,
                state=RestoreState.FAILED,
                event="restore.concurrent_rejected",
                tenant_id=tenant_id if isinstance(tenant_id, int) else -1,
                snapshot_id=str(snapshot_id),
                actor=actor,
                error={
                    "category": "concurrent_restore_in_progress",
                    "message": "Another tenant restore operation is currently active",
                },
            )
            raise RestoreError(
                RestoreState.PENDING.value,
                "concurrent_restore_in_progress",
                "Another tenant restore operation is currently active",
                ExitCode.CONCURRENT,
            )
        return fd

    def _run_state_machine(
        self,
        *,
        operation_id: str,
        short_token: str,
        started_iso: str,
        tenant_id: Any,
        snapshot_id: Any,
        actor: str,
    ) -> RestoreOperationResult:
        state = RestoreState.PENDING
        state_history: List[str] = [state.value]
        target: Optional[ValidatedRestoreTarget] = None
        work_dir = os.path.join(self._work_root_dir, operation_id)
        staging_db_name = f"acya_restore_stage_{short_token}"
        rollback_schema_name: Optional[str] = None
        cutover_started = False
        tenant_deactivated = False
        pre_backup_info: Optional[Dict[str, Any]] = None
        extracted_sha256: Optional[str] = None
        staging_table_count: Optional[int] = None
        restored_table_count: Optional[int] = None
        unaffected_count: Optional[int] = None

        def write_live_summary() -> None:
            in_progress = RestoreOperationResult(
                operation_id=operation_id,
                tenant_id=target.tenant_id if target else (tenant_id if isinstance(tenant_id, int) else -1),
                snapshot_id=target.snapshot_id if target else str(snapshot_id),
                final_state=state,
                state_history=list(state_history),
                tenant_slug=target.tenant_slug if target else None,
                schema_name=target.schema_name if target else None,
                extracted_dump_sha256=extracted_sha256,
                pre_restore_backup_path=pre_backup_info["preRestoreBackupPath"] if pre_backup_info else None,
                pre_restore_backup_sha256=pre_backup_info["preRestoreSha256"] if pre_backup_info else None,
                staging_database=staging_db_name,
                staging_table_count=staging_table_count,
                restored_table_count=restored_table_count,
                unaffected_tenant_count=unaffected_count,
                recovery_artifacts_retained=os.path.isdir(work_dir),
                work_dir=work_dir if os.path.isdir(work_dir) else None,
                started_at=started_iso,
                finished_at=None,
            )
            self._audit.write_state_summary(self._result_to_dict(in_progress))

        def transition(next_state: RestoreState, event: str, details: Optional[Dict[str, Any]] = None) -> None:
            nonlocal state
            if next_state not in VALID_STATE_TRANSITIONS.get(state, set()):
                raise RestoreError(
                    state.value,
                    "invalid_state_transition",
                    f"Illegal state transition {state.value} -> {next_state.value}",
                    ExitCode.INTERNAL,
                )
            state = next_state
            state_history.append(state.value)
            self._audit.record_event(
                operation_id=operation_id,
                state=state,
                event=event,
                tenant_id=target.tenant_id if target else (tenant_id if isinstance(tenant_id, int) else -1),
                snapshot_id=target.snapshot_id if target else str(snapshot_id),
                actor=actor,
                tenant_slug=target.tenant_slug if target else None,
                schema_name=target.schema_name if target else None,
                details=details,
            )
            write_live_summary()

        self._audit.record_event(
            operation_id=operation_id,
            state=RestoreState.PENDING,
            event="restore.requested",
            tenant_id=tenant_id if isinstance(tenant_id, int) else -1,
            snapshot_id=str(snapshot_id),
            actor=actor,
        )
        write_live_summary()

        try:
            # 1. Pending: Validate request and resolve mapping exclusively from catalog + registry
            live_registry = self._db.fetch_live_tenant_registry()
            target = self._validator.validate_and_resolve(tenant_id, snapshot_id, live_registry)
            rollback_schema_name = f"{target.schema_name[:45]}__rb_{short_token}"
            if not ROLLBACK_SCHEMA_RE.match(rollback_schema_name):
                raise RestoreError(
                    RestoreState.PENDING.value,
                    "invalid_rollback_schema_name",
                    "Generated rollback schema identifier failed validation",
                    ExitCode.INTERNAL,
                )

            # Capture baseline fingerprints of all 15 unaffected tenants before any operation
            unaffected_before = self._capture_unaffected_fingerprints(target.schema_name, live_registry)
            unaffected_count = len(unaffected_before)

            # 2. Extracting: Extract only the selected tenant dump and metadata via read-only Restic
            transition(
                RestoreState.EXTRACTING,
                "restore.extracting",
                {
                    "stagingRoot": target.staging_root,
                    "dumpRelativePath": target.dump_relative_path,
                    "expectedSizeBytes": target.expected_dump_size,
                },
            )
            extraction = self._extractor.extract_tenant_artifacts(target, work_dir)

            # 3. Verifying: Verify SHA-256 against manifest and inspect archive TOC
            transition(RestoreState.VERIFYING, "restore.verifying")
            verification = self._verifier.verify_extracted_artifacts(target, extraction, self._db)
            extracted_sha256 = verification["verifiedSha256"]

            # 4. Staging: Restore into isolated temporary PostgreSQL database & validate objects/data
            transition(
                RestoreState.STAGING,
                "restore.staging",
                {"stagingDatabase": staging_db_name, "verifiedSha256": extracted_sha256},
            )
            staging_result = self._staging_validator.stage_and_validate(
                target=target,
                dump_path=extraction["extractedDumpPath"],
                staging_db_name=staging_db_name,
            )
            staging_table_count = staging_result["tableCount"]

            # 5. Prepared: Staging database passed all structural, constraint, and data checks
            transition(
                RestoreState.PREPARED,
                "restore.prepared",
                {
                    "stagingDatabase": staging_db_name,
                    "tableCount": staging_result["tableCount"],
                    "sequenceCount": staging_result["sequenceCount"],
                    "constraintCount": staging_result["constraintCount"],
                    "totalLiveRows": staging_result["totalLiveRows"],
                },
            )

            # 6. BackingUpCurrent: Create and checksum-verify pre-restore backup of live tenant schema
            transition(RestoreState.BACKING_UP_CURRENT, "restore.backing_up_current")
            live_before_fp = self._db.inspect_schema_fingerprint(
                database_name=self._db.production_database_name,
                schema_name=target.schema_name,
            )
            if live_before_fp is None:
                raise RestoreError(
                    RestoreState.BACKING_UP_CURRENT.value,
                    "live_schema_missing",
                    f"Live production schema {target.schema_name} does not exist",
                    ExitCode.TENANT_COVERAGE,
                )
            pre_backup_info = self._pre_backup.backup_and_verify_live_schema(target, work_dir)

            # 7. CuttingOver: Deactivate tenant, rename live schema to rollback schema, restore verified dump
            transition(
                RestoreState.CUTTING_OVER,
                "restore.cutting_over",
                {
                    "preRestoreBackupSha256": pre_backup_info["preRestoreSha256"],
                    "preRestoreBackupSizeBytes": pre_backup_info["preRestoreSizeBytes"],
                    "rollbackSchema": rollback_schema_name,
                },
            )
            self._db.set_tenant_active_state(target.tenant_id, False)
            tenant_deactivated = True
            self._db.terminate_tenant_sessions(target.schema_name)

            cutover_started = True
            self._db.rename_production_schema(target.schema_name, rollback_schema_name)
            self._db.restore_dump_to_database(
                database_name=self._db.production_database_name,
                schema_name=target.schema_name,
                dump_path=extraction["extractedDumpPath"],
            )
            self._db.preserve_schema_ownership_and_permissions(
                schema_name=target.schema_name,
                owner=live_before_fp.owner,
            )

            # 8. Validating: Validate restored production schema AND verify all 15 unaffected tenants
            transition(RestoreState.VALIDATING, "restore.validating")
            restored_fp = self._db.inspect_schema_fingerprint(
                database_name=self._db.production_database_name,
                schema_name=target.schema_name,
            )
            if restored_fp is None or restored_fp.table_count != staging_result["tableCount"]:
                raise RestoreError(
                    RestoreState.VALIDATING.value,
                    "post_restore_table_count_mismatch",
                    f"Restored schema table count ({restored_fp.table_count if restored_fp else 0}) "
                    f"!= staged table count ({staging_result['tableCount']})",
                    ExitCode.VERIFICATION,
                )
            if restored_fp.constraint_count != staging_result["constraintCount"]:
                raise RestoreError(
                    RestoreState.VALIDATING.value,
                    "post_restore_constraint_count_mismatch",
                    f"Restored schema constraint count ({restored_fp.constraint_count}) "
                    f"!= staged constraint count ({staging_result['constraintCount']})",
                    ExitCode.VERIFICATION,
                )
            if restored_fp.owner != live_before_fp.owner:
                raise RestoreError(
                    RestoreState.VALIDATING.value,
                    "post_restore_owner_mismatch",
                    f"Restored schema owner ({restored_fp.owner}) != original owner ({live_before_fp.owner})",
                    ExitCode.VERIFICATION,
                )
            restored_table_count = restored_fp.table_count

            # Verify all 15 unaffected tenants remain completely unchanged
            unaffected_after = self._capture_unaffected_fingerprints(target.schema_name, live_registry)
            self._verify_unaffected_tenants_unchanged(unaffected_before, unaffected_after)

            # Drop rollback schema only after all post-restore and isolation checks pass
            self._db.drop_production_schema_if_exists(rollback_schema_name)
            self._db.drop_staging_database_if_exists(staging_db_name)

            # Reactivate tenant to its original active state (or True if originally active)
            self._db.set_tenant_active_state(target.tenant_id, target.original_is_active)
            tenant_deactivated = False

            # 9. Completed
            transition(
                RestoreState.COMPLETED,
                "restore.completed",
                {
                    "restoredTableCount": restored_table_count,
                    "unaffectedTenantsVerified": unaffected_count,
                    "preRestoreBackupPath": pre_backup_info["preRestoreBackupPath"],
                    "preRestoreBackupSha256": pre_backup_info["preRestoreSha256"],
                },
            )

            finished_iso = iso(utcnow())
            result = RestoreOperationResult(
                operation_id=operation_id,
                tenant_id=target.tenant_id,
                snapshot_id=target.snapshot_id,
                final_state=RestoreState.COMPLETED,
                state_history=state_history,
                tenant_slug=target.tenant_slug,
                schema_name=target.schema_name,
                extracted_dump_sha256=extracted_sha256,
                pre_restore_backup_path=pre_backup_info["preRestoreBackupPath"],
                pre_restore_backup_sha256=pre_backup_info["preRestoreSha256"],
                staging_database=staging_db_name,
                staging_table_count=staging_table_count,
                restored_table_count=restored_table_count,
                unaffected_tenant_count=unaffected_count,
                recovery_artifacts_retained=True,
                work_dir=work_dir,
                rollback_performed=False,
                rollback_succeeded=None,
                started_at=started_iso,
                finished_at=finished_iso,
            )
            self._audit.write_state_summary(self._result_to_dict(result))
            return result

        except Exception as exc:
            err_cat = getattr(exc, "category", "unexpected_restore_failure")
            err_msg = redact(getattr(exc, "message", str(exc)))

            # Always clean up the temporary staging database if it was created,
            # but NEVER delete `work_dir` or `pre_restore_<schema>.dump` on failure!
            try:
                self._db.drop_staging_database_if_exists(staging_db_name)
            except Exception:
                pass

            if cutover_started and target is not None and rollback_schema_name is not None:
                return self._execute_rollback(
                    operation_id=operation_id,
                    started_iso=started_iso,
                    target=target,
                    rollback_schema_name=rollback_schema_name,
                    pre_backup_info=pre_backup_info,
                    work_dir=work_dir,
                    staging_db_name=staging_db_name,
                    extracted_sha256=extracted_sha256,
                    staging_table_count=staging_table_count,
                    unaffected_count=unaffected_count,
                    state_history=state_history,
                    actor=actor,
                    err_cat=err_cat,
                    err_msg=err_msg,
                )

            # If tenant was deactivated just prior to cutover_started, restore its active state
            if tenant_deactivated and target is not None:
                try:
                    self._db.set_tenant_active_state(target.tenant_id, target.original_is_active)
                except Exception:
                    pass

            state = RestoreState.FAILED
            state_history.append(state.value)
            self._audit.record_event(
                operation_id=operation_id,
                state=RestoreState.FAILED,
                event="restore.failed",
                tenant_id=target.tenant_id if target else (tenant_id if isinstance(tenant_id, int) else -1),
                snapshot_id=target.snapshot_id if target else str(snapshot_id),
                actor=actor,
                tenant_slug=target.tenant_slug if target else None,
                schema_name=target.schema_name if target else None,
                details={"workDirRetained": os.path.isdir(work_dir)},
                error={"category": err_cat, "message": err_msg},
            )
            finished_iso = iso(utcnow())
            result = RestoreOperationResult(
                operation_id=operation_id,
                tenant_id=target.tenant_id if target else (tenant_id if isinstance(tenant_id, int) else -1),
                snapshot_id=target.snapshot_id if target else str(snapshot_id),
                final_state=RestoreState.FAILED,
                state_history=state_history,
                tenant_slug=target.tenant_slug if target else None,
                schema_name=target.schema_name if target else None,
                extracted_dump_sha256=extracted_sha256,
                pre_restore_backup_path=pre_backup_info["preRestoreBackupPath"] if pre_backup_info else None,
                pre_restore_backup_sha256=pre_backup_info["preRestoreSha256"] if pre_backup_info else None,
                staging_database=staging_db_name,
                staging_table_count=staging_table_count,
                unaffected_tenant_count=unaffected_count,
                recovery_artifacts_retained=os.path.isdir(work_dir),
                work_dir=work_dir if os.path.isdir(work_dir) else None,
                error_category=err_cat,
                error_message=err_msg,
                rollback_performed=False,
                rollback_succeeded=None,
                started_at=started_iso,
                finished_at=finished_iso,
            )
            self._audit.write_state_summary(self._result_to_dict(result))
            return result

    def _execute_rollback(
        self,
        *,
        operation_id: str,
        started_iso: str,
        target: ValidatedRestoreTarget,
        rollback_schema_name: str,
        pre_backup_info: Optional[Dict[str, Any]],
        work_dir: str,
        staging_db_name: str,
        extracted_sha256: Optional[str],
        staging_table_count: Optional[int],
        unaffected_count: Optional[int],
        state_history: List[str],
        actor: str,
        err_cat: str,
        err_msg: str,
    ) -> RestoreOperationResult:
        state_history.append(RestoreState.ROLLING_BACK.value)
        self._audit.record_event(
            operation_id=operation_id,
            state=RestoreState.ROLLING_BACK,
            event="restore.rolling_back",
            tenant_id=target.tenant_id,
            snapshot_id=target.snapshot_id,
            actor=actor,
            tenant_slug=target.tenant_slug,
            schema_name=target.schema_name,
            details={"rollbackSchema": rollback_schema_name},
            error={"category": err_cat, "message": err_msg},
        )

        try:
            self._db.rollback_production_schema(
                schema_name=target.schema_name,
                rollback_schema_name=rollback_schema_name,
                pre_restore_dump_path=pre_backup_info["preRestoreBackupPath"] if pre_backup_info else None,
            )
            self._db.set_tenant_active_state(target.tenant_id, target.original_is_active)

            state_history.append(RestoreState.ROLLED_BACK.value)
            self._audit.record_event(
                operation_id=operation_id,
                state=RestoreState.ROLLED_BACK,
                event="restore.rolled_back",
                tenant_id=target.tenant_id,
                snapshot_id=target.snapshot_id,
                actor=actor,
                tenant_slug=target.tenant_slug,
                schema_name=target.schema_name,
                details={
                    "recoveryArtifactsRetained": True,
                    "workDir": work_dir,
                    "preRestoreBackupPath": pre_backup_info["preRestoreBackupPath"] if pre_backup_info else None,
                },
                error={"category": err_cat, "message": err_msg},
            )
            finished_iso = iso(utcnow())
            result = RestoreOperationResult(
                operation_id=operation_id,
                tenant_id=target.tenant_id,
                snapshot_id=target.snapshot_id,
                final_state=RestoreState.ROLLED_BACK,
                state_history=state_history,
                tenant_slug=target.tenant_slug,
                schema_name=target.schema_name,
                extracted_dump_sha256=extracted_sha256,
                pre_restore_backup_path=pre_backup_info["preRestoreBackupPath"] if pre_backup_info else None,
                pre_restore_backup_sha256=pre_backup_info["preRestoreSha256"] if pre_backup_info else None,
                staging_database=staging_db_name,
                staging_table_count=staging_table_count,
                unaffected_tenant_count=unaffected_count,
                recovery_artifacts_retained=True,
                work_dir=work_dir,
                error_category=err_cat,
                error_message=err_msg,
                rollback_performed=True,
                rollback_succeeded=True,
                started_at=started_iso,
                finished_at=finished_iso,
            )
            self._audit.write_state_summary(self._result_to_dict(result))
            return result

        except Exception as rb_exc:
            rb_msg = redact(f"Cutover error: {err_msg}; Rollback error: {rb_exc}")
            state_history.append(RestoreState.ROLLBACK_FAILED.value)
            self._audit.record_event(
                operation_id=operation_id,
                state=RestoreState.ROLLBACK_FAILED,
                event="restore.rollback_failed",
                tenant_id=target.tenant_id,
                snapshot_id=target.snapshot_id,
                actor=actor,
                tenant_slug=target.tenant_slug,
                schema_name=target.schema_name,
                details={
                    "recoveryArtifactsRetained": True,
                    "workDir": work_dir,
                    "preRestoreBackupPath": pre_backup_info["preRestoreBackupPath"] if pre_backup_info else None,
                },
                error={"category": "rollback_failed", "message": rb_msg},
            )
            finished_iso = iso(utcnow())
            result = RestoreOperationResult(
                operation_id=operation_id,
                tenant_id=target.tenant_id,
                snapshot_id=target.snapshot_id,
                final_state=RestoreState.ROLLBACK_FAILED,
                state_history=state_history,
                tenant_slug=target.tenant_slug,
                schema_name=target.schema_name,
                extracted_dump_sha256=extracted_sha256,
                pre_restore_backup_path=pre_backup_info["preRestoreBackupPath"] if pre_backup_info else None,
                pre_restore_backup_sha256=pre_backup_info["preRestoreSha256"] if pre_backup_info else None,
                staging_database=staging_db_name,
                staging_table_count=staging_table_count,
                unaffected_tenant_count=unaffected_count,
                recovery_artifacts_retained=True,
                work_dir=work_dir,
                error_category="rollback_failed",
                error_message=rb_msg,
                rollback_performed=True,
                rollback_succeeded=False,
                started_at=started_iso,
                finished_at=finished_iso,
            )
            self._audit.write_state_summary(self._result_to_dict(result))
            return result

    def _capture_unaffected_fingerprints(
        self,
        target_schema: str,
        live_registry: List[Dict[str, Any]],
    ) -> Dict[str, TenantSchemaFingerprint]:
        fingerprints: Dict[str, TenantSchemaFingerprint] = {}
        for row in live_registry:
            schema = str(row.get("SchemaName") or "").strip()
            if not schema or schema == target_schema:
                continue
            fp = self._db.inspect_schema_fingerprint(
                database_name=self._db.production_database_name,
                schema_name=schema,
            )
            if fp is None:
                raise RestoreError(
                    RestoreState.PENDING.value,
                    "unaffected_tenant_schema_missing",
                    f"Unaffected tenant schema {schema} is missing prior to restore",
                    ExitCode.TENANT_COVERAGE,
                )
            fingerprints[schema] = fp
        return fingerprints

    @staticmethod
    def _verify_unaffected_tenants_unchanged(
        before: Dict[str, TenantSchemaFingerprint],
        after: Dict[str, TenantSchemaFingerprint],
    ) -> None:
        if set(before.keys()) != set(after.keys()):
            raise RestoreError(
                RestoreState.VALIDATING.value,
                "unaffected_tenants_set_changed",
                "The set of unaffected tenant schemas changed during restore",
                ExitCode.VERIFICATION,
            )
        for schema, fp_before in before.items():
            fp_after = after[schema]
            if (
                fp_before.schema_oid != fp_after.schema_oid
                or fp_before.owner != fp_after.owner
                or fp_before.table_count != fp_after.table_count
                or fp_before.sequence_count != fp_after.sequence_count
                or fp_before.constraint_count != fp_after.constraint_count
                or fp_before.table_names != fp_after.table_names
                or fp_before.total_live_rows != fp_after.total_live_rows
            ):
                raise RestoreError(
                    RestoreState.VALIDATING.value,
                    "unaffected_tenant_modified",
                    f"Unaffected tenant schema {schema} fingerprint changed during restore",
                    ExitCode.VERIFICATION,
                )

    @staticmethod
    def _result_to_dict(res: RestoreOperationResult) -> Dict[str, Any]:
        return {
            "schema": RESTORE_STATE_SCHEMA,
            "runnerVersion": RUNNER_VERSION,
            "operationId": res.operation_id,
            "tenantId": res.tenant_id,
            "tenantSlug": res.tenant_slug,
            "schemaName": res.schema_name,
            "snapshotId": res.snapshot_id,
            "finalState": res.final_state.value,
            "stateHistory": res.state_history,
            "extractedDumpSha256": res.extracted_dump_sha256,
            "preRestoreBackupPath": res.pre_restore_backup_path,
            "preRestoreBackupSha256": res.pre_restore_backup_sha256,
            "stagingDatabase": res.staging_database,
            "stagingTableCount": res.staging_table_count,
            "restoredTableCount": res.restored_table_count,
            "unaffectedTenantCount": res.unaffected_tenant_count,
            "recoveryArtifactsRetained": res.recovery_artifacts_retained,
            "workDir": res.work_dir,
            "errorCategory": res.error_category,
            "errorMessage": res.error_message,
            "rollbackPerformed": res.rollback_performed,
            "rollbackSucceeded": res.rollback_succeeded,
            "startedAt": res.started_at,
            "finishedAt": res.finished_at,
        }


class ResticSingleTenantExtractorAdapter:
    """Adapter around `ResticClient` for read-only `--no-lock` extraction of metadata and 1 tenant dump."""

    ALLOWED_DUMP_PATH_RE = re.compile(
        r"^("
        r"/opt/acya-backup/staging/stage-[A-Za-z0-9_-]+"
        r"|/var/backups/acya-backup-stage-[A-Za-z0-9_-]+"
        r"|/home/ubuntu/acya-backup-stage"
        r")/(metadata/(manifest\.txt|manifest\.json|tenant-registry\.json)|tenants/tenant_[a-z0-9_]{1,57}\.dump)$"
    )

    def __init__(self, restic_client: Any):
        self._client = restic_client

    def ls(self, snapshot_id: str) -> List[Dict[str, Any]]:
        validate_snapshot_id(snapshot_id)
        argv, env = self._client._build_argv("ls", [snapshot_id, "--json"], read_only=True)
        res = run(argv, env=env, timeout=180)
        if res.returncode != 0:
            raise RestoreError(
                RestoreState.EXTRACTING.value,
                "restic_ls_failed",
                f"restic ls --no-lock failed for snapshot {snapshot_id[:12]}",
                ExitCode.TRANSFER,
            )
        nodes: List[Dict[str, Any]] = []
        for raw in res.stdout.decode("utf-8", "replace").splitlines():
            line = raw.strip()
            if not line:
                continue
            obj = json.loads(line)
            if isinstance(obj, dict) and obj.get("struct_type") != "snapshot":
                nodes.append(obj)
        return nodes

    def dump(self, snapshot_id: str, exact_node_path: str) -> bytes:
        validate_snapshot_id(snapshot_id)
        if not isinstance(exact_node_path, str) or not self.ALLOWED_DUMP_PATH_RE.match(exact_node_path):
            raise RestoreError(
                RestoreState.EXTRACTING.value,
                "forbidden_extraction_path",
                f"Path {exact_node_path!r} is not an allowlisted snapshot metadata or tenant dump artifact",
                ExitCode.CONFIG,
            )
        return self._client._dump_node(snapshot_id, exact_node_path)


class PostgresRestoreDatabaseBackend:
    """PostgreSQL backend for staging validation, pre-restore backup, cutover, and rollback.

    All identifiers are strictly validated against `TENANT_SCHEMA_RE`,
    `STAGING_DB_NAME_RE`, and `ROLLBACK_SCHEMA_RE` before execution.
    Never uses SQL text substitution on dump files.
    """

    def __init__(self, pg_instance: Any, production_database_name: str = "wood-app-db"):
        self._pg = pg_instance
        self.production_database_name = production_database_name

    def fetch_live_tenant_registry(self) -> List[Dict[str, Any]]:
        from .postgres import REGISTRY_SQL, parse_registry
        raw = self._pg.query(self.production_database_name, REGISTRY_SQL, "restore_preflight")
        return parse_registry(raw)

    def inspect_archive_toc(self, dump_path: str) -> str:
        return self._pg.archive_toc(dump_path, "restore_verify")

    def create_staging_database(self, staging_db_name: str) -> None:
        if not STAGING_DB_NAME_RE.match(staging_db_name):
            raise RestoreError(RestoreState.STAGING.value, "invalid_staging_db_name", "Invalid staging DB name")
        self._pg.query("postgres", f'DROP DATABASE IF EXISTS "{staging_db_name}"', "restore_staging")
        self._pg.query("postgres", f'CREATE DATABASE "{staging_db_name}"', "restore_staging")

    def drop_staging_database_if_exists(self, staging_db_name: str) -> None:
        if not STAGING_DB_NAME_RE.match(staging_db_name):
            return
        self._pg.query(
            "postgres",
            f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{staging_db_name}' AND pid <> pg_backend_pid()",
            "restore_cleanup",
        )
        self._pg.query("postgres", f'DROP DATABASE IF EXISTS "{staging_db_name}"', "restore_cleanup")

    def restore_dump_to_database(self, database_name: str, schema_name: str, dump_path: str) -> None:
        if not TENANT_SCHEMA_RE.match(schema_name):
            raise RestoreError(RestoreState.STAGING.value, "invalid_schema_name", "Invalid schema name")
        if database_name != self.production_database_name and not STAGING_DB_NAME_RE.match(database_name):
            raise RestoreError(RestoreState.STAGING.value, "invalid_database_name", "Invalid target database name")

        argv = self._pg.docker.exec_argv(
            self._pg.cid,
            None,
            "pg_restore",
            "-U",
            self._pg.spec["user"],
            "-d",
            database_name,
            "--no-owner",
            "--no-privileges",
            "--exit-on-error",
            f"--schema={schema_name}",
            interactive=True,
        )
        with open(dump_path, "rb") as fh:
            res = run(argv, stdin=fh, timeout=3600)
        if res.returncode != 0:
            raise RestoreError(
                RestoreState.STAGING.value,
                "pg_restore_failed",
                f"pg_restore failed for schema {schema_name} in {database_name} (exit {res.returncode})",
                ExitCode.DATABASE_EXPORT,
            )

    def dump_live_tenant_schema(self, schema_name: str, dest_path: str) -> None:
        if not TENANT_SCHEMA_RE.match(schema_name):
            raise RestoreError(RestoreState.BACKING_UP_CURRENT.value, "invalid_schema_name", "Invalid schema name")
        self._pg.dump_database(
            self.production_database_name,
            dest_path,
            schema=schema_name,
            stage="restore_pre_backup",
        )

    def list_non_system_schemas(self, database_name: str) -> List[str]:
        sql = (
            "SELECT schema_name FROM information_schema.schemata "
            "WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast') "
            "ORDER BY schema_name"
        )
        out = self._pg.query(database_name, sql, "restore_staging")
        return [ln.strip() for ln in out.splitlines() if ln.strip()]

    def inspect_schema_fingerprint(
        self,
        database_name: str,
        schema_name: str,
    ) -> Optional[TenantSchemaFingerprint]:
        if not (TENANT_SCHEMA_RE.match(schema_name) or ROLLBACK_SCHEMA_RE.match(schema_name)):
            raise RestoreError(RestoreState.VALIDATING.value, "invalid_schema_name", "Invalid schema name")
        sql = f"""
        SELECT coalesce(json_build_object(
            'oid', n.oid::bigint,
            'owner', pg_get_userbyid(n.nspowner),
            'table_count', (SELECT count(*) FROM information_schema.tables WHERE table_schema = '{schema_name}' AND table_type = 'BASE TABLE'),
            'sequence_count', (SELECT count(*) FROM information_schema.sequences WHERE sequence_schema = '{schema_name}'),
            'constraint_count', (SELECT count(*) FROM information_schema.table_constraints WHERE constraint_schema = '{schema_name}'),
            'tables', coalesce((SELECT json_agg(table_name ORDER BY table_name) FROM information_schema.tables WHERE table_schema = '{schema_name}' AND table_type = 'BASE TABLE'), '[]'::json),
            'live_rows', coalesce((SELECT sum(n_live_tup)::bigint FROM pg_stat_user_tables WHERE schemaname = '{schema_name}'), 0)
        )::text, '')
        FROM pg_namespace n
        WHERE n.nspname = '{schema_name}';
        """
        out = self._pg.query(database_name, sql, "restore_validate").strip()
        if not out:
            return None
        doc = json.loads(out)
        return TenantSchemaFingerprint(
            schema_name=schema_name,
            schema_oid=int(doc["oid"]),
            owner=str(doc["owner"]),
            table_count=int(doc["table_count"]),
            sequence_count=int(doc["sequence_count"]),
            constraint_count=int(doc["constraint_count"]),
            table_names=tuple(doc.get("tables") or ()),
            total_live_rows=int(doc.get("live_rows") or 0),
        )

    def set_tenant_active_state(self, tenant_id: int, is_active: bool) -> None:
        if isinstance(tenant_id, bool) or not isinstance(tenant_id, int) or tenant_id <= 0:
            raise RestoreError(RestoreState.CUTTING_OVER.value, "invalid_tenant_id", "Invalid tenant ID")
        literal = "TRUE" if is_active else "FALSE"
        sql = f'UPDATE public.bo_tbl_enterprise SET "IsActive" = {literal} WHERE "Id" = {tenant_id};'
        self._pg.query(self.production_database_name, sql, "restore_cutover")

    def terminate_tenant_sessions(self, schema_name: str) -> None:
        if not TENANT_SCHEMA_RE.match(schema_name):
            raise RestoreError(RestoreState.CUTTING_OVER.value, "invalid_schema_name", "Invalid schema name")
        sql = (
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
            f"WHERE datname = '{self.production_database_name}' "
            "AND pid <> pg_backend_pid() "
            f"AND query ILIKE '%{schema_name}%';"
        )
        self._pg.query(self.production_database_name, sql, "restore_cutover")

    def rename_production_schema(self, old_schema: str, new_schema: str) -> None:
        if not (TENANT_SCHEMA_RE.match(old_schema) or ROLLBACK_SCHEMA_RE.match(old_schema)):
            raise RestoreError(RestoreState.CUTTING_OVER.value, "invalid_schema_name", "Invalid old schema name")
        if not (TENANT_SCHEMA_RE.match(new_schema) or ROLLBACK_SCHEMA_RE.match(new_schema)):
            raise RestoreError(RestoreState.CUTTING_OVER.value, "invalid_schema_name", "Invalid new schema name")
        sql = f'ALTER SCHEMA "{old_schema}" RENAME TO "{new_schema}";'
        self._pg.query(self.production_database_name, sql, "restore_cutover")

    def preserve_schema_ownership_and_permissions(self, schema_name: str, owner: str) -> None:
        if not TENANT_SCHEMA_RE.match(schema_name):
            raise RestoreError(RestoreState.CUTTING_OVER.value, "invalid_schema_name", "Invalid schema name")
        if not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]{0,62}$", owner):
            raise RestoreError(RestoreState.CUTTING_OVER.value, "invalid_owner_role", "Invalid owner role")
        sql = f'ALTER SCHEMA "{schema_name}" OWNER TO "{owner}";'
        self._pg.query(self.production_database_name, sql, "restore_cutover")

    def drop_production_schema_if_exists(self, schema_name: str) -> None:
        if not ROLLBACK_SCHEMA_RE.match(schema_name):
            raise RestoreError(
                RestoreState.VALIDATING.value,
                "refusing_non_rollback_drop",
                f"Only temporary rollback schemas matching {ROLLBACK_SCHEMA_RE.pattern} may be dropped after cutover",
            )
        sql = f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE;'
        self._pg.query(self.production_database_name, sql, "restore_cleanup")

    def rollback_production_schema(
        self,
        schema_name: str,
        rollback_schema_name: str,
        pre_restore_dump_path: Optional[str] = None,
    ) -> None:
        if not TENANT_SCHEMA_RE.match(schema_name) or not ROLLBACK_SCHEMA_RE.match(rollback_schema_name):
            raise RestoreError(RestoreState.ROLLING_BACK.value, "invalid_schema_name", "Invalid schema name")

        rb_fp = self.inspect_schema_fingerprint(self.production_database_name, rollback_schema_name)
        if rb_fp is not None:
            sql = (
                f'BEGIN; '
                f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE; '
                f'ALTER SCHEMA "{rollback_schema_name}" RENAME TO "{schema_name}"; '
                f'COMMIT;'
            )
            self._pg.query(self.production_database_name, sql, "restore_rollback")
            return

        if pre_restore_dump_path and os.path.isfile(pre_restore_dump_path):
            self._pg.query(
                self.production_database_name,
                f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE;',
                "restore_rollback",
            )
            self.restore_dump_to_database(
                database_name=self.production_database_name,
                schema_name=schema_name,
                dump_path=pre_restore_dump_path,
            )
            return

        raise RestoreError(
            RestoreState.ROLLING_BACK.value,
            "rollback_source_unavailable",
            f"Neither rollback schema {rollback_schema_name} nor pre-restore dump is available",
            ExitCode.INTERNAL,
        )

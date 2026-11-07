#!/usr/bin/env python3
"""Automated unit & disposable-database tests for ACYA Phase 11C.1.8 Restore Engine.

Covers all 13 mandatory scenarios using in-memory mocks and isolated disposable
database state. Never accesses or modifies the production Restic repository or
production PostgreSQL instance.
"""

import fcntl
import hashlib
import json
import os
import sys
import tempfile
import unittest
from copy import deepcopy
from typing import Any, Dict, List, Optional, Tuple

_HERE = os.path.dirname(os.path.realpath(__file__))
_LIB = os.path.normpath(os.path.join(_HERE, "..", "lib"))
if _LIB not in sys.path:
    sys.path.insert(0, _LIB)

from acya_backup.history import CATALOG_SCHEMA
from acya_backup.restore import (
    ArtifactChecksumVerifier,
    PreRestoreBackupManager,
    RestoreAuditLogger,
    RestoreError,
    RestoreRequestValidator,
    RestoreState,
    SnapshotArtifactExtractor,
    StagingDatabaseValidator,
    TenantRestoreEngine,
    TenantSchemaFingerprint,
)

ALL_16_TENANTS = [
    {"Id": 16, "Slug": "piqbit", "SchemaName": "tenant_piqbit", "IsActive": True, "Status": "Trial", "Plan": "Trial"},
    {"Id": 22, "Slug": "wellness-medical", "SchemaName": "tenant_wellness_medical", "IsActive": False, "Status": "Suspended", "Plan": "Trial"},
    {"Id": 24, "Slug": "fleur-de-printemps", "SchemaName": "tenant_fleur_de_printemps", "IsActive": False, "Status": "Expired", "Plan": "Trial"},
    {"Id": 25, "Slug": "mansour-construction", "SchemaName": "tenant_mansour_construction", "IsActive": True, "Status": "Trial", "Plan": "Trial"},
    {"Id": 32, "Slug": "stramica", "SchemaName": "tenant_stramica", "IsActive": False, "Status": "Suspended", "Plan": "Trial"},
    {"Id": 34, "Slug": "oise-btp", "SchemaName": "tenant_oise_btp", "IsActive": False, "Status": "Expired", "Plan": "Trial"},
    {"Id": 35, "Slug": "ttv", "SchemaName": "tenant_ttv", "IsActive": True, "Status": "Trial", "Plan": "Trial"},
    {"Id": 36, "Slug": "tucobois", "SchemaName": "tenant_tucobois", "IsActive": False, "Status": "Expired", "Plan": "Trial"},
    {"Id": 37, "Slug": "sheg", "SchemaName": "tenant_sheg", "IsActive": False, "Status": "Expired", "Plan": "Trial"},
    {"Id": 38, "Slug": "socofeb", "SchemaName": "tenant_socofeb", "IsActive": True, "Status": "Active", "Plan": "Pro"},
    {"Id": 39, "Slug": "socobois", "SchemaName": "tenant_socobois", "IsActive": True, "Status": "Trial", "Plan": "Trial"},
    {"Id": 45, "Slug": "rs-auto-service", "SchemaName": "tenant_rs_auto_service", "IsActive": True, "Status": "Trial", "Plan": "Trial"},
    {"Id": 46, "Slug": "zaiemtex", "SchemaName": "tenant_zaiemtex", "IsActive": True, "Status": "Trial", "Plan": "Trial"},
    {"Id": 47, "Slug": "inky-pinky", "SchemaName": "tenant_inky_pinky", "IsActive": True, "Status": "Trial", "Plan": "Trial"},
    {"Id": 48, "Slug": "oxylab", "SchemaName": "tenant_oxylab", "IsActive": True, "Status": "Trial", "Plan": "Trial"},
    {"Id": 49, "Slug": "sotubois", "SchemaName": "tenant_sotubois", "IsActive": True, "Status": "Trial", "Plan": "Trial"},
]

SNAP_2071_FULL = "2071d16434c17e91b18521cd2a6a9bfa47bc3510a3b0fac11f0c16401eb45f59"
SNAP_36A2_FULL = "36a26b4e5f749dc3e9e6746d6d4be27dac2676f26599ac6446cdd160a3216e6a"
SNAP_5A78_FULL = "5a78f6730f080f4090672634a42055da2cfa619cf993ec140b59c3a3173fd8ca"
STAGE_2071 = "/opt/acya-backup/staging/stage-20261106T101110Z-d2ae662f-cb88kl37"


def make_valid_toc(schema_name: str, extra_line: str = "") -> str:
    lines = [
        "; Archive created at 2026-11-06 10:11:15 UTC",
        f"6; 2615 2200 SCHEMA - {schema_name} postgres",
        f"215; 1259 34100 TABLE {schema_name} tbl_app_user postgres",
        f"216; 1259 34110 TABLE {schema_name} tbl_article postgres",
        f"217; 1259 34120 TABLE {schema_name} tbl_document postgres",
        f"218; 1259 34130 SEQUENCE {schema_name} tbl_document_id_seq postgres",
        f"3500; 2606 34200 CONSTRAINT {schema_name} PK_tbl_app_user postgres",
        f"3501; 2606 34201 CONSTRAINT {schema_name} PK_tbl_article postgres",
        f"3502; 2606 34202 CONSTRAINT {schema_name} PK_tbl_document postgres",
    ]
    if extra_line:
        lines.append(extra_line)
    return "\n".join(lines) + "\n"


class DisposableMockDatabaseBackend:
    """In-memory disposable multi-tenant PostgreSQL database simulator."""

    def __init__(self, tenants: List[Dict[str, Any]]):
        self.production_database_name = "wood-app-db"
        self.registry = deepcopy(tenants)
        self.prod_schemas: Dict[str, TenantSchemaFingerprint] = {}
        self.staging_dbs: Dict[str, Dict[str, TenantSchemaFingerprint]] = {}
        self.active_history: List[Tuple[int, bool]] = []

        # Failure injection flags
        self.fail_staging_restore = False
        self.staging_create_extra_schema: Optional[str] = None
        self.fail_pre_restore_backup = False
        self.pre_restore_zero_bytes = False
        self.fail_cutover_restore = False
        self.corrupt_post_restore_table_count = False
        self.mutate_unaffected_tenant_during_cutover: Optional[str] = None
        self.fail_rollback = False
        self.custom_toc_text: Optional[str] = None

        for idx, t in enumerate(self.registry):
            schema = t["SchemaName"]
            self.prod_schemas[schema] = TenantSchemaFingerprint(
                schema_name=schema,
                schema_oid=10000 + idx,
                owner="postgres",
                table_count=61,
                sequence_count=45,
                constraint_count=120,
                table_names=("tbl_app_user", "tbl_article", "tbl_document"),
                total_live_rows=500 + idx * 10,
            )

    def fetch_live_tenant_registry(self) -> List[Dict[str, Any]]:
        return deepcopy(self.registry)

    def inspect_archive_toc(self, dump_path: str) -> str:
        if self.custom_toc_text is not None:
            return self.custom_toc_text
        base = os.path.basename(dump_path)
        if base.startswith("pre_restore_"):
            schema = base[len("pre_restore_"):-len(".dump")]
        else:
            schema = base[:-len(".dump")]
        return make_valid_toc(schema)

    def create_staging_database(self, staging_db_name: str) -> None:
        self.staging_dbs[staging_db_name] = {}

    def drop_staging_database_if_exists(self, staging_db_name: str) -> None:
        self.staging_dbs.pop(staging_db_name, None)

    def restore_dump_to_database(self, database_name: str, schema_name: str, dump_path: str) -> None:
        if database_name != self.production_database_name:
            if self.fail_staging_restore:
                raise RestoreError("Staging", "pg_restore_failed", "Simulated staging pg_restore error")
            self.staging_dbs.setdefault(database_name, {})[schema_name] = TenantSchemaFingerprint(
                schema_name=schema_name,
                schema_oid=99001,
                owner="postgres",
                table_count=61,
                sequence_count=45,
                constraint_count=120,
                table_names=("tbl_app_user", "tbl_article", "tbl_document"),
                total_live_rows=1250,
            )
            if self.staging_create_extra_schema:
                self.staging_dbs[database_name][self.staging_create_extra_schema] = TenantSchemaFingerprint(
                    schema_name=self.staging_create_extra_schema,
                    schema_oid=99002,
                    owner="postgres",
                    table_count=1,
                    sequence_count=0,
                    constraint_count=1,
                    table_names=("tbl_hack",),
                    total_live_rows=1,
                )
            return

        # Production cutover restore
        if self.fail_cutover_restore:
            # Simulate partial broken schema created before failure
            self.prod_schemas[schema_name] = TenantSchemaFingerprint(
                schema_name=schema_name,
                schema_oid=88001,
                owner="postgres",
                table_count=3,
                sequence_count=1,
                constraint_count=1,
                table_names=("tbl_app_user",),
                total_live_rows=0,
            )
            raise RestoreError("CuttingOver", "pg_restore_failed", "Simulated cutover pg_restore failure")

        table_cnt = 12 if self.corrupt_post_restore_table_count else 61
        self.prod_schemas[schema_name] = TenantSchemaFingerprint(
            schema_name=schema_name,
            schema_oid=77001,
            owner="postgres",
            table_count=table_cnt,
            sequence_count=45,
            constraint_count=120,
            table_names=("tbl_app_user", "tbl_article", "tbl_document"),
            total_live_rows=1250,
        )

        if self.mutate_unaffected_tenant_during_cutover:
            other = self.mutate_unaffected_tenant_during_cutover
            old_fp = self.prod_schemas[other]
            self.prod_schemas[other] = TenantSchemaFingerprint(
                schema_name=other,
                schema_oid=old_fp.schema_oid,
                owner=old_fp.owner,
                table_count=old_fp.table_count - 1,
                sequence_count=old_fp.sequence_count,
                constraint_count=old_fp.constraint_count,
                table_names=old_fp.table_names,
                total_live_rows=old_fp.total_live_rows,
            )

    def dump_live_tenant_schema(self, schema_name: str, dest_path: str) -> None:
        if self.fail_pre_restore_backup:
            raise RestoreError("BackingUpCurrent", "pg_dump_failed", "Simulated pre-restore pg_dump failure")
        payload = b"" if self.pre_restore_zero_bytes else f"PGDMP_LIVE_BACKUP:{schema_name}".encode("utf-8")
        fd = os.open(dest_path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "wb") as fh:
            fh.write(payload)

    def list_non_system_schemas(self, database_name: str) -> List[str]:
        if database_name == self.production_database_name:
            return sorted(list(self.prod_schemas.keys()) + ["public"])
        return sorted(list(self.staging_dbs.get(database_name, {}).keys()) + ["public"])

    def inspect_schema_fingerprint(
        self,
        database_name: str,
        schema_name: str,
    ) -> Optional[TenantSchemaFingerprint]:
        if database_name == self.production_database_name:
            return self.prod_schemas.get(schema_name)
        return self.staging_dbs.get(database_name, {}).get(schema_name)

    def set_tenant_active_state(self, tenant_id: int, is_active: bool) -> None:
        self.active_history.append((tenant_id, is_active))
        for r in self.registry:
            if r["Id"] == tenant_id:
                r["IsActive"] = is_active

    def terminate_tenant_sessions(self, schema_name: str) -> None:
        return None

    def rename_production_schema(self, old_schema: str, new_schema: str) -> None:
        fp = self.prod_schemas.pop(old_schema)
        self.prod_schemas[new_schema] = TenantSchemaFingerprint(
            schema_name=new_schema,
            schema_oid=fp.schema_oid,
            owner=fp.owner,
            table_count=fp.table_count,
            sequence_count=fp.sequence_count,
            constraint_count=fp.constraint_count,
            table_names=fp.table_names,
            total_live_rows=fp.total_live_rows,
        )

    def preserve_schema_ownership_and_permissions(self, schema_name: str, owner: str) -> None:
        fp = self.prod_schemas[schema_name]
        self.prod_schemas[schema_name] = TenantSchemaFingerprint(
            schema_name=fp.schema_name,
            schema_oid=fp.schema_oid,
            owner=owner,
            table_count=fp.table_count,
            sequence_count=fp.sequence_count,
            constraint_count=fp.constraint_count,
            table_names=fp.table_names,
            total_live_rows=fp.total_live_rows,
        )

    def drop_production_schema_if_exists(self, schema_name: str) -> None:
        self.prod_schemas.pop(schema_name, None)

    def rollback_production_schema(
        self,
        schema_name: str,
        rollback_schema_name: str,
        pre_restore_dump_path: Optional[str] = None,
    ) -> None:
        if self.fail_rollback:
            raise RestoreError("RollingBack", "rollback_sql_failed", "Simulated catastrophic rollback failure")
        self.prod_schemas.pop(schema_name, None)
        rb_fp = self.prod_schemas.pop(rollback_schema_name)
        self.prod_schemas[schema_name] = TenantSchemaFingerprint(
            schema_name=schema_name,
            schema_oid=rb_fp.schema_oid,
            owner=rb_fp.owner,
            table_count=rb_fp.table_count,
            sequence_count=rb_fp.sequence_count,
            constraint_count=rb_fp.constraint_count,
            table_names=rb_fp.table_names,
            total_live_rows=rb_fp.total_live_rows,
        )


class MockResticExtractor:
    def __init__(self, ls_nodes: List[Dict[str, Any]], dumps: Dict[str, bytes], fail_extract: bool = False):
        self._ls_nodes = ls_nodes
        self._dumps = dumps
        self.fail_extract = fail_extract
        self.extracted_paths: List[str] = []

    def ls(self, snapshot_id: str) -> List[Dict[str, Any]]:
        if self.fail_extract:
            raise RuntimeError("Simulated Restic SFTP transport error")
        return list(self._ls_nodes)

    def dump(self, snapshot_id: str, exact_node_path: str) -> bytes:
        if self.fail_extract:
            raise RuntimeError("Simulated Restic dump failure")
        self.extracted_paths.append(exact_node_path)
        return self._dumps[exact_node_path]


class TenantRestoreEngineTests(unittest.TestCase):
    def setUp(self):
        self._tmpdir = tempfile.TemporaryDirectory()
        self.root = self._tmpdir.name
        self.catalog_path = os.path.join(self.root, "tenant-backup-history.json")
        self.audit_path = os.path.join(self.root, "logs", "restore-audit.jsonl")
        self.state_path = os.path.join(self.root, "state", "last-restore.json")
        self.work_root = os.path.join(self.root, "restore-work")
        self.lock_path = os.path.join(self.root, "locks", "tenant-restore.lock")

        self._setup_fixtures()

    def tearDown(self):
        self._tmpdir.cleanup()

    def _setup_fixtures(self, corrupt_dump_bytes: bool = False):
        self.dump_payloads: Dict[str, bytes] = {}
        manifest_lines = []
        manifest_json_artifacts = []
        ls_nodes = []
        catalog_entries = []

        for t in ALL_16_TENANTS:
            schema = t["SchemaName"]
            rel_path = f"tenants/{schema}.dump"
            full_path = f"{STAGE_2071}/{rel_path}"
            raw_bytes = f"PGDMP_SNAPSHOT_2071:{schema}:DATA".encode("utf-8")
            sha = hashlib.sha256(raw_bytes).hexdigest()
            served_bytes = b"CORRUPTED_BYTES_AFTER_MANIFEST" if (corrupt_dump_bytes and schema == "tenant_socofeb") else raw_bytes

            self.dump_payloads[full_path] = served_bytes
            ls_nodes.append({"type": "file", "path": full_path, "size": len(served_bytes)})
            manifest_lines.append(f"{sha}  {full_path}")
            manifest_json_artifacts.append({
                "relativePath": rel_path,
                "stagedPath": full_path,
                "sizeBytes": len(raw_bytes),
                "sha256": sha,
            })
            catalog_entries.append({
                "snapshotId": SNAP_2071_FULL,
                "snapshotShortId": "2071d164",
                "snapshotTimestamp": "2026-11-06T10:11:37Z",
                "tenantId": t["Id"],
                "tenantSlug": t["Slug"],
                "schemaName": schema,
                "dumpFilename": rel_path,
                "dumpSize": len(raw_bytes),
                "manifestSha256": sha,
                "checksumVerificationStatus": "manifest_recorded_unverified",
                "snapshotVerificationStatus": "verified",
                "tenantPresenceStatus": "present",
                "restoreEligibility": True,
                "restoreEligible": True,
                "ineligibilityReason": None,
            })

        # Also add historical snapshot 36a26b4e where tenant 47 (inky-pinky) is unavailable
        catalog_entries.append({
            "snapshotId": SNAP_36A2_FULL,
            "snapshotShortId": "36a26b4e",
            "snapshotTimestamp": "2026-10-13T10:52:27Z",
            "tenantId": 47,
            "tenantSlug": "inky-pinky",
            "schemaName": "tenant_inky_pinky",
            "dumpFilename": None,
            "dumpSize": None,
            "manifestSha256": None,
            "checksumVerificationStatus": "missing",
            "snapshotVerificationStatus": "verified",
            "tenantPresenceStatus": "unavailable",
            "restoreEligibility": False,
            "restoreEligible": False,
            "ineligibilityReason": "tenant_not_present_in_snapshot",
        })

        # Also add degraded snapshot 5a78f673
        catalog_entries.append({
            "snapshotId": SNAP_5A78_FULL,
            "snapshotShortId": "5a78f673",
            "snapshotTimestamp": "2026-10-05T07:57:56Z",
            "tenantId": 38,
            "tenantSlug": "socofeb",
            "schemaName": "tenant_socofeb",
            "dumpFilename": "tenants/tenant_socofeb.dump",
            "dumpSize": 481000,
            "manifestSha256": None,
            "checksumVerificationStatus": "missing",
            "snapshotVerificationStatus": "degraded",
            "tenantPresenceStatus": "present",
            "restoreEligibility": False,
            "restoreEligible": False,
            "ineligibilityReason": "manifest_entry_missing",
        })

        manifest_txt_bytes = ("\n".join(manifest_lines) + "\n").encode("utf-8")
        manifest_json_bytes = json.dumps({
            "schema": "acya.backup.manifest/v1",
            "artifacts": manifest_json_artifacts,
        }).encode("utf-8")
        registry_json_bytes = json.dumps(ALL_16_TENANTS).encode("utf-8")

        m_txt_path = f"{STAGE_2071}/metadata/manifest.txt"
        m_json_path = f"{STAGE_2071}/metadata/manifest.json"
        r_json_path = f"{STAGE_2071}/metadata/tenant-registry.json"

        self.dump_payloads[m_txt_path] = manifest_txt_bytes
        self.dump_payloads[m_json_path] = manifest_json_bytes
        self.dump_payloads[r_json_path] = registry_json_bytes

        ls_nodes.extend([
            {"type": "file", "path": m_txt_path, "size": len(manifest_txt_bytes)},
            {"type": "file", "path": m_json_path, "size": len(manifest_json_bytes)},
            {"type": "file", "path": r_json_path, "size": len(registry_json_bytes)},
        ])
        self.ls_nodes = ls_nodes

        catalog_doc = {
            "schema": CATALOG_SCHEMA,
            "snapshots": [
                {
                    "snapshotId": SNAP_2071_FULL,
                    "snapshotShortId": "2071d164",
                    "snapshotTimestamp": "2026-11-06T10:11:37Z",
                    "stagingRoot": STAGE_2071,
                    "snapshotVerificationStatus": "verified",
                },
                {
                    "snapshotId": SNAP_36A2_FULL,
                    "snapshotShortId": "36a26b4e",
                    "snapshotTimestamp": "2026-10-13T10:52:27Z",
                    "stagingRoot": "/var/backups/acya-backup-stage-wBiNgj",
                    "snapshotVerificationStatus": "verified",
                },
                {
                    "snapshotId": SNAP_5A78_FULL,
                    "snapshotShortId": "5a78f673",
                    "snapshotTimestamp": "2026-10-05T07:57:56Z",
                    "stagingRoot": "/home/ubuntu/acya-backup-stage",
                    "snapshotVerificationStatus": "degraded",
                },
            ],
            "entries": catalog_entries,
        }
        with open(self.catalog_path, "w", encoding="utf-8") as fh:
            json.dump(catalog_doc, fh, indent=2)

    def _build_engine(self, db_backend=None, restic_mock=None):
        db = db_backend or DisposableMockDatabaseBackend(ALL_16_TENANTS)
        restic = restic_mock or MockResticExtractor(self.ls_nodes, self.dump_payloads)
        audit = RestoreAuditLogger(self.audit_path, self.state_path)
        engine = TenantRestoreEngine(
            validator=RestoreRequestValidator(self.catalog_path),
            extractor=SnapshotArtifactExtractor(restic),
            verifier=ArtifactChecksumVerifier(),
            staging_validator=StagingDatabaseValidator(
                db, required_tables=("tbl_app_user", "tbl_article", "tbl_document")
            ),
            pre_backup_manager=PreRestoreBackupManager(db),
            db_backend=db,
            audit_logger=audit,
            work_root_dir=self.work_root,
            lock_file_path=self.lock_path,
        )
        return engine, db, restic

    def test_01_invalid_tenant_ids_rejected(self):
        engine, _, _ = self._build_engine()
        for bad_tenant_id in (0, -5, True, False, "38", None, 9999):
            res = engine.execute_restore(tenant_id=bad_tenant_id, snapshot_id="2071d164")
            self.assertEqual(res.final_state, RestoreState.FAILED)
            self.assertEqual(res.state_history, ["Pending", "Failed"])
            self.assertIn(res.error_category, ("invalid_tenant_id", "tenant_not_found_in_registry"))

    def test_02_invalid_snapshot_ids_rejected(self):
        engine, _, _ = self._build_engine()
        for bad_snap_id in ("", "2071d16", "2071D164", "../etc/passwd", "deadbeef", None):
            res = engine.execute_restore(tenant_id=38, snapshot_id=bad_snap_id)
            self.assertEqual(res.final_state, RestoreState.FAILED)
            self.assertEqual(res.state_history, ["Pending", "Failed"])
            self.assertIn(res.error_category, ("invalid_snapshot_id", "snapshot_not_found"))

    def test_03_missing_tenant_artifacts_in_historical_snapshot_rejected(self):
        engine, _, _ = self._build_engine()
        # Tenant 47 (inky-pinky) was created after snapshot 36a26b4e
        res = engine.execute_restore(tenant_id=47, snapshot_id="36a26b4e")
        self.assertEqual(res.final_state, RestoreState.FAILED)
        self.assertEqual(res.state_history, ["Pending", "Failed"])
        self.assertEqual(res.error_category, "tenant_not_present_in_snapshot")

    def test_04_degraded_snapshot_rejected(self):
        engine, _, _ = self._build_engine()
        # Snapshot 5a78f673 has snapshotVerificationStatus == 'degraded'
        res = engine.execute_restore(tenant_id=38, snapshot_id="5a78f673")
        self.assertEqual(res.final_state, RestoreState.FAILED)
        self.assertEqual(res.state_history, ["Pending", "Failed"])
        self.assertEqual(res.error_category, "snapshot_not_verified")

    def test_05_checksum_mismatch_and_forbidden_global_toc_rejected(self):
        self._setup_fixtures(corrupt_dump_bytes=True)
        engine, _, _ = self._build_engine()
        res = engine.execute_restore(tenant_id=38, snapshot_id="2071d164")
        self.assertEqual(res.final_state, RestoreState.FAILED)
        self.assertEqual(res.state_history, ["Pending", "Extracting", "Verifying", "Failed"])
        self.assertIn(res.error_category, ("extracted_dump_size_mismatch", "checksum_mismatch"))
        self.assertTrue(res.recovery_artifacts_retained)

        # Also test forbidden global ROLE object in archive TOC
        self._setup_fixtures(corrupt_dump_bytes=False)
        db = DisposableMockDatabaseBackend(ALL_16_TENANTS)
        db.custom_toc_text = make_valid_toc(
            "tenant_socofeb",
            extra_line="1; 1260 10 ROLE - superuser_hack postgres",
        )
        engine2, _, _ = self._build_engine(db_backend=db)
        res2 = engine2.execute_restore(tenant_id=38, snapshot_id="2071d164")
        self.assertEqual(res2.final_state, RestoreState.FAILED)
        self.assertEqual(res2.state_history, ["Pending", "Extracting", "Verifying", "Failed"])
        self.assertEqual(res2.error_category, "forbidden_global_object_in_dump")

    def test_06_extraction_failure_handled_safely(self):
        restic = MockResticExtractor(self.ls_nodes, self.dump_payloads, fail_extract=True)
        engine, _, _ = self._build_engine(restic_mock=restic)
        res = engine.execute_restore(tenant_id=38, snapshot_id="2071d164")
        self.assertEqual(res.final_state, RestoreState.FAILED)
        self.assertEqual(res.state_history, ["Pending", "Extracting", "Failed"])
        self.assertEqual(res.error_category, "restic_ls_failed")

    def test_07_staging_restore_failure_aborts_before_touching_production(self):
        db = DisposableMockDatabaseBackend(ALL_16_TENANTS)
        db.fail_staging_restore = True
        orig_fp = db.prod_schemas["tenant_socofeb"]

        engine, _, _ = self._build_engine(db_backend=db)
        res = engine.execute_restore(tenant_id=38, snapshot_id="2071d164")

        self.assertEqual(res.final_state, RestoreState.FAILED)
        self.assertEqual(res.state_history, ["Pending", "Extracting", "Verifying", "Staging", "Failed"])
        self.assertEqual(res.error_category, "pg_restore_failed")
        # Live production schema was never touched and staging DB was cleaned up
        self.assertEqual(db.prod_schemas["tenant_socofeb"], orig_fp)
        self.assertEqual(db.staging_dbs, {})

    def test_08_pre_restore_backup_failure_aborts_before_cutover(self):
        db = DisposableMockDatabaseBackend(ALL_16_TENANTS)
        db.fail_pre_restore_backup = True
        orig_fp = db.prod_schemas["tenant_socofeb"]

        engine, _, _ = self._build_engine(db_backend=db)
        res = engine.execute_restore(tenant_id=38, snapshot_id="2071d164")

        self.assertEqual(res.final_state, RestoreState.FAILED)
        self.assertEqual(
            res.state_history,
            ["Pending", "Extracting", "Verifying", "Staging", "Prepared", "BackingUpCurrent", "Failed"],
        )
        self.assertEqual(res.error_category, "pg_dump_failed")
        self.assertEqual(db.prod_schemas["tenant_socofeb"], orig_fp)
        self.assertEqual(db.active_history, [])

    def test_09_cutover_failure_triggers_automatic_rollback_and_retains_artifacts(self):
        db = DisposableMockDatabaseBackend(ALL_16_TENANTS)
        db.fail_cutover_restore = True
        orig_fp = db.prod_schemas["tenant_socofeb"]

        engine, _, _ = self._build_engine(db_backend=db)
        res = engine.execute_restore(tenant_id=38, snapshot_id="2071d164")

        self.assertEqual(res.final_state, RestoreState.ROLLED_BACK)
        self.assertEqual(
            res.state_history,
            [
                "Pending",
                "Extracting",
                "Verifying",
                "Staging",
                "Prepared",
                "BackingUpCurrent",
                "CuttingOver",
                "RollingBack",
                "RolledBack",
            ],
        )
        self.assertTrue(res.rollback_performed)
        self.assertTrue(res.rollback_succeeded)
        self.assertTrue(res.recovery_artifacts_retained)
        self.assertTrue(os.path.isfile(res.pre_restore_backup_path))
        # Original schema and live rows are completely restored
        self.assertEqual(db.prod_schemas["tenant_socofeb"], orig_fp)
        # Tenant was deactivated before cutover and reactivated during rollback
        self.assertEqual(db.active_history, [(38, False), (38, True)])

    def test_10_post_restore_validation_failure_triggers_rollback(self):
        db = DisposableMockDatabaseBackend(ALL_16_TENANTS)
        db.corrupt_post_restore_table_count = True
        orig_fp = db.prod_schemas["tenant_socofeb"]

        engine, _, _ = self._build_engine(db_backend=db)
        res = engine.execute_restore(tenant_id=38, snapshot_id="2071d164")

        self.assertEqual(res.final_state, RestoreState.ROLLED_BACK)
        self.assertEqual(
            res.state_history,
            [
                "Pending",
                "Extracting",
                "Verifying",
                "Staging",
                "Prepared",
                "BackingUpCurrent",
                "CuttingOver",
                "Validating",
                "RollingBack",
                "RolledBack",
            ],
        )
        self.assertEqual(res.error_category, "post_restore_table_count_mismatch")
        self.assertEqual(db.prod_schemas["tenant_socofeb"], orig_fp)

    def test_11_rollback_failure_enters_rollback_failed_and_preserves_pre_restore_backup(self):
        db = DisposableMockDatabaseBackend(ALL_16_TENANTS)
        db.fail_cutover_restore = True
        db.fail_rollback = True

        engine, _, _ = self._build_engine(db_backend=db)
        res = engine.execute_restore(tenant_id=38, snapshot_id="2071d164")

        self.assertEqual(res.final_state, RestoreState.ROLLBACK_FAILED)
        self.assertTrue(res.rollback_performed)
        self.assertFalse(res.rollback_succeeded)
        self.assertTrue(res.recovery_artifacts_retained)
        self.assertTrue(os.path.isfile(res.pre_restore_backup_path))

    def test_12_concurrent_restore_prevention(self):
        engine, _, _ = self._build_engine()
        os.makedirs(os.path.dirname(self.lock_path), exist_ok=True)
        lock_fd = os.open(self.lock_path, os.O_WRONLY | os.O_CREAT, 0o600)
        fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        try:
            with self.assertRaises(RestoreError) as ctx:
                engine.execute_restore(tenant_id=38, snapshot_id="2071d164")
            self.assertEqual(ctx.exception.category, "concurrent_restore_in_progress")
        finally:
            fcntl.flock(lock_fd, fcntl.LOCK_UN)
            os.close(lock_fd)

    def test_13_successful_single_tenant_restore_and_15_tenant_isolation(self):
        db = DisposableMockDatabaseBackend(ALL_16_TENANTS)
        unaffected_before = {
            s: fp for s, fp in db.prod_schemas.items() if s != "tenant_socofeb"
        }
        self.assertEqual(len(unaffected_before), 15)

        engine, _, restic = self._build_engine(db_backend=db)
        res = engine.execute_restore(tenant_id=38, snapshot_id="2071d164", actor="superadmin@acya.site")

        self.assertEqual(res.final_state, RestoreState.COMPLETED)
        self.assertEqual(
            res.state_history,
            [
                "Pending",
                "Extracting",
                "Verifying",
                "Staging",
                "Prepared",
                "BackingUpCurrent",
                "CuttingOver",
                "Validating",
                "Completed",
            ],
        )
        self.assertEqual(res.tenant_id, 38)
        self.assertEqual(res.tenant_slug, "socofeb")
        self.assertEqual(res.schema_name, "tenant_socofeb")
        self.assertEqual(res.unaffected_tenant_count, 15)
        self.assertEqual(res.restored_table_count, 61)
        self.assertFalse(res.rollback_performed)
        self.assertTrue(os.path.isfile(res.pre_restore_backup_path))

        # Verify only tenant_socofeb.dump + metadata were extracted from Restic
        dump_extractions = [p for p in restic.extracted_paths if p.endswith(".dump")]
        self.assertEqual(dump_extractions, [f"{STAGE_2071}/tenants/tenant_socofeb.dump"])

        # Verify tenant was deactivated during cutover and reactivated after validation
        self.assertEqual(db.active_history, [(38, False), (38, True)])

        # Verify all 15 unaffected tenants are 100% identical to before
        for schema, fp_before in unaffected_before.items():
            self.assertEqual(db.prod_schemas[schema], fp_before)

        # Verify immutable audit log entries and hash chain
        with open(self.audit_path, "r", encoding="utf-8") as fh:
            audit_entries = [json.loads(line) for line in fh if line.strip()]
        self.assertEqual(len(audit_entries), 9)
        prev_hash = "0" * 64
        for entry in audit_entries:
            self.assertEqual(entry["previousEntryHash"], prev_hash)
            prev_hash = entry["entryHash"]

    def test_14_unaffected_tenant_modification_detected_and_triggers_rollback(self):
        db = DisposableMockDatabaseBackend(ALL_16_TENANTS)
        db.mutate_unaffected_tenant_during_cutover = "tenant_piqbit"

        engine, _, _ = self._build_engine(db_backend=db)
        res = engine.execute_restore(tenant_id=38, snapshot_id="2071d164")

        self.assertEqual(res.final_state, RestoreState.ROLLED_BACK)
        self.assertEqual(res.error_category, "unaffected_tenant_modified")
        self.assertTrue(res.rollback_performed)
        self.assertTrue(res.rollback_succeeded)


if __name__ == "__main__":
    unittest.main(verbosity=2)

#!/usr/bin/env python3
"""Unit tests for ACYA Phase 11C.1.7b Tenant Backup History Indexer.

Uses in-memory fixtures and mock Restic readers only. Never accesses or modifies
the production Restic repository, PostgreSQL databases, or staging directories.
"""

import json
import os
import stat
import sys
import tempfile
import unittest

_HERE = os.path.dirname(os.path.realpath(__file__))
_LIB = os.path.normpath(os.path.join(_HERE, "..", "lib"))
if _LIB not in sys.path:
    sys.path.insert(0, _LIB)

from acya_backup.errors import BackupError
from acya_backup.history import (
    CATALOG_SCHEMA,
    TenantBackupHistoryIndexer,
    discover_staging_root,
    validate_snapshot_id,
    validate_tenant_schema_mapping,
    write_tenant_backup_history,
)

ALL_16_TENANTS = [
    {"Id": 16, "Slug": "piqbit", "SchemaName": "tenant_piqbit", "IsActive": True, "Status": "Trial"},
    {"Id": 22, "Slug": "wellness-medical", "SchemaName": "tenant_wellness_medical", "IsActive": False, "Status": "Suspended"},
    {"Id": 24, "Slug": "fleur-de-printemps", "SchemaName": "tenant_fleur_de_printemps", "IsActive": False, "Status": "Expired"},
    {"Id": 25, "Slug": "mansour-construction", "SchemaName": "tenant_mansour_construction", "IsActive": True, "Status": "Trial"},
    {"Id": 32, "Slug": "stramica", "SchemaName": "tenant_stramica", "IsActive": False, "Status": "Suspended"},
    {"Id": 34, "Slug": "oise-btp", "SchemaName": "tenant_oise_btp", "IsActive": False, "Status": "Expired"},
    {"Id": 35, "Slug": "ttv", "SchemaName": "tenant_ttv", "IsActive": True, "Status": "Trial"},
    {"Id": 36, "Slug": "tucobois", "SchemaName": "tenant_tucobois", "IsActive": False, "Status": "Expired"},
    {"Id": 37, "Slug": "sheg", "SchemaName": "tenant_sheg", "IsActive": False, "Status": "Expired"},
    {"Id": 38, "Slug": "socofeb", "SchemaName": "tenant_socofeb", "IsActive": True, "Status": "Active"},
    {"Id": 39, "Slug": "socobois", "SchemaName": "tenant_socobois", "IsActive": True, "Status": "Trial"},
    {"Id": 45, "Slug": "rs-auto-service", "SchemaName": "tenant_rs_auto_service", "IsActive": True, "Status": "Trial"},
    {"Id": 46, "Slug": "zaiemtex", "SchemaName": "tenant_zaiemtex", "IsActive": True, "Status": "Trial"},
    {"Id": 47, "Slug": "inky-pinky", "SchemaName": "tenant_inky_pinky", "IsActive": True, "Status": "Trial"},
    {"Id": 48, "Slug": "oxylab", "SchemaName": "tenant_oxylab", "IsActive": True, "Status": "Trial"},
    {"Id": 49, "Slug": "sotubois", "SchemaName": "tenant_sotubois", "IsActive": True, "Status": "Trial"},
]

TENANTS_11 = ALL_16_TENANTS[:11]   # Ids 16..39
TENANTS_12 = ALL_16_TENANTS[:12]   # Ids 16..45 (+ rs-auto-service)
TENANTS_13 = ALL_16_TENANTS[:13]   # Ids 16..46 (+ zaiemtex)

SNAP_2071_ID = "2071d16434c17e91b18521cd2a6a9bfa47bc3510a3b0fac11f0c16401eb45f59"
SNAP_36A2_ID = "36a26b4e5f749dc3a11223344556677889900aabbccddeeff001122334455667"
SNAP_F93A_ID = "f93ac4c400bb35a3a11223344556677889900aabbccddeeff001122334455667"
SNAP_1FBD_ID = "1fbd94a9328e54a0a11223344556677889900aabbccddeeff001122334455667"
SNAP_BBB6_ID = "bbb68d5db4953b8ba11223344556677889900aabbccddeeff001122334455667"
SNAP_5A78_ID = "5a78f6730f080f40a11223344556677889900aabbccddeeff001122334455667"


def _sha_for(label: str) -> str:
    import hashlib
    return hashlib.sha256(label.encode("utf-8")).hexdigest()


def build_snapshot_fixture(
    full_id: str,
    timestamp: str,
    staging_root: str,
    tenants: list,
    *,
    include_manifest_json: bool = False,
    include_registry_json: bool = True,
    omit_dump_for_schemas: tuple = (),
    zero_size_for_schemas: tuple = (),
    omit_manifest_for_schemas: tuple = (),
    corrupt_manifest_json_for_schemas: tuple = (),
):
    """Build synthetic Restic snapshot metadata, `ls` entries, and `dump` payloads."""
    snap_meta = {
        "id": full_id,
        "short_id": full_id[:8],
        "time": timestamp,
        "hostname": "vps-1d2bffb5",
        "paths": [staging_root, "/etc/nginx"],
    }

    ls_nodes = []
    manifest_lines = []
    manifest_json_entries = []
    dumps_map = {}

    for idx, t in enumerate(tenants):
        schema = t["SchemaName"]
        rel_path = f"tenants/{schema}.dump"
        full_path = f"{staging_root}/{rel_path}"
        size = 0 if schema in zero_size_for_schemas else (290000 + idx * 512)
        digest = _sha_for(f"{full_id}:{schema}")

        if schema not in omit_dump_for_schemas:
            ls_nodes.append({"type": "file", "path": full_path, "size": size})

        if schema not in omit_manifest_for_schemas:
            manifest_lines.append(f"{digest}  {full_path}")
            json_digest = _sha_for("mismatch") if schema in corrupt_manifest_json_for_schemas else digest
            manifest_json_entries.append({
                "relativePath": rel_path,
                "sha256": json_digest,
                "sizeBytes": size,
            })

    manifest_txt_bytes = ("\n".join(manifest_lines) + "\n").encode("utf-8")
    manifest_txt_full = f"{staging_root}/metadata/manifest.txt"
    ls_nodes.append({"type": "file", "path": manifest_txt_full, "size": len(manifest_txt_bytes)})
    dumps_map[manifest_txt_full] = manifest_txt_bytes

    if include_registry_json:
        reg_bytes = json.dumps(tenants, indent=2).encode("utf-8")
        reg_full = f"{staging_root}/metadata/tenant-registry.json"
        ls_nodes.append({"type": "file", "path": reg_full, "size": len(reg_bytes)})
        dumps_map[reg_full] = reg_bytes

    if include_manifest_json:
        mjson_bytes = json.dumps({
            "schema": "acya.backup.manifest/v1",
            "entries": manifest_json_entries,
        }).encode("utf-8")
        mjson_full = f"{staging_root}/metadata/manifest.json"
        ls_nodes.append({"type": "file", "path": mjson_full, "size": len(mjson_bytes)})
        dumps_map[mjson_full] = mjson_bytes

    return snap_meta, ls_nodes, dumps_map


class MockResticReader:
    """In-memory mock Restic reader that tracks every dumped path."""

    def __init__(self, snapshots_list, ls_by_id, dumps_by_id):
        self._snapshots = snapshots_list
        self._ls_by_id = ls_by_id
        self._dumps_by_id = dumps_by_id
        self.dumped_paths = []

    def snapshots(self):
        return list(self._snapshots)

    def ls(self, snapshot_id: str):
        if snapshot_id not in self._ls_by_id:
            raise BackupError("history_index", "snapshot_ls_failed", "unknown snapshot", 70)
        return list(self._ls_by_id[snapshot_id])

    def dump(self, snapshot_id: str, exact_node_path: str) -> bytes:
        if exact_node_path.endswith(".dump"):
            raise AssertionError(f"Database dump extraction attempted: {exact_node_path}")
        self.dumped_paths.append((snapshot_id, exact_node_path))
        return self._dumps_by_id[snapshot_id][exact_node_path]


class TenantBackupHistoryTests(unittest.TestCase):
    def _build_six_snapshot_mock(self) -> MockResticReader:
        specs = [
            (SNAP_5A78_ID, "2026-10-05T07:57:56Z", "/home/ubuntu/acya-backup-stage", TENANTS_11, False),
            (SNAP_BBB6_ID, "2026-10-05T12:05:50Z", "/var/backups/acya-backup-stage-d8ORiO", TENANTS_11, False),
            (SNAP_1FBD_ID, "2026-10-05T12:29:47Z", "/var/backups/acya-backup-stage-UgTTHX", TENANTS_11, False),
            (SNAP_F93A_ID, "2026-10-11T10:58:47Z", "/var/backups/acya-backup-stage-pZR8g8", TENANTS_12, False),
            (SNAP_36A2_ID, "2026-10-13T10:52:27Z", "/var/backups/acya-backup-stage-wBiNgj", TENANTS_13, False),
            (SNAP_2071_ID, "2026-11-06T06:44:22Z", "/opt/acya-backup/staging/stage-20261106T064232Z-9fa6a8a2", ALL_16_TENANTS, True),
        ]
        snaps, ls_by_id, dumps_by_id = [], {}, {}
        for fid, ts, root, tenants, has_mjson in specs:
            s_meta, s_ls, s_dumps = build_snapshot_fixture(
                fid, ts, root, tenants, include_manifest_json=has_mjson
            )
            snaps.append(s_meta)
            ls_by_id[fid] = s_ls
            dumps_by_id[fid] = s_dumps
        return MockResticReader(snaps, ls_by_id, dumps_by_id)

    def test_01_all_16_tenants_in_snapshot_2071d164_are_eligible_and_unverified_post_extraction(self):
        reader = self._build_six_snapshot_mock()
        catalog = TenantBackupHistoryIndexer(reader).build_catalog()

        self.assertEqual(catalog["schema"], CATALOG_SCHEMA)
        self.assertEqual(catalog["snapshotCount"], 6)
        self.assertEqual(catalog["knownTenantCount"], 16)
        self.assertEqual(catalog["totalEntries"], 6 * 16)

        entries_2071 = [e for e in catalog["entries"] if e["snapshotShortId"] == "2071d164"]
        self.assertEqual(len(entries_2071), 16)

        for entry in entries_2071:
            self.assertEqual(entry["snapshotId"], SNAP_2071_ID)
            self.assertEqual(entry["tenantPresenceStatus"], "present")
            self.assertEqual(entry["snapshotVerificationStatus"], "verified")
            self.assertEqual(entry["checksumVerificationStatus"], "manifest_recorded_unverified")
            self.assertTrue(entry["restoreEligibility"])
            self.assertTrue(entry["restoreEligible"])
            self.assertIsNone(entry["ineligibilityReason"])
            self.assertTrue(entry["dumpFilename"].startswith("tenants/tenant_"))
            self.assertGreater(entry["dumpSize"], 0)
            self.assertRegex(entry["manifestSha256"], r"^[0-9a-f]{64}$")

        # Verify zero database dumps were extracted during indexing
        for _, path in reader.dumped_paths:
            self.assertFalse(path.endswith(".dump"))

    def test_02_historical_snapshots_with_11_12_and_13_tenants(self):
        reader = self._build_six_snapshot_mock()
        catalog = TenantBackupHistoryIndexer(reader).build_catalog()

        by_short = {s["snapshotShortId"]: s for s in catalog["snapshots"]}
        self.assertEqual(by_short["5a78f673"]["presentTenantCount"], 11)
        self.assertEqual(by_short["5a78f673"]["eligibleTenantCount"], 11)
        self.assertEqual(by_short["bbb68d5d"]["presentTenantCount"], 11)
        self.assertEqual(by_short["1fbd94a9"]["presentTenantCount"], 11)
        self.assertEqual(by_short["f93ac4c4"]["presentTenantCount"], 12)
        self.assertEqual(by_short["f93ac4c4"]["eligibleTenantCount"], 12)
        self.assertEqual(by_short["36a26b4e"]["presentTenantCount"], 13)
        self.assertEqual(by_short["36a26b4e"]["eligibleTenantCount"], 13)
        self.assertEqual(by_short["2071d164"]["presentTenantCount"], 16)
        self.assertEqual(by_short["2071d164"]["eligibleTenantCount"], 16)

    def test_03_tenants_created_after_historical_snapshots_marked_unavailable(self):
        reader = self._build_six_snapshot_mock()
        catalog = TenantBackupHistoryIndexer(reader).build_catalog()
        tenants_by_slug = {t["tenantSlug"]: t for t in catalog["tenants"]}

        # inky-pinky, oxylab, sotubois were created after 36a26b4e -> only 1 eligible snapshot (2071d164)
        for late_slug in ("inky-pinky", "oxylab", "sotubois"):
            t_summary = tenants_by_slug[late_slug]
            self.assertEqual(t_summary["eligibleSnapshotCount"], 1)
            self.assertEqual(t_summary["latestRestoreEligibleSnapshotId"], SNAP_2071_ID)

            by_snap = {h["snapshotShortId"]: h for h in t_summary["history"]}
            self.assertTrue(by_snap["2071d164"]["restoreEligibility"])
            for older_short in ("36a26b4e", "f93ac4c4", "1fbd94a9", "bbb68d5d", "5a78f673"):
                older_entry = by_snap[older_short]
                self.assertEqual(older_entry["tenantPresenceStatus"], "unavailable")
                self.assertFalse(older_entry["restoreEligibility"])
                self.assertEqual(older_entry["ineligibilityReason"], "tenant_not_present_in_snapshot")
                self.assertIsNone(older_entry["dumpFilename"])
                self.assertIsNone(older_entry["dumpSize"])
                self.assertIsNone(older_entry["manifestSha256"])

        # zaiemtex existed in 36a26b4e and 2071d164 (2 snapshots)
        self.assertEqual(tenants_by_slug["zaiemtex"]["eligibleSnapshotCount"], 2)
        # rs-auto-service existed in f93ac4c4, 36a26b4e, and 2071d164 (3 snapshots)
        self.assertEqual(tenants_by_slug["rs-auto-service"]["eligibleSnapshotCount"], 3)
        # socofeb existed in all 6 snapshots
        self.assertEqual(tenants_by_slug["socofeb"]["eligibleSnapshotCount"], 6)

    def test_04_missing_and_empty_dump_files_marked_ineligible(self):
        s_meta, s_ls, s_dumps = build_snapshot_fixture(
            SNAP_2071_ID,
            "2026-11-06T06:44:22Z",
            "/opt/acya-backup/staging/stage-test",
            ALL_16_TENANTS,
            include_manifest_json=True,
            omit_dump_for_schemas=("tenant_socofeb",),
            zero_size_for_schemas=("tenant_piqbit",),
        )
        reader = MockResticReader([s_meta], {SNAP_2071_ID: s_ls}, {SNAP_2071_ID: s_dumps})
        catalog = TenantBackupHistoryIndexer(reader).build_catalog()
        by_slug = {e["tenantSlug"]: e for e in catalog["entries"]}

        socofeb = by_slug["socofeb"]
        self.assertEqual(socofeb["tenantPresenceStatus"], "missing_dump")
        self.assertFalse(socofeb["restoreEligibility"])
        self.assertEqual(socofeb["ineligibilityReason"], "dump_file_missing")

        piqbit = by_slug["piqbit"]
        self.assertEqual(piqbit["tenantPresenceStatus"], "present")
        self.assertFalse(piqbit["restoreEligibility"])
        self.assertEqual(piqbit["ineligibilityReason"], "dump_file_empty")

    def test_05_missing_manifest_entries_and_manifest_json_mismatch(self):
        s_meta, s_ls, s_dumps = build_snapshot_fixture(
            SNAP_2071_ID,
            "2026-11-06T06:44:22Z",
            "/opt/acya-backup/staging/stage-test",
            ALL_16_TENANTS,
            include_manifest_json=True,
            omit_manifest_for_schemas=("tenant_ttv",),
            corrupt_manifest_json_for_schemas=("tenant_socobois",),
        )
        reader = MockResticReader([s_meta], {SNAP_2071_ID: s_ls}, {SNAP_2071_ID: s_dumps})
        catalog = TenantBackupHistoryIndexer(reader).build_catalog()
        by_slug = {e["tenantSlug"]: e for e in catalog["entries"]}

        ttv = by_slug["ttv"]
        self.assertFalse(ttv["restoreEligibility"])
        self.assertEqual(ttv["ineligibilityReason"], "manifest_entry_missing")
        self.assertEqual(ttv["checksumVerificationStatus"], "missing")

        socobois = by_slug["socobois"]
        self.assertFalse(socobois["restoreEligibility"])
        self.assertEqual(socobois["ineligibilityReason"], "manifest_json_mismatch")
        self.assertEqual(socobois["checksumVerificationStatus"], "manifest_mismatch")

    def test_06_invalid_tenant_schema_mapping_rejected(self):
        valid, err = validate_tenant_schema_mapping("socofeb", "tenant_other_schema")
        self.assertFalse(valid)
        self.assertEqual(err, "invalid_tenant_schema_mapping")

        bad_tenants = list(TENANTS_11) + [
            {"Id": 99, "Slug": "bad-tenant", "SchemaName": "tenant_wrong_name", "IsActive": True}
        ]
        s_meta, s_ls, s_dumps = build_snapshot_fixture(
            SNAP_2071_ID,
            "2026-11-06T06:44:22Z",
            "/opt/acya-backup/staging/stage-test",
            bad_tenants,
        )
        reader = MockResticReader([s_meta], {SNAP_2071_ID: s_ls}, {SNAP_2071_ID: s_dumps})
        catalog = TenantBackupHistoryIndexer(reader).build_catalog()
        by_slug = {e["tenantSlug"]: e for e in catalog["entries"]}

        bad_entry = by_slug["bad-tenant"]
        self.assertFalse(bad_entry["restoreEligibility"])
        self.assertEqual(bad_entry["ineligibilityReason"], "invalid_tenant_schema_mapping")
        self.assertEqual(bad_entry["tenantPresenceStatus"], "invalid_mapping")

    def test_07_malformed_snapshot_metadata_fails_closed(self):
        s_meta, s_ls, s_dumps = build_snapshot_fixture(
            SNAP_36A2_ID,
            "2026-10-13T10:52:27Z",
            "/var/backups/acya-backup-stage-wBiNgj",
            TENANTS_13,
        )
        # Corrupt manifest.txt with non-hex digest
        s_dumps["/var/backups/acya-backup-stage-wBiNgj/metadata/manifest.txt"] = b"NOT_A_SHA256  /bad/path\n"

        # Add a second valid snapshot so known tenants are populated
        s2_meta, s2_ls, s2_dumps = build_snapshot_fixture(
            SNAP_2071_ID,
            "2026-11-06T06:44:22Z",
            "/opt/acya-backup/staging/stage-ok",
            ALL_16_TENANTS,
        )
        reader = MockResticReader(
            [s_meta, s2_meta],
            {SNAP_36A2_ID: s_ls, SNAP_2071_ID: s2_ls},
            {SNAP_36A2_ID: s_dumps, SNAP_2071_ID: s2_dumps},
        )
        catalog = TenantBackupHistoryIndexer(reader).build_catalog()

        bad_snap = next(s for s in catalog["snapshots"] if s["snapshotShortId"] == "36a26b4e")
        self.assertEqual(bad_snap["snapshotVerificationStatus"], "invalid")
        self.assertEqual(bad_snap["snapshotError"], "snapshot_metadata_malformed")
        self.assertEqual(bad_snap["eligibleTenantCount"], 0)

        for entry in [e for e in catalog["entries"] if e["snapshotShortId"] == "36a26b4e"]:
            self.assertFalse(entry["restoreEligibility"])
            self.assertEqual(entry["ineligibilityReason"], "snapshot_metadata_malformed")

    def test_08_duplicate_or_ambiguous_staging_roots_rejected(self):
        ambiguous_snap = {
            "id": SNAP_36A2_ID,
            "short_id": "36a26b4e",
            "time": "2026-10-13T10:52:27Z",
            "paths": [
                "/opt/acya-backup/staging/stage-one",
                "/opt/acya-backup/staging/stage-two",
            ],
        }
        root, err = discover_staging_root(ambiguous_snap, [])
        self.assertIsNone(root)
        self.assertEqual(err, "staging_root_ambiguous")

        missing_snap = {
            "id": SNAP_1FBD_ID,
            "short_id": "1fbd94a9",
            "time": "2026-10-05T12:29:47Z",
            "paths": ["/etc/nginx"],
        }
        root2, err2 = discover_staging_root(missing_snap, [])
        self.assertIsNone(root2)
        self.assertEqual(err2, "staging_root_missing")

        s2_meta, s2_ls, s2_dumps = build_snapshot_fixture(
            SNAP_2071_ID,
            "2026-11-06T06:44:22Z",
            "/opt/acya-backup/staging/stage-ok",
            ALL_16_TENANTS,
        )
        reader = MockResticReader(
            [ambiguous_snap, missing_snap, s2_meta],
            {SNAP_36A2_ID: [], SNAP_1FBD_ID: [], SNAP_2071_ID: s2_ls},
            {SNAP_36A2_ID: {}, SNAP_1FBD_ID: {}, SNAP_2071_ID: s2_dumps},
        )
        catalog = TenantBackupHistoryIndexer(reader).build_catalog()
        by_short = {s["snapshotShortId"]: s for s in catalog["snapshots"]}
        self.assertEqual(by_short["36a26b4e"]["snapshotError"], "staging_root_ambiguous")
        self.assertEqual(by_short["1fbd94a9"]["snapshotError"], "staging_root_missing")

    def test_09_snapshot_id_validation(self):
        self.assertEqual(validate_snapshot_id("2071d164"), "2071d164")
        self.assertEqual(validate_snapshot_id(SNAP_2071_ID), SNAP_2071_ID)

        for invalid_id in ("", "2071d16", "2071D164", "../etc/passwd", "2071d164;rm -rf /", None, 12345):
            with self.assertRaises(BackupError):
                validate_snapshot_id(invalid_id)

    def test_10_atomic_catalog_generation_and_0644_permissions(self):
        reader = self._build_six_snapshot_mock()
        catalog = TenantBackupHistoryIndexer(reader).build_catalog()

        with tempfile.TemporaryDirectory() as tmpdir:
            out_path = os.path.join(tmpdir, "tenant-backup-history.json")
            # Seed with previous content to verify atomic replacement
            with open(out_path, "w", encoding="utf-8") as fh:
                fh.write('{"old": true}\n')
            os.chmod(out_path, 0o600)

            write_tenant_backup_history(catalog, output_path=out_path)

            self.assertTrue(os.path.exists(out_path))
            mode = stat.S_IMODE(os.stat(out_path).st_mode)
            self.assertEqual(mode, 0o644)

            # Ensure no temporary files remain in directory
            files_in_dir = os.listdir(tmpdir)
            self.assertEqual(files_in_dir, ["tenant-backup-history.json"])

            with open(out_path, "r", encoding="utf-8") as fh:
                loaded = json.load(fh)
            self.assertEqual(loaded["schema"], CATALOG_SCHEMA)
            self.assertEqual(loaded["snapshotCount"], 6)
            self.assertEqual(loaded["knownTenantCount"], 16)


if __name__ == "__main__":
    unittest.main(verbosity=2)


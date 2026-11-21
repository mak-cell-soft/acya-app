# ACYA — Phase 11C.1.7b: Tenant Backup History Indexer Report

**Date:** `2026-11-07`  
**Phase:** `11C.1.7b` — Read-Only Restic Tenant Backup History Indexer & Catalog Generator  
**CLI Tool:** `/opt/acya-backup/bin/acya-backup-history` ([scripts/backup-runner/bin/acya-backup-history](file:///home/ubuntu/acya-app/scripts/backup-runner/bin/acya-backup-history))  
**Library Module:** `/opt/acya-backup/lib/acya_backup/history.py` ([scripts/backup-runner/lib/acya_backup/history.py](file:///home/ubuntu/acya-app/scripts/backup-runner/lib/acya_backup/history.py))  
**Generated State File:** [`/opt/acya-backup/state/tenant-backup-history.json`](file:///opt/acya-backup/state/tenant-backup-history.json) (`0644 root:root`)  
**Safety Status:** **VERIFIED SAFE** — Read-only `--no-lock` Restic inspection only, zero database dumps extracted, zero Restic writes, zero `pg_dump` or `pg_restore` executions, zero PostgreSQL modifications, zero container restarts.

---

## 1. Executive Summary

Phase 11C.1.7b implements the read-only tenant backup history indexer (`/opt/acya-backup/bin/acya-backup-history`) on top of the Phase 11B Backup Runner infrastructure (`Config`, `TransferSession`, `ResticClient`, `atomic_write_json`, `Logger`).

The indexer inspects all global snapshots in the Restic repository using strictly read-only `--no-lock` commands (`restic snapshots --no-lock --json`, `restic ls --no-lock <id> --json`, and `restic dump --no-lock <id> <metadata_path>` restricted by a hard allowlist to `metadata/tenant-registry.json`, `metadata/manifest.txt`, and `metadata/manifest.json`). No `.dump` files are ever extracted during history indexing.

Running `/opt/acya-backup/bin/acya-backup-history` against the production repository generated `/opt/acya-backup/state/tenant-backup-history.json` (`0644`, atomic replacement) indexing all **6** snapshots (`2071d164`, `36a26b4e`, `f93ac4c4`, `1fbd94a9`, `bbb68d5d`, `5a78f673`) and **17** discovered tenant records (**16** current production tenants plus **1** historical decommissioned tenant `bip-bip`, `Id=30`, present in the October 5 snapshots), totaling **102** snapshot-tenant history entries.

---

## 2. Created & Installed Files

| Path in Repository (`scripts/backup-runner`) | Installed Production Path (`/opt/acya-backup`) | Mode / Owner | Purpose |
| :--- | :--- | :---: | :--- |
| [scripts/backup-runner/lib/acya_backup/history.py](file:///home/ubuntu/acya-app/scripts/backup-runner/lib/acya_backup/history.py) | [`/opt/acya-backup/lib/acya_backup/history.py`](file:///opt/acya-backup/lib/acya_backup/history.py) | `0640 root:root` | Core `TenantBackupHistoryIndexer`, `ResticHistoryReader`, staging root discovery, manifest/registry parsers, tenant/schema mapping validator, and atomic catalog writer. |
| [scripts/backup-runner/bin/acya-backup-history](file:///home/ubuntu/acya-app/scripts/backup-runner/bin/acya-backup-history) | [`/opt/acya-backup/bin/acya-backup-history`](file:///home/ubuntu/acya-app/bin/acya-backup-history) | `0750 root:root` | CLI entry point that loads `/opt/acya-backup/config/backup.json`, opens a read-only `TransferSession` + `ResticClient`, builds the catalog, and writes `/opt/acya-backup/state/tenant-backup-history.json`. |
| [scripts/backup-runner/tests/test_backup_history.py](file:///home/ubuntu/acya-app/scripts/backup-runner/tests/test_backup_history.py) | [`/opt/acya-backup/tests/test_backup_history.py`](file:///opt/acya-backup/tests/test_backup_history.py) | `0640 root:root` | 10-scenario unit test suite using in-memory fixtures and mocked Restic readers without accessing the production repository. |
| *(Generated state output)* | [`/opt/acya-backup/state/tenant-backup-history.json`](file:///opt/acya-backup/state/tenant-backup-history.json) | `0644 root:root` | Atomically generated tenant backup history catalog (`146,668` bytes, `acya.backup.tenant-history/v1`). |

---

## 3. Implementation Details & Safety Architecture

### 3.1 Read-Only Restic Access (`--no-lock`) & Metadata-Only Extraction Guard
In [`ResticHistoryReader`](file:///home/ubuntu/acya-app/scripts/backup-runner/lib/acya_backup/history.py#L64-L143) and [`_safe_dump_metadata_file`](file:///home/ubuntu/acya-app/scripts/backup-runner/lib/acya_backup/history.py#L345-L358):
- All Restic commands are built via `ResticClient._build_argv(..., read_only=True)`, which enforces the `ALLOWED_READONLY_SUBCOMMANDS` allowlist and injects `--no-lock`.
- `dump()` enforces `ALLOWED_METADATA_FILENAMES = frozenset({"metadata/tenant-registry.json", "metadata/manifest.txt", "metadata/manifest.json"})` and explicitly rejects any path ending in `.dump` before invoking Restic.

### 3.2 Multi-Generation Snapshot & Staging Root Discovery
[`discover_staging_root`](file:///home/ubuntu/acya-app/scripts/backup-runner/lib/acya_backup/history.py#L146-L198) supports all three staging root conventions present across the repository's history:
1. **Phase 11B (`v2.0.0`):** `/opt/acya-backup/staging/stage-[A-Za-z0-9_-]+` (snapshot `2071d164`)
2. **Legacy Automated (`v1.2`):** `/var/backups/acya-backup-stage-[A-Za-z0-9_-]+` (snapshots `36a26b4e`, `f93ac4c4`, `1fbd94a9`, `bbb68d5d`)
3. **Initial Manual (`Phase 3C-2B`):** `/home/ubuntu/acya-backup-stage` (snapshot `5a78f673`)

If a snapshot has zero candidate staging roots or more than one candidate staging root, it fails closed with `staging_root_missing` or `staging_root_ambiguous` and marks all tenant entries for that snapshot ineligible.

### 3.3 Honest Checksum Verification Semantics
In [`_evaluate_tenant_in_snapshot`](file:///home/ubuntu/acya-app/scripts/backup-runner/lib/acya_backup/history.py#L622-L814):
- Because history indexing never extracts `.dump` files, it **never fabricates post-extraction checksum verification**.
- When a valid 64-hex SHA-256 digest is recorded in `metadata/manifest.txt` (and matches `metadata/manifest.json` when present), `checksumVerificationStatus` is set to **`"manifest_recorded_unverified"`**.
- If `manifest.txt` and `manifest.json` disagree on the SHA-256 or byte size, `checksumVerificationStatus` is set to **`"manifest_mismatch"`** (`ineligibilityReason: "manifest_json_mismatch"`).
- If no SHA-256 digest is recorded in `manifest.txt` (as in the initial October 5 `5a78f673` snapshot, whose `manifest.txt` only captured `ls -lh` output without SHA-256 hashes), `checksumVerificationStatus` is set to **`"missing"`** (`ineligibilityReason: "manifest_entry_missing"`).

### 3.4 Historical Tenant Presence & Eligibility Rules
For each `(snapshot, tenant)` pair, the catalog records:
- `snapshotId`, `snapshotShortId`, `snapshotTimestamp`
- `tenantId`, `tenantSlug`, `schemaName`
- `dumpFilename`, `dumpSize`
- `manifestSha256`
- `checksumVerificationStatus`: `"manifest_recorded_unverified"` | `"manifest_mismatch"` | `"missing"`
- `snapshotVerificationStatus`: `"verified"` | `"degraded"` | `"invalid"`
- `tenantPresenceStatus`: `"present"` | `"unavailable"` | `"missing_dump"` | `"invalid_mapping"`
- `restoreEligibility` (`bool`, plus alias `restoreEligible`)
- `ineligibilityReason`:
  - `null` (when `restoreEligibility == true`)
  - `"tenant_not_present_in_snapshot"` (historical snapshot taken before tenant was created or after tenant was removed)
  - `"dump_file_missing"` (tenant in snapshot registry/manifest, but `.dump` absent from `restic ls`)
  - `"dump_file_empty"` (`.dump` size is `0` bytes)
  - `"manifest_entry_missing"` (`.dump` present in snapshot tree, but no SHA-256 entry in `manifest.txt`)
  - `"manifest_json_mismatch"` (`manifest.json` SHA-256 or `sizeBytes` disagrees with `manifest.txt` / `restic ls`)
  - `"invalid_tenant_schema_mapping"` (`schemaName != expected_schema_for_slug(tenantSlug)` or fails `^tenant_[a-z0-9_]{1,57}$`)
  - `"staging_root_missing"` / `"staging_root_ambiguous"` / `"snapshot_metadata_malformed"` / `"invalid_snapshot_id"`

---

## 4. Production Snapshot Catalog Summary (`/opt/acya-backup/state/tenant-backup-history.json`)

### 4.1 Indexed Snapshots (`6` Total)

| Snapshot Short ID | Full Snapshot ID | Timestamp (UTC) | Staging Root | Verification Status | Has `tenant-registry.json` | Has `manifest.txt` | Has `manifest.json` | Present Tenants | Restore-Eligible Tenants |
| :---: | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **`2071d164`** | `2071d16434c17e91...1eb45f59` | `2026-11-06T10:11:37Z` | `/opt/acya-backup/staging/stage-20261106T101110Z-d2ae662f-cb88kl37` | `verified` | `true` | `true` | `true` | **16** | **16** |
| **`36a26b4e`** | `36a26b4e5f749dc3...a3216e6a` | `2026-10-13T10:52:27Z` | `/var/backups/acya-backup-stage-wBiNgj` | `verified` | `true` | `true` | `false` | **13** | **13** |
| **`f93ac4c4`** | `f93ac4c400bb35a3...c4444986` | `2026-10-11T10:58:47Z` | `/var/backups/acya-backup-stage-pZR8g8` | `verified` | `true` | `true` | `false` | **12** | **12** |
| **`1fbd94a9`** | `1fbd94a9328e54a0...8190fd2f4` | `2026-10-05T12:29:47Z` | `/var/backups/acya-backup-stage-UgTTHX` | `verified` | `true` | `true` | `false` | **12** *(11 current + `bip-bip`)* | **12** |
| **`bbb68d5d`** | `bbb68d5db4953b8b...e7be7d4c` | `2026-10-05T12:05:50Z` | `/var/backups/acya-backup-stage-d8ORiO` | `verified` | `true` | `true` | `false` | **12** *(11 current + `bip-bip`)* | **12** |
| **`5a78f673`** | `5a78f6730f080f40...173fd8ca` | `2026-10-05T07:57:56Z` | `/home/ubuntu/acya-backup-stage` | `degraded` *(Phase 3C-2B `ls -lh` manifest without SHA-256 digests)* | `false` | `true` | `false` | **12** *(11 current + `bip-bip`)* | **0** *(`manifest_entry_missing`)* |

### 4.2 Per-Tenant Eligibility Summary Across All 6 Snapshots

| Tenant ID | Tenant Slug | Schema Name | Mapping Valid | Eligible Snapshots | Eligible Snapshot Short IDs | Ineligible Snapshot Short IDs (with Reason) |
| :---: | :--- | :--- | :---: | :---: | :--- | :--- |
| `16` | `piqbit` | `tenant_piqbit` | `true` | **5** | `2071d164`, `36a26b4e`, `f93ac4c4`, `1fbd94a9`, `bbb68d5d` | `5a78f673` (`manifest_entry_missing`) |
| `22` | `wellness-medical` | `tenant_wellness_medical` | `true` | **5** | `2071d164`, `36a26b4e`, `f93ac4c4`, `1fbd94a9`, `bbb68d5d` | `5a78f673` (`manifest_entry_missing`) |
| `24` | `fleur-de-printemps` | `tenant_fleur_de_printemps` | `true` | **5** | `2071d164`, `36a26b4e`, `f93ac4c4`, `1fbd94a9`, `bbb68d5d` | `5a78f673` (`manifest_entry_missing`) |
| `25` | `mansour-construction` | `tenant_mansour_construction` | `true` | **5** | `2071d164`, `36a26b4e`, `f93ac4c4`, `1fbd94a9`, `bbb68d5d` | `5a78f673` (`manifest_entry_missing`) |
| `30` | `bip-bip` *(historical)* | `tenant_bip_bip` | `true` | **2** | `1fbd94a9`, `bbb68d5d` | `2071d164`, `36a26b4e`, `f93ac4c4` (`tenant_not_present_in_snapshot`); `5a78f673` (`manifest_entry_missing`) |
| `32` | `stramica` | `tenant_stramica` | `true` | **5** | `2071d164`, `36a26b4e`, `f93ac4c4`, `1fbd94a9`, `bbb68d5d` | `5a78f673` (`manifest_entry_missing`) |
| `34` | `oise-btp` | `tenant_oise_btp` | `true` | **5** | `2071d164`, `36a26b4e`, `f93ac4c4`, `1fbd94a9`, `bbb68d5d` | `5a78f673` (`manifest_entry_missing`) |
| `35` | `ttv` | `tenant_ttv` | `true` | **5** | `2071d164`, `36a26b4e`, `f93ac4c4`, `1fbd94a9`, `bbb68d5d` | `5a78f673` (`manifest_entry_missing`) |
| `36` | `tucobois` | `tenant_tucobois` | `true` | **5** | `2071d164`, `36a26b4e`, `f93ac4c4`, `1fbd94a9`, `bbb68d5d` | `5a78f673` (`manifest_entry_missing`) |
| `37` | `sheg` | `tenant_sheg` | `true` | **5** | `2071d164`, `36a26b4e`, `f93ac4c4`, `1fbd94a9`, `bbb68d5d` | `5a78f673` (`manifest_entry_missing`) |
| `38` | `socofeb` | `tenant_socofeb` | `true` | **5** | `2071d164`, `36a26b4e`, `f93ac4c4`, `1fbd94a9`, `bbb68d5d` | `5a78f673` (`manifest_entry_missing`) |
| `39` | `socobois` | `tenant_socobois` | `true` | **5** | `2071d164`, `36a26b4e`, `f93ac4c4`, `1fbd94a9`, `bbb68d5d` | `5a78f673` (`manifest_entry_missing`) |
| `45` | `rs-auto-service` | `tenant_rs_auto_service` | `true` | **3** | `2071d164`, `36a26b4e`, `f93ac4c4` | `1fbd94a9`, `bbb68d5d`, `5a78f673` (`tenant_not_present_in_snapshot`) |
| `46` | `zaiemtex` | `tenant_zaiemtex` | `true` | **2** | `2071d164`, `36a26b4e` | `f93ac4c4`, `1fbd94a9`, `bbb68d5d`, `5a78f673` (`tenant_not_present_in_snapshot`) |
| `47` | `inky-pinky` | `tenant_inky_pinky` | `true` | **1** | `2071d164` | `36a26b4e`, `f93ac4c4`, `1fbd94a9`, `bbb68d5d`, `5a78f673` (`tenant_not_present_in_snapshot`) |
| `48` | `oxylab` | `tenant_oxylab` | `true` | **1** | `2071d164` | `36a26b4e`, `f93ac4c4`, `1fbd94a9`, `bbb68d5d`, `5a78f673` (`tenant_not_present_in_snapshot`) |
| `49` | `sotubois` | `tenant_sotubois` | `true` | **1** | `2071d164` | `36a26b4e`, `f93ac4c4`, `1fbd94a9`, `bbb68d5d`, `5a78f673` (`tenant_not_present_in_snapshot`) |

---

## 5. Unit Test Verification Results

Both unit test suites ([`test_backup_history.py`](file:///home/ubuntu/acya-app/scripts/backup-runner/tests/test_backup_history.py) and [`test_backup_runner.py`](file:///home/ubuntu/acya-app/scripts/backup-runner/tests/test_backup_runner.py)) were executed and passed 100%:

```text
test_01_all_16_tenants_in_snapshot_2071d164_are_eligible_and_unverified_post_extraction ... ok
test_02_historical_snapshots_with_11_12_and_13_tenants ... ok
test_03_tenants_created_after_historical_snapshots_marked_unavailable ... ok
test_04_missing_and_empty_dump_files_marked_ineligible ... ok
test_05_missing_manifest_entries_and_manifest_json_mismatch ... ok
test_06_invalid_tenant_schema_mapping_rejected ... ok
test_07_malformed_snapshot_metadata_fails_closed ... ok
test_08_duplicate_or_ambiguous_staging_roots_rejected ... ok
test_09_snapshot_id_validation ... ok
test_10_atomic_catalog_generation_and_0644_permissions ... ok

----------------------------------------------------------------------
Ran 10 tests in 0.019s

OK
```

---

## 6. Operational Safety Confirmation

- **No Backups Triggered:** Confirmed.
- **No Restic Write Operations Executed:** Confirmed (only `--no-lock` read-only commands executed).
- **No Database Dumps Extracted:** Confirmed (enforced by `ALLOWED_METADATA_FILENAMES`).
- **No `pg_dump` or `pg_restore` Executed:** Confirmed.
- **No PostgreSQL Data Modified:** Confirmed.
- **Systemd Timer (`acya-backup-runner.timer`):** Remains `disabled` and `inactive`.
- **`repositoryWritesAuthorized` in `/opt/acya-backup/config/backup.json`:** Remains `false`.
- **Admin-Dash Read-Only Repository Access:** Completely unchanged.
- **Production Containers:** Untouched.
- **Git Status:** Uncommitted and unpushed per instructions.


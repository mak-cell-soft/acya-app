# ACYA Backup Infrastructure — Phase 11C.1
## First Controlled Production Backup & Independent Verification Report

- **Date:** `2026-11-06`
- **Production Host:** `vps-1d2bffb5` (`51.210.10.108`)
- **Administration / Monitoring Host:** `vps-b92b4ae6` (`51.254.216.8` — `https://monitor.acya.site/dashboard`)
- **Backup Runner:** `/opt/acya-backup/` (`acya.backup.run/v1`, version `2.0.0`)
- **Restic Binary & Version:** `/usr/local/bin/restic` (`restic 0.19.1 compiled with go1.26.4 on linux/amd64`)
- **Restic Repository:** `sftp:backup@51.254.216.8:/data/backups/restic` (Repo ID prefix: `8a26915761a4`, format version `2`)
- **New Production Snapshot ID:** `2071d16434c17e91b18521cd2a6a9bfa47bc3510a3b0fac11f0c16401eb45f59` (`2071d164`)
- **Post-Execution Write Gate State:** `"repositoryWritesAuthorized": false`
- **Post-Execution Timer State:** `disabled` / `inactive` (`0 timers listed`)

---

## 1. Executive Summary

Following operator authorization for **Phase 11C.1**, the **first controlled production backup** under the new Phase 11B standalone backup architecture (`/opt/acya-backup/`) was executed and independently verified on `2026-11-06`.

Key outcomes:
1. **Pre-Execution Safety & Stage-Only Preflight Passed:** Host identity (`vps-1d2bffb5`), Restic binary (`0.19.1`), read-only repository connectivity, lock state (`acya-backup-lock-inspect --require-clear` $\rightarrow$ exit `0`, only the 4 historical October 13 `stale_shared` locks present), and a full local `--mode stage-only --skip-remote` preflight (`20261106T101014Z-fd3a3ff4`, `12.052s`) were verified prior to enabling repository writes.
2. **Single Controlled Production Backup Succeeded on First Attempt:** The configuration write gate (`repositoryWritesAuthorized`) was temporarily opened (`true`), a single manual backup run (`--mode full --trigger phase-11c1-first-production-backup`) was executed (`20261106T101110Z-d2ae662f`), and the write gate was immediately restored to `false` upon completion (`0600 root:root`, matching its pre-execution SHA-256 `c56483d4fab1c77f6c253634c0047d25888e2a038ece44ba5cbdd07422cfb632`).
3. **New Snapshot Created (`2071d164`):** Restic created snapshot `2071d16434c17e91b18521cd2a6a9bfa47bc3510a3b0fac11f0c16401eb45f59` at `2026-11-06T10:11:37.11432449Z` in `37.924` seconds total pipeline time (`11.489s` SFTP transfer + snapshot commit, `100,930,595` packed bytes / ~96.25 MiB added across `101` files totaling `786,705,062` bytes / ~750.26 MiB).
4. **100% Database & 16/16 Tenant Coverage:** All 3 production databases (`wood-app-db`, `app-db-bo`, `n8n_db`), both PostgreSQL cluster role/global dumps (`primary.globals.sql`, `n8n.globals.sql`), and all **16/16** registered tenant schemas (`tenant_fleur_de_printemps` through `tenant_zaiemtex`, including the 3 previously unbacked-up tenants `inky-pinky`, `oxylab`, and `sotubois`) were exported, hashed, uploaded, and independently verified inside snapshot `2071d164`.
5. **Strict Safety Boundaries Preserved:** Zero secret values or contents were written to logs, state files, manifests, or staging directories; the 4 historical `stale_shared` locks remain untouched; no `restic unlock`, `forget`, `prune`, `repair`, or `check` was executed; and `acya-backup-runner.timer` remains `disabled` and `inactive`.

---

## 2. Pre-Execution Safety Checks

All Step 1 pre-execution safety checks were executed before touching any configuration:

| Verification Item | Command / Method | Observed Result | Status |
|---|---|---|---|
| **Production Host Identity** | `hostname && hostname -I` | `vps-1d2bffb5` (`51.210.10.108`), Linux `6.17.0-19-generic x86_64`, app dir `/home/ubuntu/acya-app` | **PASS** |
| **Restic Binary & Version** | `/usr/local/bin/restic version` & `sha256sum /usr/local/bin/restic` | `restic 0.19.1 compiled with go1.26.4 on linux/amd64` (`0755 root:root`, SHA-256: `20d4142678d0d95ec11a4759def1b73fd9190abc9ca19e4b62d067c0b387e639`) | **PASS** |
| **Read-Only Repo Connectivity** | `restic --no-lock cat config` (via `acya-backup-lock-inspect`) | Reachable over `sftp:backup@51.254.216.8:/data/backups/restic`, Repo ID prefix `8a26915761a4`, format version `2` | **PASS** |
| **Lock Inspection (`--require-clear`)** | `sudo /opt/acya-backup/bin/acya-backup-lock-inspect --config /opt/acya-backup/config/backup.json --require-clear` | Exit code `0`, `status: "stale_shared_only"`, `canProceedWithBackup: true`, `activeExclusive: 0`, `activeShared: 0`, `staleExclusive: 0`, `staleShared: 4` | **PASS** |
| **Existing Snapshots Before Backup** | `restic --no-lock snapshots --json` | `5` historical snapshots (`5a78f673`, `bbb68d5d`, `1fbd94a9`, `f93ac4c4`, `36a26b4e` from `2026-10-13T19:28:25Z`) | **PASS** |
| **Production Disk Space** | `df -B1 /opt/acya-backup` | `68,904,595,456` bytes (~64.17 GiB) available vs `5,368,709,120` bytes (5.0 GiB) required minimum | **PASS** |

---

## 3. Configuration Validation Summary

Before execution, `/opt/acya-backup/config/backup.json` (`0600 root:root`, SHA-256 `c56483d4fab1c77f6c253634c0047d25888e2a038ece44ba5cbdd07422cfb632`) and `/opt/acya-backup/systemd/acya-backup-runner.timer` were validated against all Phase 11C.1 requirements:

| Configuration Property | Verified Value | Status |
|---|---|---|
| **Repository URL** | `sftp:backup@51.254.216.8:/data/backups/restic` | **VERIFIED** |
| **Password File** | `/root/.config/acya-backup/restic-password` (`0600 root:root`) | **VERIFIED** |
| **SSH Key & Known Hosts** | `/root/.ssh/id_ed25519` (`0600 root:root`), `/root/.ssh/known_hosts` (`StrictHostKeyChecking=yes`, `BatchMode=yes`) | **VERIFIED** |
| **Configured Schedule** | `02:00 UTC` (`03:00 Africa/Tunis`), `RandomizedDelaySec=0`, `Persistent=true` | **VERIFIED** |
| **Required Tags** | `acya-production`, `phase-11b`, `runner-v2`, `host-vps-1d2bffb5`, `scope-full`, `tenants-16`, `run-<RUN_ID>`, `trigger-<TRIGGER>` | **VERIFIED** |
| **Primary PostgreSQL Target** | Container `8cdff3364501_wood-app-postgres` (`wood-app-db`, `app-db-bo`, plus `primary.globals.sql`) | **VERIFIED** |
| **n8n PostgreSQL Target** | Container `postgres-n8n` (`n8n_db`, plus `n8n.globals.sql`) | **VERIFIED** |
| **Excluded Non-Prod Containers** | `acya-restore-test-pg`, `acya-restore-n8n-pg` (explicitly ignored and untouched) | **VERIFIED** |
| **Persistent Data & Config Paths** | `/home/ubuntu/acya-app/storage/private/mobile`, `/var/lib/docker/volumes/acya-app_n8n_data/_data`, `docker-compose.yml`, `docker-compose.n8n.yml`, `/etc/nginx` | **VERIFIED** |
| **Encrypted Secret Paths** | `/home/ubuntu/acya-app/storage/secrets`, `/home/ubuntu/acya-app/.env`, `/home/ubuntu/acya-app/.env.n8n`, `/etc/letsencrypt` | **VERIFIED** |

*(Note: A minor CLI argument validator refinement was applied to `/opt/acya-backup/bin/acya-backup-runner` so `--trigger` accepts any safe label matching `^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$`, allowing `--trigger phase-11c1-first-production-backup`.)*

---

## 4. Stage-Only Preflight Results (Step 3)

Prior to opening the repository write gate, a complete local staging rehearsal was executed:

```bash
sudo /opt/acya-backup/bin/acya-backup-runner \
  --config /opt/acya-backup/config/backup.json \
  --mode stage-only \
  --skip-remote \
  --trigger phase-11c1-preflight \
  --print-telemetry
```

- **Run ID:** `20261106T101014Z-fd3a3ff4`
- **Started / Finished:** `2026-11-06T10:10:14Z` $\rightarrow$ `2026-11-06T10:10:26Z` (`12.052` seconds)
- **Outcome / Exit Code:** `success` / `0`
- **Database Export Verification:**
  - `primary/wood-app-db`: `5,966,059` bytes
  - `primary/app-db-bo`: `833` bytes
  - `n8n/n8n_db`: `961,716` bytes
  - Cluster globals exported: `primary.globals.sql` (`477` bytes), `n8n.globals.sql` (`306` bytes)
- **Tenant Schema Coverage:** `16/16` registered enterprises matched `16/16` `tenant_*` schemas in `wood-app-db`, all `16` individually dumped and verified present in `wood-app-db.full.dump`.
- **File & Secret Collection:** `32` data/config files (`774,843,808` bytes) + `44` secret files (`79,867` bytes) validated without copying secret payloads into unencrypted staging.
- **Manifest & Size Assertions:** `23` manifest entries generated (`manifestTxtSha256: 0e93e2217b43fa364821a70f6f51b710c2a3a7a42ef6605f4875e424667007c6`), `zeroSizeViolations: 0`.
- **Staging Cleanup:** Staging directory automatically purged upon completion (`/opt/acya-backup/staging` verified empty).

---

## 5. Temporary Write Gate Activation & Restoration (Steps 4 & 6)

1. **Pre-Backup Gate State:** `"repositoryWritesAuthorized": false` (SHA-256: `c56483d4fab1c77f6c253634c0047d25888e2a038ece44ba5cbdd07422cfb632`).
2. **Temporary Activation (Step 4):** Backed up `/opt/acya-backup/config/backup.json` (`0600 root:root`), set `"repositoryWritesAuthorized": true` (`10:11:10Z`), and wrapped the single backup execution in a shell `trap` guaranteeing immediate restoration of `/opt/acya-backup/config/backup.json` upon exit.
3. **Immediate Restoration (Step 6):** Immediately upon completion of the backup (`10:11:48Z`), the `trap` restored `/opt/acya-backup/config/backup.json` (`0600 root:root`) to `"repositoryWritesAuthorized": false`.
4. **Post-Backup Gate Verification:**
   - `"repositoryWritesAuthorized": false` confirmed in `/opt/acya-backup/config/backup.json`.
   - File permissions: `-rw------- 1 root root 5871` (`0600`).
   - File SHA-256: `c56483d4fab1c77f6c253634c0047d25888e2a038ece44ba5cbdd07422cfb632` (identical to pre-execution state).

---

## 6. First Production Backup Execution Summary (Step 5)

```bash
sudo /opt/acya-backup/bin/acya-backup-runner \
  --config /opt/acya-backup/config/backup.json \
  --mode full \
  --trigger phase-11c1-first-production-backup \
  --print-telemetry
```

| Metric | Value |
|---|---|
| **Run ID** | `20261106T101110Z-d2ae662f` |
| **Run Tag** | `run-20261106T101110Z-d2ae662f` |
| **Trigger** | `phase-11c1-first-production-backup` |
| **Mode** | `full` |
| **Start Time (UTC)** | `2026-11-06T10:11:10Z` (`11:11:10 Africa/Tunis`) |
| **Finish Time (UTC)** | `2026-11-06T10:11:48Z` (`11:11:48 Africa/Tunis`) |
| **Total Duration** | `37.924` seconds |
| **Outcome / Exit Code** | `success` / `0` |
| **Restic Exit Code** | `0` (1st attempt, `attempts: 1`) |
| **New Snapshot ID (Full)** | `2071d16434c17e91b18521cd2a6a9bfa47bc3510a3b0fac11f0c16401eb45f59` |
| **New Snapshot ID (Short)** | `2071d164` |
| **Snapshot Timestamp** | `2026-11-06T10:11:37.11432449Z` |
| **Total Files Processed** | `101` (`25` staged artifacts + `32` persistent/config files + `44` secret files) |
| **Total Logical Bytes Processed** | `786,705,062` bytes (~750.26 MiB) |
| **Uncompressed Data Added** | `250,211,067` bytes (~238.62 MiB) |
| **Packed / Compressed Data Added** | `100,930,595` bytes (~96.25 MiB transferred to `51.254.216.8`) |
| **New Blobs Added** | `228` data blobs, `46` tree blobs |

### Per-Stage Execution Breakdown

| Stage | Status | Duration (s) | Key Output |
|---|---|---|---|
| `preflight` | `succeeded` | `0.099` | `68.90 GB` free disk space; resolved `8cdff3364501_wood-app-postgres` & `postgres-n8n` |
| `repository_preflight` | `succeeded` | `2.152` | Repository `8a26915761a4` (v2) reachable via read-only `cat config` |
| `lock_inspection` | `succeeded` | `6.158` | `4` `stale_shared` locks (`0` active/exclusive); `canProceedWithBackup: true` |
| `database_export` | `succeeded` | `3.791` | `3` full DB dumps + `2` globals SQL files exported |
| `tenant_coverage` | `succeeded` | `7.711` | `16` registered tenants matched `16` schemas; `16` individual `.dump` files created |
| `file_collection` | `succeeded` | `0.029` | `32` files (`774,843,808` B) validated |
| `secret_collection` | `succeeded` | `0.029` | `44` secret files (`79,867` B) validated for direct encrypted upload |
| `manifest` | `succeeded` | `0.067` | `23` staged artifacts hashed into `manifest.txt` and `manifest.json` |
| `size_assertions` | `succeeded` | `0.067` | `zeroSizeViolations: 0` |
| `transfer` & `snapshot` | `succeeded` | `11.489` | Snapshot `2071d164` committed (`100,930,595` packed bytes) |
| `verification` | `succeeded` | `6.407` | Read-only post-backup verification of `manifest.txt`, `manifest.json`, and `tenant-registry.json` inside snapshot `2071d164` |

---

## 7. New Snapshot Metadata

Independent read-only inspection via `restic --no-lock snapshots --json` confirmed the exact metadata recorded in the repository for snapshot `2071d164`:

- **Snapshot ID:** `2071d16434c17e91b18521cd2a6a9bfa47bc3510a3b0fac11f0c16401eb45f59`
- **Short ID:** `2071d164`
- **Time:** `2026-11-06T10:11:37.11432449Z`
- **Hostname:** `vps-1d2bffb5`
- **Username:** `root`
- **Program Version:** `restic 0.19.1`
- **Tags (`8`):**
  - `acya-production`
  - `phase-11b`
  - `runner-v2`
  - `host-vps-1d2bffb5`
  - `scope-full`
  - `tenants-16`
  - `run-20261106T101110Z-d2ae662f`
  - `trigger-phase-11c1-first-production-backup`
- **Included Paths (`9`):**
  1. `/etc/letsencrypt`
  2. `/etc/nginx`
  3. `/home/ubuntu/acya-app/.env`
  4. `/home/ubuntu/acya-app/.env.n8n`
  5. `/home/ubuntu/acya-app/docker-compose.n8n.yml`
  6. `/home/ubuntu/acya-app/docker-compose.yml`
  7. `/home/ubuntu/acya-app/storage/private/mobile`
  8. `/home/ubuntu/acya-app/storage/secrets`
  9. `/opt/acya-backup/staging/stage-20261106T101110Z-d2ae662f-cb88kl37`
- **Snapshot Summary Block:**
  - `files_new`: `101`, `files_changed`: `0`, `files_unmodified`: `0`
  - `dirs_new`: `46`, `dirs_changed`: `0`, `dirs_unmodified`: `0`
  - `data_blobs`: `228`, `tree_blobs`: `46`
  - `data_added`: `250,211,067` bytes
  - `data_added_packed`: `100,930,595` bytes
  - `total_files_processed`: `101`
  - `total_bytes_processed`: `786,705,062` bytes

### Complete Repository Snapshot Inventory (`6` Snapshots Total)

| # | Short ID | Timestamp (UTC) | Host | Program Version | Tags |
|---|---|---|---|---|---|
| 1 | `5a78f673` | `2026-10-13T18:54:06Z` | `vps-1d2bffb5` | `restic 0.16.4` | `acya-prod`, `daily` |
| 2 | `bbb68d5d` | `2026-10-13T18:56:19Z` | `vps-1d2bffb5` | `restic 0.16.4` | `acya-prod`, `daily` |
| 3 | `1fbd94a9` | `2026-10-13T19:00:57Z` | `vps-1d2bffb5` | `restic 0.16.4` | `acya-prod`, `daily` |
| 4 | `f93ac4c4` | `2026-10-13T19:03:38Z` | `vps-1d2bffb5` | `restic 0.16.4` | `acya-prod`, `daily` |
| 5 | `36a26b4e` | `2026-10-13T19:28:25Z` | `vps-1d2bffb5` | `restic 0.16.4` | `acya-prod`, `daily` |
| **6** | **`2071d164`** | **`2026-11-06T10:11:37Z`** | **`vps-1d2bffb5`** | **`restic 0.19.1`** | **`acya-production`, `phase-11b`, `runner-v2`, `host-vps-1d2bffb5`, `scope-full`, `tenants-16`, `run-20261106T101110Z-d2ae662f`, `trigger-phase-11c1-first-production-backup`** |

---

## 8. Database Backup Verification

All 3 production databases and 2 cluster role/global definitions were verified inside snapshot `2071d164`:

| Instance / Container | Artifact Path in Staging | Format | Size (Bytes) | SHA-256 in `manifest.txt` | Verified in Snapshot |
|---|---|---|---:|---|---|
| `primary` (`8cdff3364501_wood-app-postgres`) | `databases/primary/wood-app-db.full.dump` | PostgreSQL custom (`PGDMP`, `-Fc -Z 6`) | `5,966,059` | `c076c4db57b5b26fcf5481734067a5f363d2ba787dae7a2bcba8f621ef0977dc` | **YES** |
| `primary` (`8cdff3364501_wood-app-postgres`) | `databases/primary/app-db-bo.full.dump` | PostgreSQL custom (`PGDMP`, `-Fc -Z 6`) | `833` | `73f20b2e06e155d3b68f4d3e603db6a7db6e4fe247ff8b7e9fed5fe9aa6e87a2` | **YES** |
| `primary` (`8cdff3364501_wood-app-postgres`) | `databases/primary/primary.globals.sql` | SQL (`pg_dumpall --globals-only`) | `477` | `6aa70179b74e2909389412659e614e969de272f6c0ef6f833af85955fc5aff65` | **YES** |
| `n8n` (`postgres-n8n`) | `databases/n8n/n8n_db.full.dump` | PostgreSQL custom (`PGDMP`, `-Fc -Z 6`) | `961,716` | `54f34ec15804c10fab5dee0ffcac952e542800fd15f1950d87bc1d1f5a94b296` | **YES** |
| `n8n` (`postgres-n8n`) | `databases/n8n/n8n.globals.sql` | SQL (`pg_dumpall --globals-only`) | `306` | `4a46f7074f4de3bb8f56bbb5cbdaec304e4132cecd7a9ed336e96d6b3bf704b1` | **YES** |

---

## 9. Tenant Schema Backup Verification (16/16)

All **16** registered enterprises in `public.bo_tbl_enterprise` and all **16** corresponding `tenant_*` schemas in `wood-app-db` were verified both inside `wood-app-db.full.dump` (`pg_restore --list`) and as individual isolated schema dumps under `tenants/` inside snapshot `2071d164`:

| # | Enterprise Slug | PostgreSQL Schema | Active | Snapshot Dump File (`tenants/...`) | Size (Bytes) | SHA-256 in `manifest.txt` |
|---:|---|---|---|---|---:|---|
| 1 | `piqbit` | `tenant_piqbit` | `true` | `tenant_piqbit.dump` | `351,696` | `40710403fde46531d5c265521e8e84f17830f9d77b8f430bf90746dcd9de3a13` |
| 2 | `socobois` | `tenant_socobois` | `true` | `tenant_socobois.dump` | `327,633` | `18b3bd6eacbcb55b42e5ef8aab6a1838af5e0ada7e93e4cb71a9b9cde088afa7` |
| 3 | `stramica` | `tenant_stramica` | `true` | `tenant_stramica.dump` | `298,425` | `3dd3d96bcb0f95aed9fe142b85954922fbc1f0487dd70e9f91cbd703ded154ee` |
| 4 | `ttv` | `tenant_ttv` | `false` | `tenant_ttv.dump` | `297,794` | `8f9551ba6523f3248a86417248990ea91e941382eab9a0fa9964bc1c539899f2` |
| 5 | `fleur-de-printemps` | `tenant_fleur_de_printemps` | `false` | `tenant_fleur_de_printemps.dump` | `297,943` | `8c0c4bbc86c1dede76eb4b501c12857d998a707db7890c115d1032a864e5fc71` |
| 6 | `mansour-construction` | `tenant_mansour_construction` | `true` | `tenant_mansour_construction.dump` | `298,412` | `0acd7d53b81c89b3d6ddba40d8a8ea1fb68b06e4b3c3a3d554eeef2940d3aae6` |
| 7 | `wellness-medical` | `tenant_wellness_medical` | `false` | `tenant_wellness_medical.dump` | `298,476` | `4f05302b68ce4ecad57bfe2f741cf3f443dc499953e55376bf513c83cde348cc` |
| 8 | `zaiemtex` | `tenant_zaiemtex` | `false` | `tenant_zaiemtex.dump` | `297,876` | `49bb93cdde20b5ec0ce58fc718b49f07ebb92d03fdac9fbe4547434180db2669` |
| 9 | `oise-btp` | `tenant_oise_btp` | `false` | `tenant_oise_btp.dump` | `297,620` | `de5b310567584cc21bb5b319f4a2d4c2cc40ddbb27340ac8db807dc655f33d23` |
| 10 | `sheg` | `tenant_sheg` | `true` | `tenant_sheg.dump` | `298,539` | `7b5a79f3212f7a4e72d3e096509b7dceaebac5ad20330727ea268edda9029ab1` |
| 11 | `rs-auto-service` | `tenant_rs_auto_service` | `false` | `tenant_rs_auto_service.dump` | `298,487` | `484642e444050e3a9e76c7ad5787709c7ae7ef1bb7658d28f4ba26ba41d67de8` |
| 12 | `socofeb` | `tenant_socofeb` | `true` | `tenant_socofeb.dump` | `297,759` | `b722c26b4b92c9dff7a7b271b453af06c6b2520901e992a1bee2daf216c031a2` |
| 13 | `tucobois` | `tenant_tucobois` | `true` | `tenant_tucobois.dump` | `300,326` | `37a41d1fa5c55ccb79a37f0b8ad809acf5c79e90d8641970d609e73cb611631c` |
| 14 | `inky-pinky` | `tenant_inky_pinky` | `true` | `tenant_inky_pinky.dump` | `298,179` | `52a2994cce0311fa19a4b120e28fc50f0c7a3319060f169a00f3546a2265768c` |
| 15 | `oxylab` | `tenant_oxylab` | `true` | `tenant_oxylab.dump` | `298,038` | `d0e9da30d557d6438e7159728ebde61b6e22db7fceb8151b77cc25f6c63df89c` |
| 16 | `sotubois` | `tenant_sotubois` | `true` | `tenant_sotubois.dump` | `293,504` | `284bf645ab89d5e803e61d1731556b72a79a956934c41c5ec69ccd6b3088ea5c` |

- **Metadata Registry Exports in Snapshot:**
  - `metadata/tenant-registry.csv` (`1,105` B, SHA-256: `471fb2c541e08bcfc7b5bb1b2d50e40a5af87712e13bfadea4574927c4cb0247`)
  - `metadata/tenant-registry.json` (`1,188` B, SHA-256: `2e67d0914d8fa8f1b731416e95b8e1d14c82453d525b6640fe0b11c17edd4bec`)

---

## 10. File & Secret Backup Verification

Independent read-only inspection via `restic --no-lock ls 2071d164 --json` confirmed that all persistent data, infrastructure configuration, and secret files are encrypted inside snapshot `2071d164`, while **zero** secret values or filenames were exposed in unencrypted staging, manifests, logs, or state files:

| Category | Source ID | Path | File Count | Total Bytes | Handling |
|---|---|---|---:|---:|---|
| **Persistent Data** | `mobile-releases` | `/home/ubuntu/acya-app/storage/private/mobile` | `13` | `774,801,004` | Direct Restic upload |
| **Persistent Data** | `n8n-data` | `/var/lib/docker/volumes/acya-app_n8n_data/_data` | `2` | `128` | Direct Restic upload |
| **Config** | `docker-compose` | `/home/ubuntu/acya-app/docker-compose.yml`, `docker-compose.n8n.yml` | `2` | `8,302` | Direct Restic upload |
| **Config** | `nginx-config` | `/etc/nginx` | `15` | `34,374` | Direct Restic upload |
| **Secrets (Encrypted)** | `app-secrets` | `/home/ubuntu/acya-app/storage/secrets` (incl. Firebase JSON keys) | `2` | `3,503` | Direct encrypted Restic upload (never staged/logged) |
| **Secrets (Encrypted)** | `dotenv-main` | `/home/ubuntu/acya-app/.env` | `1` | `1,797` | Direct encrypted Restic upload (never staged/logged) |
| **Secrets (Encrypted)** | `dotenv-n8n` | `/home/ubuntu/acya-app/.env.n8n` | `1` | `472` | Direct encrypted Restic upload (never staged/logged) |
| **Secrets (Encrypted)** | `letsencrypt` | `/etc/letsencrypt` | `40` | `74,095` | Direct encrypted Restic upload (never staged/logged) |

**Secret Redaction Audit:**
- Scanned `/opt/acya-backup/logs/*` and `/opt/acya-backup/state/*` for `private_key`, `BEGIN PRIVATE KEY`, `POSTGRES_PASSWORD`, `JWT_SECRET`, `firebase-management-key.json`, and `firebase-service-account.json`: **0 matches (`ZERO_SECRET_LEAKS_VERIFIED`)**.

---

## 11. Manifest & Checksum Verification

Both `manifest.txt` and `manifest.json` inside snapshot `2071d164` (`/opt/acya-backup/staging/stage-20261106T101110Z-d2ae662f-cb88kl37/manifest.txt` and `manifest.json`) were retrieved via `restic --no-lock dump` and verified using `acya-backup-verify --snapshot last-success`:

- **`manifest.txt` SHA-256:** `8a74242a6defbad65eca19452883938089eb4795671a954060f538fadc68e45b`
- **`manifest.json` SHA-256:** `56457b619523e7447b9cdbd1e2db7754dae323335b926db19ec03e6b8591a40f`
- **Entry Count:** `23` (`5` database/globals exports + `16` tenant dumps + `2` tenant registry metadata files)
- **Format Compliance:** Every line in `manifest.txt` strictly matches `^[a-f0-9]{64}  .+$` (Admin-Dash `ManifestParser` contract) and matches the entries in `manifest.json` (`presenceStatus: "Present"`, `readabilityStatus: "Readable"`, `parsingStatus: "Parsed"`, `integrityStatus: "Verified"`).

---

## 12. Staging Cleanup Verification

- Checked `/opt/acya-backup/staging` immediately after both the Step 3 preflight and Step 5 full backup:
  ```text
  total 8
  drwx------ 2 root root 4096 Nov  6 10:11 .
  drwxr-xr-x 9 root root 4096 Nov  5 19:27 ..
  ```
- **Result:** `/opt/acya-backup/staging` is completely empty (`0` leftover files or directories).

---

## 13. Restic Lock State Before and After Execution

Both before and after the backup, `sudo /opt/acya-backup/bin/acya-backup-lock-inspect --config /opt/acya-backup/config/backup.json --require-clear` was executed:

| Metric | Before Backup (`10:08:52Z`) | After Backup (`10:12:44Z`) |
|---|---|---|
| **Inspector Status** | `stale_shared_only` | `stale_shared_only` |
| **Can Proceed With Backup** | `true` (exit code `0`) | `true` (exit code `0`) |
| **Total Locks in Repository** | `4` | `4` |
| **Active Exclusive Locks** | `0` | `0` |
| **Active Shared Locks** | `0` | `0` |
| **Stale Exclusive Locks** | `0` | `0` |
| **Stale Shared Locks** | `4` (`3099b87ce1f8`, `6783de77a934`, `7a44ddbe78f0`, `b9a2973b8342`) | `4` (`3099b87ce1f8`, `6783de77a934`, `7a44ddbe78f0`, `b9a2973b8342`) |
| **Orphan Locks Left by New Run** | `0` | `0` (Restic `0.19.1` cleanly removed its own shared lock upon completion) |
| **`restic unlock` Executed** | `false` | `false` |

---

## 14. Local Telemetry & State File Verification

All state files under `/opt/acya-backup/state/` and logs under `/opt/acya-backup/logs/` were inspected:

- `/opt/acya-backup/state/last-run.json` (`9,656` bytes, `0600 root:root`): Records `runId: "20261106T101110Z-d2ae662f"`, `outcome: "success"`, `snapshotId: "2071d16434c17e91b18521cd2a6a9bfa47bc3510a3b0fac11f0c16401eb45f59"`.
- `/opt/acya-backup/state/last-success.json` (`9,656` bytes, `0600 root:root`): Identical recovery-point record for `2071d16434c17e91b18521cd2a6a9bfa47bc3510a3b0fac11f0c16401eb45f59`.
- `/opt/acya-backup/state/last-stage-only.json` (`5,450` bytes, `0600 root:root`): Records Step 3 preflight run `20261106T101014Z-fd3a3ff4`.
- `/opt/acya-backup/state/last-preflight.json` (`6,755` bytes, `0600 root:root`): Records preflight state.
- `/opt/acya-backup/logs/run-20261106T101110Z-d2ae662f.jsonl` (`0600 root:root`): Structured JSONL event stream from `run.started` to `run.completed`.

---

## 15. Admin-Dash Observation Summary (Step 8)

1. **HTTP Reachability Check:**
   - Read-only check from Production (`curl -sS -I https://monitor.acya.site/dashboard`) returned `HTTP/1.1 200 OK` (`Server: nginx/1.28.3 (Ubuntu)`, serving the Next.js Admin-Dash UI).
2. **Repository-Level Visibility on `51.254.216.8` (`/data/backups/restic`):**
   - Because the Restic repository on `51.254.216.8:/data/backups/restic` is bind-mounted into the Admin-Dash API container at `/data/backups/restic:ro`, snapshot `2071d164` (`2026-11-06T10:11:37Z`) is immediately present in the repository read by Admin-Dash (`restic snapshots --no-lock --json` now returns **6 snapshots**, with `2071d164` as the newest snapshot).
   - Consequently, Admin-Dash's `ResticBackupService` snapshot discovery sees:
     - **Total Snapshot Count:** `6` (up from `5`)
     - **Latest Snapshot ID:** `2071d16434c17e91b18521cd2a6a9bfa47bc3510a3b0fac11f0c16401eb45f59` (`2071d164`)
     - **Latest Snapshot Timestamp:** `2026-11-06T10:11:37Z` (transitioning Backup Freshness from `Critical` / 24 days old to `Healthy` / `< 26h`)
     - **Snapshot Size Metrics (`Summary` block):** Populated by Restic `0.19.1` (`data_added_packed: 100,930,595`, `total_bytes_processed: 786,705,062`).
3. **Important Architectural Note for Admin-Dash Deep Verification Path Matching (No Changes Made):**
   - Per `ADMIN_DASH_FINAL_TECHNICAL_SPECIFICATION_v3_2.md` Section 3.2, if Admin-Dash's `ResticPathResolver` uses a strict regex anchored to the legacy staging path (`^/var/backups/acya-backup-stage-[A-Za-z0-9]+$`), deep manifest lookup inside Admin-Dash for snapshots staged under `/opt/acya-backup/staging/stage-<RUN_ID>-XXXXXX` may report `AmbiguousStaging` until either:
     - Admin-Dash's `ResticPathResolver` regex is broadened on `51.254.216.8` to accept `/opt/acya-backup/staging/stage-[A-Za-z0-9_-]+`, **or**
     - `/opt/acya-backup/config/backup.json` `stagingDir` is pointed to `/var/backups` (with `ReadWritePaths=/opt/acya-backup /var/backups` in `acya-backup-runner.service` and `mkdtemp(prefix="acya-backup-stage-")` alphanumeric suffix).
   - Per Phase 11C.1 restrictions, **zero modifications** were made to Admin-Dash.

---

## 16. Timer & Gate Post-Execution State (Step 9)

Verified via `systemctl is-enabled`, `systemctl is-active`, and `systemctl list-timers --all 'acya*'`:

| Unit / Setting | Enabled State | Active State | Scheduled Next Run |
|---|---|---|---|
| `acya-backup-runner.timer` | `disabled` | `inactive` | None (`0 timers listed`) |
| `acya-backup-runner.service` | `static` | `inactive` | None |
| `acya-backup.timer` (legacy) | `disabled` | `inactive` | None |
| `acya-backup.service` (legacy) | `static` | `inactive` | None |
| `repositoryWritesAuthorized` (`/opt/acya-backup/config/backup.json`) | `false` | Closed (`0600 root:root`) | Manual authorization required |

---

## 17. Mandatory Confirmations & Readiness Assessment for Phase 11C.2

### Mandatory Confirmations Checklist

| # | Mandatory Confirmation | Status | Evidence |
|---:|---|---|---|
| 1 | **Only ONE production backup was executed** | **CONFIRMED** | Single `--mode full` run `20261106T101110Z-d2ae662f`; repository snapshot count increased by exactly 1 (`5` $\rightarrow$ `6`). |
| 2 | **New snapshot ID created (`2071d164...`)** | **CONFIRMED** | `2071d16434c17e91b18521cd2a6a9bfa47bc3510a3b0fac11f0c16401eb45f59` (`2026-11-06T10:11:37.11432449Z`). |
| 3 | **All 3 databases were backed up (`wood-app-db`, `app-db-bo`, `n8n_db`)** | **CONFIRMED** | Verified in `manifest.txt` and `restic --no-lock ls 2071d164` (`5,966,059` B, `833` B, `961,716` B + globals). |
| 4 | **All 16 tenant schemas were backed up** | **CONFIRMED** | All 16 `tenants/tenant_*.dump` files (`293 KB`–`351 KB` each) and `wood-app-db.full.dump` verified in snapshot `2071d164`. |
| 5 | **Persistent data and configuration files were backed up** | **CONFIRMED** | `32` files (`774,843,808` B) across `mobile-releases`, `n8n-data`, `docker-compose*`, and `/etc/nginx` verified in snapshot. |
| 6 | **Sensitive files were backed up encrypted without secret exposure** | **CONFIRMED** | `44` secret files (`79,867` B) across `storage/secrets`, `.env`, `.env.n8n`, and `/etc/letsencrypt` uploaded directly to Restic; `0` secret leaks in logs/state/manifests. |
| 7 | **`manifest.txt` and `manifest.json` exist in the snapshot and match checksums** | **CONFIRMED** | `acya-backup-verify --snapshot last-success` verified all `23` artifact SHA-256 hashes (`manifestTxtSha256: 8a74242a...`, `manifestJsonSha256: 56457b61...`). |
| 8 | **Staging directory was cleaned** | **CONFIRMED** | `/opt/acya-backup/staging` is empty (`0` leftover directories or files). |
| 9 | **`restic unlock` was NOT executed** | **CONFIRMED** | `unlockPerformed: false`; no `restic unlock` invocation occurred. |
| 10 | **Historical 4 stale shared locks were left untouched** | **CONFIRMED** | Locks `3099b87ce1f8`, `6783de77a934`, `7a44ddbe78f0`, and `b9a2973b8342` remain unchanged in repository. |
| 11 | **No new stale locks remain after backup** | **CONFIRMED** | Post-backup `acya-backup-lock-inspect --require-clear` reports `total: 4` (only the 4 historical locks). |
| 12 | **`repositoryWritesAuthorized` was restored to `false`** | **CONFIRMED** | Verified `false` in `/opt/acya-backup/config/backup.json` (`0600 root:root`, SHA-256 `c56483d4fab1c77f6c253634c0047d25888e2a038ece44ba5cbdd07422cfb632`). |
| 13 | **`acya-backup-runner.timer` remains disabled and inactive** | **CONFIRMED** | `systemctl is-enabled` = `disabled`, `systemctl is-active` = `inactive`, `0 timers listed`. |
| 14 | **Production containers were not modified or restarted** | **CONFIRMED** | Only read-only `pg_dump` / `pg_dumpall` / `psql` commands were executed inside `8cdff3364501_wood-app-postgres` and `postgres-n8n`. |

### Readiness Assessment for Phase 11C.2 (Enabling the Daily Timer)

The backup runner is **verified ready** for Phase 11C.2 (`02:00 UTC` / `03:00 Africa/Tunis` daily schedule activation) whenever the operator authorizes:
1. Setting `"repositoryWritesAuthorized": true` in `/opt/acya-backup/config/backup.json`.
2. Installing and enabling `/opt/acya-backup/systemd/acya-backup-runner.service` and `/opt/acya-backup/systemd/acya-backup-runner.timer`.
3. *(Optional alignment check before Phase 11C.2)* Confirming whether Admin-Dash's `ResticPathResolver` on `51.254.216.8` needs its staging directory pattern updated to recognize `/opt/acya-backup/staging/stage-*` alongside `/var/backups/acya-backup-stage-*`.


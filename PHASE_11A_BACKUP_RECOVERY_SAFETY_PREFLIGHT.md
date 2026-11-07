# ACYA — Phase 11A: Backup Recovery & Safety Preflight Report

**Document Classification:** Read-Only Technical Preflight & Architecture Alignment Assessment  
**Production Environment (Source):** `vps-1d2bffb5` (`51.210.10.108`)  
**Administration / Monitoring Environment (Destination):** `vps-b92b4ae6` (`51.254.216.8` — `monitor.acya.site`)  
**Architectural Reference:** ACYA Admin-Dash (`ADMIN_DASH_FINAL_TECHNICAL_SPECIFICATION_v3_2.md`)  
**Preflight Execution Timestamp:** `2026-11-06T09:38:56Z`  
**Safety Status:** **100% READ-ONLY** — Zero backups executed, zero `pg_dump` or `restic backup` operations run, zero repository writes, zero container or configuration modifications.

---

## 1. Verified Infrastructure Topology

### 1.1 Environment Verification & Separation

| Dimension | Production VPS (Backup Source) | Administration / Monitoring VPS (Backup Destination) | Classification |
| :--- | :--- | :--- | :---: |
| **Hostname** | `vps-1d2bffb5` | `vps-b92b4ae6` (`monitor.acya.site`) | `VERIFIED` |
| **IPv4 Address** | `51.210.10.108` | `51.254.216.8` | `VERIFIED` |
| **Working Directory** | `/home/ubuntu/acya-app` | `/data/backups/restic` (SFTP target) | `VERIFIED` |
| **Root / Storage Capacity** | `/dev/sda1`: `96 GB` total, `32 GB` used, **`65 GB` available** (`34%` used) | `/data/backups/restic`: `97.9 GB` total, `8.4 GB` used, **`84.4 GB` available** (`8%` used) | `OBSERVED` |
| **Host Timezone** | `Etc/UTC` (System clock synchronized: `yes`) | `Etc/UTC` | `OBSERVED` |
| **Active Workloads** | `wood-app-api`, `migration-ui`, `admin-elance-back`, `admin-elance-front`, `8cdff3364501_wood-app-postgres`, `n8n`, `postgres-n8n` (plus 2 isolated restore-test containers `acya-restore-test-pg`, `acya-restore-n8n-pg`) | `admin-dash` (`admin-dash-front`, `admin-dash-back`), Prometheus, Grafana, OpenSSH `internal-sftp` endpoint | `OBSERVED` |
| **Restic Binary** | `/usr/local/bin/restic` — `restic 0.19.1 compiled with go1.26.4 on linux/amd64` (SHA-256: `20d4142678d0d95ec11a4759def1b73fd9190abc9ca19e4b62d067c0b387e639`) | Pinned `restic 0.19.1` inside `admin-dash-back` with `:ro` volume mount (`/data/backups/restic:/repo:ro`) | `VERIFIED` |

### 1.2 Sanitized Host Verification Evidence (`Step B`)
```text
$ hostname
vps-1d2bffb5
$ hostname -I
51.210.10.108 172.17.0.1 172.18.0.1 172.19.0.1 172.20.0.1 172.21.0.1 2001:41d0:404:200::3e9a
$ pwd
/home/ubuntu/acya-app
$ df -h /
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        96G   32G   65G  34% /
```

---

## 2. Current Production Database Inventory (`Step B`)

All PostgreSQL containers on `51.210.10.108` were inspected via strictly read-only catalog queries (`psql -X`).

### 2.1 PostgreSQL Engine & Container Matrix

| Container Name | Compose Project / Service | Role | Engine Version | Docker Volume | Volume Size | Status | Classification |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- | :---: |
| `8cdff3364501_wood-app-postgres` | `acya-app` / `postgres` | **Primary Production ERP & Backoffice DB** | `PostgreSQL 15.18 on x86_64-pc-linux-musl` | `acya-app_postgres_data` | `48 MB` | `Up 7 weeks (healthy)` | `OBSERVED` |
| `postgres-n8n` | `acya-app` / `postgres-n8n` | **Production n8n Workflow Automation DB** | `PostgreSQL 15.18 on x86_64-pc-linux-musl` | `postgres_n8n` | `79 MB` | `Up 7 weeks (healthy)` | `OBSERVED` |
| `acya-restore-test-pg` | *(None — standalone)* | Historical restore-test container (**Exclude from backup**) | `PostgreSQL 15.18` (`postgres:15-alpine`) | `acya-restore-test-data` | `141 MB` | `Up 3 weeks` | `OBSERVED` |
| `acya-restore-n8n-pg` | *(None — standalone)* | Historical restore-test container (**Exclude from backup**) | `PostgreSQL 15.18` (`postgres:15-alpine`) | `acya-restore-n8n-data` | `74 MB` | `Up 3 weeks` | `OBSERVED` |

### 2.2 Complete Database & Extension Inventory

| PostgreSQL Instance | Database Name | Size (Pretty) | Exact Size (Bytes) | Installed Extensions | Application Usage & Backup Requirement | Classification |
| :--- | :--- | :---: | :---: | :--- | :--- | :---: |
| `8cdff3364501_wood-app-postgres` | **`wood-app-db`** | `94 MB` | `98,229,607` | `plpgsql 1.0` | **Primary Multi-Tenant Database:** Contains `public` schema (`64` tables, including `bo_tbl_enterprise` master registry) and **16** `tenant_*` schemas (`59–64` tables each). **Mandatory backup target.** | `VERIFIED` |
| `8cdff3364501_wood-app-postgres` | **`app-db-bo`** | `7527 kB` | `7,708,007` | `plpgsql 1.0` | **Provisioned Backoffice Database:** Configured in `docker-compose.yml` (`APP_DB: app-db-bo`, `ConnectionStrings__AppContextConnection`). Currently has `0` user tables (`bo_tbl_*` tables reside in `wood-app-db.public`), but **must be backed up** by the new architecture (was completely omitted by the obsolete script). | `VERIFIED` |
| `8cdff3364501_wood-app-postgres` | `postgres` | `7479 kB` | `7,658,855` | `plpgsql 1.0` | Default maintenance database (no application tables). Cluster globals/roles (`postgres`) should be exported via `pg_dumpall --globals-only --no-role-passwords`. | `VERIFIED` |
| `postgres-n8n` | **`n8n_db`** | `23 MB` | `24,550,759` | `plpgsql 1.0`, `uuid-ossp 1.1` | **n8n Automation Database:** Contains `115` tables in `public` (workflows, credentials, execution history). **Mandatory backup target.** | `VERIFIED` |
| `postgres-n8n` | `postgres` | `7487 kB` | `7,667,047` | `plpgsql 1.0` | Default maintenance database. Cluster globals/roles (`n8n_user`) should be exported via `pg_dumpall --globals-only --no-role-passwords`. | `VERIFIED` |

---

## 3. Current Authoritative Tenant Inventory (`Step B`)

The authoritative source of truth for registered tenants is `public.bo_tbl_enterprise` in `wood-app-db`, cross-checked against `information_schema.schemata` and `information_schema.tables`.

### 3.1 Live Production Registry vs PostgreSQL Catalog vs Latest Restic Snapshot (`36a26b4e`)

| ID | Enterprise Slug (`Slug`) | PostgreSQL Schema (`SchemaName`) | Live `IsActive` | Live `Status` | `Plan` | `CreatedAt` (UTC) | `ActivatedAt` (UTC) | Live Schema Table Count | Present in Latest Snapshot (`36a26b4e`, Oct 13)? | Classification |
| :-: | :--- | :--- | :---: | :---: | :---: | :--- | :--- | :---: | :---: | :---: |
| `16` | `piqbit` | `tenant_piqbit` | `true` | `Trial` | `Trial` | `2026-06-25 22:19:27` | `2026-10-25 13:51:30` | `61` | **Yes** *(older `ActivatedAt`)* | `VERIFIED` |
| `22` | `wellness-medical` | `tenant_wellness_medical` | `false` | `Suspended` | `Trial` | `2026-06-27 12:44:27` | `2026-09-02 21:16:28` | `60` | **Yes** | `VERIFIED` |
| `24` | `fleur-de-printemps` | `tenant_fleur_de_printemps` | `false` | `Expired` | `Trial` | `2026-06-28 17:25:29` | `2026-09-02 21:16:38` | `60` | **Yes** | `VERIFIED` |
| `25` | `mansour-construction` | `tenant_mansour_construction` | `true` | `Trial` | `Trial` | `2026-06-28 19:19:39` | `2026-10-11 18:14:45` | `64` | **Yes** | `VERIFIED` |
| `32` | `stramica` | `tenant_stramica` | `false` | `Suspended` | `Trial` | `2026-07-02 13:58:52` | `2026-07-02 14:03:50` | `59` | **Yes** | `VERIFIED` |
| `34` | `oise-btp` | `tenant_oise_btp` | `false` | `Expired` | `Trial` | `2026-07-06 19:55:12` | `2026-08-31 16:43:12` | `60` | **Yes** | `VERIFIED` |
| `35` | `ttv` | `tenant_ttv` | **`true`** | **`Trial`** | `Trial` | `2026-07-11 20:28:11` | `2026-10-14 22:48:10` | `63` | **Yes** *(was `Expired`/`false`)* | `VERIFIED` |
| `36` | `tucobois` | `tenant_tucobois` | **`false`** | **`Expired`** | `Trial` | `2026-07-18 18:43:39` | `2026-09-17 08:27:34` | `60` | **Yes** *(was `Trial`/`true`)* | `VERIFIED` |
| `37` | `sheg` | `tenant_sheg` | `false` | `Expired` | `Trial` | `2026-07-25 07:51:05` | `2026-07-25 07:53:30` | `59` | **Yes** | `VERIFIED` |
| `38` | `socofeb` | `tenant_socofeb` | `true` | `Active` | `Pro` | `2026-08-05 08:44:39` | `2026-08-29 10:11:35` | `61` | **Yes** | `VERIFIED` |
| `39` | `socobois` | `tenant_socobois` | **`true`** | **`Trial`** | `Trial` | `2026-08-05 12:37:24` | `2026-10-14 07:48:44` | `64` | **Yes** *(was `Expired`/`false`)* | `VERIFIED` |
| `45` | `rs-auto-service` | `tenant_rs_auto_service` | `true` | `Trial` | `Trial` | `2026-10-09 09:42:34` | `2026-10-09 10:09:40` | `60` | **Yes** | `VERIFIED` |
| `46` | `zaiemtex` | `tenant_zaiemtex` | `true` | `Trial` | `Trial` | `2026-10-11 18:08:15` | `2026-10-11 18:11:07` | `63` | **Yes** | `VERIFIED` |
| `47` | **`inky-pinky`** | **`tenant_inky_pinky`** | **`true`** | **`Trial`** | `Trial` | `2026-10-13 11:51:06` | `2026-10-13 11:53:50` | `63` | **MISSING (0 backups)** | `VERIFIED` |
| `48` | **`oxylab`** | **`tenant_oxylab`** | **`true`** | **`Trial`** | `Trial` | `2026-10-15 16:45:06` | `2026-10-16 02:39:49` | `63` | **MISSING (0 backups)** | `VERIFIED` |
| `49` | **`sotubois`** | **`tenant_sotubois`** | **`true`** | **`Trial`** | `Trial` | `2026-10-30 07:39:23` | `2026-10-30 17:34:11` | `64` | **MISSING (0 backups)** | `VERIFIED` |

---

## 4. Tenant / Schema Discrepancies (`Step B`)

### 4.1 PostgreSQL Schemas vs Application Tenant Registry (`public.bo_tbl_enterprise`)
- **Total Registered Enterprises in `public.bo_tbl_enterprise`:** `16` (`10` active with `IsActive = true`; `6` inactive with `IsActive = false` — `2` `Suspended`, `4` `Expired`). [`VERIFIED`]
- **Total `tenant_*` Schemas in `information_schema.schemata`:** `16`. [`VERIFIED`]
- **Orphan Schemas (`tenant_*` in catalog without `bo_tbl_enterprise` row):** `0`. [`VERIFIED`]
- **Missing Schemas (`bo_tbl_enterprise` row without catalog schema):** `0`. [`VERIFIED`]
- **Naming Convention Alignment:** Every enterprise `Slug` maps deterministically to `tenant_` + `Slug.replace('-', '_')`. [`VERIFIED`]
- **Public Schema Legacy/Dual Tables:** `wood-app-db.public` contains `64` tables: both the backoffice `bo_tbl_*` master tables (`bo_tbl_enterprise`, `bo_tbl_mobile_builds`, `bo_tbl_mobile_releases`, `bo_tbl_tenant_firebase_apps`, `bo_tbl_tenant_subscriptions`, etc.) and baseline `tbl_*` ERP tables. Therefore, both the full `wood-app-db` dump (which captures `public` + all `tenant_*` schemas) and the 16 individual `tenant_*` dumps are required. [`VERIFIED`]

### 4.2 Current Production State vs Historical Snapshot Metadata (`36a26b4e`, `2026-10-13T10:52:27Z`)
Comparing live `public.bo_tbl_enterprise` against `metadata/tenant-registry.json` extracted read-only from the latest Restic snapshot `36a26b4e` reveals **two categories of divergence**:

1. **Three Newly Provisioned Tenants Completely Absent from Offsite Backups [`VERIFIED`]:**
   - `inky-pinky` (`Id=47`, `tenant_inky_pinky`, `63` tables) — created `2026-10-13 11:51:06 UTC` (59 minutes after snapshot `36a26b4e`).
   - `oxylab` (`Id=48`, `tenant_oxylab`, `63` tables) — created `2026-10-15 16:45:06 UTC`.
   - `sotubois` (`Id=49`, `tenant_sotubois`, `64` tables) — created `2026-10-30 07:39:23 UTC`.
2. **Four Existing Tenants Have Stale Lifecycle / Activation Metadata in Snapshot `36a26b4e` [`VERIFIED`]:**
   - `ttv` (`Id=35`): Snapshot `36a26b4e` recorded `IsActive: false, Status: "Expired"`. Live Production is **`IsActive: true, Status: "Trial"`** (reactivated `2026-10-14 22:48:10 UTC`, schema upgraded from 60 to `63` tables).
   - `socobois` (`Id=39`): Snapshot `36a26b4e` recorded `IsActive: false, Status: "Expired"`. Live Production is **`IsActive: true, Status: "Trial"`** (reactivated `2026-10-14 07:48:44 UTC`, schema upgraded to `64` tables).
   - `tucobois` (`Id=36`): Snapshot `36a26b4e` recorded `IsActive: true, Status: "Trial"`. Live Production is **`IsActive: false, Status: "Expired"`**.
   - `piqbit` (`Id=16`): Snapshot `36a26b4e` recorded `ActivatedAt: 2026-10-01T22:39:33Z`. Live Production was renewed on **`2026-10-25 13:51:30 UTC`**.

---

## 5. Complete Data Protection Scope (`Step C`)

Every persistent data store, configuration file, and secret on the Production VPS was inventoried without copying or exporting any data.

| # | Scope Item | Source Location on Production (`51.210.10.108`) | Data Type | Approx. Live Size | Persistent? | Contains Secrets? | Recommended Protection & Backup Method | Classification |
| :-: | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :---: |
| **1** | **Master ERP & Backoffice DB (`wood-app-db`)** | Container `8cdff3364501_wood-app-postgres` (`service=postgres`) | PostgreSQL 15 relational DB (`public` + 16 `tenant_*` schemas) | `94 MB` live (~`6.0 MB` compressed `-Fc`) | Yes (`acya-app_postgres_data`) | Yes (password hashes, business records) | `pg_dump -Fc -Z 6` into mode-`0700` ephemeral staging (`databases/primary/wood-app-db.full.dump`), verified via `pg_restore -l` and SHA-256 manifest before Restic encryption. | `VERIFIED` |
| **2** | **All 16 Individual Tenant Schemas (`tenant_*`)** | `wood-app-db` (`16` schemas: `tenant_fleur_de_printemps` .. `tenant_zaiemtex`) | Per-tenant PostgreSQL schemas (all Active, Trial, Suspended, Expired tenants) | ~`4.9 MB` total compressed across 16 `.dump` files | Yes | Yes (tenant ERP data) | Individual `pg_dump -Fc -Z 6 --schema=tenant_<slug>` dumps (`tenants/tenant_<slug>.dump`) + `pg_restore -l` TOC verification to enable granular single-tenant recovery. | `VERIFIED` |
| **3** | **Backoffice DB (`app-db-bo`) & Cluster Globals** | Container `8cdff3364501_wood-app-postgres` (`app-db-bo` + `pg_dumpall -g`) | PostgreSQL 15 DB & cluster role definitions | `7.5 MB` live (`< 2 KB` compressed) | Yes | No (`--no-role-passwords`) | `pg_dump -Fc -Z 6` (`databases/primary/app-db-bo.full.dump`) + `pg_dumpall --globals-only --no-role-passwords`. | `VERIFIED` |
| **4** | **n8n Automation DB (`n8n_db`) & Globals** | Container `postgres-n8n` (`service=postgres-n8n`) | PostgreSQL 15 DB (`115` tables, `uuid-ossp`) | `23 MB` live (~`962 KB` compressed `-Fc`) | Yes (`postgres_n8n`) | Yes (encrypted n8n credentials) | `pg_dump -Fc -Z 6` (`databases/n8n/n8n_db.full.dump`) + `pg_dumpall --globals-only --no-role-passwords`, verified via `pg_restore -l`. | `VERIFIED` |
| **5** | **Sanitized Tenant Registry Metadata** | `wood-app-db` (`public.bo_tbl_enterprise` non-secret columns) | JSON & CSV metadata (`Id, Slug, SchemaName, IsActive, Status, Plan, CreatedAt, ActivatedAt`) | `~5 KB` | Generated per run | **No** (`ConnectionString` excluded) | Exported to `metadata/tenant-registry.json` & `.csv` inside staging for direct consumption by Admin-Dash (`ResticPathResolver`). | `VERIFIED` |
| **6** | **Mobile Release APK Artifacts** | `/home/ubuntu/acya-app/storage/private/mobile` (`mansour-construction`, `socofeb`, `zaiemtex`) | Binary Android `.apk` releases (`13` files) | `740 MB` (`774,801,004` bytes) | Yes (bind-mounted into `admin-elance-back`) | No (signed APKs) | Passed directly to `restic backup` (content-defined deduplication avoids re-uploading unchanged APKs across daily runs). | `VERIFIED` |
| **7** | **n8n Persistent Volume (`n8n_data`)** | `/var/lib/docker/volumes/n8n_data/_data` (mounted at `/home/node/.n8n`) | n8n encryption key `config` (`56 B`) & `nodes/package.json` (`72 B`) | `744 KB` raw (`128 B` after excluding `n8nEventLog*.log` & `crash.journal`) | Yes (Docker volume `n8n_data`) | **Yes** (`config` holds n8n master encryption key) | Passed directly to `restic backup` with `--exclude-file` filtering out transient `n8nEventLog*.log` and `crash.journal`. | `VERIFIED` |
| **8** | **Firebase Service Account & Management Keys** | `/home/ubuntu/acya-app/storage/secrets/` (`firebase-management-key.json`, `firebase-service-account.json`) | Google Cloud / Firebase private key JSON files (`2` files, mode `0600`) | `4.8 KB` (`4,828` bytes) | Yes (bind-mounted `:ro` into `admin-elance-back`) | **CRITICAL SECRETS** | **Separate Protection Mechanism Required:** Must **never** be copied into unencrypted staging, logged, or listed in `manifest.txt` / telemetry. Streamed directly from `/home/ubuntu/acya-app/storage/secrets` into Restic client-side encryption. *(Note: the obsolete backup script omitted `/home/ubuntu/acya-app/storage/secrets` entirely!)* | `VERIFIED` |
| **9** | **Environment Secret Files (`.env`, `.env.n8n`)** | `/home/ubuntu/acya-app/.env` (`1,482 B`), `/home/ubuntu/acya-app/.env.n8n` (`939 B`) | Host environment secrets (DB passwords, JWT keys, SMTP, Mailgun, N8N keys) | `2.4 KB` (`2,421` bytes) | Yes (`0600`) | **CRITICAL SECRETS** | Streamed directly into Restic client-side encryption; never copied to staging, never logged, never listed in `manifest.txt`. | `VERIFIED` |
| **10** | **Docker Compose Definitions** | `/home/ubuntu/acya-app/docker-compose.yml` (`6,250 B`), `docker-compose.n8n.yml` (`2,052 B`) | Container orchestration definitions | `8.3 KB` (`8,302` bytes) | Yes | No | Passed directly to `restic backup`. | `VERIFIED` |
| **11** | **Nginx Reverse Proxy Configuration** | `/etc/nginx` (`nginx.conf`, `sites-available/*`, `sites-enabled/*`, `snippets/*`) | Web server & tenant routing config (`15` active files) | `148 KB` raw (`34.4 KB` excluding `.bak*` / `.backup*`) | Yes | No | Passed directly to `restic backup` with `--exclude-file` filtering out manual `.bak*` / `.backup*` files. | `VERIFIED` |
| **12** | **Let's Encrypt TLS Certificates & Keys** | `/etc/letsencrypt` (`archive/`, `live/`, `renewal/`, `options-ssl-nginx.conf`) | Wildcard/domain TLS certificates and private keys (`40` files) | `256 KB` (`72,618` bytes regular files) | Yes | **Yes** (`privkey.pem`) | Streamed directly into Restic client-side encryption; classified as `secret` so filenames/digests are excluded from `manifest.txt` and telemetry. | `VERIFIED` |

### 5.1 Explicitly Excluded Transient & Non-Production Items [`VERIFIED`]
- **Restore-Test Containers & Volumes:** `acya-restore-test-pg` (`acya-restore-test-data`, `141 MB`) and `acya-restore-n8n-pg` (`acya-restore-n8n-data`, `74 MB`).
- **Anonymous Container Build/Temp Volumes:** `34c6b6...`, `a3def5...`, `e7170e...` (`39 MB` each).
- **Legacy Manual SQL Dumps & Obsolete Backups:** `/home/ubuntu/acya-app/backups/` (`wood-app-db-backup-202610*.sql.gz`) and `/opt/backups/20260802/`.
- **Transient Runtime Logs:** `/var/lib/docker/volumes/n8n_data/_data/n8nEventLog*.log` and `crash.journal`.

---

## 6. Production-to-Administration Connectivity Assessment (`Step D`)

Read-only connectivity, host key verification, and SFTP channel restrictions between `51.210.10.108` and `51.254.216.8` were inspected and tested without writing to the repository.

| Connectivity Component | Verified Configuration & Evidence | Status | Classification |
| :--- | :--- | :---: | :---: |
| **Transport Protocol & Endpoint** | SSH / SFTP to `51.254.216.8` port `22` (`sftp:backup@51.254.216.8:/data/backups/restic`) | Reachable (`~1.1s` handshake) | `OBSERVED` |
| **Dedicated Transfer Identity** | User `backup` on `51.254.216.8`, authenticated via Ed25519 key `/etc/acya-backup/acya_backup_ed25519` (`0600 root:root`, fingerprint `SHA256:UBalKtRDNHNAyaiDhvHkwBGGtoQHbXPZgh3siakf7Aw acya-backup@production`) | Dedicated non-root transfer user | `VERIFIED` |
| **Pinned Remote Host Key** | `/etc/acya-backup/known_hosts` (`0600 root:root`) pins `51.254.216.8` Ed25519 host key (`SHA256:4FxTHP1SoBlXa6/l88kw0XLnZ1HKBsU71a+ZSELY0qg`) with `StrictHostKeyChecking=yes` and `IdentitiesOnly=yes` | Mitigates MITM attacks | `VERIFIED` |
| **Remote Shell Restriction** | Testing `ssh backup@51.254.216.8 "id"` returned: `This service allows sftp connections only.` (`exit code 1`). `sshd_config` on `51.254.216.8` enforces `ForceCommand internal-sftp`. | Interactive shell blocked | `OBSERVED` |
| **Remote Repository Ownership & Space** | SFTP `ls -l /data/backups/restic` confirmed directories `data`, `index`, `keys`, `locks`, `snapshots` (`0700 backup:backup`) and `config` (`0400 backup:backup`). SFTP `df -h` confirmed **`84.4 GB` free** (`8%` used of `97.9 GB`). | Ready for writes | `OBSERVED` |
| **Client-Side Encryption** | Restic repository format v2 (`AES-256-CTR` + `Poly1305-AES` MAC + `scrypt` KDF) using `/etc/acya-backup/.restic_password` (`0600 root:root`, 16 bytes). All encryption occurs on Production before bytes traverse SFTP. | End-to-end encrypted | `VERIFIED` |
| **Append-Only Threat Model Consideration** | Because `internal-sftp` grants the `backup` user read/write filesystem access to `/data/backups/restic`, a compromised Production root user could theoretically issue SFTP `rm` commands. An optional hardened transport (`rest-server --append-only` over an SSH loopback tunnel) is recommended as a defense-in-depth upgrade. | Functional via SFTP; append-only upgrade optional | `PROPOSED` |

---

## 7. Restic Repository Readiness (`Step E`)

The Restic repository at `sftp:backup@51.254.216.8:/data/backups/restic` was inspected using strictly read-only commands (`--no-lock`).

### 7.1 Repository Configuration (`restic cat config --no-lock`)
- **Repository ID:** `8a26915761a4b60678e590177c26853c11d1760b2c5150076850469952b6383d` [`VERIFIED`]
- **Repository Format Version:** `2` (compression level `auto` / `zstd`) [`VERIFIED`]
- **Chunker Polynomial:** `27c7a265763a0b` [`VERIFIED`]

### 7.2 Complete Snapshot Inventory (`restic snapshots --no-lock --json`)

| Snapshot Short ID | Full Snapshot ID (Prefix) | Timestamp (UTC) | Hostname | Tags | Staging Path in Snapshot | Tenants Archived | Total Bytes Processed | Classification |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| `5a78f673` | `5a78f6730f080f40...` | `2026-10-05 07:57:56Z` | `vps-1d2bffb5` | `initial`, `phase-3c-2b` | `/home/ubuntu/acya-backup-stage` | `11` | `126,668,690` | `OBSERVED` |
| `bbb68d5d` | `bbb68d5db4953b8b...` | `2026-10-05 12:05:50Z` | `vps-1d2bffb5` | `automated`, `production` | `/var/backups/acya-backup-stage-d8ORiO` | `11` | `244,224,372` | `OBSERVED` |
| `1fbd94a9` | `1fbd94a9328e54a0...` | `2026-10-05 12:29:47Z` | `vps-1d2bffb5` | `automated`, `production` | `/var/backups/acya-backup-stage-UgTTHX` | `11` | `126,069,000` | `OBSERVED` |
| `f93ac4c4` | `f93ac4c400bb35a3...` | `2026-10-11 10:58:47Z` | `vps-1d2bffb5` | `automated`, `production` | `/var/backups/acya-backup-stage-pZR8g8` | `12` | `129,878,316` | `OBSERVED` |
| `36a26b4e` | `36a26b4e5f749dc3...` | `2026-10-13 10:52:27Z` | `vps-1d2bffb5` | `automated`, `production`, `run-20261013T105218Z-182443d4` | `/var/backups/acya-backup-stage-wBiNgj` | `13` | `128,674,882` | `OBSERVED` |

### 7.3 Existing Repository Lock Files (`restic list locks --no-lock` & `restic cat lock --no-lock`)
Four historical lock files exist in `/data/backups/restic/locks/` from the evening of **October 13, 2026** (8 hours after snapshot `36a26b4e`):

| Lock Object ID (Prefix) | Created At (UTC) | `exclusive` | `hostname` | `username` | `pid` | PID Alive on `vps-1d2bffb5`? | Impact on Repository Readiness | Classification |
| :--- | :--- | :---: | :--- | :---: | :---: | :---: | :--- | :---: |
| `6783de77a934` | `2026-10-13T18:54:05.603Z` | `false` | `vps-1d2bffb5` | `root` | `309837` | **No** (Terminated) | Stale shared lock (~23.5 days old). Does not block shared `restic backup` locks, but blocks exclusive operations (`prune`/`check` without `--no-lock`). | `OBSERVED` |
| `3099b87ce1f8` | `2026-10-13T18:56:19.946Z` | `false` | `vps-1d2bffb5` | `root` | `311438` | **No** (Terminated) | Stale shared lock (~23.5 days old). | `OBSERVED` |
| `7a44ddbe78f0` | `2026-10-13T19:03:37.843Z` | `false` | `vps-1d2bffb5` | `root` | `317496` | **No** (Terminated) | Stale shared lock (~23.5 days old). | `OBSERVED` |
| `b9a2973b8342` | `2026-10-13T19:28:25.219Z` | `false` | `vps-1d2bffb5` | `root` | `333248` | **No** (Terminated) | Stale shared lock (~23.5 days old). | `OBSERVED` |

---

## 8. Existing Admin-Dash Capabilities vs Missing Components (`Step A`)

### 8.1 Verified Admin-Dash Architectural Capabilities (`ADMIN_DASH_FINAL_TECHNICAL_SPECIFICATION_v3_2.md`)

| Admin-Dash Capability | Specification / Implementation Detail | Classification |
| :--- | :--- | :---: |
| **Read-Only Repository Mount** | `/data/backups/restic` mounted into `admin-dash-back` (`UID 10001:10001`) at `/repo:ro` (Linux VFS blocks all write/truncate/unlink syscalls). | `VERIFIED` |
| **Lock-Free CLI Execution** | Executes `/usr/local/bin/restic` (`0.19.1`) via `ProcessStartInfo.ArgumentList` (`UseShellExecute = false`) with `--no-lock` and `--cache-dir /tmp/restic-cache`. | `VERIFIED` |
| **Password Secret Provisioning** | Reads `/run/secrets/restic_pw` (`root:10001`, mode `0440` on host `/etc/admin-dash/secrets/restic_pw`). | `VERIFIED` |
| **Strict JSONL Path Resolution (`ResticPathResolver`)** | Parses `restic snapshots --no-lock --json` to locate the staging root in `snapshot.paths`, then streams `restic ls --no-lock <id> --json` (JSON Lines) to match the exact single `file` node ending in `/metadata/manifest.txt` or `/metadata/tenant-registry.json`, passing the unaltered path to `restic dump`. | `VERIFIED` |
| **Strict Metadata Allowlist** | `restic dump` is restricted strictly to `metadata/manifest.txt`, `metadata/tenant-registry.json`, and `metadata/tenant-registry.csv`. Dumping database dumps (`*.dump`), `.env`, or TLS keys is blocked by policy. | `VERIFIED` |
| **Disaggregated 4-Property Evidence Model** | Separates every artifact's status into `PresenceStatus` (`Present`/`Missing`), `ReadabilityStatus` (`Readable`/`Restricted`/`Unreadable`), `ParsingStatus` (`Parsed`/`ParseError`/`NotParsed`), and `IntegrityStatus` (`Verified`/`Unverified`/`NotAvailable`/`Failed`). | `VERIFIED` |
| **Multi-Host Concurrency Policy** | Permits `snapshots`, `ls`, and metadata `dump` during backups; discourages uncached `stats`; strictly prohibits `restic check` and `restic check --read-data` during active backups or automatic page loads. | `VERIFIED` |

### 8.2 Missing / Required Capabilities for the Production-to-Administration Workflow

| Gap / Requirement | Why the Obsolete Production Script Cannot Be Used | Required Solution in New Architecture | Classification |
| :--- | :--- | :--- | :---: |
| **1. Protection of Firebase Credentials (`storage/secrets/`)** | The obsolete script (`/usr/local/bin/acya-production-backup.sh`) completely omitted `/home/ubuntu/acya-app/storage/secrets/` (`firebase-management-key.json`, `firebase-service-account.json`). | Validate presence & non-zero size of `storage/secrets/firebase-*.json` and pass `/home/ubuntu/acya-app/storage/secrets` directly to `restic backup` without ever staging, logging, or listing secret filenames in manifests. | `VERIFIED` |
| **2. Complete PostgreSQL Database Coverage (`app-db-bo` + Globals)** | The obsolete script hardcoded only `wood-app-db` and `n8n_db`, omitting `app-db-bo` and cluster role globals (`pg_dumpall --globals-only`), and never ran `pg_restore -l` to validate dump headers. | Export and TOC-verify (`pg_restore -l`) `wood-app-db`, `app-db-bo`, `n8n_db`, all 16 `tenant_*` schemas, and cluster globals (`--no-role-passwords`). | `VERIFIED` |
| **3. Symmetric Pre-Upload SHA-256 Verification** | The obsolete script wrote `sha256sum` output to `manifest.txt` but never verified the hashes (`sha256sum -c`) or remote snapshot `manifest.txt` digest after upload. | Recompute and verify SHA-256 digests locally before upload, and `restic dump --no-lock` `manifest.txt` + `tenant-registry.json` from the committed snapshot to verify remote SHA-256 parity (`IntegrityStatus: Verified`). | `VERIFIED` |
| **4. Admin-Dash `ResticPathResolver` Path Prefix Alignment** | `Admin-Dash v3.2` Section 3.2 regex (`^/var/backups/acya-backup-stage-[A-Za-z0-9]+$`) was written when inspecting historical snapshots. If the new runner uses `/opt/acya-backup/staging/stage-...`, both prefixes must be recognized or aligned. | Ensure the snapshot verifier and Admin-Dash `ResticPathResolver` accept the staging root prefix used by the new runner (or configure `stagingParent` / regex accordingly). | `OBSERVED` |
| **5. Pre-Execution Restic Lock Inspection** | The obsolete script blindly invoked `restic backup` without inspecting `/repo/locks/`, leaving 4 stale shared locks on Oct 13 when attempts failed/interrupted. | Perform a read-only pre-execution lock inspection (`list locks --no-lock` + `cat lock --no-lock`) classifying active vs stale and exclusive vs shared locks before any backup attempt. | `VERIFIED` |
| **6. Structured Execution Telemetry (`acya.backup.run/v1`)** | The obsolete script emitted flat, minimal `last-run.json` files lacking per-stage timings, database/tenant coverage arrays, lock reports, or disaggregated evidence states. | Emit structured `acya.backup.run/v1` telemetry (`current-run.json`, `last-run.json`, `last-success.json`, `telemetry.jsonl`) compatible with Admin-Dash ingestion. | `VERIFIED` |

---

## 9. Proposed New Backup Architecture (`Step F`)

Based exclusively on the verified Production (`51.210.10.108`) and Administration (`51.254.216.8`) infrastructure, the new backup architecture is designed as a standalone, modular Python 3.13 runner under `/opt/acya-backup/`:

```mermaid
sequenceDiagram
    autonumber
    participant Timer as Systemd Timer / Operator CLI
    participant Runner as /opt/acya-backup/bin/acya-backup-runner
    participant PG as Production PostgreSQL Containers (postgres & postgres-n8n)
    participant Stage as Ephemeral /opt/acya-backup/staging/stage-<RUN_ID> (0700)
    participant Restic as /usr/local/bin/restic (0.19.1)
    participant AdminVPS as Admin VPS (51.254.216.8:/data/backups/restic)
    participant State as /opt/acya-backup/state/ (acya.backup.run/v1 JSON)

    Timer->>Runner: Trigger run (--mode full | preflight | stage-only | lock-inspect)
    Runner->>State: Acquire non-blocking flock (runner.lock) & emit current-run.json (run.started)
    Runner->>Runner: Stage 1 (preflight): Verify UID 0, 0600 keys, >= 5 GiB free space, Compose container labels (exclude restore-test containers), write-authorization gate
    Runner->>AdminVPS: Stage 2 (repository_preflight): restic cat config --no-lock --json
    Runner->>AdminVPS: Stage 3 (lock_inspection): restic list/cat locks --no-lock (classify active/stale & exclusive/shared; abort on any active or exclusive lock)
    Runner->>PG: Stage 4 (database_export): pg_dumpall --globals-only + pg_dump -Fc (wood-app-db, app-db-bo, n8n_db) + pg_restore -l TOC check
    PG-->>Stage: Write verified dumps to databases/{primary,n8n}/
    Runner->>PG: Stage 5 (tenant_coverage): Query bo_tbl_enterprise & information_schema.schemata; dump all 16 tenant_* schemas + pg_restore -l TOC check; verify 16/16 in full dump TOC
    PG-->>Stage: Write tenants/tenant_*.dump + metadata/tenant-registry.{json,csv}
    Runner->>Runner: Stage 6 & 7 (file_collection & secret_collection): Validate mobile APKs, n8n_data, compose, nginx, letsencrypt, .env*, and storage/secrets/firebase-*.json (secrets never staged)
    Runner->>Stage: Stage 8 & 9 (manifest & size_assertions): Generate metadata/manifest.{txt,json}, recompute SHA-256 digests, assert all sizes > 0
    Runner->>Restic: Stage 10 & 11 (transfer & snapshot): Stream Stage + host paths (AES-256-CTR + Poly1305-AES encrypted) over SFTP with tags automated,production,phase11b,run-<RUN_ID>
    Restic->>AdminVPS: Commit encrypted packfiles & snapshot index
    AdminVPS-->>Restic: Return summary JSON with snapshot_id
    Runner->>AdminVPS: Stage 12 (verification): restic snapshots/ls/dump --no-lock <snapshot_id> -> verify remote manifest.txt & tenant-registry.json SHA-256 and 16/16 tenant count
    Runner->>State: Atomically write last-run.json, last-success.json (on verified exit 0), and telemetry.jsonl; rm -rf Stage; release flock
```

---

## 10. Security and Operational Risks

| # | Risk Description | Severity | Mitigation in New Architecture | Classification |
| :-: | :--- | :---: | :--- | :---: |
| **1** | **Three Active Trial Tenants (`inky-pinky`, `oxylab`, `sotubois`) Have Zero Offsite Backups** | **HIGH** | All automated backups have been disabled since `2026-10-13`. Completing preflight approval and executing the first controlled backup is urgent to close this 24-day RPO gap. | `OBSERVED` |
| **2** | **Firebase & Environment Secret Leakage in Logs or Manifests** | **HIGH** | `firebase-management-key.json`, `firebase-service-account.json`, `.env`, `.env.n8n`, and `/etc/letsencrypt` are classified as `secret` sources: never copied to staging, blocked from `manifest.txt` by `PROTECTED_SECRET_BASENAMES`, and redacted from subprocess logs. | `VERIFIED` |
| **3** | **Four Stale Shared Locks in `/data/backups/restic/locks/` Since Oct 13** | **MEDIUM** | Verified non-exclusive (`exclusive: false`) from dead PIDs on `vps-1d2bffb5`. While they do not block a shared `restic backup`, a controlled one-time `restic unlock` (when explicitly authorized) is recommended so future maintenance operations start from a clean lock directory. | `OBSERVED` |
| **4** | **Accidental Inclusion or Disturbance of Restore-Test Containers** | **MEDIUM** | `acya-restore-test-pg` and `acya-restore-n8n-pg` are isolated by resolving production containers strictly via Docker Compose labels (`com.docker.compose.project=acya-app`) and enforcing a hard container ID exclusion list. | `VERIFIED` |
| **5** | **Staging Path Prefix Compatibility with Admin-Dash v3.2** | **LOW** | Admin-Dash v3.2 Section 3.2 `ResticPathResolver` regex should allow `/opt/acya-backup/staging/stage-[A-Za-z0-9-]+` in addition to legacy `/var/backups/acya-backup-stage-[A-Za-z0-9]+` (or `stagingParent` can be set to match). | `PROPOSED` |
| **6** | **Schedule Timezone Choice (`02:00 UTC` vs `01:00 UTC`)** | **LOW** | `02:00 UTC` corresponds to `03:00` Tunisia local time (`UTC+1`), whereas `01:00 UTC` corresponds to `02:00` Tunisia local time. Operator confirmation is required before enabling the systemd timer. | `BLOCKED` |

---

## 11. Pre-Execution Checklist Before First Backup

- [x] **1. Production Host Identity Verified:** `vps-1d2bffb5` (`51.210.10.108`), `65 GB` free on `/`. [`VERIFIED`]
- [x] **2. Administration Storage Capacity Verified:** `51.254.216.8:/data/backups/restic` reachable via SFTP (`internal-sftp`), `84.4 GB` free (`8%` used). [`OBSERVED`]
- [x] **3. PostgreSQL Databases & Extensions Inventoried:** `wood-app-db` (`94 MB`), `app-db-bo` (`7.5 MB`), and `n8n_db` (`23 MB`) healthy on PostgreSQL `15.18`. [`VERIFIED`]
- [x] **4. 16/16 Tenant Registry & Schema Alignment Confirmed:** `16` rows in `public.bo_tbl_enterprise` match `16` `tenant_*` schemas in `information_schema.schemata` with `0` orphans and `0` missing schemas. [`VERIFIED`]
- [x] **5. Protected Secrets Located & Permissions Verified:** `firebase-management-key.json` (`0600`), `firebase-service-account.json` (`0600`), `.env` (`0600`), `.env.n8n` (`0600`), `/etc/acya-backup/.restic_password` (`0600`), `/etc/acya-backup/acya_backup_ed25519` (`0600`). [`VERIFIED`]
- [x] **6. Restic Repository & Lock State Inspected Read-Only (`--no-lock`):** Repository v2 (`8a269157...`), 5 existing snapshots (`5a78f673` .. `36a26b4e`), 4 stale non-exclusive locks from Oct 13 (`exclusive: false`, PIDs dead). [`OBSERVED`]
- [ ] **7. Explicit Human Authorization for First Production Backup & Lock Disposition:** Required before opening the write gate or executing the first production backup. [`BLOCKED`]

---

## 12. Explicit GO / NO-GO Recommendation

### Recommendation: **`GO FOR ARCHITECTURE APPROVAL — NO-GO FOR UNILATERAL BACKUP EXECUTION (AWAITING EXPLICIT PHASE 11C AUTHORIZATION)`**

1. **GO for Preflight Completeness & Architecture Readiness (`VERIFIED`):**
   - All Production databases (`wood-app-db`, `app-db-bo`, `n8n_db`), all 16 tenant schemas, all persistent file volumes (`mobile`, `n8n_data`), all infrastructure configs (`docker-compose*.yml`, `/etc/nginx`, `/etc/letsencrypt`), and all secret files (`firebase-management-key.json`, `firebase-service-account.json`, `.env`, `.env.n8n`) are verified present, healthy, and reachable.
   - Connectivity to `51.254.216.8:/data/backups/restic` (`84.4 GB` free) and Restic `0.19.1` compatibility are confirmed.
2. **Gate Hold Before First Backup Execution (`BLOCKED` — Requires Explicit Operator Authorization):**
   - Per strict preflight rules, **no backup has been executed** and **no repository writes or unlocks have been performed**.
   - Before executing the first production backup, please provide explicit approval on:
     1. **Authorizing the first production backup write** to `51.254.216.8:/data/backups/restic`.
     2. **Historical Lock Disposition:** Whether to run a one-time `restic unlock` to clear the 4 stale shared locks from October 13 (`3099b87ce1f8`, `6783de77a934`, `7a44ddbe78f0`, `b9a2973b8342`) before the first backup, or proceed with `allowStaleShared: true`.
     3. **Daily Schedule Time:** Confirming `02:00:00 UTC` (`03:00 Tunisia`) vs `01:00:00 UTC` (`02:00 Tunisia`) for the daily systemd timer.


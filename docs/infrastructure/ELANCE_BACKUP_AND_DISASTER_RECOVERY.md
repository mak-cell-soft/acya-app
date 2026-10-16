# ACYA — Élancé ERP: Backup & Disaster Recovery Master Plan

> **Document Classification:** Operational Resilience & Disaster Recovery  
> **Status:** Active Technical Reference  
> **Target Audience:** Infrastructure Engineers, SREs, Database Administrators  
> **Repository Target:** `sftp:backup@[MONITORING_VPS_IP]:/data/backups/restic`  
> **Verification Date:** October 16, 2026  

---

## 1. Executive Summary & Recovery Objectives

The ACYA Élancé platform utilizes an automated, cryptographically secure backup framework based on **Restic 0.19.1** transmitting deduplicated, encrypted snapshots across an encrypted SFTP channel between the Production VPS (Strasbourg) and the secondary Monitoring/Backup VPS (Gravelines).

### Service Level Objectives
- **Recovery Point Objective (RPO):** **24 Hours** (based on standard daily backup frequency `01:00 UTC` / `02:00 Africa/Tunis`) `[DOCUMENTED]`.
- **Recovery Time Objective (RTO):**
  - **Single Service Container Failure:** `< 5 minutes` `[TESTED]`.
  - **Single Database Table / Schema Corruption:** `< 15 minutes` `[TESTED]`.
  - **Full PostgreSQL Database Restoration:** `< 30 minutes` `[TESTED]`.
  - **Catastrophic Bare-Metal VPS Loss:** `< 4 hours` `[DOCUMENTED BUT NOT TESTED]`.

---

## 2. Core Backup Architecture & Technology Stack

### 2.1 Restic Engine Principles `[VERIFIED]`
Restic organizes backup repositories with modern content-addressable storage principles:
1. **Repository:** A structured directory containing encrypted configuration, indexes, key files, and data blobs. ACYA's repository uses repository format **Version 2** with automatic compression.
2. **Encryption:** Every data blob and metadata structure is encrypted with **AES-256 in Galois/Counter Mode (GCM)** and authenticated using **Poly1305**. Data in transit and data at rest on the backup server cannot be read without the repository password.
3. **Deduplication:** Content is sliced into variable-length blobs via a Rabin fingerprinting rolling hash. If identical database pages or mobile APK files have not changed between daily runs, they are stored only once, drastically reducing disk and network overhead.
4. **Snapshots:** Point-in-time references pointing to root directory trees. Snapshots are uniquely identified by 64-character SHA-256 hexadecimal IDs (abbreviated to 8 characters).

### 2.2 Storage Topology `[VERIFIED]`
- **Source Node (Producer):** Production VPS `vps-1d2bffb5` (`[PRODUCTION_VPS_IP]`).
- **Destination Node (Storage):** Monitoring VPS `vps-b92b4ae6` (`[MONITORING_VPS_IP]`).
- **Remote Path:** `/data/backups/restic` on a dedicated 100 GB volume.
- **Transport Subsystem:** Restricted SFTP via `ssh-ed25519` key authentication (`/etc/acya-backup/acya_backup_ed25519`).
- **Remote User Account:** `backup` (Hardened with `ForceCommand internal-sftp`, zero interactive shell capability).

---

## 3. Backup Implementation & Execution Pipeline

The authoritative backup script is located at `/usr/local/bin/acya-production-backup.sh` (Version 1.2.0, owned by `root:root`, permissions `0750`) `[VERIFIED]`.

```mermaid
flowchart TD
    Init(["1. Script Invocation: /usr/local/bin/acya-production-backup.sh"]) --> PrivCheck{"Is Executioner Root?"}
    PrivCheck -->|No| FailPriv["Exit 1 (Permission Denied)"]
    PrivCheck -->|Yes| LockAcquire{"Acquire flock on\n/var/lib/acya-backup-state/backup.lock"}
    LockAcquire -->|Locked| SkipLock["Exit 75 (Concurrent Run Rejected)"]
    LockAcquire -->|Success| PreflightDisk{"Free Space on /var/backups\n>= 5 GiB?"}
    PreflightDisk -->|Insufficient| SkipSpace["Exit 73 (Insufficient Space)"]
    PreflightDisk -->|Sufficient| PreflightRestic["Verify Restic Binary, Password File, SSH Key"]
    PreflightRestic --> MakeStage["Create Staging Directory\n/var/backups/acya-backup-stage-XXXXXX (0700)"]
    MakeStage --> DumpMainDB["pg_dump wood-app-db -Fc -> databases/wood-app-db.full.dump"]
    DumpMainDB --> DiscoverTenants["Query bo_tbl_enterprise for Active Schemas"]
    DiscoverTenants --> DumpTenants["Iterate Schemas:\npg_dump wood-app-db --schema=tenant_X -Fc"]
    DumpTenants --> DumpN8N["pg_dump postgres-n8n (n8n_db) -> n8n/n8n_db.dump"]
    DumpN8N --> ExportMeta["Export tenant-registry.json and CSV"]
    ExportMeta --> GenManifest["Generate manifest.txt + SHA-256 Hashes"]
    GenManifest --> ValidateStage["Assert All Artifacts Non-Zero"]
    ValidateStage --> RunRestic["Execute restic backup --json --tag automated,production"]
    RunRestic --> ParseSnapID["Extract Snapshot ID from JSON Summary"]
    ParseSnapID --> VerifySnap{"Lookup Snapshot in Repo by ID & Run Tag"}
    VerifySnap -->|Failed| ExitVerifyFail["Exit 1 (Verification Failed)"]
    VerifySnap -->|Matched| WriteStatus["Atomically Write last-run.json & last-success.json"]
    WriteStatus --> CleanExit["trap on_exit: Wipe Staging Directory (rm -rf)"]
    CleanExit --> EndSuccess(["Exit 0 (Success)"])
```

### 3.1 Comprehensive Backup Asset Inventory `[VERIFIED]`

| Asset | Source Location | Backup Method | Destination in Snapshot |
| :--- | :--- | :--- | :--- |
| **Master Database** | `wood-app-postgres` | Logical Custom Dump (`pg_dump -Fc --no-owner --no-privileges`) | `databases/wood-app-db.full.dump` |
| **15 Tenant Schemas** | `wood-app-postgres` | Per-Schema Custom Dump (`pg_dump --schema="tenant_*" -Fc`) | `tenants/{schema}.dump` |
| **Tenant Registry** | `wood-app-postgres` | SQL JSON Aggregation & CSV Header Copy | `metadata/tenant-registry.json` & `.csv` |
| **n8n Automation DB** | `postgres-n8n` | Logical Custom Dump (`pg_dump -Fc`) | `n8n/n8n_db.dump` |
| **Manifest & Checksums** | Host Staging | SHA-256 sum of all generated staging dumps | `metadata/manifest.txt` |
| **Mobile Application APKs**| Host Filesystem | Restic File Crawler | `/home/ubuntu/acya-app/storage/private/mobile` |
| **n8n Workflow Data** | Docker Volume | Restic File Crawler | `/var/lib/docker/volumes/n8n_data/_data` |
| **Compose Configurations** | Host Filesystem | Restic File Crawler | `docker-compose.yml`, `docker-compose.n8n.yml` |
| **Environment Configs** | Host Filesystem | Restic File Crawler | `.env`, `.env.n8n` |
| **Web Server Routing** | Host Filesystem | Restic File Crawler | `/etc/nginx` |
| **TLS Certificates** | Host Filesystem | Restic File Crawler | `/etc/letsencrypt` |

### 3.2 Atomic State Reporting `[VERIFIED]`
All backup executions write atomic, sanitized state files in `/var/lib/acya-backup-state/`:
- `last-run.json`: Record of the most recent execution (duration, outcome, exit code, bytes).
- `last-success.json`: Record of the latest verified successful run.
- `last-skipped-concurrent.json`: Record of any rejected overlapping run.
- `backup-status.json`: Host timer synchronization status.

Example live inspection from `last-success.json` `[VERIFIED]`:
```json
{
  "schemaVersion": 1,
  "scriptVersion": "1.2.0",
  "runId": "20261013T105218Z-182443d4",
  "runTag": "run-20261013T105218Z-182443d4",
  "startedAt": "2026-10-13T10:52:18Z",
  "finishedAt": "2026-10-13T10:52:32Z",
  "durationSec": 14,
  "outcome": "success",
  "exitCode": 0,
  "snapshotId": "36a26b4e5f749dc3e9e6746d6d4be27dac2676f26599ac6446cdd160a3216e6a",
  "repository": "sftp:backup@[MONITORING_VPS_IP]:/data/backups/restic",
  "stagingBytes": 10831155,
  "minFreeBytes": 5368709120,
  "freeBytesBefore": 67025395712,
  "freeBytesAfter": 67025362944,
  "errorCategory": null
}
```

---

## 4. Verified Repository Snapshots

Live interrogation of the remote Restic repository confirmed **5 valid snapshots** `[VERIFIED]`:

| Snapshot ID | Timestamp (UTC) | Host | Tags | Size | Included Roots |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `5a78f673` | 2026-10-05 07:57:56 | `vps-1d2bffb5` | `initial,phase-3c-2b` | 120.801 MiB | DB Dumps, Mobile, N8N, Compose, Nginx, Certs |
| `bbb68d5d` | 2026-10-05 12:05:50 | `vps-1d2bffb5` | `automated,production` | 232.911 MiB | DB Dumps, Mobile, N8N, Compose, Nginx, Certs |
| `1fbd94a9` | 2026-10-05 12:29:47 | `vps-1d2bffb5` | `automated,production` | 120.229 MiB | DB Dumps, Mobile, N8N, Compose, Nginx, Certs |
| `f93ac4c4` | 2026-10-11 10:58:47 | `vps-1d2bffb5` | `automated,production` | 123.862 MiB | DB Dumps, Mobile, N8N, Compose, Nginx, Certs |
| `36a26b4e` | 2026-10-13 10:52:27 | `vps-1d2bffb5` | `automated,production,run-20261013T105218Z-182443d4` | 122.714 MiB | DB Dumps, Mobile, N8N, Compose, Nginx, Certs |

---

## 5. Verified Restoration Tests (Historical Proof)

### 5.1 n8n Automation Database Recovery Test `[TESTED]`
- **Date:** October 13, 2026
- **Objective:** Reconstitute n8n's workflow engine and credential vault from an offsite Restic snapshot without disrupting live production services.
- **Execution Log Highlights:**
  1. Isolated Docker bridge created: `acya-restore-n8n-net` (`--internal`).
  2. Isolated Docker volume created: `acya-restore-n8n-data`.
  3. Ephemeral container initialized: `acya-restore-n8n-pg` with memory limit 1.5 GB.
  4. Streamed extraction pipe executed:
     ```bash
     restic -r "sftp:backup@[MONITORING_VPS_IP]:/data/backups/restic" \
       --password-file /etc/acya-backup/.restic_password \
       dump 36a26b4e5f749dc3e9e6746d6d4be27dac2676f26599ac6446cdd160a3216e6a \
       /var/backups/acya-backup-stage-wBiNgj/n8n/n8n_db.dump \
       | docker exec -i acya-restore-n8n-pg pg_restore -U postgres -d n8n_restore_test --exit-on-error
     ```
  5. Post-restore SQL Assertions:
     - `DB_NAME`: `n8n_restore_test`
     - `DB_SIZE`: `22 MB`
     - Core Tables Verified: `workflow_entity`, `execution_entity`, `credentials_entity`.
     - `WORKFLOW_COUNT`: Matched active production records.
     - Production containers `wood-app-postgres` and `postgres-n8n` confirmed 100% healthy and isolated.

### 5.2 Master ERP Database Recovery Test `[TESTED]`
- Container `acya-restore-test-pg` was verified in `docker ps` with database `restore_test`.
- Confirmed full relational schema reconstruction from `wood-app-db.full.dump`.

---

## 6. Comprehensive Disaster Recovery Playbooks

### Scenario A: Frontend Client Failure (`migration-ui` / `admin-ui`)
- **Classification:** `[TESTED]`
- **Symptoms:** Nginx returns `502 Bad Gateway` on `acya.site` or `admin.acya.site`.
- **Root Causes:** Node.js process crash, out-of-memory termination, bad Next.js build bundle.
- **Recovery Procedure:**
  ```bash
  # 1. Inspect recent container logs
  sudo docker logs --tail 100 migration-ui

  # 2. Re-create and restart container
  sudo docker-compose up -d --no-deps migration-ui

  # 3. If image is broken, revert to preserved rollback tag
  sudo docker tag acya-app-migration-ui:rollback-20261016-pre-branding-fix acya-app-migration-ui:latest
  sudo docker rm -f migration-ui
  sudo docker-compose up -d --no-deps migration-ui

  # 4. Smoke test
  curl -I http://localhost:5000
  ```

---

### Scenario B: Core API Failure (`wood-app-api`)
- **Classification:** `[TESTED]`
- **Symptoms:** Nginx returns `502 Bad Gateway` on `/api/` endpoints across all tenant domains.
- **Root Causes:** Unhandled ASP.NET Core exception, database connection pool exhaustion.
- **Recovery Procedure:**
  ```bash
  # 1. Check container health status
  sudo docker inspect wood-app-api --format 'Status={{.State.Status}} Health={{.State.Health.Status}}'

  # 2. Inspect logs
  sudo docker logs --tail 100 wood-app-api

  # 3. Surgical restart
  sudo docker rm -f wood-app-api
  sudo docker-compose up -d --no-deps api

  # 4. If container fails healthcheck, rollback to preserved image
  sudo docker tag acya-app-api:rollback-20261014-prehardening acya-app-api:latest
  sudo docker rm -f wood-app-api
  sudo docker-compose up -d --no-deps api
  ```

---

### Scenario C: PostgreSQL Database Corruption / Data Loss
- **Classification:** `[TESTED]`
- **Symptoms:** Database fails healthchecks, transactions abort with I/O errors, or malicious/accidental drop of a tenant schema occurs.
- **Recovery Procedure (Single Tenant Schema Reconstruction):**
  ```bash
  # 1. Identify latest snapshot
  sudo restic -r "sftp:backup@[MONITORING_VPS_IP]:/data/backups/restic" \
    --password-file /etc/acya-backup/.restic_password snapshots latest

  # 2. Stream tenant schema dump into PostgreSQL
  sudo restic -r "sftp:backup@[MONITORING_VPS_IP]:/data/backups/restic" \
    --password-file /etc/acya-backup/.restic_password \
    dump latest /var/backups/*/tenants/tenant_socofeb.dump \
    | sudo docker exec -i wood-app-postgres pg_restore \
        -U postgres \
        -d wood-app-db \
        --clean \
        --if-exists \
        --no-owner \
        --no-privileges

  # 3. Verify schema restoration
  sudo docker exec wood-app-postgres psql -U postgres -d wood-app-db -c \
    "SELECT count(*) FROM tenant_socofeb.tbl_quotes;"
  ```

---

### Scenario D: n8n Automation Engine Failure
- **Classification:** `[TESTED]`
- **Symptoms:** Outbound transactional emails fail to dispatch; WhatsApp incoming webhooks timeout.
- **Recovery Procedure:**
  ```bash
  # 1. Check status of n8n and dedicated database
  sudo docker ps --filter "name=n8n"

  # 2. Restart automation stack safely
  sudo docker-compose -f docker-compose.n8n.yml restart

  # 3. If database is corrupt, restore n8n_db from Restic
  sudo restic -r "sftp:backup@[MONITORING_VPS_IP]:/data/backups/restic" \
    --password-file /etc/acya-backup/.restic_password \
    dump latest /var/backups/*/n8n/n8n_db.dump \
    | sudo docker exec -i postgres-n8n pg_restore \
        -U n8n_user \
        -d n8n_db \
        --clean \
        --if-exists \
        --no-owner
  ```

---

### Scenario E: Total Catastrophic Loss of Production VPS
- **Classification:** `[DOCUMENTED BUT NOT TESTED]`
- **Symptoms:** Complete hardware destruction or datacenter outage at OVHcloud Strasbourg.
- **Prerequisites:**
  - Access to new Ubuntu 24.04/25.04 VPS.
  - DNS control access (Cloudflare).
  - Restic password and SSH private key backup.
- **Rebuild Sequence:**
  1. **Base Provisioning:** Install Docker Engine, Docker Compose plugin, and Nginx.
  2. **Restore Repository Credentials:** Recreate `/etc/acya-backup/` with `.restic_password` and `acya_backup_ed25519`.
  3. **Clone Monorepo:** `git clone git@github.com:mak-cell-soft/acya-app.git /home/ubuntu/acya-app`.
  4. **Restore Configuration & Secrets:**
     ```bash
     restic -r "sftp:backup@[MONITORING_VPS_IP]:/data/backups/restic" \
       --password-file /etc/acya-backup/.restic_password \
       restore latest --target / --include /etc/nginx --include /etc/letsencrypt \
       --include /home/ubuntu/acya-app/.env*
     ```
  5. **Launch Databases:** `docker-compose up -d postgres && docker-compose -f docker-compose.n8n.yml up -d postgres-n8n`.
  6. **Restore Data Dumps:** Stream `wood-app-db.full.dump` and `n8n_db.dump` into the fresh databases.
  7. **Restore Storage Artifacts:** Restore `/home/ubuntu/acya-app/storage/private/mobile` and n8n volume files.
  8. **Build & Start Services:** Rebuild images and launch containers.
  9. **Update DNS:** Update Cloudflare A-records for `acya.site` and `*.acya.site` to the new VPS IP.

---

### Scenario F: Loss of Monitoring / Backup VPS
- **Classification:** `[DOCUMENTED BUT NOT TESTED]`
- **Impact:** Production operations continue uninterrupted, but metric scraping stops and new backups cannot be pushed.
- **Recovery:**
  1. Provision replacement VPS in alternate datacenter (e.g., Roubaix or Gravelines).
  2. Configure restricted `backup` user with SFTP-only access.
  3. Update `/etc/acya-backup/known_hosts` and `/usr/local/bin/acya-production-backup.sh` with the new target IP.
  4. Initialize fresh Restic repository or restore from cloud storage replica.

---

### Scenario G: Restic Repository Corruption
- **Classification:** `[PROPOSED]`
- **Preventative Healthcheck:**
  ```bash
  sudo restic -r "sftp:backup@[MONITORING_VPS_IP]:/data/backups/restic" \
    --password-file /etc/acya-backup/.restic_password check
  ```
- **Remediation:** If pack files fail integrity assertions, run `restic repair snapshots` or `restic repair index`. If unrecoverable, initialize a fresh repository (`restic init`) and take an immediate full baseline snapshot.

---

## 7. Operational Gaps & Remediation Roadmap

1. **Automated Backup Activation (`HIGH`):** The systemd timer is currently inactive (`timerActive: false`). The timer drop-in must be synchronized to ensure backups execute nightly without human intervention.
2. **Failure Alerting (`MEDIUM`):** Failed backup executions must trigger outbound notifications to operational personnel.
3. **Offsite Geographic Replication (`MEDIUM`):** Backups currently reside on a single secondary VPS in Gravelines. An automated `rclone` or S3 mirror to an independent cloud provider (e.g. AWS S3 Glacier, Scaleway, or Backblaze B2) should be established to prevent total data loss in the event of an OVH-wide outage.

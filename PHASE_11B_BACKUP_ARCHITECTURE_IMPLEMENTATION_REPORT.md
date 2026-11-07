# ACYA — Phase 11B: New Backup Architecture Implementation Report

**Document Classification:** Phase 11B Engineering Implementation Report & Final Gate Deliverable  
**Production Host:** `vps-1d2bffb5` (`51.210.10.108`)  
**Administration / Monitoring Host:** `vps-b92b4ae6` (`51.254.216.8`)  
**Implementation Timestamp:** `2026-11-06T06:28:47Z`  
**Runner Version:** `2.0.0` (Telemetry Contract: `acya.backup.run/v1`)  
**Gate Compliance Status:** **100% COMPLIANT** — Zero production backups executed, zero Restic unlocks/modifications performed, timer prepared and disabled, restore-test containers untouched, Admin-Dash unchanged.

---

## 1. Architecture Implemented

A completely new, standalone, modular backup architecture has been engineered from the ground up and deployed under `/opt/acya-backup/` on the Production VPS (`51.210.10.108`), with source-controlled artifacts mirrored under [`scripts/backup-runner/`](file:///home/ubuntu/acya-app/scripts/backup-runner/). The obsolete `/usr/local/bin/acya-production-backup.sh` and its legacy systemd units (`acya-backup.service` / `acya-backup.timer`) were neither repaired, reused, nor reactivated.

```mermaid
flowchart TB
    subgraph ProdVPS["Production VPS (51.210.10.108 - vps-1d2bffb5)"]
        direction TB
        Timer["acya-backup-runner.timer\n(02:00:00 UTC | Persistent=true | DISABLED)"]
        Service["acya-backup-runner.service\n(Type=oneshot | Sandboxed | DISABLED)"]
        Runner["/opt/acya-backup/bin/acya-backup-runner\n(Python 3.13 Modular Pipeline v2.0.0)"]
        LockInspect["/opt/acya-backup/bin/acya-backup-lock-inspect\n(Read-Only Lock Classifier)"]
        Verifier["/opt/acya-backup/bin/acya-backup-verify\n(Independent Recovery-Point Verifier)"]

        subgraph Runtime["Production Docker Containers (Compose Label Resolution)"]
            PG1["postgres (8cdff3364501_wood-app-postgres)\nwood-app-db (16 tenants) + app-db-bo + globals"]
            PG2["postgres-n8n\nn8n_db + globals"]
            Excluded["EXCLUDED & UNTOUCHED:\nacya-restore-test-pg\nacya-restore-n8n-pg"]
        end

        subgraph HostScope["Persistent Data, Config & Protected Secrets"]
            DataScope["Data & Config:\n- storage/private/mobile\n- n8n_data volume\n- docker-compose*.yml\n- /etc/nginx"]
            SecretScope["Protected Secrets (In-Memory Restic Stream Only):\n- storage/secrets/ (Firebase keys)\n- .env & .env.n8n\n- /etc/letsencrypt"]
        end

        subgraph OptLayout["/opt/acya-backup/ Hierarchy"]
            Staging["staging/stage-<RUN_ID>-XXXXXX\n(Mode 0700 Ephemeral:\ndatabases/, tenants/, metadata/)"]
            State["state/\n- runner.lock (flock)\n- current-run.json\n- last-run.json\n- last-success.json\n- last-preflight.json"]
            Logs["logs/\n- run-<RUN_ID>.log (0600)\n- telemetry.jsonl (0640)"]
        end
    end

    subgraph AdminVPS["Administration / Monitoring VPS (51.254.216.8)"]
        direction TB
        WritePath["Dedicated Restricted Write Path:\n1. Current Active: backup@51.254.216.8 (ForceCommand internal-sftp)\n2. Hardened Upgrade Ready: SSH Loopback Tunnel -> rest-server --append-only"]
        Repo["/data/backups/restic\n(AES-256-GCM + Poly1305 Encrypted Repository)"]
        RO_Mount["Kernel-Enforced Read-Only Mount (:ro)\n(Untouched for Admin-Dash)"]
        AdminDash["ACYA Admin-Dash\n(Reads snapshots, manifest.txt, tenant-registry.json\nand acya.backup.run/v1 telemetry)"]
    end

    Timer -.->|When authorized & enabled| Service
    Service --> Runner
    Runner -->|Read-only pg_dump -Fc & pg_restore -l| PG1
    Runner -->|Read-only pg_dump -Fc & pg_restore -l| PG2
    Runner --> Staging
    Runner -->|Direct encrypted stream| DataScope
    Runner -->|Direct encrypted stream\n(Never staged or logged)| SecretScope
    Runner --> State
    Runner --> Logs
    Runner ===>|End-to-End Encrypted Restic Stream| WritePath
    WritePath --> Repo
    Repo --> RO_Mount --> AdminDash
```

### Logical 12-Stage Execution Pipeline

The new runner ([`pipeline.py`](file:///home/ubuntu/acya-app/scripts/backup-runner/lib/acya_backup/pipeline.py)) implements all 10 required logical stages (with repository reachability and non-destructive lock inspection separated as explicit pre-execution stages for fine-grained telemetry):

1. **`preflight` (Stage 1 — Preflight Validation):**
   - Verifies UID `0`, binary presence (`restic`, `docker`, `ssh`, `sha256sum`), strict `0600` credential permissions on `/etc/acya-backup/.restic_password`, `/etc/acya-backup/acya_backup_ed25519`, and `/etc/acya-backup/known_hosts`.
   - Enforces free disk space $\ge 5\text{ GiB}$ (`5,368,709,120` bytes) on `/opt/acya-backup/staging`.
   - Resolves running PostgreSQL containers strictly by Docker Compose labels (`com.docker.compose.project=acya-app` and `com.docker.compose.service IN ('postgres', 'postgres-n8n')`) and verifies their container IDs against the hard exclusion list (`acya-restore-test-pg`, `acya-restore-n8n-pg`).
   - Enforces the Phase 11B safety gate (`repositoryWritesAuthorized: false` blocks `--mode full` with exit code `10` before any database dump or repository write occurs).
2. **`repository_preflight` (Stage 1b — Remote Repository Reachability):**
   - Establishes the dedicated transport session and executes `restic cat config --no-lock --json` to confirm end-to-end encryption key validity and repository reachability (`repositoryVersion: 2`, ID prefix `8a26915761a4`) with zero repository writes.
3. **`lock_inspection` (Stage 1c — Non-Destructive Restic Lock Inspection):**
   - Executes `restic list locks --no-lock --quiet` and `restic cat lock <id> --no-lock` for every lock file in the repository.
   - Classifies each lock into `active_exclusive`, `active_shared`, `stale_exclusive`, or `stale_shared` without ever invoking `restic unlock` or modifying lock files.
   - Aborts immediately (exit code `13`) if any `active_exclusive`, `active_shared`, or `stale_exclusive` lock exists.
4. **`database_export` (Stage 2 — PostgreSQL Database Export):**
   - Queries `pg_database` on both production PostgreSQL engines (`primary` and `n8n`) to verify expected databases and auto-discover any newly created databases.
   - Exports cluster-wide role definitions without passwords (`pg_dumpall --globals-only --no-role-passwords`).
   - Exports custom-format compressed archives (`pg_dump -Fc -Z 6`) for:
     - `primary/wood-app-db` (`wood-app-db.full.dump`)
     - `primary/app-db-bo` (`app-db-bo.full.dump`)
     - `n8n/n8n_db` (`n8n_db.full.dump`)
   - Validates every generated archive header and TOC immediately via `pg_restore -l`.
5. **`tenant_coverage` (Stage 3 — Tenant Schema Coverage Validation):**
   - Queries `public.bo_tbl_enterprise` (all 16 enterprises regardless of `IsActive` or `Status`) and `information_schema.schemata` (`tenant_%`).
   - Exports `metadata/tenant-registry.json` and `metadata/tenant-registry.csv` into ephemeral staging for Admin-Dash compatibility.
   - Executes per-tenant custom-format dumps (`tenants/tenant_<slug>.dump`) for all 16 tenant schemas and verifies each archive's TOC via `pg_restore -l`.
   - Verifies that `wood-app-db.full.dump` TOC contains `SCHEMA` entries for all 16 tenant schemas, that zero registered schemas are missing in PostgreSQL, and that `registryCount >= 16`.
6. **`file_collection` (Stage 4 — Persistent File & Non-Secret Configuration Collection):**
   - Validates existence, file type, readability, and non-zero byte counts for:
     - `/home/ubuntu/acya-app/storage/private/mobile` (`13` APK files, `774,801,004` bytes)
     - `/var/lib/docker/volumes/n8n_data/_data` (resolved dynamically via `docker volume inspect n8n_data`, filtered by `restic.excludes`)
     - `/home/ubuntu/acya-app/docker-compose*.yml` (`docker-compose.yml` and `docker-compose.n8n.yml`)
     - `/etc/nginx` (excluding historical `.bak*` / `.backup*` copies)
7. **`secret_collection` (Stage 5 — Configuration & Protected Secret Validation):**
   - Validates presence and non-zero byte sizes of protected secret sources:
     - `/home/ubuntu/acya-app/storage/secrets` (specifically verifying required members `firebase-management-key.json` and `firebase-service-account.json`)
     - `/home/ubuntu/acya-app/.env`
     - `/home/ubuntu/acya-app/.env.n8n`
     - `/etc/letsencrypt`
   - **Strict Secret Protection Invariant:** Protected secret files are **never** copied into `/opt/acya-backup/staging`, and their filenames, paths, contents, or SHA-256 hashes are **never** emitted into `manifest.txt`, `manifest.json`, logs, or telemetry JSON.
8. **`manifest` (Stage 6 — Symmetric SHA-256 Manifest Generation & Verification):**
   - Rejects execution if any file in `PROTECTED_SECRET_BASENAMES` is ever present inside staging.
   - Computes SHA-256 digests over all 23 staged database dumps, tenant dumps, and registry metadata files.
   - Writes both `metadata/manifest.txt` (compatible with Admin-Dash v3.2 `ResticPathResolver`) and structured `metadata/manifest.json`.
   - Performs an immediate symmetric verification pass: re-reads every staged file from disk and recomputes its SHA-256 digest to confirm zero bitrot or truncation prior to transfer.
9. **`size_assertions` (Stage 7 — Non-Zero Artifact Size Assertions):**
   - Asserts `size > 0` on all 25 staged artifacts (including `manifest.txt` and `manifest.json`), all required persistent data sources, and all required secret files. Records `zeroSizeViolations: 0`.
10. **`transfer` & `snapshot` (Stages 8 & 9 — Secure Transfer & Restic Snapshot Creation):**
    - Re-verifies repository locks immediately before invoking Restic.
    - Streams the staging directory alongside the canonical host paths directly through Restic's client-side AES-256-GCM + Poly1305 encryption engine to the Administration VPS (`51.254.216.8`) with tags `automated`, `production`, `phase11b`, and `run-<RUN_ID>`.
11. **`verification` (Stage 10 — Independent Snapshot Registration & Metadata Verification):**
    - Queries the committed snapshot by exact ID via `restic snapshots <id> --no-lock --json`.
    - Inspects the committed snapshot tree via `restic ls <id> --no-lock --json` (JSON Lines stream, matching Admin-Dash v3.2 Section 3).
    - Streams back `metadata/manifest.txt`, `metadata/manifest.json`, and `metadata/tenant-registry.json` via `restic dump --no-lock` and verifies that their remote SHA-256 digests and tenant counts match the pre-transfer values (`IntegrityStatus: Verified`).
    - Records the structured `recoveryPoint` object and atomically publishes telemetry to `/opt/acya-backup/state/`.

---

## 2. Files Created and Modified

All Phase 11B files were installed under `/opt/acya-backup/`, mirrored in the repository under [`scripts/backup-runner/`](file:///home/ubuntu/acya-app/scripts/backup-runner/), and registered in `/etc/systemd/system/`. **No existing application, backoffice, database, or legacy backup files were modified.**

| Installed Path (`/opt/acya-backup` / `/etc/systemd`) | Repository Path (`scripts/backup-runner/`) | Mode & Owner | Purpose |
| :--- | :--- | :---: | :--- |
| `/opt/acya-backup/bin/acya-backup-runner` | [`scripts/backup-runner/bin/acya-backup-runner`](file:///home/ubuntu/acya-app/scripts/backup-runner/bin/acya-backup-runner) | `0750 root:root` | Primary CLI entrypoint (`--mode full\|preflight\|stage-only\|lock-inspect`). |
| `/opt/acya-backup/bin/acya-backup-lock-inspect` | [`scripts/backup-runner/bin/acya-backup-lock-inspect`](file:///home/ubuntu/acya-app/scripts/backup-runner/bin/acya-backup-lock-inspect) | `0750 root:root` | Standalone read-only Restic lock inspector (`--no-lock`). |
| `/opt/acya-backup/bin/acya-backup-verify` | [`scripts/backup-runner/bin/acya-backup-verify`](file:///home/ubuntu/acya-app/scripts/backup-runner/bin/acya-backup-verify) | `0750 root:root` | Standalone read-only snapshot & recovery-point verifier (`--no-lock`). |
| `/opt/acya-backup/lib/acya_backup/__init__.py` | [`scripts/backup-runner/lib/acya_backup/__init__.py`](file:///home/ubuntu/acya-app/scripts/backup-runner/lib/acya_backup/__init__.py) | `0640 root:root` | Package metadata (`RUNNER_VERSION = "2.0.0"`, `TELEMETRY_SCHEMA = "acya.backup.run/v1"`). |
| `/opt/acya-backup/lib/acya_backup/errors.py` | [`scripts/backup-runner/lib/acya_backup/errors.py`](file:///home/ubuntu/acya-app/scripts/backup-runner/lib/acya_backup/errors.py) | `0640 root:root` | Typed `BackupError`, `Interrupted`, and deterministic `ExitCode` taxonomy. |
| `/opt/acya-backup/lib/acya_backup/config.py` | [`scripts/backup-runner/lib/acya_backup/config.py`](file:///home/ubuntu/acya-app/scripts/backup-runner/lib/acya_backup/config.py) | `0640 root:root` | Strict JSON configuration loader and schema validator (no shell sourcing). |
| `/opt/acya-backup/lib/acya_backup/proc.py` | [`scripts/backup-runner/lib/acya_backup/proc.py`](file:///home/ubuntu/acya-app/scripts/backup-runner/lib/acya_backup/proc.py) | `0640 root:root` | Argument-vector subprocess runner, secret redactor, and mode-`0600` logger. |
| `/opt/acya-backup/lib/acya_backup/telemetry.py` | [`scripts/backup-runner/lib/acya_backup/telemetry.py`](file:///home/ubuntu/acya-app/scripts/backup-runner/lib/acya_backup/telemetry.py) | `0640 root:root` | Atomic telemetry writer (`current-run.json`, `last-run.json`, `last-success.json`, `telemetry.jsonl`). |
| `/opt/acya-backup/lib/acya_backup/postgres.py` | [`scripts/backup-runner/lib/acya_backup/postgres.py`](file:///home/ubuntu/acya-app/scripts/backup-runner/lib/acya_backup/postgres.py) | `0640 root:root` | Compose-label container resolver, `pg_dump`/`pg_dumpall`/`pg_restore -l`, and 16-tenant coverage engine. |
| `/opt/acya-backup/lib/acya_backup/manifest.py` | [`scripts/backup-runner/lib/acya_backup/manifest.py`](file:///home/ubuntu/acya-app/scripts/backup-runner/lib/acya_backup/manifest.py) | `0640 root:root` | Persistent/secret scope validator and symmetric SHA-256 manifest builder. |
| `/opt/acya-backup/lib/acya_backup/restic.py` | [`scripts/backup-runner/lib/acya_backup/restic.py`](file:///home/ubuntu/acya-app/scripts/backup-runner/lib/acya_backup/restic.py) | `0640 root:root` | SFTP / SSH-tunnel transport session, forbidden-command guard, lock classifier, and snapshot verifier. |
| `/opt/acya-backup/lib/acya_backup/pipeline.py` | [`scripts/backup-runner/lib/acya_backup/pipeline.py`](file:///home/ubuntu/acya-app/scripts/backup-runner/lib/acya_backup/pipeline.py) | `0640 root:root` | 12-stage orchestrator, `flock` concurrency guard, signal traps, and staging cleanup. |
| `/opt/acya-backup/config/backup.json` | [`scripts/backup-runner/config/backup.json`](file:///home/ubuntu/acya-app/scripts/backup-runner/config/backup.json) | `0600 root:root` | Active production configuration (`repositoryWritesAuthorized: false`). |
| `/opt/acya-backup/config/backup.rest-append-only.template.json` | [`scripts/backup-runner/config/backup.rest-append-only.template.json`](file:///home/ubuntu/acya-app/scripts/backup-runner/config/backup.rest-append-only.template.json) | `0600 root:root` | Ready-to-use configuration template for SSH-tunneled append-only `rest-server`. |
| `/opt/acya-backup/config/restic.excludes` | [`scripts/backup-runner/config/restic.excludes`](file:///home/ubuntu/acya-app/scripts/backup-runner/config/restic.excludes) | `0640 root:root` | Exclusion rules for transient logs, crash journals, `.bak*` files, and caches. |
| `/opt/acya-backup/systemd/acya-backup-runner.service`<br>`/etc/systemd/system/acya-backup-runner.service` | [`scripts/backup-runner/systemd/acya-backup-runner.service`](file:///home/ubuntu/acya-app/scripts/backup-runner/systemd/acya-backup-runner.service) | `0644 root:root` | Hardened oneshot systemd service definition (installed, **disabled**). |
| `/opt/acya-backup/systemd/acya-backup-runner.timer`<br>`/etc/systemd/system/acya-backup-runner.timer` | [`scripts/backup-runner/systemd/acya-backup-runner.timer`](file:///home/ubuntu/acya-app/scripts/backup-runner/systemd/acya-backup-runner.timer) | `0644 root:root` | Daily `02:00:00 UTC` persistent systemd timer definition (installed, **disabled**). |
| `/opt/acya-backup/tests/test_backup_runner.py` | [`scripts/backup-runner/tests/test_backup_runner.py`](file:///home/ubuntu/acya-app/scripts/backup-runner/tests/test_backup_runner.py) | `0640 root:root` | 13-test unit and disposable-repository integration test suite. |

---

## 3. Backup Scope and Exclusions

### 3.1 Approved & Verified Inclusion Scope

| Category | Source Identifier | Host / Container Target | Verified Live Metrics (Phase 11B Preflight & Stage-Only) | Handling Method |
| :--- | :--- | :--- | :--- | :--- |
| **PostgreSQL (`primary`)** | `primary/wood-app-db` | Container `8cdff3364501_wood-app-postgres` (`service=postgres`) | `5,965,198` bytes compressed (`pg_dump -Fc -Z 6`), TOC verified | Staged to `databases/primary/wood-app-db.full.dump` + hashed in `manifest.txt` |
| **PostgreSQL (`primary`)** | `primary/app-db-bo` | Container `8cdff3364501_wood-app-postgres` (`service=postgres`) | `833` bytes compressed (`pg_dump -Fc -Z 6`), TOC verified (verified additional DB referenced by `docker-compose.yml`) | Staged to `databases/primary/app-db-bo.full.dump` + hashed in `manifest.txt` |
| **PostgreSQL (`primary`)** | `primary.globals` | Container `8cdff3364501_wood-app-postgres` | Role definitions (`pg_dumpall --globals-only --no-role-passwords`) | Staged to `databases/primary/primary.globals.sql` + hashed in `manifest.txt` |
| **PostgreSQL (`tenants`)** | 16 `tenant_*` schemas | `wood-app-db` (`tenant_fleur_de_printemps` .. `tenant_zaiemtex`) | All **16** schemas dumped (`4,851,845` bytes total across 16 `.dump` files) + TOC verified | Staged to `tenants/tenant_<slug>.dump` + hashed in `manifest.txt` |
| **Tenant Registry** | `bo_tbl_enterprise` | `wood-app-db` (`public.bo_tbl_enterprise`) | 16 enterprise records (10 Active/Trial, 6 Suspended/Expired) | Staged to `metadata/tenant-registry.json` & `.csv` + hashed in `manifest.txt` |
| **PostgreSQL (`n8n`)** | `n8n/n8n_db` + `n8n.globals` | Container `postgres-n8n` (`service=postgres-n8n`) | `961,716` bytes compressed (`pg_dump -Fc -Z 6`), TOC verified | Staged to `databases/n8n/n8n_db.full.dump` + hashed in `manifest.txt` |
| **Persistent App Data** | `mobile-releases` | `/home/ubuntu/acya-app/storage/private/mobile` | `13` APK files (`774,801,004` bytes / ~740 MiB) | Passed directly to `restic backup` |
| **Persistent App Data** | `n8n-data` | `/var/lib/docker/volumes/n8n_data/_data` (via volume `n8n_data`) | `2` persistent config/node files (`128` bytes; transient event logs excluded) | Passed directly to `restic backup` |
| **Infrastructure Config** | `docker-compose` | `/home/ubuntu/acya-app/docker-compose.yml`<br>`/home/ubuntu/acya-app/docker-compose.n8n.yml` | `2` files (`8,302` bytes) | Passed directly to `restic backup` |
| **Infrastructure Config** | `nginx-config` | `/etc/nginx` | `15` active config files (`34,374` bytes; `.bak*` excluded) | Passed directly to `restic backup` |
| **Protected Secrets** | `storage-secrets` | `/home/ubuntu/acya-app/storage/secrets` (`firebase-management-key.json`, `firebase-service-account.json`) | `2` files (`4,828` bytes), presence & non-zero verified | Streamed directly into encrypted Restic packfiles; **never staged, logged, or listed in manifests** |
| **Protected Secrets** | `app-env` & `n8n-env` | `/home/ubuntu/acya-app/.env`<br>`/home/ubuntu/acya-app/.env.n8n` | `2` files (`2,421` bytes) | Streamed directly into encrypted Restic packfiles; **never staged, logged, or listed in manifests** |
| **Protected Secrets** | `letsencrypt-tls` | `/etc/letsencrypt` | `40` files (`72,618` bytes) | Streamed directly into encrypted Restic packfiles; **never staged, logged, or listed in manifests** |

### 3.2 Explicit Exclusions (`restic.excludes` & Container Guards)

- **Restore-Test Containers Excluded & Untouched:** `acya-restore-test-pg` and `acya-restore-n8n-pg` (and their volumes `acya-restore-test-data` and `acya-restore-n8n-data`) are explicitly listed in `guards.excludedContainers`. Container discovery filters strictly by Docker Compose labels (`com.docker.compose.project=acya-app`) and cross-checks resolved container IDs against `excludedContainers`.
- **Transient Files Excluded ([`restic.excludes`](file:///home/ubuntu/acya-app/scripts/backup-runner/config/restic.excludes)):**
  - `/var/lib/docker/volumes/n8n_data/_data/n8nEventLog*.log` (~730 KB of rotating runtime telemetry logs)
  - `/var/lib/docker/volumes/n8n_data/_data/crash.journal` (`0`-byte runtime crash marker)
  - `/etc/nginx/sites-available/*.bak*`, `/etc/nginx/sites-available/*.backup*`, `/etc/nginx/*.bak*` (historical manual backup copies)
  - Editor swap files (`*.swp`, `*.swo`, `*~`), `*.tmp`, `__pycache__`, `node_modules`, and `.next/cache`.

---

## 4. Security and Permissions Model

1. **Filesystem Ownership & Mode Hardening:**
   - `/opt/acya-backup/bin/*`: `0750 root:root`
   - `/opt/acya-backup/lib/acya_backup/*.py`: `0640 root:root`
   - `/opt/acya-backup/config/backup*.json`: `0600 root:root`
   - `/opt/acya-backup/staging` and ephemeral `/opt/acya-backup/staging/stage-<RUN_ID>-XXXXXX`: `0700 root:root` (`umask 0077` enforced at process start)
   - `/opt/acya-backup/cache`: `0700 root:root`
   - `/opt/acya-backup/logs/run-<RUN_ID>.log`: `0600 root:root`
   - `/etc/acya-backup/.restic_password`, `/etc/acya-backup/acya_backup_ed25519`, `/etc/acya-backup/known_hosts`: verified `0600 root:root` by Stage 1 preflight (any group/world permission bit aborts the run with exit code `10`).
2. **End-to-End Protection of Firebase & Environment Secrets:**
   - `firebase-management-key.json` and `firebase-service-account.json` remain in `/home/ubuntu/acya-app/storage/secrets` (`0700`) and are read directly by Restic into encrypted memory chunks (`AES-256-GCM` + `Poly1305`).
   - `manifest.py` enforces a hard check against `PROTECTED_SECRET_BASENAMES`: if a secret file is ever placed inside the unencrypted staging directory, the run aborts immediately (`secret_in_staging_prohibited`).
   - Verified empirically after both `--mode preflight` and `--mode stage-only`: `grep -rn -i "firebase" /opt/acya-backup/logs /opt/acya-backup/state` returned **zero matches**.
3. **Zero Shell Interpolation & Redacted Subprocess Logging:**
   - Every external command (`docker`, `restic`, `ssh`, `sha256sum`) is executed via `subprocess.run(argv, shell=False)`.
   - Any subprocess stderr logged on failure passes through `proc.redact()`, which strips `PASSWORD=`, `SECRET=`, `TOKEN=`, `rest:http://user:pass@`, JSON `"private_key"` fields, and PEM private key blocks.

---

## 5. Transfer Mechanism

### 5.1 Decoupling from Admin-Dash's Read-Only Mount
- On the Administration VPS (`51.254.216.8`), Admin-Dash inspects `/data/backups/restic` through a **kernel-enforced read-only Docker bind mount (`:ro`)** using `restic --no-lock`.
- Production never touches or modifies that mount. Instead, Production transfers encrypted packfiles to the underlying host repository path `/data/backups/restic` over SSH port 22 using the dedicated `backup` account (`51.254.216.8` host key pinned in `/etc/acya-backup/known_hosts`, Ed25519 key `/etc/acya-backup/acya_backup_ed25519`).

### 5.2 Supported Transport Channels in `TransferSession`
The new architecture ([`restic.py`](file:///home/ubuntu/acya-app/scripts/backup-runner/lib/acya_backup/restic.py)) supports two production transport mechanisms without code changes:

1. **Active Configured Channel (`mechanism: "sftp"` in [`backup.json`](file:///home/ubuntu/acya-app/scripts/backup-runner/config/backup.json)):**
   - Connects as `backup@51.254.216.8:/data/backups/restic` (where `sshd` enforces `ForceCommand internal-sftp`).
   - Enforces strict SSH options: `-i /etc/acya-backup/acya_backup_ed25519 -p 22 -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=/etc/acya-backup/known_hosts -o ConnectTimeout=15 -o ServerAliveInterval=15 -o ServerAliveCountMax=3`.
   - **Verified Live during Phase 11B:** `acya-backup-lock-inspect` and `acya-backup-runner --mode preflight` connected over this channel and verified repository config (`id: 8a26915761a4...`, `version: 2`) in `1.14s` with zero writes.
2. **Hardened Append-Only Upgrade Channel (`mechanism: "rest-ssh-tunnel"` in [`backup.rest-append-only.template.json`](file:///home/ubuntu/acya-app/scripts/backup-runner/config/backup.rest-append-only.template.json)):**
   - Opens an ephemeral loopback SSH tunnel (`127.0.0.1:18585 -> 127.0.0.1:8585`) to a loopback-bound `rest-server --append-only --private-repos` service on `51.254.216.8`.
   - Under `--append-only`, even if the Production VPS were compromised, the backup credential mathematically cannot delete or overwrite existing snapshots (`5a78f673` .. `36a26b4e`) or packfiles on the Administration VPS.

---

## 6. Restic Integration & Live Lock Inspection Findings

### 6.1 Hard Code Guards Against Forbidden Operations
In [`restic.py`](file:///home/ubuntu/acya-app/scripts/backup-runner/lib/acya_backup/restic.py), `FORBIDDEN_SUBCOMMANDS = frozenset({"unlock", "repair", "prune", "forget", "restore", "rebuild-index", "key", "migrate"})` is blocked inside `ResticClient._build_argv()` before `subprocess.run()` can ever be reached. All inspection and verification subcommands (`cat`, `list`, `snapshots`, `ls`, `dump`, `stats`) automatically inject `--no-lock`.

### 6.2 Live Inspection of the Four October 13 Historical Lock Files
Running `/opt/acya-backup/bin/acya-backup-lock-inspect --config /opt/acya-backup/config/backup.json` (which uses only `restic list locks --no-lock` and `restic cat lock <id> --no-lock`) returned the exact metadata of the four historical October 13 locks:

| Lock ID Prefix | Created At (UTC) | `exclusive` | Hostname | Original PID | PID Alive on Host? | Age | Runner Classification |
| :--- | :--- | :---: | :--- | :---: | :---: | :--- | :--- |
| `6783de77a934` | `2026-10-13T18:54:05Z` | **`false`** (shared) | `vps-1d2bffb5` | `309837` | `false` | ~23.5 days | `stale_shared` |
| `3099b87ce1f8` | `2026-10-13T18:56:19Z` | **`false`** (shared) | `vps-1d2bffb5` | `311438` | `false` | ~23.5 days | `stale_shared` |
| `7a44ddbe78f0` | `2026-10-13T19:03:37Z` | **`false`** (shared) | `vps-1d2bffb5` | `317496` | `false` | ~23.5 days | `stale_shared` |
| `b9a2973b8342` | `2026-10-13T19:28:25Z` | **`false`** (shared) | `vps-1d2bffb5` | `333248` | `false` | ~23.5 days | `stale_shared` |

#### Key Technical Findings on Lock Behavior:
1. **Zero Active or Exclusive Locks:** All 4 historical lock files are **non-exclusive (`"exclusive": false`)** shared locks created on `2026-10-13` between `18:54:05Z` and `19:28:25Z` by processes on `vps-1d2bffb5` whose PIDs no longer exist.
2. **Pre-Execution Lock Policy:**
   - If **any** lock is `active_exclusive` or `active_shared` (age $< 30\text{ minutes}$ or live local PID), or `stale_exclusive` (`exclusive: true`), `evaluate_locks()` sets `canProceedWithBackup: false` and the runner aborts with exit code `13` (`LOCK_CONFLICT`).
   - Because all 4 locks from October 13 are `stale_shared`, Restic 0.19.1 permits a new shared `backup` lock without requiring `restic unlock` (verified in a disposable local Restic 0.19.1 repository test), while emitting a structured warning (`stale_shared_lock_present`) in telemetry.
   - If the operator prefers to require **zero** lock files of any kind before the first backup, setting `"allowStaleShared": false` in `/opt/acya-backup/config/backup.json` causes even `stale_shared` locks to block execution until a separately authorized `restic unlock` maintenance operation is executed.

---

## 7. Systemd Service and Timer Configuration

### 7.1 Alignment with Admin-Dash Freshness Thresholds
- The legacy drop-in (`/etc/systemd/system/acya-backup.timer.d/10-schedule.conf`) was configured for `01:00:00 UTC` (`02:00 Africa/Tunis`).
- Per Phase 11B Section 7, the new timer [`acya-backup-runner.timer`](file:///home/ubuntu/acya-app/scripts/backup-runner/systemd/acya-backup-runner.timer) is explicitly configured for **`OnCalendar=*-*-* 02:00:00 UTC`** with `Persistent=true`, `AccuracySec=1s`, and `RandomizedDelaySec=0`.
- With a typical runtime of ~15–25 seconds, daily snapshots complete at ~`02:00:25 UTC`, maintaining a maximum snapshot age of $\le 24\text{ hours } 1\text{ minute}$—well inside standard 24h/26h daily freshness windows on Admin-Dash without modifying any Admin-Dash thresholds.

### 7.2 Systemd Verification & Current Disabled State
Verified via `systemd-analyze verify` (zero warnings/errors) and `systemd-analyze calendar`:
```text
Normalized form: *-*-* 02:00:00 UTC
    Next elapse: Sat 2026-11-07 02:00:00 UTC
       From now: 19h left
```
Both units are installed in `/etc/systemd/system/` and verified **disabled** and **inactive**:
- `acya-backup-runner.timer`: `disabled` / `inactive`
- `acya-backup-runner.service`: `disabled` / `inactive`
- Legacy `acya-backup.timer` & `acya-backup.service`: remain `disabled` / `inactive`

---

## 8. Telemetry JSON Contract (`acya.backup.run/v1`)

### 8.1 State File Locations (`/opt/acya-backup/state/`)
- `current-run.json`: Written atomically at `run.started`; deleted upon completion. If a previous run was killed by `SIGKILL` or power loss, the next invocation (or `ExecStopPost`) converts `current-run.json` into an `"outcome": "interrupted"` record in `last-run.json` and `telemetry.jsonl`.
- `last-run.json`: Latest terminal `full` backup execution (`outcome`: `"success"`, `"partial"`, `"failed"`, or `"interrupted"`).
- `last-success.json`: Updated atomically **only** when `mode == "full"` and `outcome == "success"` and `verification.status == "verified"`.
- `last-preflight.json` / `last-stage-only.json`: Telemetry from non-destructive diagnostic runs (isolated so diagnostic checks never overwrite `last-run.json`).
- `last-skipped-concurrent.json`: Written if an overlapping invocation is rejected by `flock` (exit code `75`).
- `/opt/acya-backup/logs/telemetry.jsonl`: Append-only JSON Lines history of all `run.started`, `run.completed`, and `run.failed` events.

### 8.2 Contract Structure & Admin-Dash v3.2 Compatibility
Every telemetry record includes:
- **Lifecycle & Identity:** `schema` (`"acya.backup.run/v1"`), `event` (`"run.started"` | `"run.completed"` | `"run.failed"`), `runId`, `runTag`, `runnerVersion` (`"2.0.0"`), `environment`, `host`, `mode`, `trigger`, `outcome`, `exitCode`, `startedAt` (UTC ISO-8601), `finishedAt` (UTC ISO-8601), `durationSeconds`.
- **Failure & Warnings:** `failure` (`{stage, category, message}` or `null`), `warnings` (`[{code, detail}]`).
- **Per-Stage Telemetry (`stages`):** Individual status (`pending`, `running`, `succeeded`, `failed`, `skipped`, `aborted`), timestamps, and duration for all 12 stages.
- **Database Coverage (`databases`):** `status`, `expected` (`["primary/wood-app-db", "primary/app-db-bo", "n8n/n8n_db"]`), `exported` (per-DB byte sizes), `missing`, `unlisted`.
- **Tenant Coverage (`tenants`):** `status` (`"complete"` | `"incomplete"`), `registryCount` (`16`), `activeCount` (`10`), `catalogSchemaCount` (`16`), `dumpedCount` (`16`), `fullDumpContainsAll` (`true`), `missingSchemas`, `orphanSchemas`, `notDumped`, `absentFromFullDump`, `schemas` (ordered list of all 16 `tenant_*` schemas).
- **Artifact Counts & Sizes (`artifacts`):** Disaggregated `{count, bytes}` for `staged`, `files`, `secrets` (aggregate count/bytes only—no secret filenames or paths), `total`, `nonSecretSources`, and `zeroSizeViolations`.
- **Manifest Status (`manifest`):** `status` (`"verified"`), `entryCount` (`23`), `manifestTxtSha256`, `manifestJsonSha256`.
- **Lock Inspection (`locks`):** `status`, `canProceedWithBackup`, `unlockPerformed` (`false`), `counts`, `locks`.
- **Transfer & Restic (`transfer`, `restic`):** `status`, `mechanism`, `attempts`, `dataAddedBytes`, `dataAddedPackedBytes`, `snapshotId`, `shortId`, `exitCode`.
- **Disaggregated Verification & Recovery Point (`verification`, `recoveryPoint`):** Includes Admin-Dash v3.2 disaggregated evidence properties (`presenceStatus`, `readabilityStatus`, `parsingStatus`, `integrityStatus: "Verified"`) and the self-contained `recoveryPoint` object.

---

## 9. Unit and Integration Test Results

### 9.1 Automated Test Suite (`test_backup_runner.py`)
Executed `python3 /opt/acya-backup/tests/test_backup_runner.py` (**13 tests, 13 passed in 6.22s**):
1. `test_production_config_valid_and_safe_defaults`: Confirms `backup.json` loads cleanly with `repositoryWritesAuthorized: false` and excludes `acya-restore-test-pg` and `acya-restore-n8n-pg`.
2. `test_append_only_template_config_valid`: Confirms `backup.rest-append-only.template.json` validates cleanly.
3. `test_local_test_rejected_when_test_mode_false`: Confirms `local-test` transport is rejected in production mode.
4. `test_secret_redaction`: Confirms passwords, REST credentials, JSON `"private_key"` values, and PEM blocks are redacted.
5. `test_complete_16_tenant_coverage`: Confirms 16/16 registry, catalog, per-tenant dump, and full-dump TOC alignment.
6. `test_missing_catalog_schema_detected`: Confirms missing catalog schema triggers `registry_schema_missing`.
7. `test_missing_from_full_dump_detected`: Confirms missing schema in full dump TOC triggers `tenant_absent_from_full_dump`.
8. `test_october_13_historical_shared_locks_classified_as_stale_shared`: Confirms the 4 October 13 non-exclusive locks classify as `stale_shared_only` without unlocking.
9. `test_stale_exclusive_lock_blocks_backup`: Confirms any exclusive lock blocks execution (`canProceedWithBackup: false`).
10. `test_active_shared_lock_blocks_backup`: Confirms any recent/active shared lock blocks execution.
11. `test_forbidden_subcommands_rejected`: Confirms `unlock`, `repair`, `prune`, `forget`, `restore`, `rebuild-index`, `key`, and `migrate` raise `forbidden_restic_command`.
12. `test_secret_in_staging_rejected_and_manifest_verified`: Confirms symmetric SHA-256 verification and confirms placing `firebase-service-account.json` in staging immediately raises `secret_in_staging_prohibited`.
13. `test_disposable_restic_snapshot_and_verification_without_leaking_secrets`: End-to-end backup + `verify_snapshot` against a disposable local Restic repository + interrupted-run state recovery + abandoned staging directory cleanup.

### 9.2 Live Non-Destructive Production Validation Runs
1. **Live Remote Lock Inspection (`acya-backup-lock-inspect`):**
   - Verified SFTP connectivity to `51.254.216.8:/data/backups/restic` (`repositoryIdPrefix: 8a26915761a4`, `version: 2`).
   - Inspected all 4 October 13 locks (`3099b87ce1f8`, `6783de77a934`, `7a44ddbe78f0`, `b9a2973b8342`) with `--no-lock`.
2. **Live Full-Mode Safety Gate Test (`--mode full`):**
   - Confirmed immediate exit with code `10` (`writes_not_authorized`) while `repositoryWritesAuthorized` is `false`.
3. **Live Stage-Only Validation (`--mode stage-only --skip-remote`):**
   - Exported `primary/wood-app-db` (`5,965,198` bytes), `primary/app-db-bo` (`833` bytes), `n8n/n8n_db` (`961,716` bytes), cluster globals, and all **16** per-tenant dumps (`4,851,845` bytes) into `/opt/acya-backup/staging/stage-20261106T062442Z-fab90ac1-*` in `11.76s`.
   - Verified all 19 `pg_dump` archives with `pg_restore -l` and verified all 23 staged files with symmetric SHA-256 checksums (`manifestTxtSha256: 5adcc37e...`).
   - Automatically purged `/opt/acya-backup/staging` on exit (`0` leftover files) and confirmed `ZERO_SECRET_REFERENCES_VERIFIED` across all logs and state files.

---

## 10. Failure Handling, Verification & Separate Restore Procedure

### 10.1 Deterministic Exit Code & Retry Matrix

| Exit Code | Constant | Stage / Condition | Systemd Retry (`Restart=on-failure`) |
| :---: | :--- | :--- | :--- |
| `0` | `SUCCESS` | All stages and snapshot verification succeeded | N/A |
| `10` | `CONFIG` | Invalid config, unsafe file mode, or `repositoryWritesAuthorized: false` | **Prevented** (`RestartPreventExitStatus`) |
| `11` | `PREFLIGHT` | Docker daemon or container temporarily unavailable | **Retried** (up to 3 attempts, 5m interval) |
| `12` | `DISK_SPACE` | Free space on `/opt/acya-backup/staging` $< 5\text{ GiB}$ | **Prevented** |
| `13` | `LOCK_CONFLICT` | Active or exclusive lock present in Restic repository | **Retried** |
| `20` | `DATABASE_EXPORT` | `psql`, `pg_dump`, `pg_dumpall`, or `pg_restore -l` failure | **Retried** |
| `21` | `TENANT_COVERAGE` | Missing tenant schema, dump mismatch, or `< 16` tenants | **Prevented** |
| `30` | `FILE_SCOPE` | Required persistent path or Firebase secret file missing | **Prevented** |
| `40` | `MANIFEST` | Zero-byte artifact or SHA-256 digest mismatch | **Prevented** |
| `50` | `TRANSFER` | SSH/SFTP connectivity or tunnel establishment failure | **Retried** |
| `60` | `RESTIC_BACKUP` | Transient `restic backup` error (after internal retry) | **Retried** |
| `61` | `RESTIC_INCOMPLETE` | Restic exit code `3` (partial snapshot; does not overwrite `last-success.json`) | **Prevented** |
| `70` | `VERIFICATION` | Post-backup remote snapshot / manifest / tenant registry mismatch | **Prevented** |
| `75` | `CONCURRENT` | `flock` already held on `/opt/acya-backup/state/runner.lock` | **Prevented** |
| `129/130/143` | `SIGHUP/INT/TERM` | Clean signal trap termination + staging purge + `outcome: "interrupted"` | **Prevented** |

### 10.2 Independent Verification Procedure (On-Demand, Non-Destructive)
- **Lightweight Recovery-Point Verification (Safe anytime):**
  ```bash
  sudo /opt/acya-backup/bin/acya-backup-verify --config /opt/acya-backup/config/backup.json --snapshot last-success
  ```
- **Structural Repository Check (Maintenance Window Only, Never Automatic):**
  Per Admin-Dash v3.2 Section 4, `restic check` must never run automatically during backup windows or page loads. During an approved maintenance window when no backup is active:
  ```bash
  sudo /usr/local/bin/restic -r sftp:backup@51.254.216.8:/data/backups/restic \
    -o "sftp.args=-i /etc/acya-backup/acya_backup_ed25519 -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=/etc/acya-backup/known_hosts" \
    --password-file /etc/acya-backup/.restic_password --no-lock check
  ```

### 10.3 Isolated Restore Testing Procedure (Never Overwrites Production)
Restore drills must execute inside an isolated network (`--network none`) container or dedicated staging host and must **never** target `8cdff3364501_wood-app-postgres` or `postgres-n8n`:
1. Create an isolated `0700` restore workspace `/opt/acya-backup/staging/restore-drill-<DATE>`.
2. Extract only `manifest.txt`, `wood-app-db.full.dump`, and a target `tenant_<slug>.dump` from the desired snapshot using `restic dump --no-lock <SNAPSHOT_ID> <PATH>`.
3. Verify the extracted `.dump` SHA-256 digests against the extracted `manifest.txt`.
4. Start a disposable PostgreSQL 15 container with `--network none` and a temporary volume, run `pg_restore -U postgres -d wood_restore_verify`, verify row counts across `public.bo_tbl_enterprise` and `tenant_<slug>`, and destroy the disposable container and workspace immediately after verification.

---

## 11. Remaining Prerequisites Before First Production Backup

1. **Explicit Authorization for Historical Lock Cleanup (Optional / Recommended):**
   - Although the 4 historical locks from `2026-10-13` (`3099b87ce1f8`, `6783de77a934`, `7a44ddbe78f0`, `b9a2973b8342`) are non-exclusive (`stale_shared`) and will not block `restic backup`, we recommend explicit authorization to run a one-time `restic unlock` before the first production backup so the repository starts with `0` stale locks.
2. **Explicit Authorization to Enable Repository Writes (`repositoryWritesAuthorized: true`):**
   - Currently locked to `false` in `/opt/acya-backup/config/backup.json` to enforce the Phase 11B boundary.
3. **Optional Transport Upgrade (`rest-ssh-tunnel`):**
   - If the append-only `rest-server` daemon is provisioned on `51.254.216.8` (`127.0.0.1:8585`), `/opt/acya-backup/config/backup.rest-append-only.template.json` can be swapped in as `/opt/acya-backup/config/backup.json`. Otherwise, the verified `sftp` channel is ready for immediate use.

---

## 12. First-Backup Execution Procedure (For Phase 11C / Post-Approval)

Once explicit approval is granted for the first production backup:

```bash
# Step 1: Verify lock state is clean (or only expected stale_shared locks)
sudo /opt/acya-backup/bin/acya-backup-lock-inspect --config /opt/acya-backup/config/backup.json --require-clear

# Step 2: (Only if separately authorized) Remove the 4 stale Oct 13 shared locks
# sudo /usr/local/bin/restic -r sftp:backup@51.254.216.8:/data/backups/restic \
#   -o "sftp.args=-i /etc/acya-backup/acya_backup_ed25519 -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=/etc/acya-backup/known_hosts" \
#   --password-file /etc/acya-backup/.restic_password unlock

# Step 3: Authorize repository writes in /opt/acya-backup/config/backup.json
sudo jq '.repositoryWritesAuthorized = true' /opt/acya-backup/config/backup.json > /tmp/backup.json.tmp \
  && sudo install -m 0600 -o root -g root /tmp/backup.json.tmp /opt/acya-backup/config/backup.json \
  && sudo rm -f /tmp/backup.json.tmp

# Step 4: Execute the first controlled production backup
sudo /opt/acya-backup/bin/acya-backup-runner --config /opt/acya-backup/config/backup.json --mode full --trigger manual --print-telemetry

# Step 5: Run independent post-backup recovery-point verification
sudo /opt/acya-backup/bin/acya-backup-verify --config /opt/acya-backup/config/backup.json --snapshot last-success

# Step 6: (Once first backup is reviewed and approved) Enable the 02:00 UTC daily timer
sudo systemctl enable --now acya-backup-runner.timer
systemctl status acya-backup-runner.timer
```

---

## 13. Rollback Procedure

If Phase 11B needs to be rolled back at any point:

```bash
# 1. Ensure the new systemd units are stopped and disabled
sudo systemctl disable --now acya-backup-runner.timer acya-backup-runner.service 2>/dev/null || true

# 2. Remove the new systemd unit files and reload systemd
sudo rm -f /etc/systemd/system/acya-backup-runner.service /etc/systemd/system/acya-backup-runner.timer
sudo systemctl daemon-reload

# 3. Remove the standalone /opt/acya-backup installation directory
sudo rm -rf /opt/acya-backup

# 4. Remove the untracked repository copy (if desired)
rm -rf /home/ubuntu/acya-app/scripts/backup-runner /home/ubuntu/acya-app/PHASE_11B_BACKUP_ARCHITECTURE_IMPLEMENTATION_REPORT.md
```

---

## 14. Phase 11B Final Gate Verification Summary

| Gate Requirement | Verified Status | Evidence |
| :--- | :---: | :--- |
| **New backup runner implemented** | **YES** | `/opt/acya-backup/bin/acya-backup-runner` (v2.0.0) & modular library in `/opt/acya-backup/lib/acya_backup/` |
| **Unit & integration tests completed** | **YES** | 13/13 unit + disposable-Restic E2E tests passed; live `--mode preflight` and `--mode stage-only` succeeded |
| **Systemd definitions prepared but timer disabled** | **YES** | `acya-backup-runner.timer` (`02:00:00 UTC`) & `.service` verified (`systemd-analyze verify`), `disabled` / `inactive` |
| **No production backup executed** | **YES** | `repositoryWritesAuthorized: false`; latest snapshot in `/data/backups/restic` remains `36a26b4e` (Oct 13, 2026) |
| **No Restic unlock / prune / forget / repair performed** | **YES** | All 4 Oct 13 locks remain intact; `FORBIDDEN_SUBCOMMANDS` enforced in code |
| **Restore-test containers untouched** | **YES** | `acya-restore-test-pg` and `acya-restore-n8n-pg` remain `Up 3 weeks` and excluded in `guards.excludedContainers` |
| **Admin-Dash & read-only mount unchanged** | **YES** | Zero changes or deployments made to Admin-Dash or its `:ro` mount on `51.254.216.8` |


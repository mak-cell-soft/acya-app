# ACYA PRODUCTION — PHASE C: RESTIC BACKUP RECOVERY & VERIFICATION REPORT

- **Execution Date:** `2026-11-25` (`10:25:03Z` – `10:29:34Z`)
- **Production Host:** `<PROD_VPS_HOSTNAME>` (`<PROD_VPS_IP>`)
- **Remote Restic Repository:** `sftp:<BACKUP_USER>@<BACKUP_VPS_IP>:/data/backups/restic` (Repo ID prefix: `8a26915761a4`, format version `2`)
- **Scope Executed:** **Phase C ONLY** (Authorized Restic backup recovery, one controlled production backup, independent snapshot verification, and tenant backup history catalog refresh)
- **Forbidden Commands Executed (`forget`, `prune`, `unlock`, snapshot deletion):** **NONE (0)**
- **Rollback Status:** **Not required** (Backup succeeded on attempt 1/2 and was independently verified; `repositoryWritesAuthorized` remains `true` to keep scheduled backups active)

---

## 1. Initial Backup Configuration and Failure Evidence

Prior to Phase C execution:
- **Active Configuration File:** `/opt/acya-backup/config/backup.json` (`0600 root:root`, `3,844` bytes, SHA-256: `c56483d4fab1c77f6c253634c0047d25888e2a038ece44ba5cbdd07422cfb632`).
- **Write Gate Value:** `"repositoryWritesAuthorized": false`.
- **Active Runner:** `/opt/acya-backup/bin/acya-backup-runner --config /opt/acya-backup/config/backup.json --mode full --trigger systemd-timer` (invoked by `acya-backup-runner.service`).
- **Last Failed Run (`/opt/acya-backup/state/last-run.json`):**
  - `runId`: `20261125T023000Z-6107f6ec`
  - `startedAt` / `finishedAt`: `2026-11-25T02:30:00Z`
  - `outcome`: `failed`, `exitCode`: `10`
  - `failure`: `{"stage": "preflight", "category": "writes_not_authorized", "message": "full backup execution is blocked while repositoryWritesAuthorized is false"}`
- **Last Previous Successful Run (`/opt/acya-backup/state/last-success.json`):**
  - `runId`: `20261106T101110Z-d2ae662f` (`2026-11-06T10:11:10Z` -> `10:11:48Z`), snapshot `2071d16434c17e91b18521cd2a6a9bfa47bc3510a3b0fac11f0c16401eb45f59`.

---

## 2. Systemd Timer and Service Status (Pre-Execution)

- **`acya-backup-runner.timer`:** `enabled`, `active (waiting)` since `2026-11-18 09:56:23 UTC`.
  - Active drop-in: `/etc/systemd/system/acya-backup-runner.timer.d/10-schedule.conf` (`OnCalendar=*-*-* 02:30:00 UTC` / `03:30 Africa/Tunis`).
  - Next scheduled trigger: `Thu 2026-11-26 02:30:00 UTC`.
- **`acya-backup-runner.service`:** `failed (Result: exit-code, status=10)` since `Wed 2026-11-25 02:30:01 UTC`.
- **Concurrency & Locking Mechanism Verified:**
  - Process table inspection (`ps -eo pid,ppid,user,stat,comm,args`) confirmed zero active `restic`, `pg_dump`, `pg_dumpall`, or `acya-backup-runner` processes.
  - `/opt/acya-backup/state/runner.lock` (`0600 root:root`) was not held by any process (`fuser` returned no PIDs), and `/opt/acya-backup/state/current-run.json` was absent.
  - Verified `/opt/acya-backup/lib/acya_backup/pipeline.py` (lines 134–138) enforces non-blocking exclusive `fcntl.flock(self.lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)` on `runner.lock` to prevent concurrent executions.

---

## 3. Repository Connectivity Results

- **Transport:** SFTP (`<BACKUP_USER>@<BACKUP_VPS_IP>:22`) using `/etc/acya-backup/acya_backup_ed25519` (`0600 root:root`), `/etc/acya-backup/known_hosts` (`0600 root:root`), and `/etc/acya-backup/.restic_password` (`0600 root:root`) — credentials redacted and untouched.
- **Repository Probe (`acya-backup-lock-inspect --require-clear`):**
  - `reachable`: `true`
  - `repositoryVersion`: `2`
  - `repositoryIdPrefix`: `8a26915761a4`
  - Exit code: `0`

---

## 4. Existing Snapshot Inventory Before Execution (6 Snapshots)

Verified via read-only `restic snapshots --no-lock`:

| # | Short ID | Timestamp (UTC) | Hostname | Tags | Size |
| :---: | :--- | :--- | :--- | :--- | ---: |
| 1 | `5a78f673` | `2026-10-05 07:57:56` | `<PROD_VPS_HOSTNAME>` | `initial,phase-3c-2b` | `120.801 MiB` |
| 2 | `bbb68d5d` | `2026-10-05 12:05:50` | `<PROD_VPS_HOSTNAME>` | `automated,production` | `232.911 MiB` |
| 3 | `1fbd94a9` | `2026-10-05 12:29:47` | `<PROD_VPS_HOSTNAME>` | `automated,production` | `120.229 MiB` |
| 4 | `f93ac4c4` | `2026-10-11 10:58:47` | `<PROD_VPS_HOSTNAME>` | `automated,production` | `123.862 MiB` |
| 5 | `36a26b4e` | `2026-10-13 10:52:27` | `<PROD_VPS_HOSTNAME>` | `automated,production,run-20261013T105218Z-182443d4` | `122.714 MiB` |
| 6 | `2071d164` | `2026-11-06 10:11:37` | `<PROD_VPS_HOSTNAME>` | `automated,production,phase11b,run-20261106T101110Z-d2ae662f` | `750.260 MiB` |

---

## 5. Lock Investigation and Decision

- **Pre-Backup Lock State (`acya-backup-lock-inspect --require-clear` -> exit code `0`):**
  - `status`: `stale_shared_only`, `canProceedWithBackup`: `true`, `unlockPerformed`: `false`
  - `counts`: `total: 4`, `activeExclusive: 0`, `activeShared: 0`, `staleExclusive: 0`, `staleShared: 4`
  - The 4 historical shared locks (`3099b87ce1f8`, `6783de77a934`, `7a44ddbe78f0`, `b9a2973b8342`, dated `2026-10-13`, dead PIDs) are non-exclusive and safely tolerated by `"allowStaleShared": true`.
- **Decision:** Proceeded **without** executing `restic unlock`.
- **Post-Backup Lock State:** Identical (`total: 4`, `staleShared: 4`, `0` new orphan locks left by Restic `0.19.1`).

---

## 6. Configuration Backup Location

- **Backup Directory:** `/root/acya-remediation-backups/phase-c-20261125-102600Z/` (`0700 root:root`)
- **Backup File:** `/root/acya-remediation-backups/phase-c-20261125-102600Z/backup.json.bak` (`0600 root:root`, `3,844` bytes, SHA-256: `c56483d4fab1c77f6c253634c0047d25888e2a038ece44ba5cbdd07422cfb632` matching original).

---

## 7. Exact Authorization Change

Applied atomically using `tempfile.mkstemp` in `/opt/acya-backup/config/`, `flush()` + `os.fsync()`, `os.chmod(0o600)`, `os.chown(0, 0)`, and `os.replace()`:

```diff
--- /root/acya-remediation-backups/phase-c-20261125-102600Z/backup.json.bak
+++ /opt/acya-backup/config/backup.json
@@ -1,7 +1,7 @@
 {
   "configVersion": 1,
   "environment": "production",
-  "repositoryWritesAuthorized": false,
+  "repositoryWritesAuthorized": true,
   "testMode": false,
   "requireRoot": true,
   "paths": {
```

- Resulting permissions & ownership verified: `0600 root:root` (`3,843` bytes).
- Configuration validated via `acya_backup.config.load_config('/opt/acya-backup/config/backup.json')`: `repositoryWritesAuthorized=True`, `lock_allow_stale_shared=True`.

---

## 8. Controlled Backup Execution Details

Executed **once** via the official systemd service (`sudo systemctl start acya-backup-runner.service`):

| Metric | Value |
| :--- | :--- |
| **Run ID** | `20261125T102729Z-6fb93833` |
| **Start -> Finish (UTC)** | `2026-11-25T10:27:29Z` -> `2026-11-25T10:28:05Z` |
| **Duration** | `36.302` seconds (`14.626s` CPU time, `904.2M` memory peak) |
| **Systemd / Runner Exit Code** | `0` (`outcome=success`, Restic attempt `1/2`) |
| **Databases Exported (`3/3`)** | `primary/wood-app-db` (`6,192,174` B), `primary/app-db-bo` (`833` B), `n8n/n8n_db` (`578,548` B) + `primary.globals.sql` & `n8n.globals.sql` |
| **Tenant Schemas Exported (`16/16`)** | All `16` registered tenants (`tenant_fleur_de_printemps` through `tenant_zaiemtex`), `fullDumpContainsAll: true`, `missingSchemas: []`, `notDumped: []` |
| **Files & Protected Secrets** | `mobile-releases` (`13` files, `774,801,004` B), `n8n-data` (`2` files, `128` B), `docker-compose` (`2` files, `8,741` B), `nginx-config` (`15` files, `34,374` B), `letsencrypt-tls` (`40` files, `72,618` B), `app-env` (`1` file), `n8n-env` (`1` file), `storage-secrets` (`2` files) |
| **Staging Cleanup** | `/opt/acya-backup/staging/` verified completely empty after run |
| **Disk Space After Backup** | `/dev/sda1`: `72 GiB` available (`26%` used) |

---

## 9. New Snapshot ID and Timestamp

- **Full Snapshot ID:** `cf81bb138ba9cca8b8aeeb5252fc33e81ebf2b89d6b4c76e1b380771a235f2d7`
- **Short ID:** `cf81bb13`
- **Snapshot Timestamp (UTC):** `2026-11-25T10:27:55.669519223Z`
- **Hostname:** `<PROD_VPS_HOSTNAME>`
- **Tags:** `automated`, `production`, `phase11b`, `run-20261125T102729Z-6fb93833`
- **Total Logical Size:** `750.313 MiB` (`101` files processed, `31` new data blobs, `19` tree blobs)

---

## 10. Independent Restic Verification Results

1. **Independent `restic snapshots --no-lock`:** Confirmed **7 snapshots** total in repository `8a269157`, with `cf81bb13` (`2026-11-25 10:27:55`) as the newest snapshot.
2. **Independent `restic ls --no-lock cf81bb13...`:** Confirmed presence of:
   - `/home/ubuntu/acya-app/docker-compose.yml` (capturing the Phase A `127.0.0.1` bindings)
   - `/opt/acya-backup/staging/stage-20261125T102729Z-6fb93833-axooi4e6/databases/primary/wood-app-db.full.dump`, `app-db-bo.full.dump`, `primary.globals.sql`
   - `/opt/acya-backup/staging/stage-20261125T102729Z-6fb93833-axooi4e6/databases/n8n/n8n_db.full.dump`, `n8n.globals.sql`
   - All `16` individual `tenants/tenant_*.dump` files
   - `metadata/manifest.json`, `metadata/manifest.txt`, and `metadata/tenant-registry.json`
3. **`acya-backup-verify --snapshot last-success`:** Returned `status: "verified"`, `manifestTxtSha256: "bdb1bc32757ad07ca03c0b5b789d57c173476c720e59c246e0eb4cbb8cf4985b"`, `manifestArtifactCount: 23`, `registeredTenantCount: 16`, `tenantDumpCount: 16`, `presenceStatus: "Present"`, `readabilityStatus: "Readable"`, `parsingStatus: "Parsed"`, `integrityStatus: "Verified"`.
4. **Runner State & History Catalog:**
   - `/opt/acya-backup/state/last-run.json` (`0644 root:root`, `9,626` B) and `/opt/acya-backup/state/last-success.json` (`0644 root:root`, `9,626` B) both record `outcome: "success"`, `exitCode: 0`, `failure: null`, and snapshot `cf81bb13`.
   - Refreshed `/opt/acya-backup/state/tenant-backup-history.json` (`0644 root:root`, `185,118` B) via `acya-backup-history`: `snapshots=7, tenants=17, entries=119`.

---

## 11. Confirmation That All Previous Snapshots Remain Intact

All 6 historical snapshots (`5a78f673`, `bbb68d5d`, `1fbd94a9`, `f93ac4c4`, `36a26b4e`, `2071d164`) remain intact in `sftp:<BACKUP_USER>@<BACKUP_VPS_IP>:/data/backups/restic`, bringing the total snapshot count from `6` to `7`.

---

## 12. PostgreSQL & Application Health Verification

- `8cdff3364501_wood-app-postgres`: `Up 2 months (healthy)` — `pg_isready -U postgres -d wood-app-db` -> `/var/run/postgresql:5432 - accepting connections`.
- `postgres-n8n`: `Up 2 months (healthy)` — `pg_isready -U n8n_user -d n8n_db` -> `/var/run/postgresql:5432 - accepting connections`.
- `wood-app-api`: `Up 16 minutes (healthy)` — `https://acya.site/api/ApiHealth/HealthCheck` -> `{"status":"Healthy","database":"Connected"}`.

---

## 13. Timer Status and Next Scheduled Execution

- **`acya-backup-runner.timer`:** `enabled`, `active (waiting)`
- **Schedule:** Daily at `02:30:00 UTC` (`03:30 Africa/Tunis`, unchanged)
- **Next Scheduled Run:** `Thu 2026-11-26 02:30:00 UTC`
- **Authorization Flag:** `"repositoryWritesAuthorized": true` remains active in `/opt/acya-backup/config/backup.json` so tonight's scheduled run will execute normally.
- **Legacy Watcher (`acya-backup-sync.path`):** Left untouched per Phase C scope restrictions.

---

## 14. Warnings & Unresolved Issues

1. **4 Historical Stale Shared Locks (`2026-10-13`):** As expected, the 4 historical `stale_shared` locks (`3099b87ce1f8`, `6783de77a934`, `7a44ddbe78f0`, `b9a2973b8342`) remain untouched and appear as non-blocking warnings in `last-run.json`. They do not impact daily backups (`allowStaleShared=true`). Removing them via a one-time `restic unlock` remains deferred for a separately approved maintenance window.
2. **Subsequent Phases Not Started:** Execution has **stopped after Phase C**. Phases B (firewall hardening), D (swap), E (legacy backup watcher), and F (Docker log rotation/monitoring) have not been executed and await separate explicit authorization.

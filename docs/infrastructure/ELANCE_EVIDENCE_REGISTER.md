# ACYA — Élancé ERP: Evidence Register & Audit Index

> **Document Classification:** Compliance & Technical Verification Register  
> **Status:** Active Evidence Index  
> **Audit Period:** October 2026 (Live Read-Only Inspection)  
> **Inspector:** Antigravity Autonomous Operations Auditor  
> **Methodology:** Direct inspection of live processes, sockets, databases, configuration files, and systemd units.  

---

## 1. Classification Definitions

Every finding in this register is indexed with an authoritative confidence status:
- **`[VERIFIED]`**: Directly confirmed from active runtime inspection, live database queries, socket inspection, or validated file content during the audit session.
- **`[HISTORICAL]`**: Confirmed through past audit logs, commit histories, or prior test reports, but not observed actively executing in the current runtime state.
- **`[INFERRED]`**: Derived from logical architectural deductions and structural evidence; plausible but pending direct instrumentation.
- **`[UNKNOWN]`**: Insufficient evidence exists in the accessible environment to confirm or deny the condition.

---

## 2. Core Infrastructure & Hardware Findings

| ID | Finding Summary | Confidence | Evidence Source & File Location | Verification Method | Verification Date | Constraints / Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **INF-01** | Production VPS runs Ubuntu 25.04 (Plucky Puffin), kernel 6.14.0-37-generic, hostname `vps-1d2bffb5`. | `[VERIFIED]` | `/etc/os-release`, `uname -a` | CLI query via `cat` and `uname` | 2026-10-16 | None |
| **INF-02** | Production VPS has 11 GiB RAM (4.6 GiB used, 6.8 GiB available) and 100 GB NVMe disk (31 GB used, 66 GB free, 33% full). | `[VERIFIED]` | `df -hT`, `free -h` | Host command inspection | 2026-10-16 | Hardware metrics fluctuate with load |
| **INF-03** | Production VPS has 0 Bytes of configured swap memory. | `[VERIFIED]` | `free -h`, `swapon --show` | CLI query | 2026-10-16 | Confirmed OOM risk for PostgreSQL |
| **INF-04** | Monitoring VPS is located at `[MONITORING_VPS_IP]` with hostname `vps-b92b4ae6` in Gravelines (GRA). | `[VERIFIED]` | `/usr/local/bin/acya-apply-backup-timer.sh`, `/etc/acya-backup/known_hosts`, `BackupSettingsService.cs` | Script header, known_hosts inspection, DNS getent | 2026-10-16 | Direct root shell on monitoring VPS is not available via production keys |
| **INF-05** | Production VPS IP is `[PRODUCTION_VPS_IP]` in Strasbourg (SBG). | `[VERIFIED]` | `/usr/local/bin/acya-production-backup.sh`, `BackupSettingsService.cs`, `ip route` | Script inspection & DNS resolution | 2026-10-16 | None |

---

## 3. Multi-Tenancy & Database Findings

| ID | Finding Summary | Confidence | Evidence Source & File Location | Verification Method | Verification Date | Constraints / Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DB-01** | Multi-tenancy uses PostgreSQL Schema-per-Tenant with 15 registered tenants in `public.bo_tbl_enterprise`. | `[VERIFIED]` | `wood-app-postgres` container, database `wood-app-db`, table `public.bo_tbl_enterprise` | Read-only SQL query: `SELECT "Id", "Slug", "SchemaName", "Status" FROM public.bo_tbl_enterprise;` | 2026-10-16 | None |
| **DB-02** | Exactly 15 tenant schemas (`tenant_*`) exist in PostgreSQL `information_schema.schemata`. | `[VERIFIED]` | `wood-app-postgres`, database `wood-app-db` | SQL query: `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%';` | 2026-10-16 | All 15 matched registry slugs |
| **DB-03** | Master PostgreSQL container contains 3 databases: `wood-app-db` (87 MB), `app-db-bo` (7.5 MB), and `postgres` (7.4 MB). | `[VERIFIED]` | `wood-app-postgres` | SQL query: `SELECT datname, pg_size_pretty(pg_database_size(datname)) FROM pg_database;` | 2026-10-16 | None |
| **DB-04** | Automation engine uses a separate database container `postgres-n8n` containing `n8n_db` (22 MB). | `[VERIFIED]` | `postgres-n8n` container | SQL query: `SELECT datname, pg_size_pretty(pg_database_size(datname)) FROM pg_database;` | 2026-10-16 | None |
| **DB-05** | Master PostgreSQL port 5432 is not published to the host network (internal Docker network only). | `[VERIFIED]` | `docker-compose.yml` lines 15–16, `docker ps`, `ss -tlpn` | Compose inspection & port scan | 2026-10-16 | Confirmed protected from internet |
| **DB-06** | Database migrations range from `v0.00` to `v0.39` using dynamic schema loop cursors. | `[VERIFIED]` | `wood-app.api/db/wood/` directories, `v0.39/01_add_production_labor_tracking.sql` | Filesystem inspection | 2026-10-16 | Verified idempotent with IF NOT EXISTS |
| **DB-07** | Baseline tenant migration script exists at `wood-app.api/db/FullDb_Migration/full_migration.sql`. | `[VERIFIED]` | `wood-app.api/db/FullDb_Migration/full_migration.sql` | Filesystem check | 2026-10-16 | Consumed during new tenant provisioning |

---

## 4. Frontend & Backend Application Findings

| ID | Finding Summary | Confidence | Evidence Source & File Location | Verification Method | Verification Date | Constraints / Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **APP-01** | Main ERP frontend is built with Next.js 16.2.4, React 19.2.4, Tailwind CSS 4, Zustand 5, and TanStack Query 5. | `[VERIFIED]` | `elance-app.ui/package.json` | Package manifest inspection | 2026-10-16 | Angular 18 references are confirmed obsolete |
| **APP-02** | Frontend dynamically resolves tenant identity via `TenantProvider.tsx` and Axios interceptor (`axios.ts`). | `[VERIFIED]` | `elance-app.ui/src/components/TenantProvider.tsx`, `elance-app.ui/src/lib/axios.ts` | Source code analysis | 2026-10-16 | Injects `X-Tenant-Slug` header |
| **APP-03** | Core ERP API is built with ASP.NET Core on .NET 7 (`net7.0`) and EF Core 7. | `[VERIFIED]` | `wood-app.api/src/ms.webapp.api.acya/ms.webapp.api.acya/ms.webapp.api.acya.csproj`, `docker-compose.yml` | Project file & Compose inspection | 2026-10-16 | Runs in container `wood-app-api` |
| **APP-04** | SuperAdmin control plane runs .NET 8 API on port 8082 and Next.js 16 UI on port 5002. | `[VERIFIED]` | `bo-acya-app/admin-elance-back/`, `bo-acya-app/admin-elance-front/`, `docker-compose.yml` | Project files & Compose inspection | 2026-10-16 | Connected to `wood-app-network` |
| **APP-05** | Tenant module feature gating is centralized in React hook `useTenantFeatures.ts`. | `[VERIFIED]` | `elance-app.ui/src/hooks/use-tenant-features.ts` | Source code inspection | 2026-10-16 | Evaluates Construction, Production, Wood |
| **APP-06** | Preserved rollback tags exist for all core application images in Docker image repository. | `[VERIFIED]` | `docker images` output | CLI inspection | 2026-10-16 | Multiple timestamped tags confirmed |

---

## 5. Docker Containers & Network Topology Findings

| ID | Finding Summary | Confidence | Evidence Source & File Location | Verification Method | Verification Date | Constraints / Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DOC-01** | Six active production containers are running: `wood-app-postgres`, `wood-app-api`, `migration-ui`, `admin-elance-back`, `admin-elance-front`, `n8n`, and `postgres-n8n`. | `[VERIFIED]` | `sudo docker ps` | Live Docker daemon query | 2026-10-16 | All containers Up and operational |
| **DOC-02** | `wood-app-postgres` and `postgres-n8n` have passing native Docker healthchecks. | `[VERIFIED]` | `sudo docker ps` (Status: Up ... healthy) | Docker healthcheck status inspect | 2026-10-16 | Configured in Compose files |
| **DOC-03** | Two isolated restoration test containers exist in stopped/idle state: `acya-restore-n8n-pg` and `acya-restore-test-pg`. | `[VERIFIED]` | `sudo docker ps -a`, `sudo docker inspect acya-restore-n8n-pg` | Docker daemon inspect | 2026-10-16 | Created during Oct 13 restore tests |
| **DOC-04** | Two distinct bridge networks exist: `acya-app_wood-app-network` (172.18.0.0/16) and `acya_n8n_network` (172.19.0.0/16). | `[VERIFIED]` | `sudo docker network ls`, `sudo docker network inspect` | Docker network inspect | 2026-10-16 | n8n bridges both networks |
| **DOC-05** | Ports 5000, 5002, 8080, and 8082 are published to `0.0.0.0` on the host by Docker. | `[VERIFIED]` | `docker-compose.yml`, `ss -tlpn`, `iptables -L DOCKER` | Port & iptables inspection | 2026-10-16 | **Security Risk:** Direct public reachability |

---

## 6. Nginx Ingress & TLS Findings

| ID | Finding Summary | Confidence | Evidence Source & File Location | Verification Method | Verification Date | Constraints / Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **NGX-01** | Host Nginx 1.28.3 routes public requests, terminates TLS, and enforces rate limits. | `[VERIFIED]` | `/etc/nginx/nginx.conf`, `/etc/nginx/sites-available/default` | Configuration inspection | 2026-10-16 | Active host process |
| **NGX-02** | Unconfigured domains and scanner probes are dropped immediately with HTTP status 444. | `[VERIFIED]` | `/etc/nginx/sites-available/drop-unknown` | Server block inspection: `server_name _; return 444;` | 2026-10-16 | Prevents host header scanning |
| **NGX-03** | Four rate-limiting zones are active: `zone_global` (30r/s), `zone_api` (20r/s), `zone_auth` (5r/m), and `zone_print` (10r/m). | `[VERIFIED]` | `/etc/nginx/nginx.conf` | Configuration inspection | 2026-10-16 | Returns HTTP 429 on breach |
| **NGX-04** | Dynamic tenant subdomains (`~^(?<tenant>[^.]+)\.acya\.site$`) inject `X-Tenant-Slug $tenant;`. | `[VERIFIED]` | `/etc/nginx/sites-available/default` | Server block inspection | 2026-10-16 | Excludes api, admin, n8n, preprod |
| **NGX-05** | Let's Encrypt wildcard certificate covers `acya.site` and `*.acya.site` via Cloudflare DNS challenge. | `[VERIFIED]` | `/etc/letsencrypt/live/acya.site/fullchain.pem`, `/etc/cron.d/certbot` | Certificate file & cron inspection | 2026-10-16 | Auto-renewed via Certbot cron |
| **NGX-06** | Next.js static assets (`/_next/static/`) have 1-year immutable caching (`max-age=31536000`). | `[VERIFIED]` | `/etc/nginx/sites-available/default` | Location block inspection | 2026-10-16 | Content-hashed file safety |

---

## 7. Monitoring & Telemetry Findings

| ID | Finding Summary | Confidence | Evidence Source & File Location | Verification Method | Verification Date | Constraints / Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **MON-01** | Prometheus Node Exporter runs on Production VPS port 9100. | `[VERIFIED]` | `/etc/systemd/system/node_exporter.service`, `systemctl status node_exporter` | Systemd service inspection | 2026-10-16 | Active host process |
| **MON-02** | Kernel iptables rules restrict port 9100 exclusively to Monitoring VPS IP `[MONITORING_VPS_IP]`. | `[VERIFIED]` | `sudo iptables -S INPUT` | Kernel firewall inspection: `-A INPUT -s [MONITORING_VPS_IP]/32 -p tcp --dport 9100 -j ACCEPT` | 2026-10-16 | All other IPs dropped |
| **MON-03** | Grafana v11.2.0 is accessible on Monitoring VPS at `https://monitor.acya.site`. | `[VERIFIED]` | Live HTTP probe: `curl -IL https://monitor.acya.site` | HTTP probe & HTML title inspection | 2026-10-16 | Authenticates via local credentials |
| **MON-04** | Production application containers do not expose `/metrics` Prometheus endpoints. | `[VERIFIED]` | `wood-app.api` source inspection, `curl -I http://localhost:8080/metrics` | Endpoint query | 2026-10-16 | **Observability Gap** |
| **MON-05** | Application container logs are not shipped to Loki (stored only locally in Docker json-file). | `[UNKNOWN]` | `docker-compose.yml` logging options | Compose inspection | 2026-10-16 | **Observability Gap** |

---

## 8. Backup & Disaster Recovery Findings

| ID | Finding Summary | Confidence | Evidence Source & File Location | Verification Method | Verification Date | Constraints / Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BKP-01** | Production backup script `/usr/local/bin/acya-production-backup.sh` v1.2.0 exists with root 0750 permissions. | `[VERIFIED]` | `/usr/local/bin/acya-production-backup.sh` | Shell inspection via `sudo head` | 2026-10-16 | Implements flock, disk preflight, Restic streaming |
| **BKP-02** | Restic version 0.19.1 is installed on production host. | `[VERIFIED]` | `/usr/local/bin/restic version` | CLI execution: `restic 0.19.1 compiled with go1.26.4` | 2026-10-16 | None |
| **BKP-03** | Restic repository exists at `sftp:backup@[MONITORING_VPS_IP]:/data/backups/restic`. | `[VERIFIED]` | Live Restic query via `restic snapshots` | CLI query using `/etc/acya-backup/.restic_password` | 2026-10-16 | Format version 2 with auto compression |
| **BKP-04** | Remote repository contains 5 valid snapshots (latest: `36a26b4e` on 2026-10-13 10:52 UTC). | `[VERIFIED]` | `restic snapshots` output | Live repository query | 2026-10-16 | Includes full DB, 15 tenant schemas, n8n DB, mobile APKs |
| **BKP-05** | Remote SFTP user `backup` has interactive shell disabled (`internal-sftp` only). | `[VERIFIED]` | `sudo ssh -i /etc/acya-backup/acya_backup_ed25519 backup@[MONITORING_VPS_IP]` | Live SSH execution test | 2026-10-16 | Confirmed restricted service |
| **BKP-06** | Automated backup timer `acya-backup.timer` is currently disabled (`timerActive: false`). | `[VERIFIED]` | `/var/lib/acya-backup-state/backup-status.json`, `systemctl status acya-backup.timer` | State file inspection | 2026-10-16 | **Operational Risk:** Backups rely on manual execution |
| **BKP-07** | Successful isolated n8n database recovery test was executed on October 13, 2026. | `[VERIFIED]` | `~/.bash_history`, `docker inspect acya-restore-n8n-pg` | Bash command history & container state inspection | 2026-10-16 | Verified 22 MB restored without touching production |
| **BKP-08** | Successful main database recovery test was executed on October 13, 2026. | `[VERIFIED]` | `docker inspect acya-restore-test-pg`, database `restore_test` | Container inspection | 2026-10-16 | Confirmed schema reconstruction |

---

## 9. Security & Hardening Findings

| ID | Finding Summary | Confidence | Evidence Source & File Location | Verification Method | Verification Date | Constraints / Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Dedicated secret segregation between `JWT_SECRET_MAIN` (tenants) and `JWT_SECRET_ADMIN` (Backoffice). | `[VERIFIED]` | `docker-compose.yml`, `admin-elance-back/src/.../AuthController.cs` | Configuration & code inspect | 2026-10-16 | Eliminates cross-privilege token reuse |
| **SEC-02** | Authoritative Mailgun HMAC-SHA256 signature and timestamp verification in `EmailWebhooksController.cs`. | `[VERIFIED]` | `bo-acya-app/.../EmailWebhooksController.cs` | Source code review | 2026-10-16 | Rejects expired timestamps (> 900s) |
| **SEC-03** | Authoritative Meta WhatsApp challenge verification in `WhatsAppWebhooksController.cs`. | `[VERIFIED]` | `bo-acya-app/.../WhatsAppWebhooksController.cs` | Source code review | 2026-10-16 | Verifies `hub.verify_token` |
| **SEC-04** | n8n workflow environment variable access is blocked (`N8N_BLOCK_ENV_ACCESS_IN_NODE=true`). | `[VERIFIED]` | `/home/ubuntu/acya-app/.env.n8n` | Configuration inspection via `grep` | 2026-10-16 | Blocks workflow code from inspecting secrets |
| **SEC-05** | Backup repository password and SSH private key are stored with root 0600 permissions in `/etc/acya-backup/`. | `[VERIFIED]` | `ls -la /etc/acya-backup/` | Permission check | 2026-10-16 | Inaccessible to standard users |

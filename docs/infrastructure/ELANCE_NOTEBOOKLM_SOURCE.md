# ACYA — Élancé ERP: Technical Architecture & Operations Guide

> **Document Purpose:** Primary Source Document for Google NotebookLM Educational Ingestion  
> **Topic:** ACYA Élancé Enterprise Resource Planning Platform  
> **Audience:** Software Engineers, DevOps Professionals, Cloud Architects, and Technical Learners  
> **Format:** Narrative Technical Guide Optimized for Audio Overviews and Video Presentations  
> **Edition:** Production 2026 Reference Implementation  

---

## Chapter 1: Introduction to ACYA and Élancé

The wood, lumber, and construction merchandise industry presents unique logistical and accounting challenges. Unlike standard retail businesses that trade in integer units, a timber business must account for physical materials across multiple physical dimensions simultaneously: volume in cubic meters ($m^3$), running lengths in lineal meters, bundled packages (*colis*), and surface areas. Furthermore, timber yards frequently manage on-site workshop production (*ateliers*) where raw planks are converted into finished joinery, and construction job sites (*chantiers*) where labor, subcontracting, and material disbursements must be reconciled against progressive client billing.

**ACYA Élancé** is a dedicated Software-as-a-Service (SaaS) Enterprise Resource Planning platform designed to address these specialized commercial workflows. It provides timber merchants, construction contractors, and artisan manufacturers with an integrated suite encompassing sales estimates (*devis*), purchase orders, multi-location physical inventory, automated margin calculation, human resources, payroll, and financial treasury tracking.

To serve multiple independent enterprises efficiently while guaranteeing complete data isolation and strict confidentiality, Élancé is built as a cloud-native, multi-tenant platform. Each subscriber company accesses their business workspace via a personalized web address, complete with customized branding, logo, language, and regional currencies, all orchestrated by a centralized, containerized infrastructure.

---

## Chapter 2: Overall System Architecture

The ACYA platform operates as a distributed system hosted across two independent virtual private server (VPS) nodes in France provided by OVHcloud:

1. **The Production VPS (`vps-1d2bffb5`):** Located in the Strasbourg (SBG) datacenter, this server hosts the entire user-facing application stack, the database layer, automation pipelines, and incoming traffic routing.
2. **The Monitoring & Backup VPS (`vps-b92b4ae6`):** Located in the Gravelines (GRA) datacenter, this physically separate node acts as the offsite operational watchdog and disaster recovery vault. It hosts telemetry dashboards (Grafana), metric collectors (Prometheus), and an encrypted, deduplicated backup repository (Restic).

Incoming traffic from web browsers, mobile Flutter applications, and external webhook integrations enters the Production VPS over encrypted HTTPS. A host-level **Nginx** reverse proxy acts as the single public gateway. Nginx performs TLS termination using a wildcard SSL certificate (`*.acya.site`), enforces IP rate limiting to defend against denial-of-service attacks, and dynamically inspects incoming subdomains to route requests to the correct underlying Docker containers.

Internally, the application services communicate across isolated virtual Docker bridge networks. The main application database is strictly private and hidden from the public internet.

---

## 3. Chapter 3: Tenant and Application Architecture

Multi-tenancy in ACYA Élancé is implemented using the **Schema-per-Tenant** architectural pattern on PostgreSQL 15.

In traditional software design, multi-tenancy is often implemented in one of two extremes: either every customer gets their own completely separate database instance (which becomes expensive and difficult to maintain as customer numbers grow), or all customers share the exact same database tables with a `TenantId` column on every row (which risks catastrophic data leakage if a developer forgets a filter clause in a SQL query).

ACYA Élancé takes the architectural middle ground:
- A single PostgreSQL database named `wood-app-db` runs within the production container stack.
- The `public` schema contains a central registry table called `bo_tbl_enterprise`. This master table lists every registered customer, their unique subdomain slug (such as `socofeb` or `socobois`), their subscription plan, and their designated schema name.
- Every tenant company is granted an entirely separate PostgreSQL schema named `tenant_{slug}` (for example, `tenant_socofeb`).
- Inside each tenant schema, a complete, independent set of application tables exists: `tbl_quotes`, `tbl_invoices`, `tbl_stock`, `tbl_person`, `tbl_app_user`, and associated relational structures.

Currently, 15 distinct enterprise schemas are active on the platform. If a query is executed within `tenant_socofeb`, it is physically impossible for that query to read or corrupt data in `tenant_socobois`, because PostgreSQL's relational schema boundaries enforce absolute isolation at the engine level.

To support this in the .NET Core backend, Entity Framework Core uses a custom model cache key factory (`TenantModelCacheKeyFactory`). In standard EF Core, relational database models are compiled and cached once in application memory. In Élancé, the cache key dynamically incorporates the active tenant's schema name, ensuring that queries compiled for one tenant never bleed into another.

---

## Chapter 4: Frontend and Backend Communication

The user-facing client application is built with **Next.js 16 (App Router)** and **React 19**, styled using **Tailwind CSS 4**. It communicates with a backend API built with **ASP.NET Core on .NET 7**.

### The Request Lifecycle
When a user navigates to their company portal (e.g. `https://socofeb.acya.site`):

1. **DNS & Ingress:** The browser resolves the IP address of the Production VPS. The request reaches the host Nginx server on port 443.
2. **Subdomain Capture & Header Injection:** Nginx evaluates the incoming domain name against a regular expression. It captures the string `socofeb` and injects an internal HTTP header: `X-Tenant-Slug: socofeb`. Nginx then forwards the request to the Next.js container listening on port 5000.
3. **Client-Side Bootstrap (`TenantProvider`):** In the browser, the Next.js root layout wraps the user experience in a React component called `TenantProvider`. This provider issues a background request to `/api/Enterprise/config`.
4. **Branding & Status Evaluation:** The backend returns the enterprise's custom branding: company name, logo image URL, primary and secondary brand colors, currency symbol, and subscription status. If the enterprise status is `Suspended` or `Expired`, the router immediately intercepts the user and redirects them to a friendly `/suspended` notice. If the tenant is valid, the UI styles are applied dynamically.
5. **API Client Interceptors (`axios.ts`):** When the user interacts with the ERP (such as opening a sales quotation), the frontend HTTP client (Axios) automatically attaches two critical pieces of data to the outgoing HTTP headers:
   - `Authorization: Bearer <JWT_TOKEN>` (Authenticating the employee)
   - `X-Tenant-Slug: socofeb` (Identifying the workspace)
6. **Backend Tenant Resolution:** In the .NET API, a middleware service called `SubdomainTenantResolver` reads the `X-Tenant-Slug` header. It seeds a scoped `TenantContext` service. When the API's database context (`WoodAppContext`) initiates a database connection, it instructs PostgreSQL: `SET search_path TO tenant_socofeb, public;`.
7. **Execution & UI Hydration:** PostgreSQL retrieves only the records belonging to `socofeb`. The .NET API serializes the result into JSON, sends it back through Nginx, and the Next.js frontend updates its cached data using **TanStack React Query** and **Zustand** state management.

---

## Chapter 5: Docker and Container Relationships

The platform's runtime environment is containerized using Docker and Docker Compose. Seven core containers operate cooperatively across two user-defined bridge networks:

### 1. `wood-app-network` (Subnet `172.18.0.0/16`)
This is the primary application backbone connecting:
- `wood-app-postgres`: PostgreSQL 15 database holding the master registry and all tenant schemas.
- `wood-app-api`: .NET 7 Web API running business logic.
- `migration-ui`: Next.js 16 frontend serving the main ERP client.
- `admin-elance-back`: .NET 8 Web API serving the SaaS SuperAdmin control plane.
- `admin-elance-front`: Next.js 16 admin portal for onboarding and platform administration.
- `n8n`: Workflow automation platform that orchestrates background tasks like welcome emails and webhook processing.

### 2. `acya_n8n_network` (Subnet `172.19.0.0/16`)
This is a strictly isolated internal bridge connecting:
- `postgres-n8n`: A dedicated, separate PostgreSQL 15 database used exclusively by the n8n automation engine.
- `n8n`: The automation platform.

### Network Isolation Safety
Notice the deliberate architectural separation: `postgres-n8n` is **only** attached to `acya_n8n_network`. It is impossible for any application container or web client to establish a TCP connection to n8n's database. Furthermore, neither PostgreSQL container publishes port 5432 to the host network. Database traffic is completely confined within Docker's internal virtual network interfaces.

---

## Chapter 6: Production VPS

The Production VPS (`vps-1d2bffb5`) is an Ubuntu 25.04 virtual machine equipped with 11 GiB of system memory and a 100 GB NVMe solid-state storage disk.

### Host Storage Layout
- `/dev/sda1`: The root filesystem partition (98.9 GB total, ~31 GB used, 66 GB free).
- Persistent Docker Bind Mounts:
  - `/home/ubuntu/acya-app/wood-app.api/postgres-data-new_2026_04_22/pgdata`: The live storage directory where master PostgreSQL writes transaction logs and table data (~166 MB).
  - `/home/ubuntu/acya-app/storage/private/mobile`: Private host directory storing compiled Android APK application bundles (~112 MB).
- Host system utilities: Systemd timer units manage background synchronization, and Prometheus Node Exporter collects low-level hardware metrics.

---

## Chapter 7: Monitoring VPS

Located approximately 700 kilometers away in Gravelines, France, the Monitoring VPS (`vps-b92b4ae6`) serves as an independent control node.

### Core Services
- **Grafana (v11.2.0):** Accessible securely over HTTPS at `https://monitor.acya.site`, providing visual dashboards for platform operators.
- **Prometheus:** Periodically scrapes the Production VPS over TCP port 9100 to ingest metrics on CPU usage, memory availability, disk capacity, and network interface activity.
- **Restic Repository:** Located on a dedicated 100 GB disk mounted at `/data/backups/restic`. This directory acts as the central offsite storage vault for encrypted backups.
- **Restricted SFTP Account:** The Monitoring VPS hosts a dedicated Linux user account named `backup`. This user is locked into an internal SFTP subsystem (`ForceCommand internal-sftp`). If someone attempts to log in with an interactive SSH shell using the backup key, the server immediately terminates the session with the message: *"This service allows sftp connections only."*

---

## Chapter 8: Security and Access Boundaries

Security in ACYA Élancé is implemented in layers, adhering to defense-in-depth principles:

### 1. Dual-JWT Secret Segregation
The platform issues two entirely separate classes of JSON Web Tokens:
- **Client Tenant JWTs:** Signed using `JWT_SECRET_MAIN`. These tokens authenticate tenant employees and are validated by `wood-app-api`.
- **SuperAdmin JWTs:** Signed using `JWT_SECRET_ADMIN` with a unique issuer (`acya-bo`) and audience (`acya-bo-ui`). These tokens are validated exclusively by `admin-elance-back`.
Even if an attacker were to compromise an administrative session token from a tenant ERP instance, that token cannot be used to execute commands against the SaaS backoffice control plane.

### 2. Authoritative Webhook Cryptographic Verification
When third-party web services send events to ACYA, they are never processed blindly:
- **Mailgun Inbound Events:** Incoming email delivery receipts and failure webhooks are received by `EmailWebhooksController.cs` in `admin-elance-back`. The API calculates an HMAC-SHA256 signature using a pre-shared signing key, compares it with the payload signature, and verifies that the timestamp is within a 15-minute window to block replay attacks.
- **Meta WhatsApp Webhooks:** Incoming messaging events are authoritatively verified against a secret challenge token in `WhatsAppWebhooksController.cs`.

### 3. n8n Container Hardening
Workflow automation tools can pose significant security risks if workflow scripts can inspect server environments. To prevent this, n8n's configuration explicitly enforces:
- `N8N_BLOCK_ENV_ACCESS_IN_NODE=true`: Code executed inside workflow nodes cannot read server environment variables or access database passwords.
- `N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true`: Configuration files require strict file permissions.
- `N8N_SECURE_COOKIE=true`: Web sessions enforce encrypted cookie transmission.

### 4. Firewall & Network Port Defense
The production host runs Linux kernel iptables rules:
- Traffic to Prometheus Node Exporter (port 9100) is filtered so that packets are **only accepted if they originate from the Monitoring VPS IP**. All other sources are dropped silently.
- Nginx drops unknown host traffic with HTTP status 444 (No Response).

---

## Chapter 9: Deployment Lifecycle

Deploying updates to a live enterprise ERP requires surgical precision to prevent user disruption. ACYA Élancé strictly forbids blunt deployment commands like `docker-compose down`.

### The Targeted Deployment Runbook
When a new software version is released for a single component (for example, the Next.js ERP frontend):

1. **Preflight Check:** The operator inspects `git status` to ensure a clean working tree on branch `main`.
2. **Preserve Rollback State:** The currently running, healthy Docker image is tagged with a timestamped rollback tag:
   ```bash
   docker tag acya-app-migration-ui:latest acya-app-migration-ui:rollback-$(date +%Y%m%d)
   ```
3. **Targeted Recompilation:** The new image is built without cache, touching only the specified target:
   ```bash
   docker-compose build --no-cache migration-ui
   ```
4. **Surgical Container Recreation:** The old container is removed, and the new container is launched without restarting any dependent containers:
   ```bash
   docker rm -f migration-ui
   docker-compose up -d --no-deps migration-ui
   ```
5. **Health Verification:** The operator inspects container status (`docker ps`), reviews startup logs (`docker logs --tail 100`), and executes an HTTP smoke test (`curl -I http://localhost:5000`).

If unexpected errors occur, the rollback is instantaneous: the operator re-tags the preserved rollback image back to `latest` and recreates the container in under 30 seconds.

---

## Chapter 10: Backup Architecture

Backups are the ultimate insurance policy of any ERP platform. ACYA Élancé implements an automated backup engine driven by the production script `/usr/local/bin/acya-production-backup.sh` (Version 1.2.0).

### The Execution Pipeline
When triggered, the script follows an unyielding sequence of safety checks:
1. **Concurrency Lock:** Acquires a kernel file lock (`flock`) on `/var/lib/acya-backup-state/backup.lock`. If another backup process is already running, the new execution aborts immediately with exit code 75 to prevent disk collisions.
2. **Free Storage Preflight:** Measures available disk space on `/var/backups`. If less than 5 GiB is available, the script halts with exit code 73, protecting the server from running out of disk space during database dumps.
3. **Prerequisite Assertions:** Confirms that the Restic executable, repository password file, and SSH private keys are present and non-empty.
4. **Temporary Staging Setup:** Creates a unique, root-only staging folder: `/var/backups/acya-backup-stage-XXXXXX`.
5. **Database Dumps:**
   - Dumps the complete `wood-app-db` database using PostgreSQL's custom binary format (`-Fc`).
   - Queries `bo_tbl_enterprise` dynamically and generates individual schema dumps for all 15 tenant schemas (`tenants/tenant_socofeb.dump`, etc.).
   - Dumps the n8n database (`n8n/n8n_db.dump`).
   - Exports the tenant registry as JSON and CSV metadata.
6. **Manifest & Checksums:** Generates `manifest.txt`, computing SHA-256 cryptographic hashes for every generated dump file, and recording host versions, timestamps, and container identifiers.
7. **Restic Streaming:** Restic crawls the staging directory alongside critical persistent host assets (mobile APK storage, n8n volumes, Docker Compose files, `.env` files, and Nginx configurations). It encrypts the data locally and streams the deduplicated pack files over SFTP to the Monitoring VPS.
8. **Verification:** The script queries Restic to verify that the newly generated snapshot ID and unique run tag exist in the remote repository.
9. **Atomic Cleanup:** A bash `trap on_exit` automatically purges the temporary staging directory, leaving zero orphaned dump files on disk.

---

## Chapter 11: Restic and Snapshot Management

Live inspection of the remote Restic repository on the Monitoring VPS confirmed five immutable snapshots:
- Initial deployment snapshot (`5a78f673`) from October 5, 2026.
- Three automated production snapshots (`bbb68d5d`, `1fbd94a9`, `f93ac4c4`).
- Latest verified production snapshot (`36a26b4e`) from October 13, 2026.

### Why Restic Excels for Élancé
Because Restic uses content-defined chunking and deduplication, the total repository size on the backup VPS is remarkably compact (~233 MiB), even though it contains multiple full snapshots of 15 tenant database schemas, binary application packages, and system configurations. Subsequent snapshots only upload the specific database blocks that have changed since the previous backup run.

---

## Chapter 12: PostgreSQL Recovery

Having backups is meaningless without proven recovery procedures. In ACYA Élancé, database recovery has been tested and verified directly in the running environment.

### The Zero-Disk Streaming Recovery Technique
During a restoration test, writing a multi-gigabyte decrypted database dump to the host hard drive consumes valuable disk space and exposes sensitive commercial data in unencrypted temporary files.

To avoid this, Élancé utilizes a Unix streaming pipeline:
```bash
restic dump <SNAPSHOT_ID> <DUMP_PATH_IN_SNAPSHOT> \
  | docker exec -i <TARGET_CONTAINER> pg_restore -U postgres -d <DATABASE_NAME>
```
In this command:
1. Restic extracts and decrypts the compressed PostgreSQL dump chunk by chunk over SFTP directly into the Linux standard output (`stdout`) pipe.
2. The pipe feeds directly into standard input (`stdin`) of `pg_restore` executing inside the PostgreSQL container.
3. The data is reconstituted directly into PostgreSQL tables in memory and database storage without a single unencrypted byte ever touching the host file system.

---

## Chapter 13: Disaster Recovery Scenarios

The platform architecture defines explicit operational recovery playbooks across seven failure scenarios:

### 1. Main Frontend Failure `[TESTED]`
If `migration-ui` crashes, operators restart the container via `docker-compose up -d --no-deps migration-ui`. If code is corrupt, they retag the latest preserved rollback tag in under 30 seconds.

### 2. Core API Failure `[TESTED]`
If `wood-app-api` fails health checks, operators inspect logs, restart the container, or revert to the prior verified .NET image (`acya-app-api:rollback-20261014-prehardening`).

### 3. Single Tenant Schema Corruption `[TESTED]`
If an individual tenant schema is corrupted or accidentally truncated, operators do not need to restore the entire database. They stream that specific tenant's schema dump (`tenants/tenant_{slug}.dump`) from the latest Restic snapshot using `pg_restore --clean --if-exists`, restoring the affected business in minutes while other tenants continue working uninterrupted.

### 4. n8n Automation Engine Failure `[TESTED]`
Reconstituted by restarting `docker-compose.n8n.yml` or restoring `n8n_db.dump` from Restic.

### 5. Catastrophic Production VPS Loss `[DOCUMENTED BUT NOT TESTED]`
If the physical datacenter in Strasbourg experiences total hardware loss, operators provision a new Linux VPS, clone the Git repository, restore secrets and configurations directly from the Restic repository on the Monitoring VPS, stream the full database dump, and repoint DNS records. Estimated recovery time: under 4 hours.

### 6. Monitoring VPS Loss `[DOCUMENTED BUT NOT TESTED]`
Production application traffic continues uninterrupted. A replacement monitoring server is provisioned, and the backup SFTP target is redirected.

### 7. Restic Repository Corruption `[PROPOSED]`
Preventative `restic check` commands detect index discrepancies. If unrecoverable, a fresh repository is initialized, and an immediate full baseline snapshot is triggered.

---

## Chapter 14: Operational Risks and Known Gaps

A rigorous technical audit must be honest about vulnerabilities and operational gaps. The following items have been identified on the live platform:

### 1. Direct Docker Host Port Exposure (`HIGH RISK`) `[VERIFIED]`
In `docker-compose.yml`, ports 5000, 5002, 8080, and 8082 are published to `0.0.0.0`. Under default Linux configurations, Docker manipulates kernel routing rules in a way that bypasses standard host firewall (UFW/iptables) INPUT filters. This means that a malicious scanner hitting `http://[PRODUCTION_VPS_IP]:8080` directly could reach the API without passing through Nginx's TLS encryption, domain validation, or rate-limiting guards.
*Remediation:* Bind all published ports in Docker Compose explicitly to `127.0.0.1` (e.g. `127.0.0.1:8080:80`).

### 2. Automated Backup Timer Disabled (`HIGH RISK`) `[VERIFIED]`
Although the automated backup script and systemd timer exist and are fully functional, `/var/lib/acya-backup-state/backup-status.json` reports `"timerActive": false`. The automated schedule is currently marked as deferred. As a consequence, backups do not execute automatically every night unless an operator triggers them manually or activates the synchronization timer.
*Remediation:* Enable the automated backup schedule in the state configuration file and reload the systemd timer drop-in.

### 3. Zero Swap Space on Production VPS (`MEDIUM RISK`) `[VERIFIED]`
The production host has 11 GiB of RAM but 0 bytes of configured swap memory. If a massive reporting query or image processing spike consumes all available memory, the Linux kernel Out-Of-Memory (OOM) killer will immediately terminate large processes, which could kill PostgreSQL and cause abrupt service interruption.
*Remediation:* Configure a 4 GiB swapfile on the primary disk.

### 4. Absence of Automated Backup Failure Alerts (`MEDIUM RISK`) `[VERIFIED]`
If a scheduled backup fails due to disk space or network timeouts, the script records an error code in `last-run.json`, but does not dispatch an outbound alert (such as an email or webhook to Alertmanager).
*Remediation:* Add a webhook trigger inside the script's exit trap to notify administrators immediately upon failure.

---

## Chapter 15: Future Improvements

To advance ACYA Élancé from a robust SaaS infrastructure to an enterprise-grade high-availability platform, the following engineering enhancements are recommended:

1. **Offsite Multi-Cloud Backup Mirroring:** In addition to pushing backups to the Gravelines VPS, configure an automated, encrypted secondary sync (via `rclone`) to an object storage provider like AWS S3 Glacier, Scaleway, or Backblaze B2.
2. **Application-Level Prometheus Metrics:** Instrument Prometheus metrics endpoints in `wood-app-api` and `admin-elance-back` using `prometheus-net`, tracking active database connection pool counts, HTTP request latency histograms, and per-tenant transaction throughput.
3. **Centralized Log Streaming via Promtail to Loki:** Deploy Promtail or Docker's Loki logging driver to automatically stream container stdout/stderr logs from the Production VPS to Loki on the Monitoring VPS, enabling full-text log search in Grafana.
4. **PostgreSQL Point-in-Time Recovery (PITR):** Enable continuous PostgreSQL Write-Ahead Log (WAL) archiving (using tools like `pgBackRest` or WAL-G) to reduce the theoretical Recovery Point Objective from 24 hours down to seconds.

---

## Chapter 16: Summary Glossary

- **ACYA Élancé:** A multi-tenant Cloud ERP designed for the timber, wood products, and construction industries.
- **Schema-per-Tenant:** Architectural model where each client company has a dedicated relational schema (`tenant_{slug}`) inside a shared PostgreSQL database (`wood-app-db`).
- **Nginx Ingress:** Host web server terminating SSL, enforcing rate limits, and routing requests based on subdomain regex matching.
- **Restic:** Cryptographic, deduplicating backup engine used to take point-in-time snapshots over SFTP.
- **Zero-Disk Streaming Pipe:** Technique of piping decrypted backup data directly from Restic into PostgreSQL via standard Unix streams without writing dump files to disk.
- **`TenantModelCacheKeyFactory`:** Entity Framework Core customization ensuring that relational database models are compiled and cached independently for each tenant schema.
- **`TenantProvider`:** Next.js root React context managing tenant branding, company settings, and subscription enforcement.
- **Targeted Deployment:** Standard operating procedure of updating only the single modified Docker container with no dependency disruption.

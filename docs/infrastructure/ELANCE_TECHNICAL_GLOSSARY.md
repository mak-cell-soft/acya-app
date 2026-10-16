# ACYA — Élancé ERP: Technical Glossary & Concepts

> **Document Classification:** Terminology & Reference Lexicon  
> **Target Audience:** All Technical Audiences, Audio/Video Synthesis Models, New Team Members  
> **Scope:** Domain-Specific Timber Terms, Architecture Concepts, Infrastructure Lexicon  
> **Verification Date:** October 16, 2026  

---

## 1. Timber & Wood Domain Terminology

ACYA Élancé incorporates specialized domain logic tailored to wood merchandise, construction, and milling operations:

### 1.1 Dimensional Metrics ($m^3$, ML, Pieces)
- **Cubic Meter ($m^3$):** The primary commercial metric for raw lumber, sawn timber, and wholesale deliveries. Calculated as:
  $$\text{Volume } (m^3) = \frac{\text{Thickness (mm)} \times \text{Width (mm)} \times \text{Length (m)} \times \text{Quantity}}{1\,000\,000}$$
- **Lineal Meter (*Mètre Linéaire* / ML):** Pricing metric used for standardized battens, mouldings, joists, and decking boards where cross-sectional dimensions are uniform.
- **Wood Package (*Colis* / *Fardeau*):** A standardized bundled stack of timber pieces tagged with a physical barcode/identifier, tracked from mill delivery to customer dispatch.
- **Essence (Wood Species):** The botanical categorization of timber (e.g., White Wood / *Sapin*, Red Wood / *Pin Sylvestre*, Oak / *Chêne*, Teak / *Teck*), which determines physical density, pricing formulas, and moisture tolerance.

### 1.2 ERP Operational Modules
- **Chantier (Construction Project / Job Site):** A tracking entity grouping labor, material disbursements, subcontractor expenses, and progressive billing invoices for a specific architectural site.
- **Atelier / Production (Workshop Milling):** The manufacturing workflow that consumes raw timber packages to produce finished wood goods (doors, pergolas, custom cabinetry), tracking machine hours, worker assignments, and scrap loss.
- **Devis (Quotation / Estimate):** Pre-sale commercial estimate calculating composite margins based on current lumber purchasing costs.
- **Bon de Livraison (Delivery Note / BL):** Legal commercial document recording physical stock deduction when goods leave the timber yard.

---

## 2. Multi-Tenancy & Software Architecture Lexicon

- **Schema-per-Tenant:** A relational database multi-tenancy pattern where each client tenant is assigned an independent PostgreSQL schema (`tenant_{slug}`) inside a shared database (`wood-app-db`). Guarantees logical data isolation while sharing compute and database connections.
- **Master Registry (`public.bo_tbl_enterprise`):** The central registry table in the master PostgreSQL schema recording tenant metadata, domain slugs, active status, and subscribed subscription plans.
- **Tenant Context (`TenantContext`):** An ASP.NET Core scoped dependency injection service that resolves and stores the active tenant slug and schema name for the current HTTP request.
- **`TenantModelCacheKeyFactory`:** A custom EF Core model cache key implementation that appends the current schema name to the cache key tuple `(Type, SchemaName, DesignTime)`. Prevents EF Core from executing queries against cached models mapped to another tenant's schema.
- **`SubdomainTenantResolver`:** Business API service that inspects incoming HTTP requests to determine the tenant slug using a strict priority: (1) `X-Tenant-Slug` header, (2) Subdomain from `Host` header, (3) `?tenant={slug}` query parameter.
- **`TenantProvider`:** Next.js root React context provider that parses host subdomains, issues `/api/Enterprise/config`, sets client branding (logo, primary color, currency), and enforces suspension routing.
- **Feature Gating (`useTenantFeatures`):** Frontend React hook consolidating JWT claims and enterprise settings to dynamically hide or show modules (e.g. Construction, Production, Wood Dimensions).

---

## 3. Infrastructure & DevOps Lexicon

- **Ingress Controller (Nginx 1.28.3):** Host-level web server terminating TLS, enforcing rate limits, caching static bundles, and proxying requests to internal container ports.
- **Rate-Limiting Zones:** Nginx memory zones (`zone_global`, `zone_api`, `zone_auth`, `zone_print`) that throttle client IP request rates to mitigate DDoS attacks and brute-force authentication.
- **Wildcard Certificate (`*.acya.site`):** A single Let's Encrypt SSL/TLS certificate that cryptographically secures `acya.site` and all dynamically provisioned enterprise subdomains (`socofeb.acya.site`, `socobois.acya.site`, etc.).
- **Docker Bridge Network:** A software-defined internal virtual network interface (`acya-app_wood-app-network`, `acya_n8n_network`) allowing containers on the same host to communicate using internal container names as hostnames without publishing ports to the internet.
- **Targeted Deployment:** Safe deployment methodology where only the specific container undergoing code updates is rebuilt and recreated (`--no-deps`), leaving adjacent services running undisturbed.
- **Rollback Tag:** A Docker image tag created immediately prior to a new compilation (e.g. `acya-app-migration-ui:rollback-20261016`), allowing instantaneous reversal if the new image fails smoke testing.

---

## 4. Backup & Disaster Recovery Lexicon

- **Restic (v0.19.1):** High-speed, secure, open-source backup utility implementing cryptographic deduplication, snapshot management, and remote SFTP transport.
- **Restic Repository:** The structured, encrypted target directory on the secondary VPS (`/data/backups/restic`) holding all snapshot metadata, indexes, and encrypted data blobs.
- **Snapshot:** An immutable point-in-time index representing the complete state of backed-up directories and files. Identified by a unique 64-character SHA-256 hash (e.g. `36a26b4e...`).
- **Pack Files:** Encrypted archive bundles stored in `data/` within the Restic repository containing multiple deduplicated file blobs.
- **Content-Defined Chunking (CDC):** Restic algorithm that breaks files into dynamic chunks based on content rather than fixed byte offsets, allowing deduplication even when bytes are inserted at the beginning of files.
- **Zero-Disk Streaming Pipe:** Restoration technique where Restic streams unencrypted database dump bytes directly through a Unix pipe into `docker exec ... pg_restore` without writing the unencrypted dump to host disk.
- **Recovery Point Objective (RPO):** The maximum tolerable data loss measured in time (ACYA baseline: 24 hours).
- **Recovery Time Objective (RTO):** The target duration required to reconstitute services following a failure (ACYA baseline: < 30 minutes for databases, < 4 hours for bare-metal VPS loss).
- **`flock` Concurrency Guard:** Linux kernel file lock (`/var/lib/acya-backup-state/backup.lock`) held open during backup execution to prevent multiple overlapping backup scripts from conflicting.

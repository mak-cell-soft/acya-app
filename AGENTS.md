# ACYA App — Project Agent Instructions (Root Context)

Welcome to **ACYA App** (WoodApp ERP). This document defines the global architecture, development rules, multi-tenancy constraints, and safety guidelines for AI and autonomous coding agents working in this repository.

---

## 1. Agent Quick Start

Before modifying or creating any code in this repository:

1. **Read this root `AGENTS.md`** to understand the monorepo structure, multi-tenancy rules, and safety constraints.
2. **Read the nearest applicable child `AGENTS.md`** for domain-specific guidelines:
   - Frontend Main ERP: [elance-app.ui/AGENTS.md](file:///c:/Users/amine/source/repos/acya.app/acya-app/elance-app.ui/AGENTS.md)
   - Backend Core API: [wood-app.api/AGENTS.md](file:///c:/Users/amine/source/repos/acya.app/acya-app/wood-app.api/AGENTS.md)
   - Backoffice Suite: [bo-acya-app/AGENTS.md](file:///c:/Users/amine/source/repos/acya.app/acya-app/bo-acya-app/AGENTS.md)
3. **Inspect `git status`** to understand the existing working tree before making edits.
4. **Clarify the requested task** and verify which architectural layer is affected.
5. **Search existing implementations and usages** before creating new components, endpoints, or services.
6. **Ensure multi-tenant safety** — verify how tenant boundaries are isolated.
7. **Make the smallest safe, focused change**.
8. **Run relevant validation** (typecheck, lint, build, or tests).
9. **Inspect `git diff`** to ensure no unintended files or formatting regressions were introduced.
10. **Report exactly what changed and what was verified**.

> [!IMPORTANT]
> **Resolution of Legacy References:**
> Any legacy documentation or notes mentioning **Angular 18**, **NgRx**, or **WoodApp-UI** are obsolete. The active frontend client is **Next.js 16 (App Router) + React 19 + Tailwind CSS 4** located inside [elance-app.ui/](file:///c:/Users/amine/source/repos/acya.app/acya-app/elance-app.ui/).

---

## 2. Project Overview & Monorepo Structure

ACYA App is a specialized, multi-tenant Enterprise Resource Planning (ERP) platform designed for timber and wood merchandise businesses. It manages sales, purchases, physical inventory with wood dimensional metrics ($m^3$, packages, lengths), treasury, HR/payroll, construction projects (*chantiers*), and production workshops.

### Workspace Projects

| Directory | Role | Primary Tech Stack |
| :--- | :--- | :--- |
| [elance-app.ui/](file:///c:/Users/amine/source/repos/acya.app/acya-app/elance-app.ui/) | Main ERP Frontend | Next.js 16.2, React 19.2, TypeScript 5, Tailwind CSS 4, Base UI, TanStack Query v5, Zustand |
| [wood-app.api/](file:///c:/Users/amine/source/repos/acya.app/acya-app/wood-app.api/) | Core Business Backend | ASP.NET Core Web API (**Target: .NET 7**), EF Core 7, PostgreSQL 15, QuestPDF, ClosedXML |
| [bo-acya-app/](file:///c:/Users/amine/source/repos/acya.app/acya-app/bo-acya-app/) | Backoffice SaaS Suite | `admin-elance-back` (ASP.NET Core **.NET 8** API) + `admin-elance-front` (Next.js 16 Admin UI) |
| [qwerty-app/](file:///c:/Users/amine/source/repos/acya.app/acya-app/qwerty-app/) | E-Invoicing / TEJ Schemas | XML/XSD schemas and specifications for Tunisian electronic invoicing integration |
| [scripts/](file:///c:/Users/amine/source/repos/acya.app/acya-app/scripts/) | DevOps & Migration Scripts | Bash deployment and migration automation utilities |

---

## 3. Repository Navigation Map

When locating code or adding features, follow this mapping:

- **Frontend Pages & Routes:** [elance-app.ui/src/app/](file:///c:/Users/amine/source/repos/acya.app/acya-app/elance-app.ui/src/app/)
- **Frontend Components:** [elance-app.ui/src/components/](file:///c:/Users/amine/source/repos/acya.app/acya-app/elance-app.ui/src/components/)
- **Frontend State & Hooks:** [elance-app.ui/src/hooks/](file:///c:/Users/amine/source/repos/acya.app/acya-app/elance-app.ui/src/hooks/) and [elance-app.ui/src/store/](file:///c:/Users/amine/source/repos/acya.app/acya-app/elance-app.ui/src/store/)
- **Frontend Domain Types:** [elance-app.ui/src/types/](file:///c:/Users/amine/source/repos/acya.app/acya-app/elance-app.ui/src/types/)
- **Frontend HTTP / Axios Client:** [elance-app.ui/src/lib/axios.ts](file:///c:/Users/amine/source/repos/acya.app/acya-app/elance-app.ui/src/lib/axios.ts)
- **Backend Controllers:** [wood-app.api/src/ms.webapp.api.acya/ms.webapp.api.acya/Controllers/](file:///c:/Users/amine/source/repos/acya.app/acya-app/wood-app.api/src/ms.webapp.api.acya/ms.webapp.api.acya/Controllers/)
- **Backend Services:** [wood-app.api/src/ms.webapp.api.acya/ms.webapp.api.acya/Services/](file:///c:/Users/amine/source/repos/acya.app/acya-app/wood-app.api/src/ms.webapp.api.acya/ms.webapp.api.acya/Services/)
- **Backend Domain Entities:** [wood-app.api/src/ms.webapp.api.acya.core/Entities/](file:///c:/Users/amine/source/repos/acya.app/acya-app/wood-app.api/src/ms.webapp.api.acya.core/Entities/)
- **Backend DTOs:** [wood-app.api/src/ms.webapp.api.acya.core/Entities/DTOs/](file:///c:/Users/amine/source/repos/acya.app/acya-app/wood-app.api/src/ms.webapp.api.acya.core/Entities/DTOs/)
- **Backend Data Context & Repositories:** [wood-app.api/src/ms.webapp.api.acya.infrastructure/](file:///c:/Users/amine/source/repos/acya.app/acya-app/wood-app.api/src/ms.webapp.api.acya.infrastructure/)
- **Database Migrations:** [wood-app.api/db/wood/](file:///c:/Users/amine/source/repos/acya.app/acya-app/wood-app.api/db/wood/)
- **Baseline Schema Provisioning:** [wood-app.api/db/FullDb_Migration/](file:///c:/Users/amine/source/repos/acya.app/acya-app/wood-app.api/db/FullDb_Migration/)
- **Docker Orchestration:** [docker-compose.yml](file:///c:/Users/amine/source/repos/acya.app/acya-app/docker-compose.yml) and [docker-compose.n8n.yml](file:///c:/Users/amine/source/repos/acya.app/acya-app/docker-compose.n8n.yml)
- **Deployment & Production Procedures:** [CONFIG-STEPS.md](file:///c:/Users/amine/source/repos/acya.app/acya-app/CONFIG-STEPS.md) and [DEPLOYMENT.md](file:///c:/Users/amine/source/repos/acya.app/acya-app/DEPLOYMENT.md)

---

## 4. Multi-Tenant Architecture & Strict Rules

ACYA App uses a **PostgreSQL Schema-per-Tenant** architecture.

```text
PostgreSQL Database: wood-app-db
├── public schema             -> Master registry (bo_tbl_enterprise / TenantRegistry)
├── tenant_socobois schema    -> Tenant A isolated data (tables, documents, stock, users)
├── tenant_piqbit schema      -> Tenant B isolated data
└── tenant_xyz schema         -> Tenant N isolated data
```

### Tenant Identification & Context Propagation
1. **Nginx Reverse Proxy:** In production, Nginx captures the subdomain (`{slug}.acya.site`) and forwards it to the API in the HTTP header:
   `X-Tenant-Slug: {slug}`
2. **Frontend Axios Client:** In [elance-app.ui/src/lib/axios.ts](file:///c:/Users/amine/source/repos/acya.app/acya-app/elance-app.ui/src/lib/axios.ts), `getTenantSlug()` parses either `window.location.hostname` or the `?tenant={slug}` query string, automatically attaching `X-Tenant-Slug` to every HTTP request.
3. **Backend Middleware:** In [SubdomainTenantResolver.cs](file:///c:/Users/amine/source/repos/acya.app/acya-app/wood-app.api/src/ms.webapp.api.acya/ms.webapp.api.acya/Services/SubdomainTenantResolver.cs), the API inspects:
   - Header `X-Tenant-Slug`
   - Host subdomain
   - Query string `tenant={slug}` (development fallback)
4. **Schema Routing:** `TenantContext` is registered as Scoped and injected into `WoodAppContext`. If `MultiTenancy.IsEnabled` is `true`, `WoodAppContext.SchemaName` resolves dynamically to `tenant_{slug}`.
5. **EF Core Model Isolation:** `TenantModelCacheKeyFactory` enforces that EF Core caches separate relational models per schema name to prevent cached queries from bleeding across tenants.

### Non-Negotiable Tenant Rules for Agents
- **NEVER hardcode schema names.** Always let `WoodAppContext` resolve the active schema.
- **NEVER bypass tenant isolation in raw SQL.** If executing raw SQL queries or Dapper queries, ensure they execute against the currently configured schema or iterate safely over tenant schemas.
- **NEVER expose one tenant's data to another.** Controllers must not allow access to document IDs or entity IDs across tenant boundaries.
- **Verify feature subscription gating.** Tenants subscribe to specific modules (e.g. `isManagingConstructions`, `isManagingProduction`). Use `useTenantFeatures()` on the frontend and check the enterprise settings on the backend before executing module-specific operations.

---

## 5. Cross-Cutting Database Change Rules

Database changes require strict synchronization between entities, migrations, and tenant provisioning scripts.

### Database Workflow for Agents:
```text
Inspect Entities (ms.webapp.api.acya.core/Entities)
→ Inspect Existing Migrations (wood-app.api/db/wood/v0.XX/)
→ Implement Entity & Configuration Changes
→ Write Incremental SQL Migration in db/wood/v0.XX/
→ Update Baseline Migration (db/FullDb_Migration/full_migration.sql)
→ Update Frontend Types (elance-app.ui/src/types/)
```

### Multi-Tenant Migration Pattern
When creating an incremental SQL migration that applies across all existing tenants, use the established schema-loop pattern:

```sql
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name LIKE 'tenant_%' OR schema_name = 'public'
    ) LOOP
        EXECUTE format('
            ALTER TABLE %I.tbl_your_table 
            ADD COLUMN IF NOT EXISTS new_column VARCHAR(100);
        ', r.schema_name);
    END LOOP;
END $$;
```

### Database Safety Rules
- **NEVER run `DROP TABLE` or `DROP COLUMN`** without explicit user instruction.
- **Always make migrations idempotent** using `IF NOT EXISTS` / `IF EXISTS`.
- **Remember `full_migration.sql`:** Any table or column added to tenant schemas must also be updated in `wood-app.api/db/FullDb_Migration/full_migration.sql`, which the backoffice API uses to provision new tenants.

---

## 6. API Change Protocol

When modifying or introducing API endpoints:

1. **Check the Controller:** All core controllers inherit from `BaseApiController` and use route `api/[controller]`.
2. **Follow Clean Architecture:**
   - Controllers handle HTTP transport, routing, and authorization attributes.
   - Core domain business logic belongs in `Services/` or domain repository abstractions.
   - Never put direct business or persistence logic directly inside controller action bodies.
3. **DTO Contract Synchronization:**
   - Request and response payloads must use DTOs in `ms.webapp.api.acya.core/Entities/DTOs`.
   - Update the corresponding TypeScript interface in `elance-app.ui/src/types/`.
   - Update the service client in `elance-app.ui/src/services/` and the TanStack Query hook in `elance-app.ui/src/hooks/`.
4. **Audit Logging & Soft Deletion:**
   - Business entities implement soft-deletion via `IsDeleted` flags.
   - Critical operations (document validation, status updates, payments) should be tracked through `IAuditService`.

---

## 7. Production, Docker & DevOps Safety Rules

Critical container and deployment safety rules derived from [CONFIG-STEPS.md](file:///c:/Users/amine/source/repos/acya.app/acya-app/CONFIG-STEPS.md):

### 🚫 STRICTLY FORBIDDEN COMMANDS IN PRODUCTION
- `docker compose down` — Disables all services simultaneously.
- `docker compose down -v` — **DESTRUCTIVE:** Deletes database volumes and wipes data.
- `docker compose up -d --remove-orphans` — **DESTRUCTIVE:** Kills background automation containers like `postgres-n8n` and `n8n`.
- `docker system prune -a` and `docker volume prune` — Destroys unreferenced images and volumes without verification.

### ✅ SAFE TARGETED REBUILD WORKFLOW
When deploying updates to production services:

```bash
# Rebuild only the affected service without cache:
sudo docker compose build --no-cache [migration-ui | api | admin-ui | admin-api]

# Re-create and restart only that single container without touching dependencies:
sudo docker compose up -d --no-deps [migration-ui | api | admin-ui | admin-api]

# Verify container status:
sudo docker ps --filter "name=[container-name]"
sudo docker logs --tail 100 [container-name]
```

---

## 8. Secrets & Configuration Policy

- **Never commit `.env` or configuration files with real secrets.**
- All configurable parameters must be documented with placeholder values in `.env.example`.
- Key environment variables:
  - `POSTGRES_PASSWORD`, `POSTGRES_DB`, `APP_DB`
  - `JWT_SECRET_MAIN`: Secret key for tenant API authentication.
  - `JWT_SECRET_ADMIN`: Dedicated secret key for Backoffice SuperAdmin authentication.
  - `N8N_EMAIL_SERVICE_API_KEY`, `MAILGUN_WEBHOOK_SIGNING_KEY`
  - `SMTP_*`: Outbound transactional email configuration.
  - `TEJ_*`: Electronic invoicing credentials.

---

## 9. Safe Git Workflow for Agents

- Always run `git status` before touching files to check for uncommitted changes.
- Make surgical, minimal edits — do not touch unrelated files or reformat entire files.
- Inspect `git diff` before concluding the task to guarantee clean, intended modifications.
- Never force-push or reset local git history.

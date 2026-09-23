# Backoffice Platform Agent Instructions (bo-acya-app)

This document provides specialized guidelines for AI agents working on the **ACYA Backoffice Administrative Suite**.

---

## 1. Platform Purpose & Scope

The Backoffice platform (`bo-acya-app`) is the administrative control plane used by SaaS owners and super-administrators to:
- Onboard new enterprise tenants.
- Provision new PostgreSQL tenant schemas and execute baseline database migrations.
- Manage subscription plans, user quotas, and billing.
- Monitor tenant health, system logs, email webhooks (Mailgun), and automated workflows (n8n).

---

## 2. Architecture & Sub-Projects

The backoffice is split into two projects:

```text
bo-acya-app/
├── admin-elance-back/         # SuperAdmin Backend (.NET 8 Web API)
│   ├── ms.admin.api.acya.sln  # Visual Studio Solution
│   ├── src/
│   │   ├── ms.admin.api.acya/               # Controllers (Enterprise, Provisioning, Billing, Health)
│   │   ├── ms.admin.api.acya.core/          # Enterprise models, DTOs, interfaces
│   │   ├── ms.admin.api.acya.infrastructure/# Master DB access, schema provisioning services
│   │   └── ms.admin.api.acya.common/        # Shared constants & helpers
│   └── Dockerfile             # Container definition (admin-elance-back)
└── admin-elance-front/        # SuperAdmin Web Client (Next.js 16 + React 19)
    ├── app/                   # Next.js App Router admin pages
    ├── package.json           # Dependencies (Next.js 16, React 19, Tailwind 4)
    └── Dockerfile             # Container definition (admin-elance-front)
```

---

## 3. Key Differences vs Core ERP API

| Feature | Core ERP (`wood-app.api`) | Backoffice API (`admin-elance-back`) |
| :--- | :--- | :--- |
| **.NET Target** | **.NET 7** (`net7.0`) | **.NET 8** (`net8.0`) |
| **Database Connection** | Switches dynamically between tenant schemas | Connects to `wood-app-db` on the `public` master schema |
| **Authentication** | Client JWT (`JWT_SECRET_MAIN`) | Admin JWT (`JWT_SECRET_ADMIN`) |
| **Port (Local / Docker)** | `5068` / `8080` | `8082` |

---

## 4. Tenant Provisioning Workflow

When creating a new tenant via `EnterpriseController` / `ProvisioningController`:

1. **Enterprise Registration:** Insert metadata into `public.bo_tbl_enterprise` (slug, company name, contact, plan).
2. **Schema Creation:** Execute `CREATE SCHEMA IF NOT EXISTS tenant_{slug}`.
3. **Run Baseline Migration:**
   - Execute the SQL script defined by `MigrationScriptPath` (points to `wood-app.api/db/FullDb_Migration/full_migration.sql`).
   - This creates all application tables, functions, and initial seed data inside `tenant_{slug}`.
4. **Seed Administrator:** Create the tenant's initial administrative user linked to enterprise ID 1 in the new schema.
5. **Notification:** Trigger webhook or transactional onboarding email via n8n.

> [!IMPORTANT]
> Whenever core application tables change in `wood-app.api`, always verify that `wood-app.api/db/FullDb_Migration/full_migration.sql` has been updated so future tenant provisioning creates schemas with the latest structure.

---

## 5. Development & Validation Commands

### Backoffice Backend (`bo-acya-app/admin-elance-back/`):
```bash
# Build backend
dotnet build ms.admin.api.acya.sln

# Run backend locally (available on http://localhost:5000 / https://localhost:7000 or docker port 8082)
dotnet run --project src/ms.admin.api.acya/ms.admin.api.acya.csproj
```

### Backoffice Frontend (`bo-acya-app/admin-elance-front/`):
```bash
# Install dependencies
npm install

# Run dev server (starts on port 3000, mapped to 5002 in Docker)
npm run dev

# Lint & build
npm run lint
npm run build
```

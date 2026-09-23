# Core ERP Backend Agent Instructions (wood-app.api)

This document provides specialized guidelines for AI agents working on the **ACYA App Core Business API**.

---

## 1. Technology Stack

- **Framework:** ASP.NET Core Web API (**Target Framework: `net7.0`**)
- **Data Access & ORM:** Entity Framework Core 7.0.20 (`Npgsql.EntityFrameworkCore.PostgreSQL`)
- **Database:** PostgreSQL 15 (Schema-per-Tenant isolation)
- **Document & Print Generation:** QuestPDF (invoices, BL, delivery notes, inventory counts)
- **Spreadsheet Processing:** ClosedXML (Excel reports, accounting exports)
- **Email Delivery:** MailKit (transactional and accountant dispatch)
- **Real-Time Communications:** ASP.NET Core SignalR
- **Testing:** xUnit 2.5.1, Moq, EF Core InMemory

---

## 2. Solution Structure & Clean Architecture

The solution [ms.webapp.api.acya.sln](file:///c:/Users/amine/source/repos/acya.app/acya-app/wood-app.api/ms.webapp.api.acya.sln) is organized into four distinct architectural layers:

```text
wood-app.api/
├── src/
│   ├── ms.webapp.api.acya/               # API / Web Presentation Layer
│   │   ├── Controllers/                  # REST API endpoints (BaseApiController)
│   │   ├── Middleware/                   # Tenant resolution middleware
│   │   ├── Services/                     # Application services (TokenService, Audit, Qwerty)
│   │   └── Program.cs                    # Application startup, DI registrations, pipeline
│   ├── ms.webapp.api.acya.core/          # Core Domain & Business Models
│   │   ├── Entities/                     # POCO database models (Document, Article, Stock, etc.)
│   │   ├── Entities/DTOs/                # Request & response data transfer objects
│   │   └── Interfaces/                   # Domain service contracts & repository interfaces
│   ├── ms.webapp.api.acya.infrastructure/# Data Access & Persistence Layer
│   │   ├── WoodAppContext.cs             # Primary tenant-scoped DbContext
│   │   ├── MasterDbContext.cs           # Central tenant registry DbContext (public schema)
│   │   ├── Repositories/                 # Repository implementations (CoreRepository base)
│   │   └── Configurations/               # Fluent API mapping configs (IEntityTypeConfiguration<T>)
│   └── ms.webapp.api.acya.common/        # Shared Utilities
│       └── Enums, Constants, Formatters
├── db/                                   # SQL migrations and database setup
│   ├── wood/v0.XX/                       # Incremental versioned migration scripts
│   └── FullDb_Migration/                 # Full baseline schema for new tenant provisioning
└── tests/                                # Unit and integration test suites
    └── ms.webapp.api.acya.tests.csproj
```

---

## 3. Multi-Tenant Engine (Schema-per-Tenant)

The API dynamically routes all queries to the requesting enterprise's private PostgreSQL schema (`tenant_{slug}`).

### Architectural Components
1. **[SubdomainTenantResolver.cs](file:///c:/Users/amine/source/repos/acya.app/acya-app/wood-app.api/src/ms.webapp.api.acya/ms.webapp.api.acya/Services/SubdomainTenantResolver.cs):**
   - Resolves tenant slug from `X-Tenant-Slug` header (injected by Nginx / Axios).
   - Falls back to host subdomain (e.g. `socobois.acya.site` $\rightarrow$ `socobois`).
   - Falls back to query parameter `?tenant=socobois` for local testing.
2. **[TenantContext.cs](file:///c:/Users/amine/source/repos/acya.app/acya-app/wood-app.api/src/ms.webapp.api.acya.infrastructure/TenantContext.cs):**
   - Registered as Scoped. Holds `Slug`, `SchemaName` (e.g. `tenant_socobois`), and `IsEnabled`.
3. **[WoodAppContext.cs](file:///c:/Users/amine/source/repos/acya.app/acya-app/wood-app.api/src/ms.webapp.api.acya.infrastructure/WoodAppContext.cs):**
   - Reads `_tenantContext.SchemaName` dynamically to configure PostgreSQL schema mapping:
     ```csharp
     modelBuilder.HasDefaultSchema(SchemaName);
     ```
4. **[TenantModelCacheKeyFactory.cs](file:///c:/Users/amine/source/repos/acya.app/acya-app/wood-app.api/src/ms.webapp.api.acya.infrastructure/TenantModelCacheKeyFactory.cs):**
   - Enforces that EF Core model cache keys include the active schema name, preventing query cross-contamination between tenants.

---

## 4. API & Controller Conventions

- **Base Controller:** All controllers must inherit from `BaseApiController`:
  ```csharp
  [ApiController]
  [Route("api/[controller]")]
  public class ArticleController : BaseApiController
  ```
- **Controller Responsibilities:**
  - Controllers only validate input, verify user permissions/tenant feature gating, and return `ActionResult`.
  - Business calculations (pricing grids, inventory valuation, stock movements) belong in `Services/` or repository implementations.
- **DTOs vs Entities:**
  - Never return EF Core POCO entities directly from controller actions.
  - Always project to and from DTOs in `ms.webapp.api.acya.core/Entities/DTOs/`.
- **Soft Deletion:**
  - Most domain tables feature `IsDeleted` or `Statut`. Do not execute physical `DELETE` unless specifically intended.
- **Audit Trails:**
  - Track critical status updates and transactional changes through `IAuditService`.

---

## 5. Database Change & Migration Protocol

Database changes are managed via versioned SQL scripts located in `db/wood/`:

### Migration Steps
1. **Update Domain Entities:** Update or create entities in `ms.webapp.api.acya.core/Entities/`.
2. **Configure Fluent API:** Update configurations in `ms.webapp.api.acya.infrastructure/Configurations/`.
3. **Write Incremental SQL Migration:**
   - Add a new script in `db/wood/v0.XX/` (e.g., `db/wood/v0.29/01_feature_name.sql`).
   - Loop over all existing tenant schemas and `public`:
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
                 ALTER TABLE %I.tbl_target 
                 ADD COLUMN IF NOT EXISTS new_col VARCHAR(100);
             ', r.schema_name);
         END LOOP;
     END $$;
     ```
4. **Update Baseline Schema:**
   - Update [db/FullDb_Migration/full_migration.sql](file:///c:/Users/amine/source/repos/acya.app/acya-app/wood-app.api/db/FullDb_Migration/full_migration.sql) so newly provisioned tenants receive the latest schema automatically.

---

## 6. Build, Test & Validation Commands

All commands can be run from `wood-app.api/`:

| Task | Command |
| :--- | :--- |
| **Build Solution** | `dotnet build ms.webapp.api.acya.sln` |
| **Run Unit & Integration Tests** | `dotnet test tests/ms.webapp.api.acya.tests.csproj` |
| **Run Specific Test** | `dotnet test tests/ms.webapp.api.acya.tests.csproj --filter "FullyQualifiedName~StockTransferTests"` |
| **Run API Locally** | `dotnet run --project src/ms.webapp.api.acya/ms.webapp.api.acya/ms.webapp.api.acya.csproj` |

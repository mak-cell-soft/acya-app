# Backend Agent Context (wood-app.api)

> [!NOTE]
> The primary, comprehensive backend agent instruction file is **[AGENTS.md](./AGENTS.md)**.
> Please refer to `AGENTS.md` for complete architecture, multi-tenancy rules, and test commands.

## Quick Summary
- **Target Framework:** .NET 7 (`net7.0`)
- **Database:** PostgreSQL 15 with **Schema-per-Tenant** isolation (`tenant_{slug}`).
- **DbContexts:** `WoodAppContext` (tenant data) and `MasterDbContext` (master registry).
- **Architecture:** Clean Architecture (`ms.webapp.api.acya` presentation, `ms.webapp.api.acya.core` domain, `ms.webapp.api.acya.infrastructure` persistence, `ms.webapp.api.acya.common` shared).
- **Migrations:** Incremental scripts in `db/wood/v0.XX/`, baseline template in `db/FullDb_Migration/full_migration.sql`.
- **Validation:** `dotnet build ms.webapp.api.acya.sln` and `dotnet test tests/ms.webapp.api.acya.tests.csproj`.

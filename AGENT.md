# ACYA App — Root Agent Context

> [!NOTE]
> The primary, comprehensive agent instruction system is located in **[AGENTS.md](./AGENTS.md)**.
> Please refer to `AGENTS.md` for full architectural patterns, multi-tenancy rules, and safety constraints.

## Quick Summary
- **Main ERP Frontend:** [elance-app.ui/](./elance-app.ui/) — Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4. (See [elance-app.ui/AGENTS.md](./elance-app.ui/AGENTS.md))
- **Core ERP Backend:** [wood-app.api/](./wood-app.api/) — ASP.NET Core Web API (**Target: .NET 7**), EF Core 7, PostgreSQL (Schema-per-Tenant). (See [wood-app.api/AGENTS.md](./wood-app.api/AGENTS.md))
- **Backoffice Platform:** [bo-acya-app/](./bo-acya-app/) — SuperAdmin suite with .NET 8 API (`admin-elance-back`) and Next.js 16 UI (`admin-elance-front`). (See [bo-acya-app/AGENTS.md](./bo-acya-app/AGENTS.md))
- **Database Architecture:** PostgreSQL 15 with **Schema-per-Tenant** (`tenant_{slug}` schemas). Central registry in `public.bo_tbl_enterprise`.

*(Legacy notice: Any past references to Angular 18, NgRx, or WoodApp-UI are obsolete).*

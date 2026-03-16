# WoodApp Project Root Context (acya-app)

## 1. Project Overview
This repository contains a full-stack ERP system for wood merchandise management, comprising a .NET Web API and an Angular frontend.

## 2. Workspace Structure
The workspace is divided into two primary projects:

### 📂 [wood-app.api](./wood-app.api/)
- **Backend Service:** ASP.NET Core API using .NET 8 and PostgreSQL.
- **Key Responsibilities:** Database management, authentication, business logic, reporting.
- **Detailed Docs:** See [wood-app.api/AGENT.md](./wood-app.api/AGENT.md) for architecture and backend rules.

### 📂 [WoodApp-UI](./WoodApp-UI/)
- **Frontend App:** Angular 18 application with NgRx and Material Design.
- **Key Responsibilities:** Interactive UI, state management, document workflows, dashboards.
- **Detailed Docs:** See [WoodApp-UI/AGENT.md](./WoodApp-UI/AGENT.md) for UI architecture and aesthetic guidelines.

## 3. Global Development Rules
- **Differentiate Context:** When working on backend tasks, refer to the API Agent context. For frontend tasks, refer to the UI Agent context.
- **Full-Stack Alignment:** Ensure DTOs in the API (`ms.webapp.api.acya.core/Entities/DTOs`) align with TypeScript interfaces in the UI (`WoodApp-UI/src/app/models/`).
- **SQL Migrations:** Database schema changes should be placed in `wood-app.api/db/wood/v0.XX/`. 
- **Template Scripts:** Special scripts that should not run during auto-migration (like on-demand seeds) must use the `.sql.template` extension.

## 4. Quick Context Tags
#fullstack #dotnet8 #angular18 #postgresql #wood-erp #monorepo

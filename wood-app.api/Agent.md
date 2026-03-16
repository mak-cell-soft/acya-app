# Backend Agent Context (wood-app.api)

## 1. Project Overview
- **Project Name:** ms.webapp.api.acya
- **Type:** Backend REST API
- **Tech Stack:** .NET 8, ASP.NET Core, Entity Framework Core (EF Core)
- **Database:** PostgreSQL
- **Architecture:** Layered Architecture (Clean Architecture principles)

## 2. Solution Structure
- **`src/ms.webapp.api.acya/`** - Web API Layer
  - **`Controllers/`** - REST endpoints (inheriting from `BaseApiController`).
  - **`Services/`** - Business logic services (e.g., `TokenService`).
  - **`Extensions/`** - Startup configurations and dependency injection setup.
- **`src/ms.webapp.api.acya.core/`** - Domain & Business Logic
  - **`Entities/`** - Database models (POCOs).
  - **`DTOs/`** - Data Transfer Objects for API requests/responses.
  - **`Interfaces/`** - Domain-level abstractions.
- **`src/ms.webapp.api.acya.infrastructure/`** - Data Access & External Services
  - **`WoodAppContext.cs`** - Main EF Core DB Context.
  - **`Repositories/`** - Implementation of data access logic.
  - **`Configurations/`** - Fluent API configurations for entity mapping (PostgreSQL).
- **`src/ms.webapp.api.acya.common/`** - Shared Components
  - Enums (`DocStatus`, `Roles`), Constants, and generic Helpers.

## 3. Key Files & Entry Points
- **`ms.webapp.api.acya/Program.cs`**: Application entry point, DI container configuration, and middleware pipeline.
- **`ms.webapp.api.acya.infrastructure/WoodAppContext.cs`**: Handles database connectivity and DbSet registrations.
- **`ms.webapp.api.acya.infrastructure/Core/CoreRepository.cs`**: Generic repository base class providing CRUD operations.

## 4. Patterns & Conventions
- **Repository Pattern:** All database operations should go through a specific repository (e.g., `EnterpriseRepository`).
- **DTO Mapping:** Manual mapping or constructor-based mapping (entity <-> DTO) is common in the codebase.
- **Base Controller:** All controllers must inherit from `BaseApiController` to ensure consistent routing and common behavior.
- **Fluent API:** Database schema is defined using `IEntityTypeConfiguration<T>` in the `infrastructure` project.

## 5. Development Workflow
- **Database Migrations:** SQL scripts are located in `db/wood/v0.XX/`.
- **Naming Conventions:** PascalCase for Classes/Properties, camelCase for local variables.
- **Comments:** Explain the "Why" behind complex business logic or database transaction decisions.

## 6. Quick Context Tags
#dotnet8 #efcore #postgresql #layered-architecture #api #wood-management #backend

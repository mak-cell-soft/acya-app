# Backend Agent Context (wood-app.api)

## 1. Project Overview
- **Project Name:** ms.webapp.api.acya
- **Type:** Backend RESTful API
- **Tech Stack:** .NET, C#, ASP.NET Core Web API, Entity Framework Core
- **Database:** Relational Database (via EF Core)
- **Real-time:** SignalR
- **Primary Purpose:** Serves as the core backend layer for a merchandise, stock, accounting, and enterprise management system. Handles data persistence, business logic, authentication, and real-time notifications.

## 2. Folder Structure
The backend follows a Clean Architecture / N-Tier separation of concerns, structured into multiple sub-projects inside `src/`:

- `ms.webapp.api.acya/` (Presentation Layer)
  - `Controllers/` - ASP.NET Web API controllers exposing REST endpoints
  - `Services/` - Application services orchestrating business logic and integrations
  - `Extentions/` - Middleware and Dependency Injection extension methods
  - `PermissionsHelper/` - Authorization evaluation helpers
  - `Dockerfile` - Containerization configuration
- `ms.webapp.api.acya.core/` (Domain Layer)
  - `Entities/` - Core domain POCOs (e.g., Article, Document, Stock, Provider)
  - `Interfaces/` - Contracts for repositories and core services
  - `Permissions/` - Role and access control definitions
- `ms.webapp.api.acya.infrastructure/` (Data / Infrastructure Layer)
  - `WoodAppContext.cs` - Entity Framework Core DbContext
  - `Configurations/` - Fluent API configurations for EF Core entities mapping
  - `Repositories/` - Implementations of the data access logic using EF Core
  - `Migrations/` - EF Core database schema migrations
- `ms.webapp.api.acya.common/` (Shared Layer)
  - Contains constants, Enums (`DocStatus`, `Roles`, `TransactionType`), and cross-cutting `Helpers.cs`.

## 3. Key Files & Entry Points
- **`ms.webapp.api.acya/Program.cs`**: Main bootstrapping entry point. Configures DI container, Swagger, JWT Authentication, CORS, and registers SignalR Hubs (`/api/notificationHub`).
- **`ms.webapp.api.acya.infrastructure/WoodAppContext.cs`**: The central Database Context connecting EF Core to the application's tables mapping out all domains like `AppUsers`, `Merchandises`, `Stocks`, `Documents`.
- **`ms.webapp.api.acya/appsettings.json`**: App configuration file storing connection strings, JWT keys, and environment-specific settings.
- **`Controllers/BaseApiController.cs`**: Base controller containing shared routing logic and property resolution.
- **`ms.webapp.api.acya.sln`**: The Visual Studio solution file grouping all core, common, infrastructure, and presentation assemblies.

## 4. Architecture & Patterns
- **Clean Architecture / N-Tier:** Strict dependency flow where API depends on Infrastructure and Core, Infrastructure depends on Core, and Core has no outbound dependencies.
- **Repository Pattern:** Abstracted database access (`ms.webapp.api.acya.infrastructure/Repositories/`) ensuring decoupling from the controllers.
- **Dependency Injection (DI):** Heavy usage of ASP.NET Core's built-in DI container to inject Services and Repositories into Controllers.
- **Real-time Publish/Subscribe:** Utilizes SignalR via `NotificationHub.cs` and `NotificationService.cs` for real-time web socket pushes.
- **Entity Framework Fluent API:** Database schemas are mapped using explicit configuration classes rather than data annotations alone.

## 5. Dependencies & Integrations
- **Web Framework:** `Microsoft.AspNetCore.App`
- **Data Access:** `Microsoft.EntityFrameworkCore`
- **Authentication:** `Microsoft.AspNetCore.Authentication.JwtBearer` (JWT Tokens)
- **Real-time:** Built-in `Microsoft.AspNetCore.SignalR`
- **Documentation:** Swagger/OpenAPI.

## 6. Conventions & Rules
- **Naming Conventions:** PascalCase for Classes, Methods, Properties. camelCase for variables and DI fields. Interfaces are prefixed with `I` (e.g., `IEntity`).
- **Controller Routing:** Controllers map generic functionality and define specific verb attributes `[HttpGet]`, `[HttpPost]`.
- **Database Context Usage:** Direct DbContext usage is confined within the `Infrastructure` project's repositories. Controllers consume Repositories or Services, not `WoodAppContext`.
- **Response Format:** DTOs (Data Transfer Objects) should be used heavily for payloads entering/leaving the Controllers to avoid circular references (partially handled by `ReferenceHandler.IgnoreCycles` in Program.cs).

## 7. Quick Context Tags
#dotnet #backend #csharp #webapi #efcore #entity-framework #signalr #clean-architecture #repository-pattern #jwt

# ms.webapp.api.acya

Cloud-ready microservice refactored from Wood App.

## Deliverables

- **Refactored Codebase**: Namespace `ms.webapp.api.acya`, optimized and containerized.
- **Docker**: Production-ready multi-stage build.

## NuGet Packages Used

### ms.webapp.api.acya
- Microsoft.AspNetCore.Authentication.JwtBearer
- Microsoft.AspNetCore.OpenApi
- Newtonsoft.Json
- Swashbuckle.AspNetCore

### ms.webapp.api.acya.infrastructure
- EntityFramework
- Microsoft.EntityFrameworkCore
- Npgsql.EntityFrameworkCore.PostgreSQL
- Microsoft.AspNetCore.Http.Abstractions
- Microsoft.AspNetCore.SignalR.Core

### ms.webapp.api.acya.core
- Newtonsoft.Json

## Configuration

Configuration is externalized via `appsettings.json` and Environment Variables.
- **CORS**: `AllowedOrigins` in `appsettings.json`.
- **Database**: `ConnectionStrings:WoodAppContextConnection`.

## Run Locally (DOTNET)

1. Navigate to the project directory:
   ```powershell
   cd wood-app.api\src\ms.webapp.api.acya\ms.webapp.api.acya
   ```
2. Restore dependencies:
   ```powershell
   dotnet restore
   ```
3. Run the application:
   ```powershell
   dotnet run 
   dotnet run --launch-profile https
   ```

## Docker Deployment

Build and run using the following commands from the `src` directory (context root).

1. Navigate to the `src` folder:
   ```powershell
   cd wood-app.api\src
   ```

2. Build the Docker image:
   ```powershell
   docker build -f ms.webapp.api.acya/ms.webapp.api.acya/Dockerfile -t ms.webapp.api.acya:latest .
   ```

3. Run the container:
   ```powershell
   docker run -d -p 8080:80 -p 4430:443 --name ms.webapp.api.acya ms.webapp.api.acya:latest
   ```
   *Note: Ensure environment variables for DB connection are passed if running in production.*

## Compatibility with Angular 18

CORS policies are configured to allow requests from origins definitions in `appsettings.json`.
Default: `https://localhost:4200`
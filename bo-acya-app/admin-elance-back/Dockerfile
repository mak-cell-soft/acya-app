FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# Copy csproj files and restore
COPY src/ms.admin.api.acya/ms.admin.api.acya.csproj src/ms.admin.api.acya/
COPY src/ms.admin.api.acya.core/ms.admin.api.acya.core.csproj src/ms.admin.api.acya.core/
COPY src/ms.admin.api.acya.infrastructure/ms.admin.api.acya.infrastructure.csproj src/ms.admin.api.acya.infrastructure/
COPY src/ms.admin.api.acya.common/ms.admin.api.acya.common.csproj src/ms.admin.api.acya.common/
RUN dotnet restore src/ms.admin.api.acya/ms.admin.api.acya.csproj

# Copy everything else and build
COPY . .
RUN dotnet publish src/ms.admin.api.acya/ms.admin.api.acya.csproj -c Release -o /out

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*
COPY --from=build /out .
COPY db/ /app/db/
EXPOSE 80
ENTRYPOINT ["dotnet", "ms.admin.api.acya.dll"]

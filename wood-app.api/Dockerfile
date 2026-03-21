# Multi-stage Dockerfile for ms.webapp.api.acya
# Optimized for production deployment

# Stage 1: Base runtime image
FROM mcr.microsoft.com/dotnet/aspnet:7.0 AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
EXPOSE 80
EXPOSE 443

# Stage 2: Build image
FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build
WORKDIR /src

# Copy project files for restore (layer caching optimization)
COPY ["src/ms.webapp.api.acya/ms.webapp.api.acya/ms.webapp.api.acya.csproj", "ms.webapp.api.acya/ms.webapp.api.acya/"]
COPY ["src/ms.webapp.api.acya.core/ms.webapp.api.acya.core.csproj", "ms.webapp.api.acya.core/"]
COPY ["src/ms.webapp.api.acya.infrastructure/ms.webapp.api.acya.infrastructure.csproj", "ms.webapp.api.acya.infrastructure/"]
COPY ["src/ms.webapp.api.acya.common/ms.webapp.api.acya.common.csproj", "ms.webapp.api.acya.common/"]

# Restore dependencies
RUN dotnet restore "ms.webapp.api.acya/ms.webapp.api.acya/ms.webapp.api.acya.csproj"

# Copy all source files and db directory
COPY src/ .
COPY db/ ./db/

# Build the application
WORKDIR "/src/ms.webapp.api.acya/ms.webapp.api.acya"
RUN dotnet build "ms.webapp.api.acya.csproj" -c Release -o /app/build

# Stage 3: Publish
FROM build AS publish
RUN dotnet publish "ms.webapp.api.acya.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Stage 4: Final runtime image
FROM base AS final
WORKDIR /app

# Copy published application and database scripts
COPY --from=publish /app/publish .
COPY db/ ./db/

# Set environment variables
ENV ASPNETCORE_URLS=http://+:80
ENV ASPNETCORE_ENVIRONMENT=Production

# Health check (matches ApiHealthController route: api/ApiHealth/HealthCheck)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:80/api/ApiHealth/HealthCheck || exit 1

ENTRYPOINT ["dotnet", "ms.webapp.api.acya.dll"]

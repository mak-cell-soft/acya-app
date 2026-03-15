# Docker Environment Documentation

## Overview

This Docker environment provides a complete containerized setup for the Wood App API, including:
- **PostgreSQL Database** (v15) with automatic schema initialization
- **.NET 7.0 Web API** with multi-stage optimized build
- **pgAdmin** (optional) for database management
- **Health checks** for all services
- **Volume persistence** for data
- **Network isolation** for security

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 2GB+ available RAM
- 5GB+ available disk space

## Quick Start

### 1. Environment Setup

Copy the example environment file and customize it:

```bash
# For development
cp .env.example .env

# Or use the development preset
cp .env.development .env
```

Edit `.env` file with your configuration (database passwords, ports, etc.)

### 2. Start the Environment

```bash
# Start all services (API + Database)
docker-compose up -d

# Start with pgAdmin for database management
docker-compose --profile tools up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f api
docker-compose logs -f postgres
```

### 3. Verify Services

- **API**: http://localhost:8080
- **API Swagger**: http://localhost:8080/swagger
- **API Health**: http://localhost:8080/api/health
- **pgAdmin** (if enabled): http://localhost:5050
- **PostgreSQL**: localhost:5432

### 4. Stop the Environment

```bash
# Stop services (keeps data)
docker-compose stop

# Stop and remove containers (keeps data)
docker-compose down

# Stop and remove everything including volumes (DELETES DATA!)
docker-compose down -v
```

## Service Details

### PostgreSQL Database

- **Image**: postgres:15-alpine
- **Container**: wood-app-postgres
- **Port**: 5432 (configurable via POSTGRES_PORT)
- **Databases**: 
  - wood-app-db (main application database)
  - app-db-bo (secondary database)
- **Data Volume**: wood-app-postgres-data
- **Initialization**: Mounts `db/` so `init-db.sh` runs; it creates `APP_DB` (if set) then runs all SQL scripts from `db/wood/` in version order

### .NET API

- **Image**: Built from Dockerfile (multi-stage)
- **Container**: wood-app-api
- **Ports**: 
  - 8080 (HTTP, configurable via API_HTTP_PORT)
  - 8443 (HTTPS, configurable via API_HTTPS_PORT)
- **Health Check**: http://localhost:8080/api/ApiHealth/HealthCheck
- **Dependencies**: Waits for PostgreSQL to be healthy before starting

### pgAdmin (Optional)

- **Image**: dpage/pgadmin4:latest
- **Container**: wood-app-pgadmin
- **Port**: 5050 (configurable via PGADMIN_PORT)
- **Profile**: tools (must be explicitly enabled)
- **Data Volume**: wood-app-pgadmin-data

## Configuration

### Environment Variables

All configuration is managed through environment variables in the `.env` file:

| Variable | Description | Default |
|----------|-------------|---------|
| `ASPNETCORE_ENVIRONMENT` | Application environment | Production |
| `POSTGRES_USER` | Database username | postgres |
| `POSTGRES_PASSWORD` | Database password | root |
| `POSTGRES_DB` | Main database name | wood-app-db |
| `APP_DB` | Secondary database (AppContext) | app-db-bo |
| `POSTGRES_PORT` | PostgreSQL port | 5432 |
| `API_HTTP_PORT` | API HTTP port | 8080 |
| `API_HTTPS_PORT` | API HTTPS port | 8443 |
| `TOKEN_KEY` | JWT secret key | (see .env.example) |
| `JWT_AUDIENCE` | JWT audience | http://localhost:4200 |
| `JWT_ISSUER` | JWT issuer | http://localhost:8080/api/ |
| `ALLOWED_ORIGINS` | CORS allowed origins | http://localhost:4200;https://localhost:4200 |
| `PGADMIN_EMAIL` | pgAdmin login email | admin@woodapp.com |
| `PGADMIN_PASSWORD` | pgAdmin password | admin |
| `PGADMIN_PORT` | pgAdmin port | 5050 |

### Database Initialization

The PostgreSQL container automatically runs all SQL scripts from the `db/wood/` directory on first startup. Scripts are executed in version order (v0.00, v0.01, etc.).

To reinitialize the database:
```bash
# Remove the database volume
docker-compose down -v

# Start fresh
docker-compose up -d
```

## Common Operations

### Rebuild API After Code Changes

```bash
# Rebuild and restart API
docker-compose up -d --build api

# Or rebuild everything
docker-compose up -d --build
```

### Access Database

```bash
# Using psql in the container
docker-compose exec postgres psql -U postgres -d wood-app-db

# Using pgAdmin (start with --profile tools)
docker-compose --profile tools up -d
# Then open http://localhost:5050
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f postgres

# Last 100 lines
docker-compose logs --tail=100 api
```

### Execute Commands in Containers

```bash
# API container
docker-compose exec api bash

# Database container
docker-compose exec postgres bash

# Run SQL script
docker-compose exec -T postgres psql -U postgres -d wood-app-db < script.sql
```

### Backup Database

```bash
# Create backup
docker-compose exec -T postgres pg_dump -U postgres wood-app-db > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U postgres -d wood-app-db < backup.sql
```

### Monitor Resources

```bash
# View resource usage
docker stats

# View specific containers
docker stats wood-app-api wood-app-postgres
```

## Production Deployment

### Security Considerations

1. **Change default passwords** in `.env` file
2. **Use strong JWT secret key** (TOKEN_KEY)
3. **Disable pgAdmin** in production (remove --profile tools)
4. **Use HTTPS** with proper certificates
5. **Restrict CORS origins** to your frontend domain
6. **Use secrets management** (Docker Secrets, Kubernetes Secrets, etc.)
7. **Enable firewall rules** to restrict database access

### Production Environment File

Create a `.env.production` file:

```bash
ASPNETCORE_ENVIRONMENT=Production
POSTGRES_PASSWORD=<strong-password>
TOKEN_KEY=<strong-secret-key>
JWT_AUDIENCE=https://yourdomain.com
JWT_ISSUER=https://api.yourdomain.com/api/
ALLOWED_ORIGINS=https://yourdomain.com
```

Use it with:
```bash
docker-compose --env-file .env.production up -d
```

### Scaling

```bash
# Scale API instances (requires load balancer)
docker-compose up -d --scale api=3
```

### Health Monitoring

All services include health checks:
```bash
# Check service health
docker-compose ps

# Detailed health status
docker inspect --format='{{.State.Health.Status}}' wood-app-api
```

## Troubleshooting

### API Cannot Connect to Database

1. Check if PostgreSQL is healthy:
   ```bash
   docker-compose ps postgres
   ```

2. Verify connection string in logs:
   ```bash
   docker-compose logs api | grep -i connection
   ```

3. Test database connectivity:
   ```bash
   docker-compose exec api ping postgres
   ```

### Port Already in Use

Change ports in `.env` file:
```bash
API_HTTP_PORT=8081
POSTGRES_PORT=5433
```

### Database Initialization Failed

1. Check initialization logs:
   ```bash
   docker-compose logs postgres
   ```

2. Verify SQL scripts are valid
3. Remove volume and retry:
   ```bash
   docker-compose down -v
   docker-compose up -d
   ```

### Out of Memory

Increase Docker memory limit in Docker Desktop settings or add to docker-compose.yml:
```yaml
services:
  api:
    mem_limit: 1g
  postgres:
    mem_limit: 512m
```

## Development Workflow

### Local Development with Docker

1. Start database only:
   ```bash
   docker-compose up -d postgres
   ```

2. Run API locally:
   ```bash
   cd src/ms.webapp.api.acya/ms.webapp.api.acya
   dotnet run
   ```

### Hot Reload (Development)

Mount source code as volume in docker-compose.override.yml:
```yaml
services:
  api:
    volumes:
      - ./src:/src
    environment:
      - ASPNETCORE_ENVIRONMENT=Development
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [.NET Docker Images](https://hub.docker.com/_/microsoft-dotnet)

## Support

For issues or questions:
1. Check logs: `docker-compose logs -f`
2. Verify configuration in `.env`
3. Review this documentation
4. Check Docker and Docker Compose versions

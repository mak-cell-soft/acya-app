# Rebuild & Deployment Configuration Steps

## 1. UI First

Navigate to project directory:
```bash
cd ~/acya-app
```

Build the new UI image:
```bash
sudo docker-compose build --no-cache migration-ui
```

Remove only the old UI container:
```bash
sudo docker rm -f migration-ui 2>/dev/null || true
```

Create the new UI container:
```bash
sudo docker-compose up -d --no-deps migration-ui
```

Check running UI container:
```bash
sudo docker ps --filter "name=migration-ui"
```

### UI Verification
```bash
# Verify container status
sudo docker ps --filter "name=migration-ui"

# View recent container logs
sudo docker logs --tail 100 migration-ui

# Verify endpoint responds
curl -I http://localhost:5000

# Check UI image
sudo docker images acya-app_migration-ui
```

---

## 2. API Next

Build the new API image:
```bash
sudo docker-compose build --no-cache api
```

Remove only the old API container:
```bash
sudo docker rm -f wood-app-api 2>/dev/null || true
```

Create the new API container:
```bash
sudo docker-compose up -d --no-deps api
```

Verify container status:
```bash
sudo docker ps --filter "name=wood-app-api"
```

### API Verification & Health Check
```bash
# Verify Docker health
sudo docker inspect wood-app-api --format 'Status={{.State.Status}} Health={{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}'

# Check API logs
sudo docker logs --tail 100 wood-app-api

# Test the API port
curl -I http://localhost:8080
```

---

## ⚠️ Commands to Avoid in Production

Do **not** use these for this operation:

```bash
sudo docker-compose down
sudo docker-compose down -v
sudo docker-compose up -d
sudo docker-compose up -d --remove-orphans
```

> [!WARNING]
> **Avoid `--remove-orphans`**: The Compose project currently reports:
> - `postgres-n8n`
> - `n8n`
> 
> as orphan containers. They may be intentional and unrelated to this deployment.

Also, **do not run**:

```bash
sudo docker system prune -a
```

or:

```bash
sudo docker volume prune
```

on production unless you have deliberately reviewed what will be deleted.

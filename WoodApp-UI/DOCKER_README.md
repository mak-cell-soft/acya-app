# WoodApp-UI Docker Deployment Guide

This guide explains how to build and run the WoodApp-UI Angular application using Docker.

## Prerequisites

- Docker installed (version 20.10 or higher)
- Docker Compose installed (version 2.0 or higher)

## Project Structure

```
WoodApp-UI/
├── Dockerfile              # Multi-stage Docker build configuration
├── docker-compose.yml      # Docker Compose orchestration
├── .dockerignore          # Files to exclude from Docker build
└── DOCKER_README.md       # This file
```

## Quick Start

### 1. Build and Run with Docker Compose (Recommended)

```bash
# Build and start the application
docker-compose up -d

# View logs
docker-compose logs -f woodapp-ui

# Stop the application
docker-compose down
```

The application will be available at: **http://localhost:4000**

### 2. Build and Run with Docker Commands

```bash
# Build the Docker image
docker build -t woodapp-ui:latest .

# Run the container
docker run -d \
  --name woodapp-ui \
  -p 4000:4000 \
  -e API_URL=https://your-backend-api:44306/api \
  woodapp-ui:latest

# View logs
docker logs -f woodapp-ui

# Stop and remove the container
docker stop woodapp-ui
docker rm woodapp-ui
```

## Configuration

### Environment Variables

You can configure the application using environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Port the application listens on | `4000` |
| `NODE_ENV` | Node environment | `production` |
| `API_URL` | Backend API URL | Update in docker-compose.yml |

### Update Backend API URL

Edit `docker-compose.yml` and update the `API_URL` environment variable:

```yaml
environment:
  - API_URL=https://your-actual-backend-url:44306/api
```

## Docker Image Details

### Multi-Stage Build

The Dockerfile uses a multi-stage build process:

1. **Build Stage**: 
   - Uses Node.js 20 Alpine
   - Installs dependencies
   - Builds the Angular application with SSR

2. **Production Stage**:
   - Uses Node.js 20 Alpine
   - Copies only the built application
   - Installs production dependencies only
   - Runs the SSR server

### Image Size Optimization

- Uses Alpine Linux for minimal image size
- Multi-stage build to exclude build dependencies
- `.dockerignore` to exclude unnecessary files
- Production-only npm dependencies

## Advanced Usage

### Custom Port Mapping

To run on a different port:

```bash
docker run -d -p 8080:4000 --name woodapp-ui woodapp-ui:latest
```

Access at: http://localhost:8080

### Volume Mounting for Development

For development with hot-reload (not recommended for production):

```bash
docker run -d \
  -p 4000:4000 \
  -v $(pwd)/src:/app/src \
  --name woodapp-ui-dev \
  woodapp-ui:latest
```

### Health Check

The container includes a health check that runs every 30 seconds:

```bash
# Check container health status
docker inspect --format='{{.State.Health.Status}}' woodapp-ui
```

## Troubleshooting

### View Container Logs

```bash
docker-compose logs -f woodapp-ui
# or
docker logs -f woodapp-ui
```

### Access Container Shell

```bash
docker exec -it woodapp-ui sh
```

### Rebuild After Changes

```bash
# Rebuild and restart
docker-compose up -d --build

# Force rebuild without cache
docker-compose build --no-cache
docker-compose up -d
```

### Common Issues

1. **Port already in use**
   ```bash
   # Change port in docker-compose.yml or use different port
   ports:
     - "8080:4000"
   ```

2. **Build fails**
   ```bash
   # Clear Docker cache and rebuild
   docker system prune -a
   docker-compose build --no-cache
   ```

3. **Container exits immediately**
   ```bash
   # Check logs for errors
   docker-compose logs woodapp-ui
   ```

## Production Deployment

### With Nginx Reverse Proxy

Uncomment the nginx service in `docker-compose.yml` and create `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream woodapp {
        server woodapp-ui:4000;
    }

    server {
        listen 80;
        server_name your-domain.com;

        location / {
            proxy_pass http://woodapp;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### SSL/TLS Configuration

For HTTPS support, add SSL certificates and update nginx configuration accordingly.

## Monitoring

### Resource Usage

```bash
# View resource usage
docker stats woodapp-ui

# View all containers
docker-compose ps
```

### Container Information

```bash
# Inspect container
docker inspect woodapp-ui

# View container processes
docker top woodapp-ui
```

## Cleanup

```bash
# Stop and remove containers
docker-compose down

# Remove containers and volumes
docker-compose down -v

# Remove images
docker rmi woodapp-ui:latest

# Clean up all unused Docker resources
docker system prune -a
```

## CI/CD Integration

### Example GitHub Actions Workflow

```yaml
name: Build and Push Docker Image

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: docker build -t woodapp-ui:${{ github.sha }} .
      
      - name: Push to registry
        run: |
          docker tag woodapp-ui:${{ github.sha }} your-registry/woodapp-ui:latest
          docker push your-registry/woodapp-ui:latest
```

## Support

For issues or questions:
- Check the logs: `docker-compose logs -f`
- Verify environment variables are set correctly
- Ensure backend API is accessible from the container
- Check Docker and Docker Compose versions

## License

This Docker configuration is part of the WoodApp-UI project.

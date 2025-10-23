# AuthForge Deployment Guide

This guide covers deploying AuthForge as a containerized application using Docker and Docker Compose.

## Table of Contents

1. [Local Development with Docker](#local-development-with-docker)
2. [Production Container Deployment](#production-container-deployment)
3. [Environment Configuration](#environment-configuration)
4. [Database Management](#database-management)
5. [Health Checks and Monitoring](#health-checks-and-monitoring)
6. [Security Considerations](#security-considerations)
7. [Kubernetes Deployment](#kubernetes-deployment)
8. [Troubleshooting](#troubleshooting)

---

## Local Development with Docker

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 2GB free disk space

### Quick Start

1. **Copy environment file:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your development values
   ```

2. **Generate JWT secret (if needed):**
   ```bash
   openssl rand -base64 32
   ```

3. **Start containers:**
   ```bash
   docker-compose up --build
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - Health check: http://localhost:3000/api/health
   - Readiness check: http://localhost:3000/api/ready

5. **View logs:**
   ```bash
   docker-compose logs -f app
   docker-compose logs -f db
   ```

### Development Commands

```bash
# Start containers in background
docker-compose up -d

# Stop containers
docker-compose down

# Remove all data (including database)
docker-compose down -v

# Rebuild images
docker-compose up -d --build

# Run migrations (if needed)
docker-compose exec app npm run prisma:migrate

# Access database shell
docker-compose exec db psql -U authforge -d authforge

# View real-time logs
docker-compose logs -f

# Restart a service
docker-compose restart app
docker-compose restart db
```

---

## Production Container Deployment

### Container Image Building

The application uses a **multi-stage build** for production:

**Stage 1: Builder**
- Node 20 Alpine
- Installs all dependencies
- Builds Next.js application
- Generates Prisma client
- Prunes development dependencies

**Stage 2: Runtime**
- Minimal Alpine Linux base (~150MB)
- Non-root user for security
- Built application only
- dumb-init for proper signal handling
- Health check configured

### Building the Image

```bash
# Build image
docker build -t authforge:latest app/

# Build with custom tag
docker build -t myregistry.com/authforge:v1.0.0 app/

# Build with build args
docker build \
  --build-arg NODE_ENV=production \
  -t authforge:latest app/
```

### Image Size

- Final image: ~300-350MB (including Node.js runtime)
- Multi-stage optimization reduces from ~1.2GB to ~350MB
- Alpine base reduces OS footprint by 75%

### Running in Production

```bash
# Run with environment variables
docker run -d \
  --name authforge \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL="postgresql://user:pass@db:5432/authforge" \
  -e JWT_SECRET="$(openssl rand -base64 32)" \
  -e MAILGUN_API_KEY="your-key" \
  -e MAILGUN_DOMAIN="your-domain" \
  -e FROM_EMAIL="noreply@example.com" \
  -e HOST_URL="https://api.example.com" \
  --restart unless-stopped \
  authforge:latest

# Check health
curl http://localhost:3000/api/health
```

---

## Environment Configuration

### Required Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `NODE_ENV` | Deployment environment | `production` |
| `PORT` | Application port | `3000` |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@host/db` |
| `JWT_SECRET` | Token signing key | Generated: `openssl rand -base64 32` |
| `HOST_URL` | Application URL | `https://api.example.com` |
| `MAILGUN_API_KEY` | Email service API key | From Mailgun console |
| `MAILGUN_DOMAIN` | Email domain | `mg.example.com` |
| `FROM_EMAIL` | Sender email | `noreply@example.com` |

### Optional Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) | `*` (dev only) |
| `LOG_LEVEL` | Logging verbosity | `info` |
| `NODE_OPTIONS` | Node.js flags | `--max-old-space-size=512` |

### Secrets Management

**Never commit `.env` to version control!**

**Development:**
- Use `.env.local` (in .gitignore)
- Safe to commit `.env.example` (no secrets)

**Production:**
- Docker Secrets (Docker Swarm)
  ```yaml
  secrets:
    db_password:
      external: true
  services:
    app:
      secrets:
        - db_password
  ```
- Kubernetes Secrets
  ```yaml
  apiVersion: v1
  kind: Secret
  metadata:
    name: authforge-secrets
  data:
    jwt-secret: <base64-encoded>
    mailgun-key: <base64-encoded>
  ```
- HashiCorp Vault
- AWS Secrets Manager
- Terraform variables

---

## Database Management

### PostgreSQL Service

The `docker-compose.yml` includes PostgreSQL 16 Alpine:

```yaml
db:
  image: postgres:16-alpine
  environment:
    POSTGRES_USER: authforge
    POSTGRES_PASSWORD: ${DB_PASSWORD}
    POSTGRES_DB: authforge
  volumes:
    - postgres_data:/var/lib/postgresql/data
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U authforge"]
    interval: 10s
    timeout: 5s
    retries: 5
```

### Database Initialization

```bash
# Migrations run automatically on container startup
# Via postinstall hook in package.json

# Manual migration (if needed)
docker-compose exec app npm run prisma:migrate

# Seed database (development)
docker-compose exec app npm run prisma:seed
```

### Database Connection

```bash
# Connect via psql
docker-compose exec db psql -U authforge -d authforge

# View tables
\dt

# View users
SELECT * FROM "User";

# Exit
\q
```

### Backup and Restore

```bash
# Backup database
docker-compose exec db pg_dump -U authforge authforge > backup.sql

# Restore from backup
docker-compose exec -T db psql -U authforge authforge < backup.sql

# Backup to volume
docker run --rm -v authforge_postgres_data:/data alpine tar czf /backup.tar.gz -C /data .
```

### Connection Pooling

For production with multiple app instances, use PgBouncer:

```yaml
pgbouncer:
  image: pgbouncer:latest
  environment:
    DATABASES_HOST: db
    DATABASES_USER: authforge
    DATABASES_PASSWORD: ${DB_PASSWORD}
    DATABASES_DBNAME: authforge
    PGBOUNCER_POOL_MODE: transaction
    PGBOUNCER_MAX_CLIENT_CONN: 1000
    PGBOUNCER_DEFAULT_POOL_SIZE: 25
  depends_on:
    - db
```

---

## Health Checks and Monitoring

### Health Check Endpoints

**Liveness Probe** (`/api/health`)
- Indicates if the process is still running
- Returns `200 OK` if healthy
- Returns `503 Service Unavailable` if unhealthy
- Checks: database connectivity, memory usage

```bash
curl http://localhost:3000/api/health
# {
#   "status": "healthy",
#   "timestamp": "2024-01-15T10:30:00.000Z",
#   "uptime": 3600.5,
#   "memory": { "used": 50000000, "total": 1000000000 }
# }
```

**Readiness Probe** (`/api/ready`)
- Indicates if the app is ready to serve traffic
- Returns `200 OK` when ready
- Returns `503 Service Unavailable` if not ready
- Checks: database connectivity, environment variables, Prisma initialization

```bash
curl http://localhost:3000/api/ready
# {
#   "status": "ready",
#   "timestamp": "2024-01-15T10:30:00.000Z",
#   "checks": {
#     "database": "ok",
#     "environment": "ok",
#     "version": "0.1.0"
#   }
# }
```

### Docker Healthcheck

The Dockerfile includes a built-in healthcheck:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', ...)"
```

View health status:
```bash
docker ps
# Shows HEALTHY or UNHEALTHY status
```

### Kubernetes Health Checks

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: authforge
spec:
  template:
    spec:
      containers:
      - name: app
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 40
          periodSeconds: 30
          timeoutSeconds: 3
          failureThreshold: 3

        readinessProbe:
          httpGet:
            path: /api/ready
            port: 3000
          initialDelaySeconds: 40
          periodSeconds: 10
          timeoutSeconds: 3
          failureThreshold: 3
```

### Monitoring

Key metrics to monitor:

1. **Application Metrics**
   - Response time (p50, p95, p99)
   - Error rate (4xx, 5xx)
   - Request throughput (requests/sec)

2. **Resource Metrics**
   - CPU usage
   - Memory usage (heap size)
   - Disk I/O

3. **Database Metrics**
   - Connection pool utilization
   - Query performance
   - Replication lag (if applicable)

4. **Business Metrics**
   - Authentication success rate
   - Email delivery success rate
   - API token usage

**Recommended Tools:**
- Prometheus + Grafana (open-source)
- Datadog (commercial)
- New Relic (commercial)
- CloudWatch (AWS)

---

## Security Considerations

### 1. Secrets Management

```bash
# ✗ INSECURE: Secrets in environment variables
docker run -e JWT_SECRET="mysecret" authforge

# ✓ SECURE: Use Docker Secrets (Swarm)
docker secret create jwt_secret <(echo "mysecret")

# ✓ SECURE: Use Docker Compose secrets
secrets:
  jwt_secret:
    file: ./secrets/jwt_secret.txt

# ✓ SECURE: Use Kubernetes Secrets
kubectl create secret generic authforge-secrets \
  --from-literal=jwt-secret="mysecret"
```

### 2. Network Security

```yaml
# Use bridge network (default)
networks:
  authforge_network:
    driver: bridge

# Services only accessible via network
services:
  app:
    networks:
      - authforge_network
  db:
    networks:
      - authforge_network
    # No ports exposed to host
```

### 3. User Permissions

The container runs as non-root user (UID 1001):

```dockerfile
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001
USER appuser
```

### 4. Resource Limits

```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 1G
    reservations:
      cpus: '1'
      memory: 512M
```

### 5. Image Security

```bash
# Scan image for vulnerabilities
docker scan authforge:latest

# Use minimal Alpine base (fewer CVEs)
FROM node:20-alpine

# Keep image updated
docker pull node:20-alpine
docker build --no-cache -t authforge:latest app/
```

### 6. HTTPS/TLS

```yaml
# Use reverse proxy (nginx, traefik)
services:
  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./certs:/etc/nginx/certs:ro
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - app
```

---

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (1.24+)
- kubectl configured
- Container registry (Docker Hub, ECR, GCR, etc.)

### Deployment Manifest

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: authforge

---

apiVersion: v1
kind: Secret
metadata:
  name: authforge-secrets
  namespace: authforge
type: Opaque
stringData:
  jwt-secret: "your-jwt-secret"
  db-password: "your-db-password"
  mailgun-api-key: "your-mailgun-key"

---

apiVersion: v1
kind: ConfigMap
metadata:
  name: authforge-config
  namespace: authforge
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  MAILGUN_DOMAIN: "mg.example.com"
  FROM_EMAIL: "noreply@example.com"
  HOST_URL: "https://api.example.com"

---

apiVersion: apps/v1
kind: Deployment
metadata:
  name: authforge
  namespace: authforge
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: authforge
  template:
    metadata:
      labels:
        app: authforge
    spec:
      containers:
      - name: app
        image: myregistry.com/authforge:v1.0.0
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 3000
          name: http

        envFrom:
        - configMapRef:
            name: authforge-config

        env:
        - name: DATABASE_URL
          value: "postgresql://authforge:$(DB_PASSWORD)@postgres:5432/authforge"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: authforge-secrets
              key: jwt-secret
        - name: MAILGUN_API_KEY
          valueFrom:
            secretKeyRef:
              name: authforge-secrets
              key: mailgun-api-key

        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 2000m
            memory: 1Gi

        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 40
          periodSeconds: 30
          timeoutSeconds: 3
          failureThreshold: 3

        readinessProbe:
          httpGet:
            path: /api/ready
            port: 3000
          initialDelaySeconds: 40
          periodSeconds: 10
          timeoutSeconds: 3
          failureThreshold: 3

---

apiVersion: v1
kind: Service
metadata:
  name: authforge
  namespace: authforge
spec:
  type: LoadBalancer
  selector:
    app: authforge
  ports:
  - protocol: TCP
    port: 443
    targetPort: 3000
    name: https
  - protocol: TCP
    port: 80
    targetPort: 3000
    name: http
```

### Deploy to Kubernetes

```bash
# Create namespace and deploy
kubectl apply -f deployment.yaml

# Check status
kubectl get pods -n authforge
kubectl get svc -n authforge

# View logs
kubectl logs -n authforge deployment/authforge -f

# Scale
kubectl scale deployment authforge -n authforge --replicas=5

# Update image
kubectl set image deployment/authforge \
  app=myregistry.com/authforge:v1.1.0 \
  -n authforge

# Rollback if needed
kubectl rollout undo deployment/authforge -n authforge
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs authforge

# Check environment variables
docker inspect authforge | grep -A 20 "Env"

# Run interactive shell
docker run -it --rm authforge /bin/sh

# Check disk space
docker system df
```

### Database Connection Issues

```bash
# Test database connection
docker-compose exec app node -e \
  "require('@prisma/client').PrismaClient().\$queryRaw\`SELECT 1\`"

# Check PostgreSQL logs
docker-compose logs db

# Verify network connectivity
docker-compose exec app ping db
```

### Health Check Failures

```bash
# Test health endpoint
curl -v http://localhost:3000/api/health

# Check health status
docker ps | grep authforge

# View health check command
docker inspect authforge | grep -A 5 "HealthCheck"

# Check container logs for errors
docker logs authforge
```

### Memory Issues

```bash
# Check memory usage
docker stats authforge

# Increase memory limit in docker-compose.yml
deploy:
  resources:
    limits:
      memory: 2G

# Monitor Node.js heap
docker exec authforge node -e "console.log(process.memoryUsage())"
```

### Performance Issues

1. **Check database query performance**
   ```bash
   docker-compose exec db psql -U authforge -c "SELECT * FROM pg_stat_statements"
   ```

2. **Enable query logging**
   ```yaml
   environment:
     POSTGRES_INITDB_ARGS: "-c log_statement=all"
   ```

3. **Check connection pool utilization**
   ```bash
   curl http://localhost:3000/api/health | jq '.memory'
   ```

---

## Additional Resources

- **Docker Documentation:** https://docs.docker.com/
- **Docker Compose:** https://docs.docker.com/compose/
- **Kubernetes Docs:** https://kubernetes.io/docs/
- **Next.js Deployment:** https://nextjs.org/docs/deployment
- **Prisma Deployment:** https://www.prisma.io/docs/guides/deployment

---

**Last Updated:** January 2024
**AuthForge Version:** 0.1.0

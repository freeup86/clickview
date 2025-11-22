# ClickView Enterprise - Deployment Guide

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Deployment Options](#deployment-options)
4. [Docker Compose Deployment](#docker-compose-deployment)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [Manual Deployment](#manual-deployment)
7. [Environment Configuration](#environment-configuration)
8. [Database Setup](#database-setup)
9. [SSL/TLS Configuration](#ssltls-configuration)
10. [Monitoring and Logging](#monitoring-and-logging)
11. [Backup and Recovery](#backup-and-recovery)
12. [Troubleshooting](#troubleshooting)

## Overview

ClickView Enterprise is a comprehensive business intelligence platform built with:

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL 15 + TimescaleDB (for time-series data)
- **Cache**: Redis 7
- **Real-time**: WebSocket (Socket.io) + GraphQL Subscriptions
- **API**: REST + GraphQL + WebSocket

## Prerequisites

### Minimum Requirements

- **CPU**: 4 cores
- **RAM**: 8GB (16GB recommended for production)
- **Disk**: 50GB SSD (100GB+ recommended for production)
- **OS**: Linux (Ubuntu 22.04+, CentOS 8+, RHEL 8+) or macOS

### Software Requirements

- **Docker**: 24.0+ and Docker Compose 2.0+
- **Node.js**: 18.x LTS (for manual deployment)
- **PostgreSQL**: 15+ with TimescaleDB extension
- **Redis**: 7+
- **Nginx**: 1.24+ (for reverse proxy)
- **SSL Certificates**: Let's Encrypt or commercial CA

### Network Requirements

- **Inbound Ports**:
  - 80 (HTTP) - Redirects to HTTPS
  - 443 (HTTPS) - Main application
  - 3000 (optional) - Frontend dev server
  - 3001 (optional) - Backend API server

- **Outbound Ports**:
  - 443 (HTTPS) - External APIs (ClickUp, OpenAI, etc.)
  - 587 (SMTP) - Email delivery
  - 53 (DNS) - Name resolution

## Deployment Options

### 1. Docker Compose (Recommended for Single Server)

**Pros**:
- Simple setup and configuration
- All services containerized
- Easy to manage and update
- Suitable for small to medium deployments

**Cons**:
- Single server limitation
- No automatic scaling
- Limited high availability

**Best for**: Development, staging, small production deployments (< 1000 users)

### 2. Kubernetes (Recommended for Production)

**Pros**:
- High availability and scalability
- Auto-scaling capabilities
- Rolling updates with zero downtime
- Built-in service discovery and load balancing
- Self-healing capabilities

**Cons**:
- More complex setup
- Requires Kubernetes knowledge
- Higher resource overhead

**Best for**: Production deployments, enterprise environments, multi-region deployments

### 3. Manual Deployment

**Pros**:
- Full control over configuration
- Can optimize for specific hardware
- No containerization overhead

**Cons**:
- Time-consuming setup
- Manual dependency management
- Harder to replicate across environments

**Best for**: Custom environments, specific compliance requirements

## Docker Compose Deployment

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-org/clickview.git
cd clickview

# 2. Copy and configure environment variables
cp .env.example .env
nano .env  # Edit with your configuration

# 3. Generate secure keys
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copy output to JWT_SECRET, ENCRYPTION_KEY, SESSION_SECRET in .env

# 4. Start all services
docker-compose up -d

# 5. Check service status
docker-compose ps

# 6. View logs
docker-compose logs -f

# 7. Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001/api
# GraphQL Playground: http://localhost:3001/playground
# API Docs: http://localhost:3001/api-docs
```

### Production Docker Compose Deployment

```bash
# 1. Use production compose file
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 2. Run database migrations
docker-compose exec backend npm run migrate

# 3. Create initial admin user
docker-compose exec backend npm run seed:admin

# 4. Verify services are healthy
docker-compose ps
curl http://localhost:3001/health
curl http://localhost:3000/health

# 5. Setup automatic backups (see Backup section)
```

### Service Configuration

#### PostgreSQL + TimescaleDB

```yaml
# In docker-compose.yml
postgres:
  volumes:
    - postgres_data:/var/lib/postgresql/data
  environment:
    POSTGRES_PASSWORD: "CHANGE_THIS_IN_PRODUCTION"
```

#### Redis

```yaml
redis:
  volumes:
    - redis_data:/data
  command: redis-server --appendonly yes
```

### Updating the Application

```bash
# 1. Pull latest changes
git pull origin main

# 2. Rebuild containers
docker-compose build

# 3. Update services with zero downtime
docker-compose up -d --no-deps --build backend
docker-compose up -d --no-deps --build frontend

# 4. Run migrations
docker-compose exec backend npm run migrate

# 5. Verify
docker-compose ps
```

## Kubernetes Deployment

See [KUBERNETES.md](./KUBERNETES.md) for detailed Kubernetes deployment instructions.

### Quick Start with Helm

```bash
# 1. Add Helm repository
helm repo add clickview https://charts.clickview.io
helm repo update

# 2. Create namespace
kubectl create namespace clickview

# 3. Install with Helm
helm install clickview clickview/clickview \
  --namespace clickview \
  --set postgresql.auth.password=YOUR_PASSWORD \
  --set ingress.enabled=true \
  --set ingress.hosts[0].host=clickview.yourdomain.com

# 4. Check deployment status
kubectl get pods -n clickview
kubectl get services -n clickview

# 5. Access the application
kubectl port-forward -n clickview svc/clickview-frontend 3000:80
```

## Manual Deployment

### Backend Setup

```bash
# 1. Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Install PostgreSQL 15 + TimescaleDB
sudo sh -c "echo 'deb https://packagecloud.io/timescale/timescaledb/ubuntu/ $(lsb_release -c -s) main' > /etc/apt/sources.list.d/timescaledb.list"
wget --quiet -O - https://packagecloud.io/timescale/timescaledb/gpgkey | sudo apt-key add -
sudo apt-get update
sudo apt-get install -y postgresql-15 timescaledb-2-postgresql-15

# 3. Install Redis
sudo apt-get install -y redis-server

# 4. Clone and setup backend
cd /opt
git clone https://github.com/your-org/clickview.git
cd clickview/backend
npm ci --production
npm run build

# 5. Configure environment
cp .env.example .env
nano .env

# 6. Setup systemd service
sudo cp deployment/clickview-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable clickview-backend
sudo systemctl start clickview-backend
```

### Frontend Setup

```bash
# 1. Build frontend
cd /opt/clickview/frontend
npm ci
npm run build

# 2. Install Nginx
sudo apt-get install -y nginx

# 3. Configure Nginx
sudo cp nginx.conf /etc/nginx/sites-available/clickview
sudo ln -s /etc/nginx/sites-available/clickview /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 4. Setup SSL with Let's Encrypt
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d clickview.yourdomain.com
```

## Environment Configuration

### Critical Environment Variables

```bash
# Security (MUST CHANGE IN PRODUCTION)
JWT_SECRET=<128-char-hex>
ENCRYPTION_KEY=<64-char-hex>
SESSION_SECRET=<128-char-hex>

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/clickview
DB_SSL=true  # Enable in production

# Redis
REDIS_URL=redis://localhost:6379

# Frontend
FRONTEND_URL=https://clickview.yourdomain.com
VITE_API_URL=https://clickview.yourdomain.com/api

# Email (Required for password reset, notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### Feature Configuration

```bash
# Enable/disable features
FEATURE_SSO=true
FEATURE_MFA=true
FEATURE_AUDIT_LOGS=true
FEATURE_AI_INSIGHTS=true
FEATURE_ANOMALY_DETECTION=true
FEATURE_REPORT_BUILDER=true
```

### Performance Tuning

```bash
# Database connection pool
DB_POOL_MIN=5
DB_POOL_MAX=20

# Rate limiting
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_WINDOW_MS=60000

# Cache TTL
REDIS_TTL=3600  # 1 hour
```

## Database Setup

### Initial Setup

```bash
# 1. Create database and user
sudo -u postgres psql
CREATE DATABASE clickview;
CREATE USER clickview_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE clickview TO clickview_user;

# Enable TimescaleDB extension
\c clickview
CREATE EXTENSION IF NOT EXISTS timescaledb;

# 2. Run migrations
cd /opt/clickview/backend
npm run migrate

# 3. Seed initial data
npm run seed
```

### Database Migrations

```bash
# Check migration status
npm run migrate:status

# Run pending migrations
npm run migrate

# Rollback last migration
npm run migrate:down

# Create new migration
npm run migrate:create -- add_new_feature
```

### Performance Optimization

```sql
-- Enable query plan cache
ALTER SYSTEM SET shared_preload_libraries = 'timescaledb,pg_stat_statements';

-- Optimize for SSD
ALTER SYSTEM SET random_page_cost = 1.1;

-- Increase shared buffers (25% of RAM)
ALTER SYSTEM SET shared_buffers = '4GB';

-- Increase work memory
ALTER SYSTEM SET work_mem = '50MB';

-- Enable parallel queries
ALTER SYSTEM SET max_parallel_workers_per_gather = 4;

-- Restart PostgreSQL
sudo systemctl restart postgresql
```

## SSL/TLS Configuration

### Let's Encrypt (Free SSL)

```bash
# 1. Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# 2. Obtain certificate
sudo certbot --nginx -d clickview.yourdomain.com -d www.clickview.yourdomain.com

# 3. Auto-renewal is configured automatically
# Test renewal:
sudo certbot renew --dry-run
```

### Custom SSL Certificate

```nginx
# /etc/nginx/sites-available/clickview
server {
    listen 443 ssl http2;
    server_name clickview.yourdomain.com;

    ssl_certificate /etc/ssl/certs/clickview.crt;
    ssl_certificate_key /etc/ssl/private/clickview.key;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3001;
        # ... same proxy settings
    }
}
```

## Monitoring and Logging

### Application Logs

```bash
# Docker Compose
docker-compose logs -f backend
docker-compose logs -f frontend

# Systemd
sudo journalctl -u clickview-backend -f

# Log files
tail -f /opt/clickview/logs/app.log
tail -f /opt/clickview/logs/error.log
```

### Health Checks

```bash
# Backend health
curl http://localhost:3001/health

# Frontend health
curl http://localhost:3000/health

# Database health
docker-compose exec postgres pg_isready

# Redis health
docker-compose exec redis redis-cli ping
```

### Prometheus + Grafana

```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3002:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
```

## Backup and Recovery

### Automated Database Backups

```bash
# 1. Create backup script
cat > /opt/clickview/scripts/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/clickview/backups"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="clickview_backup_${DATE}.sql.gz"

# Create backup
docker-compose exec -T postgres pg_dump -U clickview_user clickview | gzip > "${BACKUP_DIR}/${FILENAME}"

# Keep only last 30 days
find "${BACKUP_DIR}" -name "clickview_backup_*.sql.gz" -mtime +30 -delete

# Upload to S3 (optional)
# aws s3 cp "${BACKUP_DIR}/${FILENAME}" s3://your-backup-bucket/
EOF

chmod +x /opt/clickview/scripts/backup.sh

# 2. Schedule with cron
crontab -e
0 2 * * * /opt/clickview/scripts/backup.sh
```

### Restore from Backup

```bash
# 1. Stop the application
docker-compose stop backend

# 2. Restore database
gunzip -c /opt/clickview/backups/clickview_backup_20240101_020000.sql.gz | \
  docker-compose exec -T postgres psql -U clickview_user clickview

# 3. Restart application
docker-compose start backend
```

### Redis Backup

```bash
# Manual save
docker-compose exec redis redis-cli BGSAVE

# Automatic snapshots (in redis.conf)
save 900 1      # After 900 sec if at least 1 key changed
save 300 10     # After 300 sec if at least 10 keys changed
save 60 10000   # After 60 sec if at least 10000 keys changed
```

## Troubleshooting

### Application Won't Start

```bash
# Check logs
docker-compose logs backend
docker-compose logs postgres

# Common issues:
# 1. Database connection failed
#    - Check DATABASE_URL in .env
#    - Verify postgres is running: docker-compose ps

# 2. Port already in use
#    - Change ports in docker-compose.yml
#    - Or stop conflicting services

# 3. Permission denied
#    - Check file permissions: ls -la
#    - Fix ownership: sudo chown -R $USER:$USER /opt/clickview
```

### Database Connection Issues

```bash
# Test database connection
docker-compose exec postgres psql -U clickview_user -d clickview -c "SELECT 1"

# Check PostgreSQL logs
docker-compose logs postgres

# Verify network connectivity
docker-compose exec backend ping postgres
```

### High Memory Usage

```bash
# Check memory usage
docker stats

# Restart services to clear memory
docker-compose restart

# Optimize PostgreSQL memory settings
# Edit postgresql.conf and reduce shared_buffers, work_mem
```

### Slow Performance

```bash
# 1. Check database query performance
docker-compose exec postgres psql -U clickview_user -d clickview
SELECT * FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;

# 2. Check Redis hit rate
docker-compose exec redis redis-cli INFO stats | grep keyspace

# 3. Enable query logging (temporarily)
# In .env: LOG_SQL_QUERIES=true

# 4. Check resource usage
docker stats
htop
```

### SSL Certificate Issues

```bash
# Test SSL configuration
openssl s_client -connect clickview.yourdomain.com:443

# Check certificate expiration
echo | openssl s_client -connect clickview.yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates

# Renew Let's Encrypt certificate
sudo certbot renew
```

## Security Checklist

- [ ] All default passwords changed
- [ ] Strong random keys generated for JWT_SECRET, ENCRYPTION_KEY, SESSION_SECRET
- [ ] HTTPS enabled with valid SSL certificate
- [ ] Database connections use SSL (DB_SSL=true)
- [ ] CORS properly configured (only allowed origins)
- [ ] Rate limiting enabled
- [ ] Firewall configured (only necessary ports open)
- [ ] MFA enabled for admin accounts
- [ ] Audit logging enabled
- [ ] Database backups configured and tested
- [ ] Monitoring and alerting set up
- [ ] Security headers configured in Nginx
- [ ] GraphQL playground disabled in production
- [ ] Introspection disabled in production
- [ ] Error messages don't expose sensitive information

## Production Deployment Checklist

See [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) for comprehensive production readiness checklist.

## Support

- **Documentation**: https://docs.clickview.io
- **Community**: https://community.clickview.io
- **Issues**: https://github.com/your-org/clickview/issues
- **Email**: support@clickview.io

## License

Copyright © 2024 ClickView Enterprise. All rights reserved.

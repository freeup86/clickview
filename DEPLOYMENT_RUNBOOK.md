# ClickView Deployment Runbook

**Version**: 1.0
**Last Updated**: 2025-11-23
**Owner**: DevOps Team

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Deployment Procedures](#deployment-procedures)
4. [Post-Deployment Verification](#post-deployment-verification)
5. [Rollback Procedures](#rollback-procedures)
6. [Monitoring and Alerts](#monitoring-and-alerts)
7. [Troubleshooting](#troubleshooting)
8. [Emergency Contacts](#emergency-contacts)

---

## Overview

### System Architecture

ClickView is deployed using Docker Compose with the following services:

- **Backend API**: Node.js/Express application (Port 3001)
- **Frontend**: React/Vite application served via Nginx (Port 80/443)
- **PostgreSQL**: TimescaleDB (Port 5432)
- **Redis**: Cache and session store (Port 6379)
- **Nginx**: Reverse proxy and SSL termination
- **Monitoring**: Prometheus, Grafana, StatsD

### Deployment Strategy

- **Zero-downtime deployments** using rolling updates
- **Blue-green deployment** for major releases
- **Canary deployments** for high-risk changes
- **Automated rollback** on health check failures

---

## Pre-Deployment Checklist

### 1 Week Before Deployment

- [ ] Schedule deployment window
- [ ] Notify stakeholders via email/Slack
- [ ] Create deployment ticket in JIRA
- [ ] Review and merge all approved PRs
- [ ] Tag release in GitHub
- [ ] Update CHANGELOG.md
- [ ] Prepare rollback plan

### 1 Day Before Deployment

- [ ] Run full test suite locally
- [ ] Verify CI/CD pipeline passes
- [ ] Review database migrations
- [ ] Test migrations on staging database
- [ ] Backup production database
- [ ] Review monitoring dashboards
- [ ] Verify SSL certificates are valid
- [ ] Check disk space on servers (>20% free)
- [ ] Check resource usage (CPU, Memory < 70%)

### 1 Hour Before Deployment

- [ ] Verify all team members are available
- [ ] Run final backup
- [ ] Check current error rates in monitoring
- [ ] Verify external dependencies are healthy
- [ ] Put deployment banner on admin UI
- [ ] Enable read-only mode if necessary

---

## Deployment Procedures

### Standard Deployment (Staging)

#### Step 1: Prepare Environment

```bash
cd /opt/clickview
git fetch origin
git checkout main
git pull origin main
```

#### Step 2: Run Deployment Script

```bash
./scripts/deploy.sh staging
```

The script will:
1. Check prerequisites
2. Build backend and frontend
3. Run tests
4. Run database migrations
5. Deploy with Docker Compose
6. Run health checks
7. Send notifications

#### Step 3: Monitor Deployment

```bash
# Watch logs
docker-compose -f docker-compose.yml -f docker-compose.staging.yml logs -f

# Check container status
docker-compose ps

# Check health
curl http://staging.clickview.com/health
```

### Production Deployment

#### Step 1: Deploy to Staging First

Always deploy to staging and verify before production.

```bash
./scripts/deploy.sh staging
```

#### Step 2: Verify Staging

- [ ] Run smoke tests
- [ ] Verify all features work
- [ ] Check error logs
- [ ] Monitor for 1 hour

#### Step 3: Production Deployment

```bash
# Production deployment requires confirmation
./scripts/deploy.sh production
```

**Enter "yes" when prompted to confirm production deployment.**

#### Step 4: Monitor Production

Watch key metrics for 30 minutes:

- Response times
- Error rates
- Database connections
- Memory/CPU usage
- Active user sessions

### Blue-Green Deployment

For major version upgrades:

#### Step 1: Prepare Green Environment

```bash
# Clone production environment
docker-compose -f docker-compose.yml -f docker-compose.blue-green.yml up -d green-backend green-frontend
```

#### Step 2: Deploy to Green

```bash
# Deploy new version to green
docker-compose exec green-backend npm run migrate:up
```

#### Step 3: Smoke Test Green

```bash
curl http://green.clickview.internal/health
```

#### Step 4: Switch Traffic

```bash
# Update Nginx configuration to route to green
./scripts/switch-to-green.sh

# Reload Nginx
docker-compose exec nginx nginx -s reload
```

#### Step 5: Monitor and Cleanup

After 1 hour of stable green environment:

```bash
# Remove blue environment
docker-compose -f docker-compose.blue-green.yml stop blue-backend blue-frontend
docker-compose -f docker-compose.blue-green.yml rm -f blue-backend blue-frontend
```

---

## Post-Deployment Verification

### Automated Checks

The deployment script runs these automatically:

- [x] Health endpoint returns 200
- [x] Readiness endpoint returns ready
- [x] Liveness endpoint returns alive
- [x] Database connectivity
- [x] Redis connectivity
- [x] API response time < 200ms

### Manual Verification

#### 1. Functional Tests

- [ ] Login with test account
- [ ] Create a dashboard
- [ ] Create a report
- [ ] Export a report (PDF)
- [ ] Share a dashboard
- [ ] Test drill-down navigation
- [ ] Verify real-time updates

#### 2. Integration Tests

- [ ] GraphQL API responds correctly
- [ ] WebSocket connections establish
- [ ] Authentication flows work
- [ ] MFA enrollment works
- [ ] Email notifications send

#### 3. Performance Tests

- [ ] Dashboard load time < 2s
- [ ] API response time < 200ms
- [ ] Database query time < 100ms
- [ ] No memory leaks detected

#### 4. Security Tests

- [ ] HTTPS redirects work
- [ ] CSRF protection active
- [ ] Security headers present
- [ ] No exposed secrets in logs
- [ ] Rate limiting works

### Monitoring Dashboards

Check these dashboards:

1. **Application Dashboard** (Grafana)
   - URL: https://grafana.clickview.com/d/app
   - Key metrics: Response time, error rate, throughput

2. **Database Dashboard** (Grafana)
   - URL: https://grafana.clickview.com/d/db
   - Key metrics: Connections, query time, cache hit rate

3. **Infrastructure Dashboard** (Grafana)
   - URL: https://grafana.clickview.com/d/infra
   - Key metrics: CPU, memory, disk, network

4. **Error Tracking** (Sentry)
   - URL: https://sentry.io/clickview
   - Check for new errors or spikes

---

## Rollback Procedures

### Automatic Rollback

The deployment script automatically rolls back if health checks fail.

### Manual Rollback

If issues are discovered after deployment:

#### Step 1: Identify Last Good Version

```bash
# List recent releases
git tag -l | tail -5

# Example output:
# v1.2.1
# v1.2.2
# v1.2.3  <-- Current (broken)
```

#### Step 2: Execute Rollback

```bash
# Rollback to previous version
./scripts/deploy.sh production --rollback --version 1.2.2
```

#### Step 3: Verify Rollback

```bash
# Check version
curl https://api.clickview.com/version

# Check health
curl https://api.clickview.com/health
```

#### Step 4: Database Rollback (if needed)

```bash
# Restore from backup
./scripts/backup.sh restore-db /var/backups/clickview/database/db_20251123_140000.dump

# Or rollback migrations
cd backend
npm run migrate:down -- --to 20251120_120000
```

### Emergency Rollback

If the system is completely down:

```bash
# Stop all containers
docker-compose down

# Checkout previous version
git checkout v1.2.2

# Restore database from backup
./scripts/backup.sh restore-db /var/backups/clickview/database/db_20251123_140000.dump

# Start containers
docker-compose up -d

# Verify health
curl http://localhost:3001/health
```

---

## Monitoring and Alerts

### Critical Alerts

These require immediate response:

| Alert | Threshold | Action |
|-------|-----------|--------|
| Service Down | Any service unhealthy > 1 min | Investigate logs, restart if needed |
| Database Unavailable | Connection fails > 30s | Check PostgreSQL, restart if needed |
| High Error Rate | >5% errors for 5 min | Check Sentry, rollback if widespread |
| High Memory Usage | >90% for 10 min | Identify memory leak, restart containers |
| Disk Space Low | <10% free | Clean up logs, expand disk |
| SSL Certificate Expiring | <7 days | Renew certificate |

### Warning Alerts

These require investigation:

| Alert | Threshold | Action |
|-------|-----------|--------|
| Slow Response Time | >1s avg for 5 min | Check database queries, optimize |
| High CPU Usage | >80% for 10 min | Identify bottleneck, scale up |
| Failed Login Attempts | >10/min | Check for brute force attack |
| Cache Miss Rate High | >50% for 5 min | Review caching strategy |

### Alert Channels

- **Critical**: PagerDuty + Slack #alerts + Email
- **Warning**: Slack #warnings + Email
- **Info**: Slack #deployments

### On-Call Rotation

| Day | Primary | Secondary |
|-----|---------|-----------|
| Mon-Tue | DevOps Team | Backend Team |
| Wed-Thu | Backend Team | Frontend Team |
| Fri-Sun | DevOps Team | Backend Team |

---

## Troubleshooting

### Common Issues

#### Issue: Containers Won't Start

**Symptoms**: `docker-compose up` fails

**Diagnosis**:
```bash
# Check logs
docker-compose logs

# Check system resources
docker system df
```

**Resolution**:
```bash
# Clean up old containers/images
docker system prune -a

# Restart Docker daemon
sudo systemctl restart docker
```

#### Issue: Database Connection Errors

**Symptoms**: Backend logs show "Connection refused"

**Diagnosis**:
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U postgres -d clickview -c "SELECT 1"
```

**Resolution**:
```bash
# Restart PostgreSQL
docker-compose restart postgres

# If corrupted, restore from backup
./scripts/backup.sh restore-db /var/backups/clickview/database/latest.dump
```

#### Issue: High Memory Usage

**Symptoms**: Application slow, OOM errors

**Diagnosis**:
```bash
# Check container memory
docker stats

# Check Node.js heap
docker-compose exec backend node -e "console.log(process.memoryUsage())"
```

**Resolution**:
```bash
# Restart affected containers
docker-compose restart backend

# Increase memory limits in docker-compose.prod.yml
# Then redeploy
```

#### Issue: Slow Database Queries

**Symptoms**: API response times >1s

**Diagnosis**:
```bash
# Check slow queries
docker-compose exec postgres psql -U postgres -d clickview -c "
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;"
```

**Resolution**:
```bash
# Add indexes
docker-compose exec postgres psql -U postgres -d clickview -c "
CREATE INDEX CONCURRENTLY idx_name ON table(column);"

# Update statistics
docker-compose exec postgres psql -U postgres -d clickview -c "ANALYZE;"
```

### Log Locations

| Component | Location |
|-----------|----------|
| Backend API | `docker-compose logs backend` |
| Frontend | `docker-compose logs frontend` |
| PostgreSQL | `docker-compose logs postgres` |
| Redis | `docker-compose logs redis` |
| Nginx | `docker-compose logs nginx` |
| Application | `/opt/clickview/logs/application-*.log` |
| Deployment | `/opt/clickview/logs/deploy_*.log` |
| Backup | `/var/backups/clickview/backup.log` |

### Useful Commands

```bash
# View real-time logs
docker-compose logs -f --tail=100 backend

# Check resource usage
docker stats

# Execute command in container
docker-compose exec backend npm run migrate:status

# Connect to database
docker-compose exec postgres psql -U postgres -d clickview

# Connect to Redis
docker-compose exec redis redis-cli

# Check health
curl http://localhost:3001/health | jq

# Restart specific service
docker-compose restart backend

# View environment variables
docker-compose exec backend env

# Check disk usage
df -h
du -sh /var/lib/docker/*
```

---

## Emergency Contacts

### Escalation Path

1. **Level 1**: On-call engineer (see rotation above)
2. **Level 2**: Engineering Lead
3. **Level 3**: CTO

### Contact Information

| Role | Name | Phone | Slack | Email |
|------|------|-------|-------|-------|
| DevOps Lead | [Name] | [Phone] | @devops-lead | devops@clickview.com |
| Backend Lead | [Name] | [Phone] | @backend-lead | backend@clickview.com |
| CTO | [Name] | [Phone] | @cto | cto@clickview.com |
| Security | [Name] | [Phone] | @security | security@clickview.com |

### External Contacts

| Service | Contact | URL |
|---------|---------|-----|
| AWS Support | 1-800-XXX-XXXX | https://console.aws.amazon.com/support |
| Sentry Support | support@sentry.io | https://sentry.io/support |
| DataDog Support | support@datadoghq.com | https://help.datadoghq.com |

---

## Appendix

### Environment Variables

See `.env.example` for complete list.

Critical variables:
- `DB_PASSWORD`: PostgreSQL password
- `REDIS_PASSWORD`: Redis password
- `JWT_SECRET`: JWT signing key
- `MASTER_ENCRYPTION_KEY`: Encryption master key
- `SENTRY_DSN`: Sentry error tracking DSN

### Database Migrations

Migrations are located in `backend/migrations/`.

```bash
# Check migration status
npm run migrate:status

# Run pending migrations
npm run migrate:up

# Rollback last migration
npm run migrate:down

# Rollback to specific migration
npm run migrate:down -- --to 20251120_120000
```

### Backup Schedule

- **Database**: Daily at 2:00 AM UTC
- **Files**: Weekly on Sunday at 3:00 AM UTC
- **Config**: On every deployment
- **Retention**: 30 days local, 90 days S3

### SSL Certificate Renewal

Certificates are managed by Let's Encrypt.

```bash
# Renew certificates
sudo certbot renew

# Reload Nginx
docker-compose exec nginx nginx -s reload
```

---

**Document Version**: 1.0
**Last Review**: 2025-11-23
**Next Review**: 2025-12-23

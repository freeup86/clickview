# ClickView Disaster Recovery Runbook

## Overview

This runbook provides step-by-step procedures for recovering the ClickView application from various disaster scenarios. It is designed to achieve:

- **RTO (Recovery Time Objective)**: < 4 hours
- **RPO (Recovery Point Objective)**: < 1 hour

## Contact Information

| Role | Name | Contact |
|------|------|---------|
| On-Call Engineer | TBD | PagerDuty |
| Database Admin | TBD | Slack #db-team |
| Infrastructure Lead | TBD | Slack #infra |
| Security Team | TBD | security@clickview.app |

## Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| SEV-1 | Complete service outage | Immediate |
| SEV-2 | Partial outage affecting >50% users | 15 minutes |
| SEV-3 | Degraded performance | 1 hour |
| SEV-4 | Minor issues | 4 hours |

---

## Scenario 1: Database Failure

### Symptoms
- Application errors: "Connection refused" or "Database unavailable"
- Health check endpoint returns 503
- Monitoring alerts for database connectivity

### Immediate Response (0-15 minutes)

1. **Acknowledge the alert** in PagerDuty/monitoring system

2. **Verify the issue**:
   ```bash
   # Check database connectivity
   psql -h $DB_HOST -U $DB_USER -d clickview -c "SELECT 1"

   # Check database container/process
   docker ps | grep postgres
   systemctl status postgresql
   ```

3. **Check database logs**:
   ```bash
   docker logs clickview-db --tail 100
   # or
   tail -100 /var/log/postgresql/postgresql-14-main.log
   ```

### Recovery Procedure

#### Option A: Restart Database (5-10 minutes)
```bash
# Restart database container
docker-compose restart db

# Or restart service
systemctl restart postgresql

# Verify connectivity
psql -h $DB_HOST -c "SELECT 1"
```

#### Option B: Failover to Replica (10-20 minutes)
```bash
# Promote replica to primary
pg_ctl promote -D /var/lib/postgresql/data

# Update connection strings
kubectl edit configmap clickview-config
# Change DB_HOST to replica hostname

# Restart application pods
kubectl rollout restart deployment/clickview-backend
```

#### Option C: Point-in-Time Recovery (30-60 minutes)
```bash
# List available backups
npm run backup:list

# Restore to specific point in time
npm run backup:restore -- --target-time="2024-01-15T10:30:00Z"

# Verify data integrity
npm run backup:verify
```

### Post-Recovery
1. Verify all services are healthy
2. Check data integrity
3. Update incident ticket
4. Schedule post-mortem

---

## Scenario 2: Application Server Failure

### Symptoms
- 502/503 errors from load balancer
- Health checks failing
- No response from application endpoints

### Immediate Response

1. **Check application health**:
   ```bash
   # Check pods
   kubectl get pods -l app=clickview-backend

   # Check logs
   kubectl logs -l app=clickview-backend --tail=100

   # Check resource usage
   kubectl top pods -l app=clickview-backend
   ```

### Recovery Procedure

#### Restart Affected Pods
```bash
# Delete failed pods (they will be recreated)
kubectl delete pods -l app=clickview-backend --field-selector=status.phase=Failed

# Or force restart
kubectl rollout restart deployment/clickview-backend

# Monitor rollout
kubectl rollout status deployment/clickview-backend
```

#### Scale Up (if capacity issue)
```bash
kubectl scale deployment/clickview-backend --replicas=5
```

---

## Scenario 3: Redis Cache Failure

### Symptoms
- Increased response times
- Session errors
- Cache miss alerts

### Immediate Response
```bash
# Check Redis connectivity
redis-cli -h $REDIS_HOST ping

# Check Redis logs
docker logs clickview-redis --tail 100
```

### Recovery Procedure

#### Restart Redis
```bash
docker-compose restart redis
# or
kubectl rollout restart deployment/clickview-redis
```

#### Clear and Rebuild Cache
```bash
# Connect to Redis
redis-cli -h $REDIS_HOST

# Clear all keys (caution!)
FLUSHALL

# Restart application to rebuild cache
kubectl rollout restart deployment/clickview-backend
```

---

## Scenario 4: Data Corruption

### Symptoms
- Unexpected query results
- Constraint violation errors
- Data integrity check failures

### Recovery Procedure

1. **Stop writes immediately**:
   ```bash
   # Scale down write-capable services
   kubectl scale deployment/clickview-backend --replicas=0
   ```

2. **Identify corruption extent**:
   ```sql
   -- Check table integrity
   SELECT * FROM pg_catalog.pg_stat_user_tables;

   -- Run integrity checks
   SELECT * FROM pg_catalog.pg_index WHERE NOT indisvalid;
   ```

3. **Restore from backup**:
   ```bash
   # Find last known good backup
   npm run backup:list

   # Restore to new database
   npm run backup:restore -- \
     --backup-id=<backup_id> \
     --target-database=clickview_restored

   # Verify restored data
   npm run backup:verify --database=clickview_restored

   # Switch to restored database
   kubectl edit configmap clickview-config
   # Update DATABASE_URL
   ```

4. **Resume service**:
   ```bash
   kubectl scale deployment/clickview-backend --replicas=3
   ```

---

## Scenario 5: Security Breach

### Immediate Response

1. **Isolate affected systems**:
   ```bash
   # Block external access
   kubectl apply -f emergency-network-policy.yaml

   # Rotate secrets
   kubectl delete secret clickview-secrets
   kubectl create secret generic clickview-secrets \
     --from-literal=JWT_SECRET=$(openssl rand -hex 32) \
     --from-literal=ENCRYPTION_KEY=$(openssl rand -hex 32)
   ```

2. **Invalidate all sessions**:
   ```bash
   redis-cli -h $REDIS_HOST FLUSHALL
   ```

3. **Audit access**:
   ```sql
   SELECT * FROM audit_logs
   WHERE created_at > NOW() - INTERVAL '24 hours'
   ORDER BY created_at DESC;
   ```

4. **Notify security team** immediately

---

## Scenario 6: Complete Infrastructure Failure

### Recovery in Secondary Region

1. **Activate secondary region**:
   ```bash
   # Switch DNS to secondary region
   aws route53 change-resource-record-sets \
     --hosted-zone-id $ZONE_ID \
     --change-batch file://failover-dns.json
   ```

2. **Restore from cross-region backup**:
   ```bash
   # In secondary region
   npm run backup:restore -- \
     --source-region=us-east-1 \
     --source-bucket=$PRIMARY_BACKUP_BUCKET
   ```

3. **Scale up infrastructure**:
   ```bash
   kubectl scale deployment/clickview-backend --replicas=5
   kubectl scale deployment/clickview-frontend --replicas=3
   ```

---

## Backup Verification Procedure

Run quarterly to ensure backups are valid:

```bash
# Automated test restore
npm run backup:test

# Manual verification
npm run backup:restore -- \
  --validate-only \
  --backup-id=$(npm run backup:latest)

# Check backup statistics
npm run backup:stats
```

---

## Recovery Metrics Tracking

After each incident, document:

| Metric | Target | Actual |
|--------|--------|--------|
| Time to Detection | < 5 min | |
| Time to Acknowledgment | < 10 min | |
| Time to Recovery | < 4 hours | |
| Data Loss | < 1 hour | |

---

## Appendix

### Environment Variables
```bash
# Database
DB_HOST=clickview-db.cluster-xxx.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=clickview

# Redis
REDIS_HOST=clickview-redis.xxx.cache.amazonaws.com
REDIS_PORT=6379

# Backup
BACKUP_S3_BUCKET=clickview-backups
BACKUP_S3_REGION=us-east-1
BACKUP_ENCRYPTION_KEY=<see secrets manager>
```

### Useful Commands
```bash
# Check system health
curl -s https://api.clickview.app/health | jq

# View recent logs
kubectl logs -l app=clickview-backend --since=1h

# Check database connections
psql -c "SELECT count(*) FROM pg_stat_activity"

# View cache stats
redis-cli INFO stats
```

### Emergency Contacts
- AWS Support: (800) xxx-xxxx
- PagerDuty: https://clickview.pagerduty.com
- Status Page: https://status.clickview.app

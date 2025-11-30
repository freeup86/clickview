# Maintenance Procedures

## Table of Contents

1. [Scheduled Maintenance Windows](#scheduled-maintenance-windows)
2. [Database Maintenance](#database-maintenance)
3. [Kubernetes Cluster Maintenance](#kubernetes-cluster-maintenance)
4. [Certificate Management](#certificate-management)
5. [Dependency Updates](#dependency-updates)
6. [Log Rotation & Cleanup](#log-rotation--cleanup)
7. [Capacity Planning](#capacity-planning)

---

## Scheduled Maintenance Windows

### Standard Maintenance Window
- **Day**: Sundays
- **Time**: 02:00 - 06:00 UTC
- **Notification**: 72 hours advance notice

### Emergency Maintenance
- Requires P1/P2 justification
- Minimum 1-hour notice when possible
- Status page updated immediately

### Maintenance Checklist

Before maintenance:
- [ ] Create change ticket
- [ ] Update status page
- [ ] Notify stakeholders
- [ ] Verify backup exists
- [ ] Test rollback procedure

During maintenance:
- [ ] Follow runbook steps
- [ ] Monitor metrics
- [ ] Log all changes

After maintenance:
- [ ] Verify service health
- [ ] Update status page
- [ ] Close change ticket
- [ ] Document any issues

---

## Database Maintenance

### Daily Tasks (Automated)

```bash
# These run via cron, verify they completed:
kubectl logs -l app=db-maintenance --since=24h | grep -i "completed\|error"
```

| Task | Schedule | Command |
|------|----------|---------|
| Statistics update | 04:00 UTC | `ANALYZE` |
| Backup verification | 05:00 UTC | `pg_verifybackup` |
| Dead tuple check | 06:00 UTC | Stats query |

### Weekly Tasks

#### 1. Table Bloat Analysis
```bash
kubectl exec -it postgres-0 -- psql -c "
SELECT
  schemaname || '.' || relname AS table_name,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
  n_dead_tup AS dead_tuples,
  n_live_tup AS live_tuples,
  CASE WHEN n_live_tup > 0
    THEN round(100.0 * n_dead_tup / (n_live_tup + n_dead_tup), 2)
    ELSE 0
  END AS dead_ratio
FROM pg_stat_user_tables
WHERE n_dead_tup > 10000
ORDER BY n_dead_tup DESC
LIMIT 20;
"
```

#### 2. Index Health Check
```bash
kubectl exec -it postgres-0 -- psql -c "
-- Unused indexes
SELECT
  schemaname || '.' || relname AS table_name,
  indexrelname AS index_name,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  idx_scan AS scans
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey'
  AND pg_relation_size(indexrelid) > 1048576
ORDER BY pg_relation_size(indexrelid) DESC;
"
```

#### 3. Run VACUUM ANALYZE
```bash
# Standard vacuum (online, safe)
kubectl exec -it postgres-0 -- psql -c "VACUUM ANALYZE;"

# For heavily bloated tables (causes brief locks)
kubectl exec -it postgres-0 -- psql -c "VACUUM FULL table_name;"
```

### Monthly Tasks

#### 1. REINDEX for Performance
```bash
# Reindex specific table (brief locks)
kubectl exec -it postgres-0 -- psql -c "REINDEX TABLE table_name;"

# Reindex entire database (maintenance window required)
kubectl exec -it postgres-0 -- psql -c "REINDEX DATABASE clickview;"
```

#### 2. Partition Maintenance (TimescaleDB)
```bash
kubectl exec -it postgres-0 -- psql -c "
-- Check chunk distribution
SELECT
  hypertable_name,
  chunk_name,
  range_start,
  range_end,
  pg_size_pretty(total_bytes) as size
FROM timescaledb_information.chunks
ORDER BY range_end DESC
LIMIT 20;

-- Drop old chunks (older than 90 days)
SELECT drop_chunks('metrics_raw', INTERVAL '90 days');
"
```

#### 3. Connection Pool Review
```bash
# Check connection patterns
kubectl exec -it postgres-0 -- psql -c "
SELECT
  usename,
  application_name,
  client_addr,
  count(*) as connections,
  max(backend_start) as last_connection
FROM pg_stat_activity
GROUP BY usename, application_name, client_addr
ORDER BY connections DESC;
"
```

---

## Kubernetes Cluster Maintenance

### Node Maintenance

#### Drain Node for Maintenance
```bash
# Cordon (prevent new pods)
kubectl cordon node-name

# Drain (evict pods gracefully)
kubectl drain node-name --ignore-daemonsets --delete-emptydir-data

# After maintenance, uncordon
kubectl uncordon node-name
```

#### Node Updates
```bash
# Check node versions
kubectl get nodes -o wide

# Check for available updates
kubectl describe node node-name | grep -i version
```

### Pod Maintenance

#### Rolling Restart (Zero Downtime)
```bash
# Restart deployment
kubectl rollout restart deployment/clickview-backend -n clickview

# Monitor rollout
kubectl rollout status deployment/clickview-backend -n clickview

# Verify all pods healthy
kubectl get pods -n clickview -w
```

#### Force Pod Replacement
```bash
# Delete specific pod (will be recreated)
kubectl delete pod pod-name -n clickview

# Delete all pods in deployment (staggered replacement)
kubectl delete pods -l app=clickview,component=backend -n clickview
```

### Resource Cleanup

#### Completed Jobs
```bash
# List completed jobs
kubectl get jobs -n clickview

# Delete completed jobs older than 1 day
kubectl delete jobs --field-selector status.successful=1 -n clickview
```

#### Evicted Pods
```bash
# Find evicted pods
kubectl get pods -n clickview | grep Evicted

# Delete evicted pods
kubectl delete pods --field-selector=status.phase=Failed -n clickview
```

#### Orphaned Resources
```bash
# Find orphaned PVCs
kubectl get pvc -n clickview | grep -v Bound

# Find orphaned secrets
kubectl get secrets -n clickview | grep -v 'kubernetes.io'
```

---

## Certificate Management

### Check Certificate Status
```bash
# Check all certificates
kubectl get certificates -n clickview

# Detailed certificate info
kubectl describe certificate clickview-tls -n clickview

# Check expiry from endpoint
echo | openssl s_client -connect api.clickview.app:443 2>/dev/null | openssl x509 -noout -dates
```

### Manual Certificate Renewal
```bash
# Delete secret to trigger renewal
kubectl delete secret clickview-tls -n clickview

# Verify renewal
kubectl describe certificate clickview-tls -n clickview

# Check new secret created
kubectl get secret clickview-tls -n clickview
```

### Cert-Manager Troubleshooting
```bash
# Check cert-manager pods
kubectl get pods -n cert-manager

# Check cert-manager logs
kubectl logs -l app=cert-manager -n cert-manager --tail=100

# Check certificate requests
kubectl get certificaterequests -n clickview
```

---

## Dependency Updates

### npm Dependencies

#### Check for Updates
```bash
# Check outdated packages
npm outdated

# Check for security vulnerabilities
npm audit
```

#### Update Process
```bash
# Update minor/patch versions
npm update

# Update specific package
npm install package-name@latest

# Update major versions (with testing)
npx npm-check-updates -u
npm install
```

#### Security Fixes
```bash
# Auto-fix vulnerabilities
npm audit fix

# Force fix (may include breaking changes)
npm audit fix --force
```

### Docker Base Images

#### Check for Updates
```bash
# Pull latest base images
docker pull node:20-alpine
docker pull postgres:15-alpine

# Check current image digests
docker images --digests
```

#### Update Base Images
1. Update Dockerfile with new version
2. Build and test locally
3. Run security scan: `docker scan image-name`
4. Push to registry
5. Deploy to staging
6. Verify all tests pass
7. Deploy to production

### Kubernetes Components

```bash
# Check component versions
kubectl version
kubectl get nodes -o jsonpath='{.items[*].status.nodeInfo.kubeletVersion}'

# Check for deprecated APIs
kubectl api-versions
```

---

## Log Rotation & Cleanup

### Application Logs

```bash
# Check log volume usage
kubectl exec -it clickview-backend-xxx -- du -sh /var/log/

# Configure log rotation (in pod)
cat /etc/logrotate.d/app
```

### Kubernetes Logs

```bash
# Check container log sizes
for pod in $(kubectl get pods -n clickview -o name); do
  echo $pod
  kubectl exec $pod -n clickview -- ls -lh /var/log/ 2>/dev/null
done
```

### Log Retention Policy

| Log Type | Retention | Location |
|----------|-----------|----------|
| Application | 14 days | S3 archive |
| Access logs | 90 days | S3 archive |
| Audit logs | 1 year | Compliance archive |
| Metrics | 30 days | Prometheus |
| Metrics (aggregated) | 1 year | Long-term storage |

### Cleanup Scripts

```bash
# Run log cleanup (weekly cron)
./scripts/cleanup-logs.sh

# Archive old logs to S3
aws s3 sync /var/log/archive s3://clickview-logs/$(date +%Y/%m)/

# Clean up local archived logs
find /var/log/archive -type f -mtime +7 -delete
```

---

## Capacity Planning

### Monthly Review Metrics

```bash
# Resource usage trends
curl -s "http://prometheus:9090/api/v1/query?query=avg_over_time(container_cpu_usage_seconds_total[30d])"

# Growth rate
curl -s "http://prometheus:9090/api/v1/query?query=deriv(pg_database_size_bytes[30d])"
```

### Capacity Thresholds

| Resource | Yellow | Red | Action |
|----------|--------|-----|--------|
| CPU | 60% | 80% | Scale horizontally |
| Memory | 70% | 85% | Scale or optimize |
| Disk | 70% | 85% | Expand or archive |
| DB Connections | 80 | 95 | Increase pool size |
| Network | 70% | 85% | Upgrade tier |

### Scaling Guidelines

| Metric | Threshold | Scale Action |
|--------|-----------|--------------|
| RPS > 1000 | Per pod | Add 1 replica |
| Memory > 1.5GB | Sustained | Add replica or increase limit |
| P95 latency > 300ms | 5 min | Investigate, then scale |
| Queue depth > 1000 | Growing | Add workers |

### Quarterly Capacity Report

Generate quarterly:
```bash
./scripts/capacity-report.sh --quarter Q4-2024 > reports/capacity-Q4-2024.md
```

Report includes:
- Growth trends (users, data, traffic)
- Resource utilization averages
- Peak usage analysis
- Scaling events review
- Cost optimization opportunities
- Recommendations for next quarter

---

## Maintenance Calendar Template

| Week | Sunday Maintenance | Tasks |
|------|-------------------|-------|
| 1st | Minor maintenance | VACUUM, stats update |
| 2nd | Security updates | Dependency patches |
| 3rd | Performance review | Index optimization |
| 4th | Capacity planning | Resource review |

---

**Document Owner**: DevOps Team
**Last Updated**: 2025-11-30
**Review Schedule**: Monthly

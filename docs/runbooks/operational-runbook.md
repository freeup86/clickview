# ClickView Operational Runbook

## Table of Contents

1. [Overview](#overview)
2. [On-Call Procedures](#on-call-procedures)
3. [Alert Response](#alert-response)
4. [Incident Response](#incident-response)
5. [Database Operations](#database-operations)
6. [Scaling Procedures](#scaling-procedures)
7. [Deployment & Rollback](#deployment--rollback)
8. [Security Incidents](#security-incidents)
9. [Post-Incident Review](#post-incident-review)

---

## Overview

### Purpose
This runbook provides operational procedures for ClickView platform operations, incident response, and maintenance tasks.

### Target Audience
- On-call engineers
- DevOps team
- Platform engineers
- Security team

### Escalation Contacts

| Role | Primary | Secondary | Phone |
|------|---------|-----------|-------|
| On-Call Engineer | PagerDuty Rotation | - | Via PagerDuty |
| Engineering Lead | @eng-lead | @eng-lead-backup | Slack escalation |
| Security Lead | @security-lead | - | security@clickview.app |
| VP Engineering | @vp-eng | - | Executive escalation only |

---

## On-Call Procedures

### Shift Schedule
- Primary on-call: 24/7 rotation (weekly shifts)
- Secondary on-call: Backup for escalations
- Handoff: Mondays at 10:00 AM UTC

### Responsibilities
1. **Acknowledge alerts** within 5 minutes
2. **Assess severity** and classify incident
3. **Initiate response** based on runbook
4. **Communicate status** via #incidents channel
5. **Document actions** in incident ticket
6. **Escalate** if unable to resolve within 30 minutes

### Tools Access Checklist
- [ ] AWS Console access
- [ ] Kubernetes cluster access (kubectl)
- [ ] Grafana/Prometheus dashboards
- [ ] PagerDuty account
- [ ] Database read access
- [ ] Slack #incidents channel

### Daily Health Check
```bash
# Run daily at start of shift
./scripts/health-check.sh

# Check critical metrics
curl -s http://api.clickview.app/health | jq .

# Review overnight alerts
kubectl logs -n monitoring prometheus-0 --since=8h | grep -i alert
```

---

## Alert Response

### Severity Classifications

| Severity | Response Time | Examples |
|----------|--------------|----------|
| P1 Critical | 5 minutes | Service down, data loss, security breach |
| P2 High | 15 minutes | Degraded performance, partial outage |
| P3 Medium | 1 hour | Non-critical errors, capacity warnings |
| P4 Low | 24 hours | Informational, minor issues |

### Common Alerts

#### ALERT: High Error Rate (> 5%)

**Symptoms**: Error rate exceeds 5% of requests

**Investigation**:
```bash
# Check recent errors
kubectl logs -l app=clickview,component=backend --tail=100 | grep -i error

# Check error distribution
curl -s "http://prometheus:9090/api/v1/query?query=sum(rate(http_requests_total{status=~'5..'}[5m]))/sum(rate(http_requests_total[5m]))"

# Check recent deployments
kubectl rollout history deployment/clickview-backend -n clickview
```

**Resolution**:
1. Identify error pattern in logs
2. If deployment-related: Roll back (see Rollback section)
3. If database-related: Check connection pool and queries
4. If external API: Check ClickUp/OpenAI status

---

#### ALERT: High Latency (P95 > 500ms)

**Symptoms**: Response times exceeding SLA

**Investigation**:
```bash
# Check current latency
kubectl top pods -n clickview

# Check database query times
kubectl exec -it postgres-0 -- psql -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# Check cache hit rates
redis-cli INFO stats | grep hit
```

**Resolution**:
1. Check if database queries are slow (run EXPLAIN ANALYZE)
2. Check Redis cache hit rate (should be > 80%)
3. Check for resource exhaustion (CPU/memory)
4. Scale horizontally if needed (see Scaling section)

---

#### ALERT: High Memory Usage (> 85%)

**Symptoms**: Container memory approaching limits

**Investigation**:
```bash
# Check pod memory usage
kubectl top pods -n clickview

# Check for memory leaks
kubectl logs -l app=clickview --tail=500 | grep -i "memory\|heap\|oom"

# Check container resource limits
kubectl describe pod -l app=clickview | grep -A5 "Limits:"
```

**Resolution**:
1. Identify memory-intensive operations
2. Force garbage collection if possible
3. Restart pods if immediate relief needed:
   ```bash
   kubectl rollout restart deployment/clickview-backend -n clickview
   ```
4. Increase memory limits if persistent issue

---

#### ALERT: Database Connection Pool Exhausted

**Symptoms**: Connection pool at capacity, queries timing out

**Investigation**:
```bash
# Check active connections
kubectl exec -it postgres-0 -- psql -c "SELECT count(*) FROM pg_stat_activity;"

# Check waiting queries
kubectl exec -it postgres-0 -- psql -c "SELECT * FROM pg_stat_activity WHERE wait_event IS NOT NULL;"

# Check connection settings
kubectl exec -it postgres-0 -- psql -c "SHOW max_connections;"
```

**Resolution**:
1. Identify long-running queries and terminate if needed:
   ```sql
   SELECT pg_terminate_backend(pid) FROM pg_stat_activity
   WHERE duration > interval '5 minutes' AND state = 'active';
   ```
2. Scale backend replicas to distribute connections
3. Review application connection pool settings

---

#### ALERT: Disk Space Low (> 80%)

**Symptoms**: Disk usage approaching capacity

**Investigation**:
```bash
# Check disk usage
kubectl exec -it postgres-0 -- df -h

# Check largest tables
kubectl exec -it postgres-0 -- psql -c "
  SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
  FROM pg_catalog.pg_statio_user_tables
  ORDER BY pg_total_relation_size(relid) DESC
  LIMIT 10;
"
```

**Resolution**:
1. Run VACUUM FULL on bloated tables
2. Archive old data to cold storage
3. Increase disk size if needed (PVC resize)
4. Review data retention policies

---

#### ALERT: SSL Certificate Expiring

**Symptoms**: Certificate expires within 14 days

**Investigation**:
```bash
# Check certificate expiry
echo | openssl s_client -connect api.clickview.app:443 2>/dev/null | openssl x509 -noout -dates
```

**Resolution**:
1. Verify cert-manager is running:
   ```bash
   kubectl get pods -n cert-manager
   ```
2. Check certificate resource:
   ```bash
   kubectl describe certificate clickview-tls -n clickview
   ```
3. Force renewal if needed:
   ```bash
   kubectl delete secret clickview-tls -n clickview
   ```

---

## Incident Response

### Incident Declaration

Declare an incident when:
- Multiple users affected
- SLA at risk
- Security concern
- Data integrity issue

### Incident Response Process

```
┌─────────────────────────────────────────────────────────────┐
│                    INCIDENT DETECTED                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  1. ACKNOWLEDGE (5 min)                                      │
│  - Acknowledge in PagerDuty                                 │
│  - Join #incidents channel                                  │
│  - Notify: "Investigating [ALERT_NAME]"                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  2. ASSESS (10 min)                                         │
│  - Determine severity (P1/P2/P3/P4)                         │
│  - Identify affected services                               │
│  - Check for related alerts                                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  3. MITIGATE (ongoing)                                      │
│  - Apply quick fixes from runbook                           │
│  - Communicate status every 15 minutes                      │
│  - Escalate if blocked > 30 minutes                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  4. RESOLVE                                                 │
│  - Confirm service restored                                 │
│  - Update status page                                       │
│  - Notify: "Incident resolved"                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  5. REVIEW (within 48 hours)                                │
│  - Schedule post-incident review                            │
│  - Create follow-up tickets                                 │
│  - Update runbooks if needed                                │
└─────────────────────────────────────────────────────────────┘
```

### Communication Templates

**Initial Notification**:
```
🔴 INCIDENT: [Brief Description]
Severity: P[1-4]
Status: Investigating
Impact: [Affected users/services]
Next update: [Time]
```

**Update**:
```
🟡 UPDATE: [Brief Description]
Status: [Investigating/Mitigating/Monitoring]
Progress: [What we've tried/learned]
Next update: [Time]
```

**Resolution**:
```
🟢 RESOLVED: [Brief Description]
Duration: [Time]
Root cause: [Brief explanation]
Follow-up: [Ticket link]
```

---

## Database Operations

### Routine Maintenance

#### Daily Tasks
```bash
# Check replication lag
kubectl exec -it postgres-0 -- psql -c "
  SELECT client_addr, state, sent_lsn, write_lsn, flush_lsn, replay_lsn
  FROM pg_stat_replication;
"

# Check table bloat
kubectl exec -it postgres-0 -- psql -c "
  SELECT schemaname, relname, n_dead_tup, n_live_tup,
         round(n_dead_tup * 100.0 / nullif(n_live_tup + n_dead_tup, 0), 2) as dead_ratio
  FROM pg_stat_user_tables
  WHERE n_dead_tup > 10000
  ORDER BY n_dead_tup DESC;
"
```

#### Weekly Tasks
```bash
# Run analyze on all tables
kubectl exec -it postgres-0 -- psql -c "ANALYZE VERBOSE;"

# Check index usage
kubectl exec -it postgres-0 -- psql -c "
  SELECT relname, indexrelname, idx_scan, idx_tup_read, idx_tup_fetch
  FROM pg_stat_user_indexes
  WHERE idx_scan = 0 AND indexrelname NOT LIKE '%_pkey';
"
```

### Emergency Database Procedures

#### Kill Long-Running Queries
```sql
-- Find long-running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';

-- Terminate specific query
SELECT pg_terminate_backend(PID);

-- Terminate all queries older than 10 minutes
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE duration > interval '10 minutes' AND state != 'idle';
```

#### Emergency Read-Only Mode
```bash
# Put database in read-only mode
kubectl exec -it postgres-0 -- psql -c "ALTER SYSTEM SET default_transaction_read_only = on;"
kubectl exec -it postgres-0 -- psql -c "SELECT pg_reload_conf();"

# Revert to read-write
kubectl exec -it postgres-0 -- psql -c "ALTER SYSTEM SET default_transaction_read_only = off;"
kubectl exec -it postgres-0 -- psql -c "SELECT pg_reload_conf();"
```

### Backup & Restore Procedures

See [disaster-recovery-runbook.md](./disaster-recovery-runbook.md) for detailed backup and restore procedures.

**Quick Reference**:
```bash
# List available backups
aws s3 ls s3://clickview-backups/full/ --recursive | tail -10

# Restore from latest backup
./scripts/restore-backup.sh --latest

# Point-in-time recovery
./scripts/restore-backup.sh --target-time "2025-01-15 10:30:00"
```

---

## Scaling Procedures

### Manual Scaling

#### Scale Backend Pods
```bash
# Scale up
kubectl scale deployment/clickview-backend -n clickview --replicas=10

# Scale down
kubectl scale deployment/clickview-backend -n clickview --replicas=3

# Check current replicas
kubectl get deployment clickview-backend -n clickview
```

#### Scale Frontend Pods
```bash
# Scale up
kubectl scale deployment/clickview-frontend -n clickview --replicas=5

# Scale down
kubectl scale deployment/clickview-frontend -n clickview --replicas=2
```

### Auto-Scaling Configuration

```bash
# Check HPA status
kubectl get hpa -n clickview

# Describe HPA for details
kubectl describe hpa clickview-backend-hpa -n clickview

# Update HPA limits temporarily
kubectl patch hpa clickview-backend-hpa -n clickview -p '{"spec":{"maxReplicas":20}}'
```

### Database Scaling

#### Read Replica Scaling
```bash
# Add read replica
kubectl apply -f k8s/overlays/production/read-replica.yaml

# Verify replica sync
kubectl exec -it postgres-replica-0 -- psql -c "SELECT pg_is_in_recovery();"
```

#### Connection Pool Scaling
```bash
# Increase PgBouncer pool size
kubectl set env deployment/pgbouncer -n clickview POOL_SIZE=100

# Restart PgBouncer
kubectl rollout restart deployment/pgbouncer -n clickview
```

---

## Deployment & Rollback

### Deployment Process

```bash
# Standard deployment
kubectl set image deployment/clickview-backend backend=clickview/backend:v1.2.0 -n clickview

# Watch rollout
kubectl rollout status deployment/clickview-backend -n clickview

# Check deployment history
kubectl rollout history deployment/clickview-backend -n clickview
```

### Rollback Procedures

#### Quick Rollback (Last Revision)
```bash
# Rollback to previous version
kubectl rollout undo deployment/clickview-backend -n clickview

# Verify rollback
kubectl rollout status deployment/clickview-backend -n clickview
```

#### Rollback to Specific Version
```bash
# View history
kubectl rollout history deployment/clickview-backend -n clickview

# Rollback to specific revision
kubectl rollout undo deployment/clickview-backend -n clickview --to-revision=5
```

### Canary Deployment
```bash
# Deploy canary (10% traffic)
kubectl apply -f k8s/canary/backend-canary.yaml

# Monitor canary metrics
watch "kubectl logs -l app=clickview,track=canary --tail=10"

# Promote or rollback based on metrics
kubectl delete -f k8s/canary/backend-canary.yaml
```

### Blue-Green Deployment
```bash
# Deploy green environment
kubectl apply -f k8s/blue-green/green-deployment.yaml

# Switch traffic to green
kubectl patch service clickview-backend -n clickview -p '{"spec":{"selector":{"version":"green"}}}'

# Rollback to blue if needed
kubectl patch service clickview-backend -n clickview -p '{"spec":{"selector":{"version":"blue"}}}'
```

---

## Security Incidents

### Security Incident Classification

| Type | Severity | Response |
|------|----------|----------|
| Data breach | P1 | Immediate containment, legal notification |
| Active attack | P1 | Block source, engage security team |
| Credential compromise | P1 | Rotate credentials, audit access |
| Vulnerability exploited | P2 | Patch immediately, assess impact |
| Suspicious activity | P3 | Investigate, monitor closely |

### Immediate Response Actions

#### 1. Containment
```bash
# Block suspicious IP
./scripts/waf-block-ip.sh 192.168.1.100

# Revoke compromised API key
./scripts/revoke-api-key.sh KEY_ID

# Force logout all sessions
redis-cli KEYS "session:*" | xargs redis-cli DEL
```

#### 2. Evidence Collection
```bash
# Capture logs
kubectl logs -l app=clickview --since=1h > incident-logs.txt

# Capture WAF events
./scripts/export-waf-logs.sh --last-hour > waf-events.json

# Database audit trail
kubectl exec -it postgres-0 -- psql -c "
  SELECT * FROM audit_log
  WHERE created_at > now() - interval '1 hour'
  ORDER BY created_at DESC;
" > audit-trail.txt
```

#### 3. Communication
```bash
# Notify security team
./scripts/security-alert.sh --severity=P1 --type="suspected_breach"

# Update status page (if public impact)
./scripts/statuspage-update.sh --status=investigating
```

### Post-Security Incident

1. **Preserve evidence** (do not delete logs)
2. **Rotate all credentials** that may be compromised
3. **Audit access logs** for suspicious activity
4. **Notify affected users** if data was exposed
5. **Document timeline** of events
6. **Conduct forensic analysis**
7. **Implement additional controls**

---

## Post-Incident Review

### PIR Template

```markdown
# Post-Incident Review: [INCIDENT-ID]

## Incident Summary
- **Date/Time**: [When it occurred]
- **Duration**: [How long it lasted]
- **Severity**: [P1/P2/P3/P4]
- **Impact**: [Who/what was affected]

## Timeline
| Time (UTC) | Event |
|------------|-------|
| HH:MM | Alert triggered |
| HH:MM | On-call acknowledged |
| HH:MM | Root cause identified |
| HH:MM | Mitigation applied |
| HH:MM | Service restored |

## Root Cause Analysis
### What happened?
[Detailed technical explanation]

### Why did it happen?
- Contributing factor 1
- Contributing factor 2

### Why wasn't it caught earlier?
[Gap analysis]

## What Went Well
- [Positive observation 1]
- [Positive observation 2]

## What Needs Improvement
- [Area for improvement 1]
- [Area for improvement 2]

## Action Items
| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| [Action 1] | @owner | YYYY-MM-DD | Open |
| [Action 2] | @owner | YYYY-MM-DD | Open |

## Lessons Learned
[Key takeaways for the team]
```

### PIR Process

1. **Schedule within 48 hours** of incident resolution
2. **Invite all participants** in the incident response
3. **Focus on learning**, not blame
4. **Create actionable items** with owners and due dates
5. **Share learnings** with broader team
6. **Update runbooks** based on findings
7. **Track action items** to completion

---

## Appendix

### Useful Commands

```bash
# Quick health check
kubectl get pods -n clickview
kubectl top pods -n clickview
kubectl logs -l app=clickview --tail=50

# Check all deployments
kubectl get deployments -n clickview -o wide

# Check ingress
kubectl get ingress -n clickview

# Check certificates
kubectl get certificates -n clickview

# Check secrets (names only)
kubectl get secrets -n clickview

# Port forward for debugging
kubectl port-forward svc/clickview-backend 3001:3001 -n clickview
```

### Monitoring URLs

| Service | URL |
|---------|-----|
| Grafana | https://grafana.clickview.app |
| Prometheus | https://prometheus.clickview.app |
| AlertManager | https://alertmanager.clickview.app |
| Status Page | https://status.clickview.app |

### Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-30 | DevOps Team | Initial version |

---

**Last Updated**: 2025-11-30
**Review Schedule**: Quarterly
**Owner**: DevOps Team

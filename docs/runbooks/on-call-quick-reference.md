# On-Call Quick Reference Card

## First Response Checklist

When an alert fires:

1. [ ] **Acknowledge** in PagerDuty (within 5 min)
2. [ ] **Check** #incidents Slack channel
3. [ ] **Identify** alert type (see table below)
4. [ ] **Follow** the appropriate runbook section
5. [ ] **Communicate** status to team

---

## Alert Quick Response Table

| Alert | First Check | Quick Fix | Escalate If |
|-------|-------------|-----------|-------------|
| **High Error Rate** | `kubectl logs -l app=clickview --tail=50` | Rollback if recent deploy | Errors persist > 15 min |
| **High Latency** | `kubectl top pods -n clickview` | Scale up replicas | P95 > 1s for 10 min |
| **High Memory** | `kubectl describe pod <name>` | Restart pods | OOMKilled events |
| **High CPU** | `kubectl top pods -n clickview` | Scale up replicas | CPU > 90% for 15 min |
| **DB Connections** | Check pg_stat_activity | Kill long queries | Pool exhausted |
| **Disk Full** | `df -h` in pod | VACUUM or archive | > 95% used |
| **Pod CrashLoop** | `kubectl describe pod` | Check logs, rollback | > 5 restarts |
| **Certificate Expiry** | Check cert-manager | Force renewal | < 7 days to expiry |

---

## Essential Commands

### Check System Health
```bash
# Pods status
kubectl get pods -n clickview

# Resource usage
kubectl top pods -n clickview

# Recent events
kubectl get events -n clickview --sort-by='.lastTimestamp' | tail -20
```

### View Logs
```bash
# Backend logs
kubectl logs -l app=clickview,component=backend --tail=100

# Specific pod
kubectl logs <pod-name> -n clickview

# Previous container (after crash)
kubectl logs <pod-name> -n clickview --previous
```

### Quick Fixes
```bash
# Restart deployment
kubectl rollout restart deployment/clickview-backend -n clickview

# Rollback to previous
kubectl rollout undo deployment/clickview-backend -n clickview

# Scale up
kubectl scale deployment/clickview-backend --replicas=6 -n clickview
```

### Database
```bash
# Check connections
kubectl exec -it postgres-0 -- psql -c "SELECT count(*) FROM pg_stat_activity;"

# Kill long queries
kubectl exec -it postgres-0 -- psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE duration > interval '5 minutes';"
```

---

## Escalation Path

```
P4 (Low)      → On-call handles, ticket created
P3 (Medium)   → On-call handles, notify team
P2 (High)     → Notify tech lead, 15-min updates
P1 (Critical) → All hands, 5-min updates, exec notify
```

### Contact Methods
- **Slack**: #incidents (fastest)
- **PagerDuty**: Auto-escalation
- **Phone**: Executive escalation only

---

## Severity Decision Tree

```
Is service completely down?
├── Yes → P1 Critical
└── No
    └── Is data at risk?
        ├── Yes → P1 Critical
        └── No
            └── Are >10% users affected?
                ├── Yes → P2 High
                └── No
                    └── Is there performance degradation?
                        ├── Yes → P3 Medium
                        └── No → P4 Low
```

---

## Status Update Templates

**Investigating**:
> :red_circle: INCIDENT: [Description] | Severity: P[X] | Status: Investigating | ETA: 15 min

**Identified**:
> :yellow_circle: UPDATE: Root cause identified. [Brief]. Applying fix. Next update in 15 min.

**Resolved**:
> :green_circle: RESOLVED: [Description] | Duration: [X] min | Follow-up: [TICKET]

---

## Key Metrics to Watch

| Metric | Normal | Warning | Critical |
|--------|--------|---------|----------|
| Error Rate | < 1% | 1-5% | > 5% |
| P95 Latency | < 200ms | 200-500ms | > 500ms |
| CPU Usage | < 60% | 60-80% | > 80% |
| Memory Usage | < 70% | 70-85% | > 85% |
| DB Connections | < 80 | 80-90 | > 90 |
| Disk Usage | < 70% | 70-85% | > 85% |

---

## Quick Links

- **Grafana**: https://grafana.clickview.app
- **Prometheus**: https://prometheus.clickview.app
- **Status Page**: https://status.clickview.app
- **AWS Console**: https://console.aws.amazon.com
- **Full Runbook**: [operational-runbook.md](./operational-runbook.md)

---

*Keep this reference handy during on-call shifts*

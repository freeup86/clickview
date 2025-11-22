# ClickView Enterprise - Kubernetes Deployment Guide

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Architecture](#architecture)
4. [Quick Start](#quick-start)
5. [Manual Deployment](#manual-deployment)
6. [Configuration](#configuration)
7. [Scaling](#scaling)
8. [High Availability](#high-availability)
9. [Monitoring](#monitoring)
10. [Backup and Restore](#backup-and-restore)
11. [Troubleshooting](#troubleshooting)

## Overview

This guide covers deploying ClickView Enterprise on Kubernetes for production environments requiring high availability, auto-scaling, and zero-downtime deployments.

### Supported Kubernetes Platforms

- **Self-managed**: kubeadm, Rancher, OpenShift
- **Managed**: Amazon EKS, Google GKE, Azure AKS, DigitalOcean DOKS
- **Local development**: Minikube, Kind, K3s

### Minimum Cluster Requirements

- **Kubernetes version**: 1.25+
- **Nodes**: 3+ worker nodes (for HA)
- **CPU**: 8 cores total (2-4 cores per node)
- **Memory**: 16GB total (4-8GB per node)
- **Storage**: 100GB+ SSD with dynamic provisioning
- **Load Balancer**: Cloud provider LB or MetalLB
- **Ingress Controller**: Nginx, Traefik, or cloud provider

## Prerequisites

### Required Tools

```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Helm 3
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Verify installations
kubectl version --client
helm version
```

### Cluster Access

```bash
# Verify cluster access
kubectl cluster-info
kubectl get nodes

# Create namespace
kubectl create namespace clickview

# Set default namespace (optional)
kubectl config set-context --current --namespace=clickview
```

## Architecture

### Kubernetes Resources

```
clickview/
├── Namespace: clickview
├── ConfigMaps
│   ├── backend-config
│   └── frontend-config
├── Secrets
│   ├── database-credentials
│   ├── jwt-secrets
│   └── smtp-credentials
├── Deployments
│   ├── backend (3 replicas)
│   ├── frontend (2 replicas)
│   ├── postgres (1 replica with StatefulSet)
│   └── redis (1 replica)
├── Services
│   ├── backend-service (ClusterIP)
│   ├── frontend-service (ClusterIP)
│   ├── postgres-service (ClusterIP)
│   └── redis-service (ClusterIP)
├── Ingress
│   └── clickview-ingress (HTTPS)
├── PersistentVolumeClaims
│   ├── postgres-pvc (50Gi)
│   └── redis-pvc (10Gi)
├── HorizontalPodAutoscalers
│   ├── backend-hpa
│   └── frontend-hpa
└── NetworkPolicies
    └── clickview-netpol
```

## Quick Start

### Option 1: Helm Chart (Recommended)

```bash
# 1. Add Helm repository
helm repo add clickview https://charts.clickview.io
helm repo update

# 2. Create values file
cat > values.yaml << EOF
global:
  domain: clickview.yourdomain.com

backend:
  replicaCount: 3
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2000m
      memory: 2Gi
  autoscaling:
    enabled: true
    minReplicas: 3
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70

frontend:
  replicaCount: 2
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 512Mi

postgresql:
  enabled: true
  auth:
    username: clickview_user
    password: CHANGE_THIS_PASSWORD
    database: clickview_db
  primary:
    persistence:
      enabled: true
      size: 50Gi
    resources:
      requests:
        cpu: 500m
        memory: 2Gi

redis:
  enabled: true
  master:
    persistence:
      enabled: true
      size: 10Gi

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: clickview.yourdomain.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: clickview-tls
      hosts:
        - clickview.yourdomain.com

monitoring:
  enabled: true
  prometheus:
    enabled: true
  grafana:
    enabled: true
EOF

# 3. Install with Helm
helm install clickview clickview/clickview \
  --namespace clickview \
  --values values.yaml \
  --create-namespace

# 4. Check deployment status
kubectl get pods -n clickview
kubectl get services -n clickview
kubectl get ingress -n clickview

# 5. Watch rollout
kubectl rollout status deployment/clickview-backend -n clickview
kubectl rollout status deployment/clickview-frontend -n clickview
```

### Option 2: Manual Kubernetes Manifests

See [Manual Deployment](#manual-deployment) section below.

## Manual Deployment

### 1. Create Namespace and Secrets

```bash
# Create namespace
kubectl create namespace clickview

# Generate secure keys
JWT_SECRET=$(openssl rand -hex 64)
ENCRYPTION_KEY=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 64)

# Create secrets
kubectl create secret generic clickview-secrets \
  --namespace=clickview \
  --from-literal=jwt-secret="${JWT_SECRET}" \
  --from-literal=encryption-key="${ENCRYPTION_KEY}" \
  --from-literal=session-secret="${SESSION_SECRET}"

# Database credentials
kubectl create secret generic postgres-credentials \
  --namespace=clickview \
  --from-literal=username=clickview_user \
  --from-literal=password="$(openssl rand -base64 32)" \
  --from-literal=database=clickview_db

# SMTP credentials (optional)
kubectl create secret generic smtp-credentials \
  --namespace=clickview \
  --from-literal=host=smtp.gmail.com \
  --from-literal=port=587 \
  --from-literal=user=your-email@gmail.com \
  --from-literal=password=your-app-password
```

### 2. Deploy PostgreSQL with TimescaleDB

```yaml
# k8s/postgres-statefulset.yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: clickview
spec:
  selector:
    app: postgres
  ports:
    - port: 5432
      targetPort: 5432
  clusterIP: None
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: clickview
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: timescale/timescaledb-ha:pg15-latest
        ports:
        - containerPort: 5432
          name: postgres
        env:
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: password
        - name: POSTGRES_DB
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: database
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
          limits:
            cpu: 2000m
            memory: 4Gi
        livenessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - clickview_user
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - clickview_user
          initialDelaySeconds: 5
          periodSeconds: 5
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: "standard"  # Change to your storage class
      resources:
        requests:
          storage: 50Gi
```

```bash
kubectl apply -f k8s/postgres-statefulset.yaml
```

### 3. Deploy Redis

```yaml
# k8s/redis-deployment.yaml
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: clickview
spec:
  selector:
    app: redis
  ports:
    - port: 6379
      targetPort: 6379
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: clickview
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        command:
        - redis-server
        - --appendonly
        - "yes"
        volumeMounts:
        - name: redis-storage
          mountPath: /data
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 1Gi
        livenessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: redis-storage
        persistentVolumeClaim:
          claimName: redis-pvc
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-pvc
  namespace: clickview
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: "standard"
  resources:
    requests:
      storage: 10Gi
```

```bash
kubectl apply -f k8s/redis-deployment.yaml
```

### 4. Deploy Backend

```yaml
# k8s/backend-deployment.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: backend-config
  namespace: clickview
data:
  NODE_ENV: "production"
  PORT: "3001"
  LOG_LEVEL: "info"
  FEATURE_AI_INSIGHTS: "true"
  FEATURE_MFA: "true"
  FEATURE_SSO: "true"
---
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: clickview
spec:
  selector:
    app: backend
  ports:
    - port: 3001
      targetPort: 3001
  type: ClusterIP
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: clickview
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: your-registry/clickview-backend:latest
        ports:
        - containerPort: 3001
        envFrom:
        - configMapRef:
            name: backend-config
        env:
        - name: DATABASE_URL
          value: "postgresql://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@postgres:5432/$(POSTGRES_DB)"
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: password
        - name: POSTGRES_DB
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: database
        - name: REDIS_URL
          value: "redis://redis:6379"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: clickview-secrets
              key: jwt-secret
        - name: ENCRYPTION_KEY
          valueFrom:
            secretKeyRef:
              name: clickview-secrets
              key: encryption-key
        - name: SESSION_SECRET
          valueFrom:
            secretKeyRef:
              name: clickview-secrets
              key: session-secret
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 2000m
            memory: 2Gi
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 5
```

```bash
kubectl apply -f k8s/backend-deployment.yaml
```

### 5. Deploy Frontend

```yaml
# k8s/frontend-deployment.yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: clickview
spec:
  selector:
    app: frontend
  ports:
    - port: 80
      targetPort: 80
  type: ClusterIP
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: clickview
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: your-registry/clickview-frontend:latest
        ports:
        - containerPort: 80
        env:
        - name: VITE_API_URL
          value: "https://clickview.yourdomain.com/api"
        - name: VITE_WS_URL
          value: "wss://clickview.yourdomain.com"
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
```

```bash
kubectl apply -f k8s/frontend-deployment.yaml
```

### 6. Configure Ingress

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: clickview
  namespace: clickview
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/websocket-services: "backend"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - clickview.yourdomain.com
    secretName: clickview-tls
  rules:
  - host: clickview.yourdomain.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: backend
            port:
              number: 3001
      - path: /graphql
        pathType: Prefix
        backend:
          service:
            name: backend
            port:
              number: 3001
      - path: /socket.io
        pathType: Prefix
        backend:
          service:
            name: backend
            port:
              number: 3001
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 80
```

```bash
kubectl apply -f k8s/ingress.yaml
```

## Configuration

### Auto-Scaling (HPA)

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: clickview
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: frontend-hpa
  namespace: clickview
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: frontend
  minReplicas: 2
  maxReplicas: 5
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

```bash
kubectl apply -f k8s/hpa.yaml
```

### Network Policies

```yaml
# k8s/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: clickview-netpol
  namespace: clickview
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
  - from:
    - podSelector: {}
  egress:
  - to:
    - podSelector: {}
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 53
    - protocol: UDP
      port: 53
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 443
```

```bash
kubectl apply -f k8s/network-policy.yaml
```

## Scaling

### Manual Scaling

```bash
# Scale backend
kubectl scale deployment backend --replicas=5 -n clickview

# Scale frontend
kubectl scale deployment frontend --replicas=3 -n clickview

# Check pod status
kubectl get pods -n clickview
```

### Cluster Auto-Scaling

For cloud providers, enable cluster autoscaler:

```bash
# AWS EKS
eksctl create cluster --enable-cluster-autoscaler

# GKE
gcloud container clusters update CLUSTER_NAME --enable-autoscaling \
  --min-nodes=3 --max-nodes=10

# AKS
az aks update --resource-group RESOURCE_GROUP --name CLUSTER_NAME \
  --enable-cluster-autoscaler --min-count=3 --max-count=10
```

## High Availability

### Database High Availability

For production, use managed PostgreSQL with replication:

- **AWS**: RDS PostgreSQL with Multi-AZ
- **GCP**: Cloud SQL with high availability
- **Azure**: Azure Database for PostgreSQL with zone redundancy

Or deploy PostgreSQL with replication using operators:

```bash
# Install CloudNativePG operator
kubectl apply -f https://get.enterprisedb.io/cnpg/postgresql-operator-1.21.0.yaml

# Deploy PostgreSQL cluster
kubectl apply -f k8s/postgres-cluster.yaml
```

### Redis High Availability

```bash
# Install Redis operator
helm install redis-operator ot-helm/redis-operator -n clickview

# Deploy Redis cluster
kubectl apply -f k8s/redis-cluster.yaml
```

## Monitoring

### Prometheus + Grafana

```bash
# Install kube-prometheus-stack
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set grafana.adminPassword=admin

# Access Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
# Open http://localhost:3000 (admin/admin)
```

### Application Metrics

Backend exposes Prometheus metrics at `/metrics`:

```yaml
# Add ServiceMonitor
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: backend-metrics
  namespace: clickview
spec:
  selector:
    matchLabels:
      app: backend
  endpoints:
  - port: http
    path: /metrics
```

## Backup and Restore

### Automated Backups with CronJob

```yaml
# k8s/backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: clickview
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:15
            command:
            - /bin/sh
            - -c
            - |
              pg_dump -h postgres -U $POSTGRES_USER $POSTGRES_DB | \
              gzip > /backups/backup-$(date +%Y%m%d-%H%M%S).sql.gz

              # Upload to S3
              aws s3 cp /backups/backup-$(date +%Y%m%d-%H%M%S).sql.gz \
                s3://your-backup-bucket/clickview/

              # Clean old local backups
              find /backups -name "backup-*.sql.gz" -mtime +7 -delete
            env:
            - name: POSTGRES_USER
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: username
            - name: POSTGRES_DB
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: database
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: password
            volumeMounts:
            - name: backup-storage
              mountPath: /backups
          restartPolicy: OnFailure
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-pvc
```

### Restore from Backup

```bash
# Copy backup to pod
kubectl cp backup-20240101-020000.sql.gz clickview/postgres-0:/tmp/

# Restore
kubectl exec -it postgres-0 -n clickview -- bash
gunzip -c /tmp/backup-20240101-020000.sql.gz | psql -U clickview_user clickview_db
```

## Troubleshooting

### Check Pod Status

```bash
# List all pods
kubectl get pods -n clickview

# Describe pod
kubectl describe pod POD_NAME -n clickview

# View logs
kubectl logs POD_NAME -n clickview
kubectl logs -f POD_NAME -n clickview  # Follow logs

# Previous container logs (if crashed)
kubectl logs POD_NAME -n clickview --previous
```

### Database Connection Issues

```bash
# Test database connection
kubectl exec -it POD_NAME -n clickview -- \
  psql -h postgres -U clickview_user -d clickview_db -c "SELECT 1"

# Check PostgreSQL logs
kubectl logs postgres-0 -n clickview
```

### Ingress Not Working

```bash
# Check ingress
kubectl get ingress -n clickview
kubectl describe ingress clickview -n clickview

# Check ingress controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
```

### Performance Issues

```bash
# Check resource usage
kubectl top pods -n clickview
kubectl top nodes

# Describe HPA status
kubectl describe hpa backend-hpa -n clickview

# Check for throttling
kubectl describe pod POD_NAME -n clickview | grep -i throttl
```

## Updates and Rollbacks

### Rolling Update

```bash
# Update image
kubectl set image deployment/backend \
  backend=your-registry/clickview-backend:v2.0.0 \
  -n clickview

# Watch rollout
kubectl rollout status deployment/backend -n clickview

# Check rollout history
kubectl rollout history deployment/backend -n clickview
```

### Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment/backend -n clickview

# Rollback to specific revision
kubectl rollout undo deployment/backend --to-revision=2 -n clickview
```

## Clean Up

```bash
# Delete all resources
kubectl delete namespace clickview

# Or with Helm
helm uninstall clickview -n clickview
```

---

For more information, see the main [DEPLOYMENT.md](./DEPLOYMENT.md) guide.

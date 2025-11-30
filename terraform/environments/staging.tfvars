# ============================================================
# ClickView Enterprise - Staging Environment
# ============================================================

environment  = "staging"
aws_region   = "us-east-1"
project_name = "clickview"

# ============================================================
# NETWORKING
# ============================================================

vpc_cidr = "10.1.0.0/16"

private_subnet_cidrs  = ["10.1.1.0/24", "10.1.2.0/24", "10.1.3.0/24"]
public_subnet_cidrs   = ["10.1.101.0/24", "10.1.102.0/24", "10.1.103.0/24"]
database_subnet_cidrs = ["10.1.201.0/24", "10.1.202.0/24", "10.1.203.0/24"]

# ============================================================
# EKS
# ============================================================

eks_cluster_version     = "1.28"
eks_node_instance_types = ["t3.medium"]
eks_node_min_size       = 1
eks_node_max_size       = 5
eks_node_desired_size   = 2

# ============================================================
# RDS
# ============================================================

rds_instance_class        = "db.t3.medium"
rds_replica_instance_class = "db.t3.small"
rds_allocated_storage     = 50
rds_max_allocated_storage = 100
rds_database_name         = "clickview_staging"
rds_username              = "clickview_staging"

# ============================================================
# ELASTICACHE
# ============================================================

redis_node_type = "cache.t3.small"

# ============================================================
# DOMAIN
# ============================================================

domain_name = "staging.clickview.app"

# ============================================================
# ALERTING
# ============================================================

alert_emails = [
  "staging-alerts@clickview.app"
]

# ============================================================
# TAGS
# ============================================================

additional_tags = {
  CostCenter = "staging"
  Team       = "engineering"
}

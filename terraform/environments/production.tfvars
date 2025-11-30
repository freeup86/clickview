# ============================================================
# ClickView Enterprise - Production Environment
# ============================================================

environment  = "production"
aws_region   = "us-east-1"
project_name = "clickview"

# ============================================================
# NETWORKING
# ============================================================

vpc_cidr = "10.0.0.0/16"

private_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
public_subnet_cidrs   = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
database_subnet_cidrs = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]

# ============================================================
# EKS
# ============================================================

eks_cluster_version     = "1.28"
eks_node_instance_types = ["t3.xlarge", "t3.large"]
eks_node_min_size       = 3
eks_node_max_size       = 20
eks_node_desired_size   = 5

# ============================================================
# RDS
# ============================================================

rds_instance_class         = "db.r6g.xlarge"
rds_replica_instance_class = "db.r6g.large"
rds_allocated_storage      = 200
rds_max_allocated_storage  = 1000
rds_database_name          = "clickview"
rds_username               = "clickview_admin"

# ============================================================
# ELASTICACHE
# ============================================================

redis_node_type = "cache.r6g.large"

# ============================================================
# DOMAIN & SSL
# ============================================================

domain_name = "clickview.app"
# acm_certificate_arn = "arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/CERT_ID"

# ============================================================
# ALERTING
# ============================================================

alert_emails = [
  "ops@clickview.app",
  "on-call@clickview.app"
]

# ============================================================
# TAGS
# ============================================================

additional_tags = {
  CostCenter  = "production"
  Team        = "platform"
  Compliance  = "soc2"
  DataClass   = "confidential"
}

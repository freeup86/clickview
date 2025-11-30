# ============================================================
# ClickView Enterprise - Terraform Infrastructure
# ============================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  backend "s3" {
    bucket         = "clickview-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "clickview-terraform-locks"
  }
}

# ============================================================
# PROVIDER CONFIGURATION
# ============================================================

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "ClickView"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = "DevOps"
    }
  }
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
  }
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
    }
  }
}

# ============================================================
# DATA SOURCES
# ============================================================

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# ============================================================
# VPC MODULE
# ============================================================

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.1"

  name = "${var.project_name}-${var.environment}-vpc"
  cidr = var.vpc_cidr

  azs             = slice(data.aws_availability_zones.available.names, 0, 3)
  private_subnets = var.private_subnet_cidrs
  public_subnets  = var.public_subnet_cidrs

  # Database subnets
  create_database_subnet_group       = true
  create_database_subnet_route_table = true
  database_subnets                   = var.database_subnet_cidrs

  # NAT Gateway
  enable_nat_gateway     = true
  single_nat_gateway     = var.environment != "production"
  one_nat_gateway_per_az = var.environment == "production"

  # DNS
  enable_dns_hostnames = true
  enable_dns_support   = true

  # VPC Flow Logs
  enable_flow_log                      = true
  create_flow_log_cloudwatch_log_group = true
  create_flow_log_cloudwatch_iam_role  = true
  flow_log_max_aggregation_interval    = 60

  # Tags for EKS
  public_subnet_tags = {
    "kubernetes.io/role/elb"                    = 1
    "kubernetes.io/cluster/${var.project_name}" = "shared"
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb"           = 1
    "kubernetes.io/cluster/${var.project_name}" = "shared"
  }

  tags = {
    Environment = var.environment
  }
}

# ============================================================
# SECURITY GROUPS
# ============================================================

# ALB Security Group
resource "aws_security_group" "alb" {
  name        = "${var.project_name}-${var.environment}-alb-sg"
  description = "Security group for Application Load Balancer"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-alb-sg"
  }
}

# Application Security Group
resource "aws_security_group" "app" {
  name        = "${var.project_name}-${var.environment}-app-sg"
  description = "Security group for application pods"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description     = "From ALB"
    from_port       = 3001
    to_port         = 3001
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description = "From self (cluster communication)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    self        = true
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-app-sg"
  }
}

# Database Security Group
resource "aws_security_group" "database" {
  name        = "${var.project_name}-${var.environment}-db-sg"
  description = "Security group for RDS database"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description     = "PostgreSQL from app"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-db-sg"
  }
}

# Redis Security Group
resource "aws_security_group" "redis" {
  name        = "${var.project_name}-${var.environment}-redis-sg"
  description = "Security group for ElastiCache Redis"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description     = "Redis from app"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-sg"
  }
}

# ============================================================
# EKS CLUSTER
# ============================================================

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.16"

  cluster_name    = "${var.project_name}-${var.environment}"
  cluster_version = var.eks_cluster_version

  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  # Cluster access configuration
  enable_irsa = true

  # Managed node groups
  eks_managed_node_groups = {
    general = {
      name           = "general-workers"
      instance_types = var.eks_node_instance_types

      min_size     = var.eks_node_min_size
      max_size     = var.eks_node_max_size
      desired_size = var.eks_node_desired_size

      disk_size = 50

      labels = {
        role = "general"
      }

      tags = {
        Environment = var.environment
      }
    }

    spot = {
      name           = "spot-workers"
      instance_types = ["t3.large", "t3.xlarge", "t3a.large"]
      capacity_type  = "SPOT"

      min_size     = var.environment == "production" ? 2 : 0
      max_size     = var.environment == "production" ? 10 : 3
      desired_size = var.environment == "production" ? 2 : 1

      disk_size = 50

      labels = {
        role     = "spot"
        workload = "non-critical"
      }

      taints = [{
        key    = "spot"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]
    }
  }

  # Cluster addons
  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
    aws-ebs-csi-driver = {
      most_recent              = true
      service_account_role_arn = module.ebs_csi_irsa.iam_role_arn
    }
  }

  tags = {
    Environment = var.environment
  }
}

# EBS CSI Driver IRSA
module "ebs_csi_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.30"

  role_name             = "${var.project_name}-${var.environment}-ebs-csi"
  attach_ebs_csi_policy = true

  oidc_providers = {
    main = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["kube-system:ebs-csi-controller-sa"]
    }
  }
}

# ============================================================
# RDS POSTGRESQL
# ============================================================

module "rds" {
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 6.1"

  identifier = "${var.project_name}-${var.environment}-postgres"

  engine               = "postgres"
  engine_version       = "15.4"
  family               = "postgres15"
  major_engine_version = "15"
  instance_class       = var.rds_instance_class

  allocated_storage     = var.rds_allocated_storage
  max_allocated_storage = var.rds_max_allocated_storage
  storage_encrypted     = true

  db_name  = var.rds_database_name
  username = var.rds_username
  port     = 5432

  # High availability
  multi_az = var.environment == "production"

  # Networking
  db_subnet_group_name   = module.vpc.database_subnet_group_name
  vpc_security_group_ids = [aws_security_group.database.id]
  publicly_accessible    = false

  # Backup
  backup_retention_period = var.environment == "production" ? 30 : 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Sun:04:00-Sun:05:00"

  # Enhanced monitoring
  monitoring_interval             = 60
  monitoring_role_name            = "${var.project_name}-${var.environment}-rds-monitoring"
  create_monitoring_role          = true
  performance_insights_enabled    = true
  performance_insights_retention_period = 7

  # Parameters
  parameters = [
    {
      name  = "shared_preload_libraries"
      value = "pg_stat_statements,timescaledb"
    },
    {
      name  = "log_statement"
      value = "ddl"
    },
    {
      name  = "log_min_duration_statement"
      value = "1000"
    }
  ]

  # Deletion protection
  deletion_protection = var.environment == "production"

  tags = {
    Environment = var.environment
  }
}

# RDS Read Replica (Production only)
resource "aws_db_instance" "read_replica" {
  count = var.environment == "production" ? 1 : 0

  identifier = "${var.project_name}-${var.environment}-postgres-replica"

  instance_class    = var.rds_replica_instance_class
  replicate_source_db = module.rds.db_instance_identifier

  vpc_security_group_ids = [aws_security_group.database.id]
  publicly_accessible    = false

  # Performance Insights
  performance_insights_enabled = true

  tags = {
    Name        = "${var.project_name}-${var.environment}-postgres-replica"
    Environment = var.environment
  }
}

# ============================================================
# ELASTICACHE REDIS
# ============================================================

resource "aws_elasticache_subnet_group" "redis" {
  name       = "${var.project_name}-${var.environment}-redis-subnet"
  subnet_ids = module.vpc.private_subnets

  tags = {
    Environment = var.environment
  }
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "${var.project_name}-${var.environment}-redis"
  description          = "Redis cluster for ClickView ${var.environment}"

  node_type            = var.redis_node_type
  port                 = 6379
  parameter_group_name = "default.redis7"

  # Cluster mode
  num_cache_clusters = var.environment == "production" ? 3 : 1
  automatic_failover_enabled = var.environment == "production"

  # Networking
  subnet_group_name  = aws_elasticache_subnet_group.redis.name
  security_group_ids = [aws_security_group.redis.id]

  # Encryption
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token

  # Maintenance
  maintenance_window         = "sun:05:00-sun:06:00"
  snapshot_retention_limit   = var.environment == "production" ? 7 : 1
  snapshot_window            = "04:00-05:00"
  auto_minor_version_upgrade = true

  tags = {
    Environment = var.environment
  }
}

# ============================================================
# SECRETS MANAGER
# ============================================================

resource "aws_secretsmanager_secret" "database_credentials" {
  name        = "${var.project_name}/${var.environment}/database"
  description = "Database credentials for ClickView ${var.environment}"

  tags = {
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "database_credentials" {
  secret_id = aws_secretsmanager_secret.database_credentials.id
  secret_string = jsonencode({
    username = var.rds_username
    password = module.rds.db_instance_password
    host     = module.rds.db_instance_address
    port     = module.rds.db_instance_port
    database = var.rds_database_name
  })
}

resource "aws_secretsmanager_secret" "redis_credentials" {
  name        = "${var.project_name}/${var.environment}/redis"
  description = "Redis credentials for ClickView ${var.environment}"

  tags = {
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "redis_credentials" {
  secret_id = aws_secretsmanager_secret.redis_credentials.id
  secret_string = jsonencode({
    host       = aws_elasticache_replication_group.redis.primary_endpoint_address
    port       = 6379
    auth_token = var.redis_auth_token
  })
}

resource "aws_secretsmanager_secret" "app_secrets" {
  name        = "${var.project_name}/${var.environment}/app"
  description = "Application secrets for ClickView ${var.environment}"

  tags = {
    Environment = var.environment
  }
}

# ============================================================
# S3 BUCKETS
# ============================================================

# Backup bucket
resource "aws_s3_bucket" "backups" {
  bucket = "${var.project_name}-${var.environment}-backups-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "${var.project_name}-${var.environment}-backups"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "backups" {
  bucket = aws_s3_bucket.backups.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    id     = "archive-old-backups"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 365
    }
  }
}

# Static assets bucket
resource "aws_s3_bucket" "assets" {
  bucket = "${var.project_name}-${var.environment}-assets-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "${var.project_name}-${var.environment}-assets"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket = aws_s3_bucket.assets.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ============================================================
# CLOUDFRONT
# ============================================================

resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "ClickView ${var.environment} CDN"
  default_root_object = "index.html"
  price_class         = var.environment == "production" ? "PriceClass_All" : "PriceClass_100"

  aliases = var.environment == "production" ? [var.domain_name] : []

  origin {
    domain_name = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.assets.id}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.main.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.assets.id}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.environment != "production"
    acm_certificate_arn            = var.environment == "production" ? var.acm_certificate_arn : null
    ssl_support_method             = var.environment == "production" ? "sni-only" : null
    minimum_protocol_version       = "TLSv1.2_2021"
  }

  tags = {
    Environment = var.environment
  }
}

resource "aws_cloudfront_origin_access_identity" "main" {
  comment = "ClickView ${var.environment} OAI"
}

# ============================================================
# WAF
# ============================================================

resource "aws_wafv2_web_acl" "main" {
  name        = "${var.project_name}-${var.environment}-waf"
  description = "WAF for ClickView ${var.environment}"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  # AWS Managed Rules - Common Rule Set
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules - SQL Injection
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesSQLiRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  # Rate limiting
  rule {
    name     = "RateLimitRule"
    priority = 3

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRuleMetric"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "ClickViewWAFMetric"
    sampled_requests_enabled   = true
  }

  tags = {
    Environment = var.environment
  }
}

# ============================================================
# CLOUDWATCH ALARMS
# ============================================================

resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "${var.project_name}-${var.environment}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "CPU utilization is above 80%"

  alarm_actions = [aws_sns_topic.alerts.arn]

  dimensions = {
    AutoScalingGroupName = module.eks.eks_managed_node_groups["general"].node_group_autoscaling_group_names[0]
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_cpu_high" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "RDS CPU utilization is above 80%"

  alarm_actions = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = module.rds.db_instance_identifier
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_connections_high" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-connections-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 90
  alarm_description   = "RDS connections are above 90%"

  alarm_actions = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = module.rds.db_instance_identifier
  }
}

# ============================================================
# SNS TOPIC FOR ALERTS
# ============================================================

resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-${var.environment}-alerts"

  tags = {
    Environment = var.environment
  }
}

resource "aws_sns_topic_subscription" "alerts_email" {
  count     = length(var.alert_emails)
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_emails[count.index]
}

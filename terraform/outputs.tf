# ============================================================
# ClickView Enterprise - Terraform Outputs
# ============================================================

# ============================================================
# VPC
# ============================================================

output "vpc_id" {
  description = "The ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr" {
  description = "The CIDR block of the VPC"
  value       = module.vpc.vpc_cidr_block
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = module.vpc.private_subnets
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = module.vpc.public_subnets
}

output "database_subnet_ids" {
  description = "List of database subnet IDs"
  value       = module.vpc.database_subnets
}

output "database_subnet_group_name" {
  description = "Name of the database subnet group"
  value       = module.vpc.database_subnet_group_name
}

# ============================================================
# EKS
# ============================================================

output "eks_cluster_name" {
  description = "Name of the EKS cluster"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "Endpoint for EKS cluster"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_certificate_authority_data" {
  description = "Certificate authority data for EKS cluster"
  value       = module.eks.cluster_certificate_authority_data
  sensitive   = true
}

output "eks_cluster_oidc_issuer_url" {
  description = "The URL on the EKS cluster for the OpenID Connect identity provider"
  value       = module.eks.cluster_oidc_issuer_url
}

output "eks_cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = module.eks.cluster_security_group_id
}

output "eks_kubectl_config" {
  description = "kubectl config command to update kubeconfig"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}

# ============================================================
# RDS
# ============================================================

output "rds_endpoint" {
  description = "The connection endpoint for the RDS instance"
  value       = module.rds.db_instance_endpoint
}

output "rds_address" {
  description = "The address of the RDS instance"
  value       = module.rds.db_instance_address
}

output "rds_port" {
  description = "The port of the RDS instance"
  value       = module.rds.db_instance_port
}

output "rds_database_name" {
  description = "The database name"
  value       = module.rds.db_instance_name
}

output "rds_instance_id" {
  description = "The RDS instance ID"
  value       = module.rds.db_instance_identifier
}

output "rds_replica_endpoint" {
  description = "The endpoint of the read replica (production only)"
  value       = var.environment == "production" ? aws_db_instance.read_replica[0].endpoint : null
}

# ============================================================
# ELASTICACHE
# ============================================================

output "redis_endpoint" {
  description = "The primary endpoint for Redis"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "redis_reader_endpoint" {
  description = "The reader endpoint for Redis (if cluster mode)"
  value       = aws_elasticache_replication_group.redis.reader_endpoint_address
}

output "redis_port" {
  description = "The port for Redis"
  value       = 6379
}

# ============================================================
# SECRETS
# ============================================================

output "database_secret_arn" {
  description = "ARN of the database credentials secret"
  value       = aws_secretsmanager_secret.database_credentials.arn
}

output "redis_secret_arn" {
  description = "ARN of the Redis credentials secret"
  value       = aws_secretsmanager_secret.redis_credentials.arn
}

output "app_secret_arn" {
  description = "ARN of the application secrets"
  value       = aws_secretsmanager_secret.app_secrets.arn
}

# ============================================================
# S3
# ============================================================

output "backups_bucket_name" {
  description = "Name of the backups S3 bucket"
  value       = aws_s3_bucket.backups.id
}

output "backups_bucket_arn" {
  description = "ARN of the backups S3 bucket"
  value       = aws_s3_bucket.backups.arn
}

output "assets_bucket_name" {
  description = "Name of the assets S3 bucket"
  value       = aws_s3_bucket.assets.id
}

output "assets_bucket_arn" {
  description = "ARN of the assets S3 bucket"
  value       = aws_s3_bucket.assets.arn
}

# ============================================================
# CLOUDFRONT
# ============================================================

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.id
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.domain_name
}

# ============================================================
# WAF
# ============================================================

output "waf_web_acl_arn" {
  description = "ARN of the WAF Web ACL"
  value       = aws_wafv2_web_acl.main.arn
}

output "waf_web_acl_id" {
  description = "ID of the WAF Web ACL"
  value       = aws_wafv2_web_acl.main.id
}

# ============================================================
# SECURITY GROUPS
# ============================================================

output "alb_security_group_id" {
  description = "Security group ID for ALB"
  value       = aws_security_group.alb.id
}

output "app_security_group_id" {
  description = "Security group ID for application"
  value       = aws_security_group.app.id
}

output "database_security_group_id" {
  description = "Security group ID for database"
  value       = aws_security_group.database.id
}

output "redis_security_group_id" {
  description = "Security group ID for Redis"
  value       = aws_security_group.redis.id
}

# ============================================================
# ALERTING
# ============================================================

output "alerts_sns_topic_arn" {
  description = "ARN of the SNS topic for alerts"
  value       = aws_sns_topic.alerts.arn
}

# ============================================================
# SUMMARY
# ============================================================

output "infrastructure_summary" {
  description = "Summary of deployed infrastructure"
  value = {
    environment    = var.environment
    region         = var.aws_region
    vpc_id         = module.vpc.vpc_id
    eks_cluster    = module.eks.cluster_name
    rds_endpoint   = module.rds.db_instance_endpoint
    redis_endpoint = aws_elasticache_replication_group.redis.primary_endpoint_address
    cdn_domain     = aws_cloudfront_distribution.main.domain_name
  }
}

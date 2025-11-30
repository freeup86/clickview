# ============================================================
# ClickView Enterprise - Terraform Variables
# ============================================================

# ============================================================
# GENERAL
# ============================================================

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "clickview"
}

variable "environment" {
  description = "Environment name (development, staging, production)"
  type        = string

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production."
  }
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

# ============================================================
# NETWORKING
# ============================================================

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

variable "database_subnet_cidrs" {
  description = "CIDR blocks for database subnets"
  type        = list(string)
  default     = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]
}

# ============================================================
# EKS
# ============================================================

variable "eks_cluster_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.28"
}

variable "eks_node_instance_types" {
  description = "Instance types for EKS worker nodes"
  type        = list(string)
  default     = ["t3.large"]
}

variable "eks_node_min_size" {
  description = "Minimum number of EKS worker nodes"
  type        = number
  default     = 2
}

variable "eks_node_max_size" {
  description = "Maximum number of EKS worker nodes"
  type        = number
  default     = 10
}

variable "eks_node_desired_size" {
  description = "Desired number of EKS worker nodes"
  type        = number
  default     = 3
}

# ============================================================
# RDS
# ============================================================

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.large"
}

variable "rds_replica_instance_class" {
  description = "RDS read replica instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "rds_allocated_storage" {
  description = "Allocated storage for RDS in GB"
  type        = number
  default     = 100
}

variable "rds_max_allocated_storage" {
  description = "Maximum allocated storage for RDS autoscaling in GB"
  type        = number
  default     = 500
}

variable "rds_database_name" {
  description = "Name of the database"
  type        = string
  default     = "clickview"
}

variable "rds_username" {
  description = "Master username for RDS"
  type        = string
  default     = "clickview_admin"
}

# ============================================================
# ELASTICACHE
# ============================================================

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.medium"
}

variable "redis_auth_token" {
  description = "Auth token for Redis"
  type        = string
  sensitive   = true
}

# ============================================================
# DOMAIN & SSL
# ============================================================

variable "domain_name" {
  description = "Primary domain name"
  type        = string
  default     = "clickview.app"
}

variable "acm_certificate_arn" {
  description = "ARN of ACM certificate for CloudFront"
  type        = string
  default     = ""
}

# ============================================================
# ALERTING
# ============================================================

variable "alert_emails" {
  description = "Email addresses for alert notifications"
  type        = list(string)
  default     = []
}

# ============================================================
# TAGS
# ============================================================

variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}

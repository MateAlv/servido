# Defaults are chosen to stay inside the AWS Free plan (accounts created on or after
# 2025-07-15): only free-plan-eligible instance classes, 20 GB of database storage, and
# short database backups. See infra/README.md before changing them.

variable "region" {
  description = "AWS region. us-east-1 is the cheapest."
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name, used in resource names. One environment for the course (ADR 0008)."
  type        = string
  default     = "prod"
}

variable "github_repository" {
  description = "owner/name of the repository the instance clones and the deploy workflow runs from."
  type        = string
  default     = "MateAlv/servido"
}

variable "alert_email" {
  description = "Email that receives budget alerts."
  type        = string
}

variable "monthly_budget_usd" {
  description = "Monthly budget in USD, measured before credits are applied (it tracks how fast credits are spent)."
  type        = number
  default     = 15
}

variable "api_instance_type" {
  description = "EC2 instance type for the API. The Free plan only launches the types listed in the validation."
  type        = string
  default     = "t4g.micro"

  validation {
    condition     = contains(["t4g.micro", "t4g.small", "t3.micro", "t3.small"], var.api_instance_type)
    error_message = "Use a Free-plan-eligible type: t4g.micro, t4g.small, t3.micro or t3.small."
  }
}

variable "db_instance_class" {
  description = "RDS instance class. The Free plan rejects anything bigger than micro."
  type        = string
  default     = "db.t4g.micro"

  validation {
    condition     = contains(["db.t4g.micro", "db.t3.micro"], var.db_instance_class)
    error_message = "The Free plan only allows db.t4g.micro or db.t3.micro."
  }
}

variable "db_allocated_storage_gb" {
  description = "Database storage in GB (20 is the free-tier size and the minimum for gp2)."
  type        = number
  default     = 20

  validation {
    condition     = var.db_allocated_storage_gb == 20
    error_message = "Keep 20 GB: it is the free-tier size and the minimum RDS allows."
  }
}

variable "db_backup_retention_days" {
  description = "Days of automated database backups. If the apply fails with FreeTierRestrictionError, set 0."
  type        = number
  default     = 1

  validation {
    condition     = var.db_backup_retention_days >= 0 && var.db_backup_retention_days <= 7
    error_message = "Use between 0 and 7 days; the Free plan rejects long retention."
  }
}

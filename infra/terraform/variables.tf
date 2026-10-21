# Defaults are chosen to stay inside the AWS Free plan (accounts created on or after
# 2025-07-15). See infra/README.md before changing them.

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

variable "github_oidc_subject_prefix" {
  description = "Subject prefix of the repository's GitHub OIDC tokens when it uses immutable subjects, with the owner and repository IDs. `gh api repos/OWNER/REPO/actions/oidc/customization/sub` prints it."
  type        = string
  default     = "repo:MateAlv@92270678/servido@1424448711"
}

variable "alert_emails" {
  description = "Emails that receive budget alerts."
  type        = list(string)
}

variable "monthly_budget_usd" {
  description = "Monthly budget in USD, measured before credits are applied (it tracks how fast credits are spent)."
  type        = number
  default     = 15
}

variable "instance_type" {
  description = "EC2 instance type. t4g.small has a free trial of 750 hours a month until 2026-12-31; the Free plan only launches the types in the validation."
  type        = string
  default     = "t4g.small"

  validation {
    condition     = contains(["t4g.small", "t4g.micro", "t3.small", "t3.micro"], var.instance_type)
    error_message = "Use a Free-plan-eligible type: t4g.small, t4g.micro, t3.small or t3.micro."
  }
}

variable "data_snapshot_id" {
  description = "Only to restore a backup, together with -replace=aws_ebs_volume.data (see infra/README.md)."
  type        = string
  default     = null
}

variable "domain_name" {
  description = "Custom address for the app, with its DNS in Cloudflare (see infra/README.md). null keeps only the *.cloudfront.net address."
  type        = string
  default     = "servido.discordia.fyi"
}

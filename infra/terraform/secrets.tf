# SSM Parameter Store (standard tier) is free; deploy.sh reads this on the instance.
resource "random_password" "postgres" {
  length  = 32
  special = false
}

resource "aws_ssm_parameter" "postgres_password" {
  name        = "/${local.name}/postgres-password"
  description = "Password of the servido PostgreSQL user on the app instance"
  type        = "SecureString"
  value       = random_password.postgres.result
}

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

resource "random_password" "jwt" {
  length  = 64
  special = false
}

resource "aws_ssm_parameter" "jwt_secret" {
  name        = "/${local.name}/jwt-secret"
  description = "Key that signs the API's login tokens (HS256)"
  type        = "SecureString"
  value       = random_password.jwt.result
}

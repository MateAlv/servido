# SSM Parameter Store (standard tier) is free; the API reads this at deploy time.
resource "aws_ssm_parameter" "database_url" {
  name        = "/${local.name}/database-url"
  description = "SQLAlchemy URL of the RDS database"
  type        = "SecureString"
  value       = "postgresql+psycopg://${aws_db_instance.main.username}:${random_password.db.result}@${aws_db_instance.main.endpoint}/${aws_db_instance.main.db_name}?sslmode=require"
}

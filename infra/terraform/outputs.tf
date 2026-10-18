output "site_url" {
  description = "Public address of the app."
  value       = "https://${aws_cloudfront_distribution.main.domain_name}"
}

output "api_health_url" {
  value = "https://${aws_cloudfront_distribution.main.domain_name}/api/health"
}

output "api_instance_id" {
  description = "For `aws ssm start-session --target <id>`."
  value       = aws_instance.api.id
}

output "database_endpoint" {
  value = aws_db_instance.main.address
}

output "github_variables" {
  description = "Run these once so the Deploy workflow can reach this environment."
  value       = <<-EOT
    gh variable set AWS_REGION --body "${var.region}"
    gh variable set AWS_DEPLOY_ROLE_ARN --body "${aws_iam_role.deploy.arn}"
    gh variable set EC2_INSTANCE_ID --body "${aws_instance.api.id}"
    gh variable set FRONTEND_BUCKET --body "${aws_s3_bucket.frontend.bucket}"
    gh variable set CLOUDFRONT_DISTRIBUTION_ID --body "${aws_cloudfront_distribution.main.id}"
  EOT
}

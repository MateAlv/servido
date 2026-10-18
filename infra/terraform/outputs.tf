output "site_url" {
  description = "Public address of the app."
  value       = "https://${aws_cloudfront_distribution.main.domain_name}"
}

output "api_health_url" {
  value = "https://${aws_cloudfront_distribution.main.domain_name}/api/health"
}

output "instance_id" {
  description = "For `aws ssm start-session --target <id>`."
  value       = aws_instance.app.id
}

output "github_variables" {
  description = "Run these once so the Deploy workflow can reach this environment."
  value       = <<-EOT
    gh variable set AWS_REGION --body "${var.region}"
    gh variable set AWS_DEPLOY_ROLE_ARN --body "${aws_iam_role.deploy.arn}"
    gh variable set EC2_INSTANCE_ID --body "${aws_instance.app.id}"
  EOT
}

locals {
  site_host = local.custom_domain ? var.domain_name : aws_cloudfront_distribution.main.domain_name
}

output "site_url" {
  description = "Public address of the app."
  value       = "https://${local.site_host}"
}

output "api_health_url" {
  value = "https://${local.site_host}/api/health"
}

output "cloudflare_dns_records" {
  description = "Add these in Cloudflare (DNS only, grey cloud): the certificate validation, then the app's address."
  value = local.custom_domain ? concat(
    [for o in aws_acm_certificate.site[0].domain_validation_options :
    "CNAME  ${trimsuffix(o.resource_record_name, ".")}  ->  ${trimsuffix(o.resource_record_value, ".")}"],
    ["CNAME  ${var.domain_name}  ->  ${aws_cloudfront_distribution.main.domain_name}"],
  ) : []
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

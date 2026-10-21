# HTTPS on the custom domain: an ACM certificate (free, renews itself) validated by a CNAME
# that someone adds by hand in Cloudflare, where the domain's DNS lives. CloudFront only
# accepts certificates from us-east-1, which is this stack's region.

locals {
  custom_domain = var.domain_name != null
}

resource "aws_acm_certificate" "site" {
  count             = local.custom_domain ? 1 : 0
  domain_name       = var.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# Waits until ACM sees the validation record; apply the certificate alone first (infra/README.md).
resource "aws_acm_certificate_validation" "site" {
  count           = local.custom_domain ? 1 : 0
  certificate_arn = aws_acm_certificate.site[0].arn
}

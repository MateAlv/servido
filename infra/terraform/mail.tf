# Transactional mail (spec 007, US-51) through Amazon SES, sent as no-reply@<domain_name>.
# Easy DKIM proves the domain: its three CNAMEs go in Cloudflare by hand, like the ACM
# validation (terraform output ses_dkim_records). Leaving the SES sandbox is a one-time request
# in the console (infra/README.md); until then SES only delivers to verified addresses.

resource "aws_sesv2_email_identity" "mail" {
  count          = local.custom_domain ? 1 : 0
  email_identity = var.domain_name
}

# Any identity of this account, not just the domain: in the sandbox SES also checks the
# permission against each verified recipient.
data "aws_iam_policy_document" "app_mail" {
  statement {
    actions   = ["ses:SendEmail"]
    resources = ["arn:aws:ses:${var.region}:${local.account_id}:identity/*"]
  }
}

resource "aws_iam_role_policy" "app_mail" {
  count  = local.custom_domain ? 1 : 0
  name   = "send-app-mail"
  role   = aws_iam_role.app.id
  policy = data.aws_iam_policy_document.app_mail.json
}

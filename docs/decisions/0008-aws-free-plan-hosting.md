# 0008 — Hosting on the AWS Free plan with Terraform

- **Status**: Accepted
- **Date**: 2026-10-18
- **Supersedes**: the hosting part left open in [0006](0006-database-on-rds.md)

## Context

The MVP has no real users and must run for about two months on one AWS account on the Free plan (accounts created after 2025-07-15): USD 100 of sign-up credit, up to USD 100 more for onboarding activities, 6 months at most, and the account closes instead of billing when the credits run out. The Free plan only launches some instance types and rejects others, and joining an AWS Organization or setting up Control Tower upgrades it to the paid plan for good. Only one team member has cloud experience. GitHub Actions is free for public repositories.

## Decision

- **Terraform** in `infra/terraform`, state in S3 with native locking. Nothing is created by hand in the console.
- **One environment** (`prod`) in `us-east-1`. Local Docker and CI are the test environment.
- **CloudFront** is the only public address: the frontend from a private S3 bucket, and `/api/*` to the API. HTTPS on `*.cloudfront.net` until the team buys a domain.
- **API** on one EC2 `t4g.micro` (Amazon Linux 2023, Docker, standard CPU credits), with an Elastic IP and no SSH: SSM Session Manager and Run Command only. It only accepts traffic from CloudFront.
- **Database** on RDS PostgreSQL 17 `db.t4g.micro`, 20 GB, private, reachable only from the API.
- **Secrets** in SSM Parameter Store.
- **Deploys** with GitHub Actions on merges to `main`: OIDC role (no stored keys), `deploy.sh` on the instance through SSM, then the frontend to S3 and a CloudFront invalidation.
- **Budget alert** at USD 15/month measured before credits, emailed to the team.

## Consequences

- About USD 25/month of credits, about USD 50 for the course, within the sign-up credit.
- The cronograma's separate test environment is dropped: a second copy would double the cost. The cost plan in the artifacts workbook should be updated (it budgeted two environments).
- With the defaults, the USD 15 forecast alert fires every month; it signals the burn rate.
- The account closes when the Free plan ends; anything worth keeping must be exported before that. `terraform destroy` removes everything at the end of the course.
- A single instance means a few seconds of downtime per deploy, acceptable for an MVP.
- A custom domain later needs an ACM certificate in `us-east-1` and a DNS record; nothing else changes.

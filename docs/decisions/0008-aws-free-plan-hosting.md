# 0008 — Hosting on the AWS Free plan: everything in Docker on one instance

- **Status**: Accepted
- **Date**: 2026-10-18
- **Supersedes**: [0006](0006-database-on-rds.md) (production database on RDS)

## Context

The MVP has no real users and must run for about two months on one AWS account on the Free plan (accounts created after 2025-07-15). It gets USD 100 of sign-up credit, up to USD 100 more for onboarding activities, and lasts 6 months at most (this account received USD 120 in total, expiring on 2027-04-18). The account closes instead of billing when the credits run out. The Free plan only launches some instance types. Joining an AWS Organization or setting up Control Tower upgrades it to the paid plan for good. EC2 `t4g.small` has a free trial of 750 hours a month until 2026-12-31. Only one team member has cloud experience. GitHub Actions is free for public repositories.

A first version of this decision put the database on RDS (`db.t4g.micro`) and the frontend in S3: about USD 24.6/month, of which RDS was USD 14. For one user at a time, what RDS adds (managed backups, patching, failover) is not worth more than half the cost. It also gives the team a second way of running the database to learn.

## Decision

- **Terraform** in `infra/terraform`, state in S3 with native locking. Nothing is created by hand in the console.
- **One environment** (`prod`) in `us-east-1`. Local Docker and CI are the test environment.
- **One EC2 `t4g.small`** (Amazon Linux 2023, standard CPU credits, Elastic IP, no SSH: SSM only) runs three containers with Docker Compose:
  - `db`: PostgreSQL 17, the same image as development and CI.
  - `api`: FastAPI, the same image as `make up`.
  - `web`: nginx with the React build; it forwards `/api` to the API. Locally, `make up` runs the Vite dev server instead.
- **CloudFront** is the only public address: HTTPS on `servido.discordia.fyi` (a free subdomain of a team member's domain, DNS in Cloudflare, certificate from ACM) and on its `*.cloudfront.net` address. The instance only accepts traffic from CloudFront. Only `/assets/*` (file names with a content hash) is cached at the edge.
- **Data** on its own encrypted EBS volume, snapshotted every night by Data Lifecycle Manager, last 7 kept.
- **Secrets** in SSM Parameter Store: the database password and the key that signs login tokens.
- **Deploys** with GitHub Actions on merges to `main` (or run by hand): OIDC role (no stored keys), then `deploy.sh` on the instance through SSM Run Command, which pulls the commit, writes the secrets to the instance's `.env` and rebuilds the containers. Terraform is applied by hand, never by CI.
- **Budget alert** at USD 15/month measured before credits, emailed to the team.

## Consequences

- About USD 5.4/month of credits (disk and public IPv4; the instance is on the free trial), about USD 11 for the course. If the trial does not combine with the Free plan, about USD 17.6/month. The budget alert shows which case applies in the first month.
- Production has the same `compose` shape everyone runs locally (database, API, web), so the whole team can understand and debug it.
- No managed database: if the volume fails, the last nightly snapshot is restored, losing up to a day of data. Acceptable for MVP data. PostgreSQL upgrades are an image change.
- The cost plan presented to the PO budgeted two environments with RDS; it should be updated to this setup. The cronograma's separate test environment is dropped.
- A deploy restarts the containers: a few seconds of downtime, acceptable for an MVP.
- The account closes when the Free plan ends; anything worth keeping must be exported before that. `terraform destroy` removes everything at the end of the course.
- The custom domain only needed an ACM certificate in `us-east-1` and two DNS records in Cloudflare; nothing else changed. Moving to another domain is the same steps with a different `domain_name`.

# Infrastructure

Servido! runs on one AWS account on the **Free plan**, in `us-east-1`, defined with Terraform. Why it looks like this: [ADR 0008](../docs/decisions/0008-aws-free-plan-hosting.md). Diagrams: [docs/architecture/](../docs/architecture/).

```text
infra/
├── terraform/            Everything in AWS (apply from here)
│   ├── bootstrap/        One-time: the S3 bucket that stores Terraform state
│   ├── cloudfront/       CloudFront Function for single-page-app routing
│   └── user_data.sh.tftpl  First boot of the API instance
└── ec2/                  What runs on the API instance: compose.yml and deploy.sh
```

| Piece | AWS service | Size |
| --- | --- | --- |
| Public address (HTTPS) | CloudFront (`*.cloudfront.net`) | Price class 100 |
| Frontend (static files) | S3, private, read only by CloudFront | — |
| API (FastAPI in Docker) | EC2 + Elastic IP | `t4g.micro`, 10 GB gp3 |
| Database | RDS PostgreSQL 17, private | `db.t4g.micro`, 20 GB gp2 |
| Secrets | SSM Parameter Store (SecureString) | Standard tier |
| Deploys | GitHub Actions → OIDC role → S3 + SSM Run Command | — |
| Spend alert | AWS Budgets | USD 15/month |

## Free plan rules

The account must stay on the Free plan: it never bills real money, and when the credits or the 6 months run out it closes. These rules keep it that way.

- **Only Free-plan-eligible sizes.** EC2: `t4g.micro`, `t4g.small`, `t3.micro`, `t3.small` (the variables reject anything else). RDS: `db.t4g.micro` or `db.t3.micro`, 20 GB, short backups.
- **Never** join or create an AWS Organization, set up Control Tower or IAM Identity Center, buy Savings Plans or Reserved Instances, or subscribe to AWS Marketplace products. Joining an Organization or setting up Control Tower upgrades the account to the paid plan for good, and IAM Identity Center normally sits on top of an Organization.
- Plain IAM users, roles and the GitHub OIDC provider used here are fine.
- No NAT gateways, load balancers or extra environments: they would eat the credits in weeks.
- Every change goes through Terraform, never the console, so `terraform destroy` can clean everything at the end.

## Cost

On-demand prices in `us-east-1`, all paid from the credits:

| Resource | USD/month |
| --- | --- |
| EC2 `t4g.micro` (730 h) | 6.13 |
| EBS gp3 10 GB | 0.80 |
| Elastic IP (public IPv4) | 3.65 |
| RDS `db.t4g.micro` (730 h) | 11.68 |
| RDS gp2 20 GB | 2.30 |
| S3, CloudFront, SSM, Budgets | ~0 (free-tier usage) |
| **Total** | **~24.6** |

Two months of development use about USD 50 of the USD 100 sign-up credit. AWS offers up to USD 100 more for onboarding activities; creating an EC2 instance, an RDS database and a budget are among them. Check the balance under Billing → Free Tier.

The USD 15 budget is measured before credits, so with the defaults its forecast alert fires early every month. It is a reminder of the burn rate, not a problem. Set `monthly_budget_usd = 30` to only hear about anomalies.

## First setup

Whoever creates the account:

1. Sign up at aws.amazon.com and choose the **Free plan**. Turn on MFA for the root user.
2. Create an IAM user for the person who runs Terraform, with `AdministratorAccess` and MFA. Do not use the root user day to day.

Whoever runs Terraform (needs Terraform ≥ 1.10, AWS CLI v2, `gh` and the Session Manager plugin):

```bash
# 1. Credentials for this account only, in their own profile
aws configure --profile servido          # access keys of the IAM user, region us-east-1
export AWS_PROFILE=servido
aws sts get-caller-identity              # check it is the Servido! account

# 2. One-time: the bucket for Terraform state
cd infra/terraform/bootstrap
terraform init && terraform apply
terraform output -raw backend_config > ../backend.hcl

# 3. The environment
cd ..
cp terraform.tfvars.example terraform.tfvars   # set alert_email
terraform init -backend-config=backend.hcl
terraform plan                                 # read it: only the resources in the table above
terraform apply                                # about 10 minutes, RDS is the slowest

# 4. Wait 5 minutes for the instance's first boot, then
curl "$(terraform output -raw api_health_url)" # {"status":"ok","database":"ok"}

# 5. Let GitHub Actions deploy (run from the repository root, needs repo admin)
terraform -chdir=infra/terraform output -raw github_variables | bash
gh workflow run deploy.yml
```

After that, every merge to `main` that touches `backend/`, `frontend/` or `infra/ec2/` deploys automatically. The app is at `terraform output site_url`.

## Day to day

| Task | Command |
| --- | --- |
| Shell on the instance | `aws ssm start-session --target "$(terraform output -raw api_instance_id)"` |
| API logs | `sudo docker compose -f /opt/servido/infra/ec2/compose.yml logs -f` (in that shell) |
| Deploy by hand | `sudo /opt/servido/infra/ec2/deploy.sh main` (in that shell), or `gh workflow run deploy.yml` |
| Database from your machine | `aws ssm start-session --target <instance-id> --document-name AWS-StartPortForwardingSessionToRemoteHost --parameters "host=<database_endpoint>,portNumber=5432,localPortNumber=5433"`, then connect to `localhost:5433` with the password in SSM `/servido-prod/database-url` |
| Snapshot before a risky migration | `aws rds create-db-snapshot --db-instance-identifier servido-prod --db-snapshot-identifier before-<name>` (delete it afterwards) |

## When things fail

| Error | Fix |
| --- | --- |
| `FreeTierRestrictionError` about backup retention | `db_backup_retention_days = 0` in `terraform.tfvars`, apply again |
| `FreeTierRestrictionError` about the instance size | Use the defaults; the Free plan rejects anything bigger than micro |
| `InsufficientDBInstanceCapacity` | `db_instance_class = "db.t3.micro"` |
| `EntityAlreadyExists` for the GitHub OIDC provider | Someone created it already: `terraform import aws_iam_openid_connect_provider.github <arn>` |
| Health check fails after apply | The first boot takes a few minutes. Then check `/var/log/cloud-init-output.log` in a Session Manager shell |

## At the end of the course

```bash
terraform -chdir=infra/terraform destroy
terraform -chdir=infra/terraform/bootstrap destroy
```

Then check Billing for anything left (manual RDS snapshots) or simply let the Free plan account close.

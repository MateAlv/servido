# Infrastructure

Servido! runs on one AWS account on the **Free plan**, in `us-east-1`, defined with Terraform. Production is the same three containers as `make up` (database, API and web) on one EC2 instance, with CloudFront in front for HTTPS. Why it looks like this: [ADR 0008](../docs/decisions/0008-aws-free-plan-hosting.md). Diagrams: [docs/architecture/](../docs/architecture/).

```text
infra/
├── terraform/            Everything in AWS (apply from here)
│   ├── bootstrap/        One-time: the S3 bucket that stores Terraform state
│   └── user_data.sh.tftpl  First boot of the instance
└── ec2/                  What runs on the instance: compose.yml and deploy.sh
```

| Piece | Where | Size |
| --- | --- | --- |
| Public address (HTTPS) | CloudFront (`*.cloudfront.net`) | Price class 100 |
| Web: the React build, served by nginx, which forwards `/api` | Container `web` | — |
| API (FastAPI) | Container `api` | — |
| Database (PostgreSQL 17) | Container `db`, data on its own EBS volume | 8 GB gp3 |
| The instance running the three containers | EC2 + Elastic IP | `t4g.small` (2 vCPU, 2 GB), 12 GB gp3 |
| Backups | Data Lifecycle Manager: a snapshot of the database volume every night, last 7 kept | — |
| Secrets | SSM Parameter Store (SecureString) | Standard tier |
| Deploys | GitHub Actions → OIDC role → SSM Run Command on the instance | — |
| Spend alert | AWS Budgets | USD 15/month |

The containers are defined in [ec2/compose.yml](ec2/compose.yml). The web image is [frontend/Dockerfile](../frontend/Dockerfile) with [frontend/nginx.conf](../frontend/nginx.conf); the API image is the same [backend/Dockerfile](../backend/Dockerfile) that `make up` uses.

## Free plan rules

The account must stay on the Free plan: it never bills real money, and when the credits or the 6 months run out it closes. These rules keep it that way.

- **Only Free-plan-eligible sizes.** EC2: `t4g.small` (default), `t4g.micro`, `t3.small` or `t3.micro`; the variables reject anything else.
- **Never** join or create an AWS Organization, set up Control Tower or IAM Identity Center, buy Savings Plans or Reserved Instances, or subscribe to AWS Marketplace products. Joining an Organization or setting up Control Tower upgrades the account to the paid plan for good, and IAM Identity Center normally sits on top of an Organization.
- Plain IAM users, roles and the GitHub OIDC provider used here are fine.
- No RDS, NAT gateways, load balancers or extra environments: one instance runs everything.
- Every change goes through Terraform, never the console, so `terraform destroy` can clean everything at the end.

## Cost

On-demand prices in `us-east-1`, all paid from the credits:

| Resource | USD/month |
| --- | --- |
| EC2 `t4g.small` (730 h) | 0 (free trial: 750 h/month until 2026-12-31; 12.26 without it) |
| EBS gp3, 12 + 8 GB | 1.60 |
| Elastic IP (public IPv4) | 3.65 |
| Nightly snapshots (only changed blocks) | ~0.10 |
| CloudFront, SSM, Budgets, Data Lifecycle Manager | ~0 (free-tier usage) |
| **Total** | **~5.4** |

Two months of development use about USD 11 of the USD 100 sign-up credit. The `t4g.small` free trial applies to every AWS account, but nothing confirms how it combines with the Free plan. If it does not apply, the total is about USD 17.6/month, still inside the credit. The USD 15 budget, measured before credits, will tell you in the first month (see [When things fail](#when-things-fail)). Check the balance under Billing → Free Tier.

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
cp terraform.tfvars.example terraform.tfvars   # set alert_emails
terraform init -backend-config=backend.hcl
terraform plan                                 # read it: only the pieces in the table above
terraform apply                                # a few minutes, CloudFront is the slowest

# 4. Wait about 10 minutes for the instance's first boot (it builds the images), then
curl "$(terraform output -raw api_health_url)" # {"status":"ok","database":"ok"}

# 5. Let GitHub Actions deploy (run from the repository root, needs repo admin)
terraform -chdir=infra/terraform output -raw github_variables | bash
gh workflow run deploy.yml
```

After that, every merge to `main` that touches `backend/`, `frontend/` or `infra/ec2/` deploys automatically: the instance pulls the commit and rebuilds the containers, and migrations run when the API starts. The app is at `terraform output site_url`.

## Day to day

Commands marked *(shell)* run in a Session Manager shell on the instance.

| Task | Command |
| --- | --- |
| Shell on the instance | `aws ssm start-session --target "$(terraform output -raw instance_id)"` |
| State and logs *(shell)* | `cd /opt/servido/infra/ec2`, then `sudo docker compose ps` and `sudo docker compose logs -f api` |
| Deploy by hand | `gh workflow run deploy.yml`, or `sudo /opt/servido/infra/ec2/deploy.sh main` *(shell)* |
| SQL console *(shell)* | `sudo docker compose -f /opt/servido/infra/ec2/compose.yml exec db psql -U servido` |
| Dump before a risky migration *(shell)* | `sudo docker compose -f /opt/servido/infra/ec2/compose.yml exec db pg_dump -U servido servido > ~/before-<name>.sql` |
| List the nightly snapshots | `aws ec2 describe-snapshots --owner-ids self --filters Name=tag:Snapshot,Values=servido-prod-daily --query 'Snapshots[].[StartTime,SnapshotId]' --output table` |

### Restoring a snapshot

This replaces the database with the state of that night, and replaces the instance too. Data written after the snapshot is lost.

```bash
cd infra/terraform
terraform apply -replace=aws_ebs_volume.data -var data_snapshot_id=snap-0123456789abcdef0
terraform output -raw github_variables | bash   # the instance ID changed
```

The new instance mounts the restored volume and deploys `main`, as on the first setup.

## When things fail

| Symptom | Fix |
| --- | --- |
| The budget alert fires in the first month | The `t4g.small` free trial is not applying to this account: check the EC2 line under Billing → Bills. Either accept about USD 17.6/month (still inside the credits) or set `instance_type = "t4g.micro"` (about USD 11.4/month in total, 1 GB of memory). |
| `FreeTierRestrictionError` or "not eligible for Free Tier" about the instance size | Use the defaults; the Free plan rejects anything bigger. |
| `InsufficientInstanceCapacity` | Try again later, or `instance_type = "t3.small"`. |
| `EntityAlreadyExists` for the GitHub OIDC provider | Someone created it already: `terraform import aws_iam_openid_connect_provider.github <arn>` |
| Health check fails after apply | The first boot takes about 10 minutes. Then check `/var/log/cloud-init-output.log` and `sudo docker compose ps` *(shell)*. |
| Disk full on the instance | `sudo docker system prune` *(shell)*. The database is on its own volume and is not affected. |
| The Deploy workflow cannot find the instance | The instance was replaced (for example by a change in `user_data.sh.tftpl`): run step 5 of the first setup again. |

## At the end of the course

```bash
terraform -chdir=infra/terraform destroy
terraform -chdir=infra/terraform/bootstrap destroy
```

`destroy` leaves the nightly snapshots behind. Delete them with the IDs from "List the nightly snapshots" (`aws ec2 delete-snapshot --snapshot-id <id>`), or simply let the Free plan account close.

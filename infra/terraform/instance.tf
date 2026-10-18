locals {
  arm64 = startswith(var.instance_type, "t4g")
}

# Amazon Linux 2023 is a Free-tier-eligible image; the parameter always points to the latest.
data "aws_ssm_parameter" "al2023" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-${local.arm64 ? "arm64" : "x86_64"}"
}

data "aws_subnet" "app" {
  id = sort(data.aws_subnets.app.ids)[0]
}

data "aws_iam_policy_document" "app_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "app" {
  name               = "${local.name}-app"
  assume_role_policy = data.aws_iam_policy_document.app_assume.json
}

# Session Manager and Run Command: shell access and deploys without SSH keys or open ports.
resource "aws_iam_role_policy_attachment" "app_ssm" {
  role       = aws_iam_role.app.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

data "aws_iam_policy_document" "app_parameters" {
  statement {
    actions   = ["ssm:GetParameter"]
    resources = ["arn:aws:ssm:${var.region}:${local.account_id}:parameter/${local.name}/*"]
  }
}

resource "aws_iam_role_policy" "app_parameters" {
  name   = "read-app-parameters"
  role   = aws_iam_role.app.id
  policy = data.aws_iam_policy_document.app_parameters.json
}

resource "aws_iam_instance_profile" "app" {
  name = "${local.name}-app"
  role = aws_iam_role.app.name
}

# PostgreSQL lives on its own volume: replacing the instance keeps the data, and
# backups.tf snapshots it every day.
resource "aws_ebs_volume" "data" {
  availability_zone = data.aws_subnet.app.availability_zone
  type              = "gp3"
  size              = 8
  encrypted         = true
  snapshot_id       = var.data_snapshot_id

  tags = {
    Name     = "${local.name}-data"
    Snapshot = local.snapshot_tag
  }

  # The snapshot only matters when the volume is created: a later apply without the
  # variable must not replace the restored volume with an empty one.
  lifecycle {
    ignore_changes = [snapshot_id]
  }
}

resource "aws_instance" "app" {
  ami                         = nonsensitive(data.aws_ssm_parameter.al2023.value)
  instance_type               = var.instance_type
  subnet_id                   = data.aws_subnet.app.id
  vpc_security_group_ids      = [aws_security_group.app.id]
  iam_instance_profile        = aws_iam_instance_profile.app.name
  associate_public_ip_address = true

  # Standard CPU credits: a busy instance slows down instead of billing surplus credits,
  # which the t4g.small free trial does not cover.
  credit_specification {
    cpu_credits = "standard"
  }

  metadata_options {
    http_tokens = "required"
  }

  root_block_device {
    volume_type = "gp3"
    volume_size = 12
    encrypted   = true
  }

  user_data = templatefile("${path.module}/user_data.sh.tftpl", {
    region           = var.region
    parameter_prefix = "/${local.name}"
    repository_url   = local.repository_url
    data_device      = "/dev/disk/by-id/nvme-Amazon_Elastic_Block_Store_${replace(aws_ebs_volume.data.id, "-", "")}"
    compose_url      = "https://github.com/docker/compose/releases/download/v5.5.1/docker-compose-linux-${local.arm64 ? "aarch64" : "x86_64"}"
    buildx_url       = "https://github.com/docker/buildx/releases/download/v0.37.2/buildx-v0.37.2.linux-${local.arm64 ? "arm64" : "amd64"}"
  })
  user_data_replace_on_change = true

  # A new Amazon Linux release must not replace the running instance.
  lifecycle {
    ignore_changes = [ami]
  }

  tags = {
    Name = "${local.name}-app"
  }

  depends_on = [aws_ssm_parameter.postgres_password]
}

resource "aws_volume_attachment" "data" {
  device_name = "/dev/sdf"
  volume_id   = aws_ebs_volume.data.id
  instance_id = aws_instance.app.id

  # Stops the instance (and PostgreSQL with it) before detaching, so the data stays consistent.
  stop_instance_before_detaching = true
}

# A stable address, so CloudFront's origin survives instance stops and replacements.
resource "aws_eip" "app" {
  domain   = "vpc"
  instance = aws_instance.app.id

  tags = {
    Name = "${local.name}-app"
  }
}

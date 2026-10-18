locals {
  api_arm64 = startswith(var.api_instance_type, "t4g")
}

# Amazon Linux 2023 is a Free-tier-eligible image; the parameter always points to the latest.
data "aws_ssm_parameter" "al2023" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-${local.api_arm64 ? "arm64" : "x86_64"}"
}

data "aws_iam_policy_document" "api_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "api" {
  name               = "${local.name}-api"
  assume_role_policy = data.aws_iam_policy_document.api_assume.json
}

# Session Manager and Run Command: shell access and deploys without SSH keys or open ports.
resource "aws_iam_role_policy_attachment" "api_ssm" {
  role       = aws_iam_role.api.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

data "aws_iam_policy_document" "api_parameters" {
  statement {
    actions   = ["ssm:GetParameter"]
    resources = ["arn:aws:ssm:${var.region}:${local.account_id}:parameter/${local.name}/*"]
  }
}

resource "aws_iam_role_policy" "api_parameters" {
  name   = "read-app-parameters"
  role   = aws_iam_role.api.id
  policy = data.aws_iam_policy_document.api_parameters.json
}

resource "aws_iam_instance_profile" "api" {
  name = "${local.name}-api"
  role = aws_iam_role.api.name
}

resource "aws_instance" "api" {
  ami                         = nonsensitive(data.aws_ssm_parameter.al2023.value)
  instance_type               = var.api_instance_type
  subnet_id                   = sort(data.aws_subnets.api.ids)[0]
  vpc_security_group_ids      = [aws_security_group.api.id]
  iam_instance_profile        = aws_iam_instance_profile.api.name
  associate_public_ip_address = true

  # Standard CPU credits: a busy instance slows down instead of billing surplus credits.
  credit_specification {
    cpu_credits = "standard"
  }

  metadata_options {
    http_tokens = "required"
  }

  root_block_device {
    volume_type = "gp3"
    volume_size = 10
    encrypted   = true
  }

  user_data = templatefile("${path.module}/user_data.sh.tftpl", {
    region           = var.region
    parameter_prefix = "/${local.name}"
    repository_url   = local.repository_url
    compose_url      = "https://github.com/docker/compose/releases/download/v5.5.1/docker-compose-linux-${local.api_arm64 ? "aarch64" : "x86_64"}"
    buildx_url       = "https://github.com/docker/buildx/releases/download/v0.37.2/buildx-v0.37.2.linux-${local.api_arm64 ? "arm64" : "amd64"}"
  })
  user_data_replace_on_change = true

  # A new Amazon Linux release must not replace the running instance.
  lifecycle {
    ignore_changes = [ami]
  }

  tags = {
    Name = "${local.name}-api"
  }

  depends_on = [aws_ssm_parameter.database_url]
}

# A stable address, so CloudFront's origin survives instance stops and replacements.
resource "aws_eip" "api" {
  domain   = "vpc"
  instance = aws_instance.api.id

  tags = {
    Name = "${local.name}-api"
  }
}

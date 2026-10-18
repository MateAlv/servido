# Data Lifecycle Manager snapshots the database volume every night and keeps the last 7.
# The service is free; snapshots only store the blocks that changed, a few cents a month.

locals {
  snapshot_tag = "${local.name}-daily"
}

data "aws_iam_policy_document" "snapshots_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["dlm.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "snapshots" {
  name               = "${local.name}-snapshots"
  assume_role_policy = data.aws_iam_policy_document.snapshots_assume.json
}

resource "aws_iam_role_policy_attachment" "snapshots" {
  role       = aws_iam_role.snapshots.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSDataLifecycleManagerServiceRole"
}

resource "aws_dlm_lifecycle_policy" "data" {
  description        = "Daily snapshots of the ${local.name} database volume"
  execution_role_arn = aws_iam_role.snapshots.arn
  state              = "ENABLED"

  policy_details {
    resource_types = ["VOLUME"]

    target_tags = {
      Snapshot = local.snapshot_tag
    }

    schedule {
      name      = "daily"
      copy_tags = true

      # 06:00 UTC is 03:00 in Buenos Aires.
      create_rule {
        interval      = 24
        interval_unit = "HOURS"
        times         = ["06:00"]
      }

      retain_rule {
        count = 7
      }
    }
  }
}

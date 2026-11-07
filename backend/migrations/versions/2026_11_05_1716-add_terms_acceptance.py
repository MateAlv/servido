"""Store acceptance of the current terms for newly created accounts.

Revision ID: terms_acceptance_20261105
Revises: e0e674653e2f
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "terms_acceptance_20261105"
down_revision: str | None = "e0e674653e2f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    for table in ("comensales", "restaurantes"):
        op.add_column(table, sa.Column("terms_version", sa.String(length=20), nullable=True))
        op.add_column(
            table,
            sa.Column("terms_accepted_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_check_constraint(
            f"ck_{table}_terms_acceptance_complete",
            table,
            "(terms_version IS NULL AND terms_accepted_at IS NULL) OR "
            "(terms_version IS NOT NULL AND terms_accepted_at IS NOT NULL)",
        )


def downgrade() -> None:
    for table in ("restaurantes", "comensales"):
        op.drop_constraint(f"ck_{table}_terms_acceptance_complete", table, type_="check")
        op.drop_column(table, "terms_accepted_at")
        op.drop_column(table, "terms_version")

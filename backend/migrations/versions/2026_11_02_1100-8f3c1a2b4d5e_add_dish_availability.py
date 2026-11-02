"""Add dish availability.

Revision ID: 8f3c1a2b4d5e
Revises: 737b715b85e4
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "8f3c1a2b4d5e"
down_revision: str | None = "737b715b85e4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "platos",
        sa.Column("disponible", sa.Boolean(), server_default=sa.true(), nullable=False),
    )


def downgrade() -> None:
    op.drop_column("platos", "disponible")

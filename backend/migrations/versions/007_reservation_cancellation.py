"""Store the cancellation instant of reservations.

Revision ID: 007_reservation_cancellation
Revises: 006_reservations
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "007_reservation_cancellation"
down_revision: str | None = "006_reservations"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "reservations",
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_check_constraint(
        "ck_reservations_cancelled_at_matches_status",
        "reservations",
        "(status = 'confirmed' AND cancelled_at IS NULL) "
        "OR (status = 'cancelled' AND cancelled_at IS NOT NULL)",
    )


def downgrade() -> None:
    op.drop_constraint("ck_reservations_cancelled_at_matches_status", "reservations", type_="check")
    op.drop_column("reservations", "cancelled_at")

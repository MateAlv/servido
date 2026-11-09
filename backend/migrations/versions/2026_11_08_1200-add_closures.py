"""add closures

Revision ID: closures_20261108
Revises: merge_reviews_terms_20261107
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "closures_20261108"
down_revision: str | Sequence[str] | None = "merge_reviews_terms_20261107"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "closures",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("restaurant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=True),
        sa.Column("end_time", sa.Time(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column("request_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.CheckConstraint(
            "(start_time IS NULL AND end_time IS NULL) OR "
            "(start_time IS NOT NULL AND end_time IS NOT NULL)",
            name="closure_times_complete",
        ),
        sa.CheckConstraint("start_time IS NULL OR end_time > start_time", name="end_after_start"),
        sa.ForeignKeyConstraint(
            ["restaurant_id"], ["restaurantes.id_restaurante"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("request_id"),
    )
    op.create_index("ix_closures_restaurant_id_date", "closures", ["restaurant_id", "date"])


def downgrade() -> None:
    op.drop_index("ix_closures_restaurant_id_date", table_name="closures")
    op.drop_table("closures")

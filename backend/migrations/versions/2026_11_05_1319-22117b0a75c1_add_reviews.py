"""The diner's reviews of finished reservations (spec 012, US-27, US-50).

Revision ID: 22117b0a75c1
Revises: e0e674653e2f
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "22117b0a75c1"
down_revision: str | None = "e0e674653e2f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "reviews",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("reservation_id", sa.UUID(), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("comment", sa.String(length=500), nullable=True),
        sa.Column("spend_per_person", sa.Numeric(precision=10, scale=0), nullable=True),
        sa.Column(
            "published_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "comment IS NULL OR (length(trim(comment)) > 0 AND length(comment) <= 500)",
            name=op.f("ck_reviews_comment_not_blank_and_within_limit"),
        ),
        sa.CheckConstraint(
            "rating BETWEEN 1 AND 5", name=op.f("ck_reviews_rating_between_1_and_5")
        ),
        sa.CheckConstraint(
            "spend_per_person IS NULL OR spend_per_person BETWEEN 1 AND 1000000",
            name=op.f("ck_reviews_spend_per_person_within_limits"),
        ),
        sa.ForeignKeyConstraint(
            ["reservation_id"],
            ["reservations.id"],
            name=op.f("fk_reviews_reservation_id_reservations"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_reviews")),
        sa.UniqueConstraint("reservation_id", name=op.f("uq_reviews_reservation_id")),
    )


def downgrade() -> None:
    op.drop_table("reviews")

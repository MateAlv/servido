"""The restaurant's replies to reviews (spec 025, US-42).

Revision ID: adcf6e505647
Revises: 5061ebdc5acd
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "adcf6e505647"
down_revision: str | None = "5061ebdc5acd"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "review_replies",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("review_id", sa.UUID(), nullable=False),
        sa.Column("text", sa.String(length=500), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column("edited_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "length(trim(text)) > 0 AND length(text) <= 500",
            name=op.f("ck_review_replies_text_not_blank_and_within_limit"),
        ),
        sa.ForeignKeyConstraint(
            ["review_id"],
            ["reviews.id"],
            name=op.f("fk_review_replies_review_id_reviews"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_review_replies")),
        sa.UniqueConstraint("review_id", name=op.f("uq_review_replies_review_id")),
    )


def downgrade() -> None:
    op.drop_table("review_replies")

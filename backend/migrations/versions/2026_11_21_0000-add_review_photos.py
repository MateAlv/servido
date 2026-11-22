"""Add ordered review photos."""

import sqlalchemy as sa
from alembic import op

revision = "review_photos_20261121"
down_revision = "promotions_20261119"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "review_photos",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("review_id", sa.Uuid(), nullable=False),
        sa.Column("position", sa.SmallInteger(), nullable=False),
        sa.Column("media_type", sa.String(10), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "position BETWEEN 1 AND 4", name=op.f("ck_review_photos_position_in_range")
        ),
        sa.CheckConstraint(
            "media_type IN ('image/jpeg', 'image/png', 'image/webp')",
            name=op.f("ck_review_photos_supported_media_type"),
        ),
        sa.ForeignKeyConstraint(
            ["review_id"],
            ["reviews.id"],
            name=op.f("fk_review_photos_review_id_reviews"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_review_photos")),
        sa.UniqueConstraint(
            "review_id", "position", name=op.f("uq_review_photos_review_id_position")
        ),
    )


def downgrade() -> None:
    op.drop_table("review_photos")

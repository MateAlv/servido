"""Email verification of diners (spec 007, US-51).

Revision ID: 003_email_verification
Revises: 002_restaurant_names
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "003_email_verification"
down_revision: str | None = "002_restaurant_names"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "comensales",
        sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True),
    )
    # Accounts created before this feature count as verified (spec 007, assumptions).
    op.execute("UPDATE comensales SET email_verified_at = CURRENT_TIMESTAMP")

    op.create_table(
        "email_verifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("diner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["diner_id"],
            ["comensales.id_comensal"],
            name="fk_email_verifications_diner_id_comensales",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_email_verifications"),
        sa.UniqueConstraint("diner_id", name="uq_email_verifications_diner_id"),
        sa.UniqueConstraint("token_hash", name="uq_email_verifications_token_hash"),
    )


def downgrade() -> None:
    op.drop_table("email_verifications")
    op.drop_column("comensales", "email_verified_at")

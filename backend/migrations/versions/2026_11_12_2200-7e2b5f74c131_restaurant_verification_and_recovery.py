"""Restaurant account verification and recovery (spec 026, US-44 and US-46).

`email_verified_at` is set for every existing restaurant, because those accounts were created
before this feature (same rule as spec 019 for diners): none of them disappears from the map.
`has_password` is true for every existing account, and `password_changed_at` stays NULL until a
password is changed (data-model.md).

Revision ID: 7e2b5f74c131
Revises: 5061ebdc5acd
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "7e2b5f74c131"
down_revision: str | None = "5061ebdc5acd"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "restaurantes",
        sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "restaurantes",
        sa.Column(
            "has_password",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
    )
    op.add_column(
        "restaurantes",
        sa.Column("password_changed_at", sa.DateTime(timezone=True), nullable=True),
    )
    # Accounts created before this feature count as verified (spec 026, research R6).
    op.execute("UPDATE restaurantes SET email_verified_at = CURRENT_TIMESTAMP")

    op.create_table(
        "restaurant_email_verifications",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("restaurant_id", sa.UUID(), nullable=False),
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
            ["restaurant_id"],
            ["restaurantes.id_restaurante"],
            name=op.f("fk_restaurant_email_verifications_restaurant_id_restaurantes"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_restaurant_email_verifications")),
        sa.UniqueConstraint(
            "restaurant_id", name=op.f("uq_restaurant_email_verifications_restaurant_id")
        ),
        sa.UniqueConstraint(
            "token_hash", name=op.f("uq_restaurant_email_verifications_token_hash")
        ),
    )

    op.create_table(
        "restaurant_password_resets",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("restaurant_id", sa.UUID(), nullable=False),
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
            ["restaurant_id"],
            ["restaurantes.id_restaurante"],
            name=op.f("fk_restaurant_password_resets_restaurant_id_restaurantes"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_restaurant_password_resets")),
        sa.UniqueConstraint(
            "restaurant_id", name=op.f("uq_restaurant_password_resets_restaurant_id")
        ),
        sa.UniqueConstraint("token_hash", name=op.f("uq_restaurant_password_resets_token_hash")),
    )


def downgrade() -> None:
    op.drop_table("restaurant_password_resets")
    op.drop_table("restaurant_email_verifications")
    op.drop_column("restaurantes", "password_changed_at")
    op.drop_column("restaurantes", "has_password")
    op.drop_column("restaurantes", "email_verified_at")

"""Add password recovery for diners (spec 013).

`has_password` is true for every existing account, including the ones created with Google
before this feature: they can ask for a link and set a password (data-model.md).
`password_changed_at` stays NULL until a password is changed.

Revision ID: 5061ebdc5acd
Revises: 7086b989611c
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "5061ebdc5acd"
down_revision: str | None = "7086b989611c"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "password_reset_requests",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column(
            "requested_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_password_reset_requests")),
    )
    op.create_index(
        "ix_password_reset_requests_email_requested_at",
        "password_reset_requests",
        ["email", "requested_at"],
        unique=False,
    )
    op.create_table(
        "password_resets",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("diner_id", sa.UUID(), nullable=False),
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
            name=op.f("fk_password_resets_diner_id_comensales"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_password_resets")),
        sa.UniqueConstraint("diner_id", name=op.f("uq_password_resets_diner_id")),
        sa.UniqueConstraint("token_hash", name=op.f("uq_password_resets_token_hash")),
    )
    op.add_column(
        "comensales",
        sa.Column("has_password", sa.Boolean(), server_default=sa.text("true"), nullable=False),
    )
    op.add_column(
        "comensales", sa.Column("password_changed_at", sa.DateTime(timezone=True), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("comensales", "password_changed_at")
    op.drop_column("comensales", "has_password")
    op.drop_table("password_resets")
    op.drop_index(
        "ix_password_reset_requests_email_requested_at", table_name="password_reset_requests"
    )
    op.drop_table("password_reset_requests")

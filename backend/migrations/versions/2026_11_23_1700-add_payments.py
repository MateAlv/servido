"""Add the electronic payments of orders (spec 032, US-56)."""

import sqlalchemy as sa
from alembic import op

revision = "payments_20261123"
down_revision = "review_photos_20261121"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "payments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("order_id", sa.Uuid(), nullable=False),
        sa.Column("request_id", sa.Uuid(), nullable=False),
        sa.Column("provider_payment_id", sa.String(32), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("status_detail", sa.String(64), nullable=False),
        sa.Column("card_brand", sa.String(32), nullable=True),
        sa.Column("card_last_four", sa.String(4), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("amount > 0", name=op.f("ck_payments_amount_positive")),
        sa.CheckConstraint(
            "status IN ('approved', 'rejected', 'in_process')",
            name=op.f("ck_payments_status_known"),
        ),
        sa.CheckConstraint(
            "(status = 'approved') = (approved_at IS NOT NULL)",
            name=op.f("ck_payments_approved_at_matches_status"),
        ),
        sa.ForeignKeyConstraint(
            ["order_id"],
            ["pedidos.id"],
            ondelete="CASCADE",
            name=op.f("fk_payments_order_id_pedidos"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_payments")),
        sa.UniqueConstraint("request_id", name=op.f("uq_payments_request_id")),
        sa.UniqueConstraint("provider_payment_id", name=op.f("uq_payments_provider_payment_id")),
    )
    op.create_index(
        "payments_one_live_per_order",
        "payments",
        ["order_id"],
        unique=True,
        postgresql_where=sa.text("status IN ('approved', 'in_process')"),
    )


def downgrade() -> None:
    op.drop_index("payments_one_live_per_order", table_name="payments")
    op.drop_table("payments")

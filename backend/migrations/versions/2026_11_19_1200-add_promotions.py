"""add promotions and the frozen bill of an order

Revision ID: promotions_20261119
Revises: 05189283b55a
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "promotions_20261119"
down_revision: str | Sequence[str] | None = "05189283b55a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "restaurantes",
        sa.Column(
            "stack_promotions",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )

    op.create_table(
        "promotions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("restaurant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("discount_type", sa.String(length=10), nullable=False),
        sa.Column("discount_value", sa.Numeric(10, 2), nullable=False),
        sa.Column("minimum_amount", sa.Numeric(10, 2), nullable=True),
        sa.Column("starts_on", sa.Date(), nullable=True),
        sa.Column("ends_on", sa.Date(), nullable=True),
        sa.Column("weekdays", postgresql.ARRAY(sa.Integer()), nullable=True),
        sa.Column("start_time", sa.Time(), nullable=True),
        sa.Column("end_time", sa.Time(), nullable=True),
        sa.Column("active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("stackable", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("request_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint("length(trim(name)) > 0", name="name_not_blank"),
        sa.CheckConstraint("discount_type IN ('percentage', 'fixed')", name="discount_type_known"),
        sa.CheckConstraint("discount_value > 0", name="discount_value_positive"),
        sa.CheckConstraint(
            "discount_type <> 'percentage' OR (discount_value <= 100 AND minimum_amount IS NULL)",
            name="percentage_bounds",
        ),
        sa.CheckConstraint(
            "discount_type <> 'fixed' OR "
            "(minimum_amount IS NOT NULL AND minimum_amount > 0 "
            "AND minimum_amount >= discount_value)",
            name="fixed_minimum",
        ),
        sa.CheckConstraint(
            "(starts_on IS NULL AND ends_on IS NULL) OR "
            "(starts_on IS NOT NULL AND ends_on IS NOT NULL AND ends_on >= starts_on)",
            name="dates_complete",
        ),
        sa.CheckConstraint(
            "(start_time IS NULL AND end_time IS NULL) OR "
            "(start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)",
            name="times_complete",
        ),
        sa.CheckConstraint(
            "starts_on IS NOT NULL OR weekdays IS NOT NULL OR start_time IS NOT NULL",
            name="some_validity",
        ),
        sa.CheckConstraint(
            "weekdays IS NULL OR weekdays <@ ARRAY[1,2,3,4,5,6,7]", name="weekdays_valid"
        ),
        sa.ForeignKeyConstraint(
            ["restaurant_id"], ["restaurantes.id_restaurante"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("request_id"),
    )
    op.create_index(
        "ix_promotions_restaurant_id_created_at",
        "promotions",
        ["restaurant_id", "created_at"],
    )

    op.add_column("pedidos", sa.Column("subtotal", sa.Numeric(10, 2), nullable=True))
    op.add_column("pedidos", sa.Column("discount_amount", sa.Numeric(10, 2), nullable=True))
    op.add_column("pedidos", sa.Column("total", sa.Numeric(10, 2), nullable=True))
    op.execute(
        """
        UPDATE pedidos
        SET subtotal = COALESCE(
                (SELECT SUM(items.quantity * items.unit_price)
                 FROM pedido_items AS items
                 WHERE items.order_id = pedidos.id),
                0
            )
        """
    )
    op.execute("UPDATE pedidos SET discount_amount = 0, total = subtotal")
    op.alter_column("pedidos", "subtotal", nullable=False)
    op.alter_column("pedidos", "discount_amount", server_default=sa.text("0"), nullable=False)
    op.alter_column("pedidos", "total", nullable=False)
    op.create_check_constraint("subtotal_not_negative", "pedidos", "subtotal >= 0")
    op.create_check_constraint(
        "discount_within_subtotal",
        "pedidos",
        "discount_amount >= 0 AND discount_amount <= subtotal",
    )
    op.create_check_constraint(
        "total_matches_bill", "pedidos", "total = subtotal - discount_amount"
    )

    op.create_table(
        "pedidos_descuentos",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("promotion_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.CheckConstraint("length(trim(name)) > 0", name="name_not_blank"),
        sa.CheckConstraint("amount > 0", name="amount_positive"),
        sa.ForeignKeyConstraint(["order_id"], ["pedidos.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["promotion_id"], ["promotions.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "order_id", "promotion_id", name="uq_pedidos_descuentos_order_promotion"
        ),
    )


def downgrade() -> None:
    op.drop_table("pedidos_descuentos")
    op.drop_constraint("total_matches_bill", "pedidos", type_="check")
    op.drop_constraint("discount_within_subtotal", "pedidos", type_="check")
    op.drop_constraint("subtotal_not_negative", "pedidos", type_="check")
    op.drop_column("pedidos", "total")
    op.drop_column("pedidos", "discount_amount")
    op.drop_column("pedidos", "subtotal")
    op.drop_index("ix_promotions_restaurant_id_created_at", table_name="promotions")
    op.drop_table("promotions")
    op.drop_column("restaurantes", "stack_promotions")

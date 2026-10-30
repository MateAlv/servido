"""Orders and carts of reservations (spec 009, US-17, US-19, US-21).

Revision ID: 007_orders
Revises: 006_reservations
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "007_orders"
down_revision: str | None = "006_reservations"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "carts",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("reservation_id", sa.UUID(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["reservation_id"],
            ["reservations.id"],
            name=op.f("fk_carts_reservation_id_reservations"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_carts")),
        sa.UniqueConstraint("reservation_id", name=op.f("uq_carts_reservation_id")),
    )
    op.create_table(
        "orders",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("reservation_id", sa.UUID(), nullable=False),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["reservation_id"],
            ["reservations.id"],
            name=op.f("fk_orders_reservation_id_reservations"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_orders")),
        sa.UniqueConstraint("reservation_id", name=op.f("uq_orders_reservation_id")),
    )
    op.create_table(
        "cart_items",
        sa.Column("cart_id", sa.UUID(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("dish_name", sa.String(length=150), nullable=False),
        sa.Column("unit_price", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("prep_time_minutes", sa.Integer(), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("dish_id", sa.UUID(), nullable=True),
        sa.CheckConstraint(
            "length(trim(dish_name)) > 0", name=op.f("ck_cart_items_dish_name_not_blank")
        ),
        sa.CheckConstraint(
            "prep_time_minutes IS NULL OR prep_time_minutes > 0",
            name=op.f("ck_cart_items_prep_time_positive"),
        ),
        sa.CheckConstraint(
            "quantity BETWEEN 1 AND 20", name=op.f("ck_cart_items_quantity_within_bounds")
        ),
        sa.CheckConstraint("unit_price > 0", name=op.f("ck_cart_items_unit_price_positive")),
        sa.ForeignKeyConstraint(
            ["cart_id"], ["carts.id"], name=op.f("fk_cart_items_cart_id_carts"), ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["dish_id"],
            ["platos.id_plato"],
            name=op.f("fk_cart_items_dish_id_platos"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_cart_items")),
        sa.UniqueConstraint("cart_id", "dish_id", name="uq_cart_items_cart_id_dish_id"),
    )
    op.create_table(
        "order_items",
        sa.Column("order_id", sa.UUID(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("dish_name", sa.String(length=150), nullable=False),
        sa.Column("unit_price", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("prep_time_minutes", sa.Integer(), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("dish_id", sa.UUID(), nullable=True),
        sa.CheckConstraint(
            "length(trim(dish_name)) > 0", name=op.f("ck_order_items_dish_name_not_blank")
        ),
        sa.CheckConstraint(
            "prep_time_minutes IS NULL OR prep_time_minutes > 0",
            name=op.f("ck_order_items_prep_time_positive"),
        ),
        sa.CheckConstraint(
            "quantity BETWEEN 1 AND 20", name=op.f("ck_order_items_quantity_within_bounds")
        ),
        sa.CheckConstraint("unit_price > 0", name=op.f("ck_order_items_unit_price_positive")),
        sa.ForeignKeyConstraint(
            ["dish_id"],
            ["platos.id_plato"],
            name=op.f("fk_order_items_dish_id_platos"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["order_id"],
            ["orders.id"],
            name=op.f("fk_order_items_order_id_orders"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_order_items")),
        sa.UniqueConstraint("order_id", "dish_id", name="uq_order_items_order_id_dish_id"),
    )


def downgrade() -> None:
    op.drop_table("order_items")
    op.drop_table("cart_items")
    op.drop_table("orders")
    op.drop_table("carts")

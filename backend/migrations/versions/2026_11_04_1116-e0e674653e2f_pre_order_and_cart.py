"""The diner's pre-order: the cart, and what a confirmation keeps
(spec 009-pedido-anticipado, US-17).

Revision ID: e0e674653e2f
Revises: 8f3c1a2b4d5e
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "e0e674653e2f"
down_revision: str | None = "8f3c1a2b4d5e"
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
        "cart_items",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("cart_id", sa.UUID(), nullable=False),
        sa.Column("dish_id", sa.UUID(), nullable=True),
        sa.Column("dish_name", sa.String(length=150), nullable=False),
        sa.Column("unit_price", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("prep_time_minutes", sa.Integer(), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=False),
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
    # The name each dish had when the order was confirmed (P8): existing items take the
    # dish's current name.
    op.add_column("pedido_items", sa.Column("dish_name", sa.String(length=150), nullable=True))
    op.execute(
        "UPDATE pedido_items SET dish_name = platos.nombre "
        "FROM platos WHERE platos.id_plato = pedido_items.dish_id"
    )
    op.alter_column("pedido_items", "dish_name", nullable=False)
    op.create_check_constraint(
        op.f("ck_pedido_items_dish_name_not_blank"), "pedido_items", "length(trim(dish_name)) > 0"
    )
    # NOT VALID: new and updated items keep the 20-unit bound (P10) without failing the deploy
    # on an older item above it.
    op.execute(
        "ALTER TABLE pedido_items ADD CONSTRAINT ck_pedido_items_quantity_within_bounds "
        "CHECK (quantity <= 20) NOT VALID"
    )
    op.add_column(
        "pedidos",
        sa.Column(
            "confirmed_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("pedidos", "confirmed_at")
    op.drop_constraint(
        op.f("ck_pedido_items_quantity_within_bounds"), "pedido_items", type_="check"
    )
    op.drop_constraint(op.f("ck_pedido_items_dish_name_not_blank"), "pedido_items", type_="check")
    op.drop_column("pedido_items", "dish_name")
    op.drop_table("cart_items")
    op.drop_table("carts")

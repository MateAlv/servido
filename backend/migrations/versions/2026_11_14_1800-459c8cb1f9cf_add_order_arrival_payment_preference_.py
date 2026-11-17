"""add order arrival payment preference and confirmation receipts

Revision ID: 459c8cb1f9cf
Revises: 5061ebdc5acd
Create Date: 2026-11-14 18:00:05.573907

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "459c8cb1f9cf"
down_revision: str | Sequence[str] | None = "5061ebdc5acd"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    for table in ("carts", "pedidos"):
        op.add_column(
            table,
            sa.Column(
                "arrival_delay",
                sa.Interval(),
                nullable=False,
                server_default=sa.text("INTERVAL '0 minutes'"),
            ),
        )
        op.add_column(table, sa.Column("payment_method", sa.String(6), nullable=True))
        op.create_check_constraint(
            op.f(f"ck_{table}_arrival_delay_bounds"),
            table,
            "arrival_delay >= INTERVAL '0 minutes' AND arrival_delay <= INTERVAL '30 minutes'",
        )
        op.create_check_constraint(
            op.f(f"ck_{table}_arrival_delay_duration"),
            table,
            "EXTRACT(YEAR FROM arrival_delay) = 0 "
            "AND EXTRACT(MONTH FROM arrival_delay) = 0 "
            "AND EXTRACT(DAY FROM arrival_delay) = 0",
        )
        op.create_check_constraint(
            op.f(f"ck_{table}_payment_method_known"),
            table,
            "payment_method IS NULL OR payment_method IN ('cash', 'online')",
        )
    op.add_column(
        "pedidos",
        sa.Column("payment_status", sa.String(7), nullable=False, server_default="pending"),
    )
    op.create_check_constraint(
        op.f("ck_pedidos_payment_status_known"), "pedidos", "payment_status IN ('pending', 'paid')"
    )
    op.create_table(
        "order_confirmations",
        sa.Column("reservation_id", sa.UUID(), nullable=False),
        sa.Column("operation_id", sa.UUID(), nullable=False),
        sa.Column("request_digest", sa.String(64), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["reservation_id"],
            ["reservations.id"],
            ondelete="RESTRICT",
            name=op.f("fk_order_confirmations_reservation_id_reservations"),
        ),
        sa.PrimaryKeyConstraint(
            "reservation_id", "operation_id", name=op.f("pk_order_confirmations")
        ),
        sa.CheckConstraint(
            "length(request_digest) = 64", name=op.f("ck_order_confirmations_digest_length")
        ),
    )
    op.execute("""
    CREATE FUNCTION guard_order_payment() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF TG_OP = 'UPDATE' THEN
        IF OLD.payment_status = 'paid'
           AND NEW.payment_method IS DISTINCT FROM OLD.payment_method THEN
          RAISE EXCEPTION 'paid method is immutable' 
            USING ERRCODE = '23514', CONSTRAINT = 'order_payment_paid';
        END IF;
        IF NEW.status = 'confirmed'
           AND NEW.confirmed_at IS DISTINCT FROM OLD.confirmed_at
           AND NEW.payment_method IS NULL THEN
          RAISE EXCEPTION 'confirmation requires payment method' 
            USING ERRCODE = '23514', CONSTRAINT = 'order_payment_required';
        END IF;
      ELSIF NEW.status = 'confirmed' AND NEW.payment_method IS NULL THEN
        RAISE EXCEPTION 'confirmation requires payment method' 
            USING ERRCODE = '23514', CONSTRAINT = 'order_payment_required';
      END IF;
      RETURN NEW;
    END; $$;
    CREATE TRIGGER order_payment_guard BEFORE INSERT OR UPDATE ON pedidos
      FOR EACH ROW EXECUTE FUNCTION guard_order_payment();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER order_payment_guard ON pedidos")
    op.execute("DROP FUNCTION guard_order_payment()")
    op.drop_table("order_confirmations")
    op.drop_constraint(op.f("ck_pedidos_payment_status_known"), "pedidos", type_="check")
    op.drop_column("pedidos", "payment_status")
    for table in ("pedidos", "carts"):
        for name in ("payment_method_known", "arrival_delay_duration", "arrival_delay_bounds"):
            op.drop_constraint(op.f(f"ck_{table}_{name}"), table, type_="check")
        op.drop_column(table, "payment_method")
        op.drop_column(table, "arrival_delay")

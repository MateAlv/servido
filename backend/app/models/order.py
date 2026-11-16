from datetime import datetime, timedelta
from decimal import Decimal

from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Interval,
    Numeric,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Order(Base):
    """The pre-order of one reservation. US-17 (spec 009-pedido-anticipado) only writes confirmed
    orders; the order counts as cancelled when its reservation is (P12)."""

    __tablename__ = "pedidos"
    __table_args__ = (
        CheckConstraint(
            "arrival_delay >= INTERVAL '0 minutes' AND arrival_delay <= INTERVAL '30 minutes'",
            name="arrival_delay_bounds",
        ),
        CheckConstraint(
            "EXTRACT(YEAR FROM arrival_delay) = 0 "
            "AND EXTRACT(MONTH FROM arrival_delay) = 0 "
            "AND EXTRACT(DAY FROM arrival_delay) = 0",
            name="arrival_delay_duration",
        ),
        CheckConstraint(
            "payment_method IS NULL OR payment_method IN ('cash', 'online')",
            name="payment_method_known",
        ),
        CheckConstraint("payment_status IN ('pending', 'paid')", name="payment_status_known"),
        CheckConstraint(
            "(payment_status = 'pending' AND paid_amount IS NULL AND paid_at IS NULL) OR "
            "(payment_status = 'paid' AND payment_method IN ('cash', 'online') "
            "AND paid_amount IS NOT NULL AND paid_amount >= 0 AND paid_at IS NOT NULL)",
            name="payment_fields_match_status",
        ),
        CheckConstraint("status IN ('confirmed', 'pending', 'cancelled')", name="status_known"),
        UniqueConstraint("reservation_id", name="reservation_order_unique"),
    )

    arrival_delay: Mapped[timedelta] = mapped_column(
        Interval, nullable=False, default=timedelta, server_default=text("INTERVAL '0 minutes'")
    )
    payment_method: Mapped[str | None] = mapped_column(String(6), nullable=True)
    payment_status: Mapped[str] = mapped_column(
        String(7), nullable=False, default="pending", server_default="pending"
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    reservation_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("reservations.id", ondelete="RESTRICT"), nullable=False
    )
    restaurant_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("restaurantes.id_restaurante", ondelete="RESTRICT"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending", server_default="pending"
    )
    prep_start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    # The diner's last confirmation (spec 009-pedido-anticipado, P1).
    confirmed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    payment_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending", server_default="pending"
    )
    payment_method: Mapped[str | None] = mapped_column(String(20), nullable=True)
    paid_amount: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    items: Mapped[list["OrderItem"]] = relationship(  # noqa: F821
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="OrderItem.dish_name",
    )

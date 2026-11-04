from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Order(Base):
    """The pre-order of one reservation. US-17 (spec 009) only writes confirmed orders; the
    order counts as cancelled when its reservation is (P12)."""

    __tablename__ = "pedidos"
    __table_args__ = (
        CheckConstraint("status IN ('confirmed', 'pending')", name="status_known"),
        UniqueConstraint("reservation_id", name="reservation_order_unique"),
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
    # The diner's last confirmation (spec 009, P1).
    confirmed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    items: Mapped[list["OrderItem"]] = relationship(  # noqa: F821
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="OrderItem.dish_name",
    )

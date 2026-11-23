from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Numeric, String, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Payment(Base):
    """An electronic payment attempt of an order through Mercado Pago (spec 032, US-56).

    Card data never reaches this table (FR-014): only Mercado Pago's operation id, the card brand
    and its last four digits.
    """

    __tablename__ = "payments"
    __table_args__ = (
        CheckConstraint("amount > 0", name="amount_positive"),
        CheckConstraint("status IN ('approved', 'rejected', 'in_process')", name="status_known"),
        CheckConstraint(
            "(status = 'approved') = (approved_at IS NOT NULL)", name="approved_at_matches_status"
        ),
        # E4: an order is charged at most once, and not again while a payment is in review (E8).
        Index(
            "payments_one_live_per_order",
            "order_id",
            unique=True,
            postgresql_where=text("status IN ('approved', 'in_process')"),
        ),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    order_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("pedidos.id", ondelete="CASCADE"), nullable=False
    )
    # The diner's attempt: a repeated request returns this payment instead of charging again.
    request_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False, unique=True)
    provider_payment_id: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    status_detail: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    card_brand: Mapped[str | None] = mapped_column(String(32), nullable=True)
    card_last_four: Mapped[str | None] = mapped_column(String(4), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

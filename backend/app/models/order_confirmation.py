"""Accepted operations survive removal/recreation of a reservation's order (US-43)."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class OrderConfirmation(Base):
    __tablename__ = "order_confirmations"
    __table_args__ = (CheckConstraint("length(request_digest) = 64", name="digest_length"),)
    reservation_id: Mapped[UUID] = mapped_column(
        ForeignKey("reservations.id", ondelete="RESTRICT"), primary_key=True
    )
    operation_id: Mapped[UUID] = mapped_column(primary_key=True)
    request_digest: Mapped[str] = mapped_column(String(64), nullable=False)
    accepted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

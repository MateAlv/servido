from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, Numeric, String, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base

MAX_COMMENT_LENGTH = 500
MAX_SPEND_PER_PERSON = 1_000_000


class Review(Base):
    """A diner's final review of one finished reservation (spec 014, R4).

    The diner and the restaurant come from the reservation, so they can't disagree with it.
    """

    __tablename__ = "reviews"
    __table_args__ = (
        CheckConstraint("rating BETWEEN 1 AND 5", name="rating_between_1_and_5"),
        CheckConstraint(
            f"comment IS NULL OR (length(trim(comment)) > 0 "
            f"AND length(comment) <= {MAX_COMMENT_LENGTH})",
            name="comment_not_blank_and_within_limit",
        ),
        CheckConstraint(
            f"spend_per_person IS NULL OR spend_per_person BETWEEN 1 AND {MAX_SPEND_PER_PERSON}",
            name="spend_per_person_within_limits",
        ),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    reservation_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("reservations.id", ondelete="RESTRICT"),
        nullable=False,
        unique=True,
    )
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str | None] = mapped_column(String(MAX_COMMENT_LENGTH), nullable=True)
    # Whole pesos, so a scale of 0.
    spend_per_person: Mapped[Decimal | None] = mapped_column(Numeric(10, 0), nullable=True)
    published_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )

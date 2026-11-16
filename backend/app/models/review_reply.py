from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String
from sqlalchemy import text as sql_text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base

MAX_REPLY_LENGTH = 500


class ReviewReply(Base):
    """The restaurant's public answer to one review (spec 025, US-42): one per review, edited in
    place and never deleted (C3, C4)."""

    __tablename__ = "review_replies"
    __table_args__ = (
        CheckConstraint(
            f"length(trim(text)) > 0 AND length(text) <= {MAX_REPLY_LENGTH}",
            name="text_not_blank_and_within_limit",
        ),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    review_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("reviews.id", ondelete="RESTRICT"),
        nullable=False,
        unique=True,
    )
    text: Mapped[str] = mapped_column(String(MAX_REPLY_LENGTH), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=sql_text("CURRENT_TIMESTAMP")
    )
    edited_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

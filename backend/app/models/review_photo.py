from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    SmallInteger,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ReviewPhoto(Base):
    __tablename__ = "review_photos"
    __table_args__ = (
        CheckConstraint("position BETWEEN 1 AND 4", name="position_in_range"),
        CheckConstraint(
            "media_type IN ('image/jpeg', 'image/png', 'image/webp')", name="supported_media_type"
        ),
        UniqueConstraint("review_id", "position"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    review_id: Mapped[UUID] = mapped_column(ForeignKey("reviews.id", ondelete="RESTRICT"))
    position: Mapped[int] = mapped_column(SmallInteger)
    media_type: Mapped[str] = mapped_column(String(10))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP")
    )

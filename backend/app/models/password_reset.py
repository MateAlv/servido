from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Index, String, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class PasswordReset(Base):
    """The link that is currently valid to change one diner's password (spec 013, data model)."""

    __tablename__ = "password_resets"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    # Unique: a diner has one valid link, and a new request replaces it.
    diner_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("comensales.id_comensal", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    # SHA-256 of the token in the link; the token itself is never stored.
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )


class PasswordResetRequest(Base):
    """One recovery request per email, kept only to count them (spec 013, FR-012)."""

    __tablename__ = "password_reset_requests"
    __table_args__ = (
        Index("ix_password_reset_requests_email_requested_at", "email", "requested_at"),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    # No foreign key: addresses without an account are counted too, so the limit reveals nothing.
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )

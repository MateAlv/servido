from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.dialects.postgresql import ExcludeConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base

RESERVATION_MINUTES = 90


class Reservation(Base):
    """A diner holds one table of a restaurant's table group for 90 minutes (spec 005).

    Table groups are recreated every time the restaurant saves them, so a reservation names its
    table by the group's identity (capacity and seating area) plus a number inside the group
    (decision D1). The number is internal: diners and restaurants never see it.
    """

    __tablename__ = "reservations"
    __table_args__ = (
        CheckConstraint("table_capacity > 0", name="table_capacity_positive"),
        CheckConstraint("table_number > 0", name="table_number_positive"),
        CheckConstraint(
            "party_size > 0 AND party_size <= table_capacity", name="party_size_fits_table"
        ),
        CheckConstraint(
            "seating_area IN ('indoor', 'outdoor', 'terrace')", name="seating_area_known"
        ),
        CheckConstraint(
            f"ends_at - starts_at = INTERVAL '{RESERVATION_MINUTES} minutes'",
            name="lasts_90_minutes",
        ),
        CheckConstraint("status IN ('confirmed', 'cancelled')", name="status_known"),
        # No two confirmed reservations on one table at overlapping times (risk 2).
        ExcludeConstraint(
            ("restaurant_id", "="),
            ("table_capacity", "="),
            ("seating_area", "="),
            ("table_number", "="),
            (func.tstzrange(text("starts_at"), text("ends_at")), "&&"),
            name="ex_reservations_table_no_overlap",
            using="gist",
            where=text("status = 'confirmed'"),
        ),
        Index("ix_reservations_restaurant_id_starts_at", "restaurant_id", "starts_at"),
        Index("ix_reservations_diner_id_starts_at", "diner_id", "starts_at"),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    diner_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("comensales.id_comensal", ondelete="RESTRICT"),
        nullable=False,
    )
    restaurant_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("restaurantes.id_restaurante", ondelete="RESTRICT"),
        nullable=False,
    )
    table_capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    seating_area: Mapped[str] = mapped_column(String(20), nullable=False)
    table_number: Mapped[int] = mapped_column(Integer, nullable=False)
    party_size: Mapped[int] = mapped_column(Integer, nullable=False)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="confirmed", server_default="confirmed"
    )
    # Sent by the page once per review: a repeated confirmation finds the same reservation.
    request_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )

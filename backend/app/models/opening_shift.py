from datetime import time
from uuid import UUID, uuid4

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, SmallInteger, Time, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class OpeningShift(Base):
    __tablename__ = "turnos"
    __table_args__ = (
        CheckConstraint("day_of_week BETWEEN 1 AND 7", name="day_of_week_range"),
        CheckConstraint("end_time > start_time", name="end_after_start"),
        UniqueConstraint(
            "restaurant_id",
            "day_of_week",
            "start_time",
            "end_time",
            name="uq_turnos_shift_identity",
        ),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    restaurant_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("restaurantes.id_restaurante"), nullable=False
    )
    day_of_week: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )

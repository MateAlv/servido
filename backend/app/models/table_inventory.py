from uuid import UUID, uuid4

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base

# Glossary: tipo de mesa. A fixed catalog (spec 004, FR-009; decision D6 of 28/10).
SEATING_AREAS = ("indoor", "outdoor", "terrace")


class TableInventoryGroup(Base):
    __tablename__ = "table_inventory"
    __table_args__ = (
        CheckConstraint("capacity > 0", name="capacity_positive"),
        CheckConstraint("quantity > 0", name="quantity_positive"),
        CheckConstraint(
            "seating_area IN ('indoor', 'outdoor', 'terrace')", name="seating_area_known"
        ),
        UniqueConstraint(
            "restaurant_id",
            "capacity",
            "seating_area",
            name="uq_table_inventory_restaurant_capacity_area",
        ),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    restaurant_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("restaurantes.id_restaurante"), nullable=False
    )
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    seating_area: Mapped[str] = mapped_column(
        String(20), nullable=False, default="indoor", server_default="indoor"
    )
    available: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )

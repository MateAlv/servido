from uuid import UUID, uuid4

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class TableInventoryGroup(Base):
    __tablename__ = "table_inventory"
    __table_args__ = (
        CheckConstraint("capacity > 0", name="capacity_positive"),
        CheckConstraint("quantity > 0", name="quantity_positive"),
        UniqueConstraint(
            "restaurant_id", "capacity", name="uq_table_inventory_restaurant_capacity"
        ),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    restaurant_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("restaurantes.id_restaurante"), nullable=False
    )
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    available: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )

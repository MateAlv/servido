from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class OrderItem(Base):
    """A dish of an order, with the name, price and time it had at confirmation (spec 009, P8)."""

    __tablename__ = "pedido_items"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="quantity_positive"),
        CheckConstraint("quantity <= 20", name="quantity_within_bounds"),
        CheckConstraint("length(trim(dish_name)) > 0", name="dish_name_not_blank"),
        CheckConstraint("unit_price > 0", name="unit_price_positive"),
        CheckConstraint(
            "prep_time_minutes IS NULL OR prep_time_minutes >= 0", name="prep_time_valid"
        ),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    order_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("pedidos.id", ondelete="CASCADE"), nullable=False
    )
    dish_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("platos.id_plato", ondelete="RESTRICT"), nullable=False
    )
    dish_name: Mapped[str] = mapped_column(String(150), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    prep_time_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)

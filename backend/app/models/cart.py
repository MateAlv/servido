from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

MAX_UNITS_PER_DISH = 20


class Cart(Base):
    """The order a diner is building and hasn't confirmed (spec 009, P1). The restaurant never
    reads it: only a confirmation writes `pedidos`."""

    __tablename__ = "carts"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    reservation_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("reservations.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    items: Mapped[list["CartItem"]] = relationship(
        back_populates="cart",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="CartItem.dish_name",
    )


class CartItem(Base):
    """A dish of a cart, with the name, price and time the diner saw (P9)."""

    __tablename__ = "cart_items"
    __table_args__ = (
        UniqueConstraint("cart_id", "dish_id", name="uq_cart_items_cart_id_dish_id"),
        CheckConstraint("length(trim(dish_name)) > 0", name="dish_name_not_blank"),
        CheckConstraint("unit_price > 0", name="unit_price_positive"),
        CheckConstraint(
            "prep_time_minutes IS NULL OR prep_time_minutes > 0", name="prep_time_positive"
        ),
        CheckConstraint(
            f"quantity BETWEEN 1 AND {MAX_UNITS_PER_DISH}", name="quantity_within_bounds"
        ),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    cart_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("carts.id", ondelete="CASCADE"), nullable=False
    )
    # The copied name keeps the item readable if the dish is ever deleted.
    dish_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("platos.id_plato", ondelete="SET NULL"), nullable=True
    )
    dish_name: Mapped[str] = mapped_column(String(150), nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    prep_time_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    cart: Mapped[Cart] = relationship(back_populates="items")

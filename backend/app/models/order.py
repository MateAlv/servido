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
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, declared_attr, mapped_column, relationship

from app.models.base import Base

MAX_UNITS_PER_DISH = 20


def item_checks() -> tuple[CheckConstraint, ...]:
    return (
        CheckConstraint("length(trim(dish_name)) > 0", name="dish_name_not_blank"),
        CheckConstraint("unit_price > 0", name="unit_price_positive"),
        CheckConstraint(
            "prep_time_minutes IS NULL OR prep_time_minutes > 0", name="prep_time_positive"
        ),
        CheckConstraint(
            f"quantity BETWEEN 1 AND {MAX_UNITS_PER_DISH}", name="quantity_within_bounds"
        ),
    )


class ItemColumns:
    """A dish with the name, price and preparation time it carried when it was written (P8)."""

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    dish_name: Mapped[str] = mapped_column(String(150), nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    prep_time_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)

    # The copied name and price keep the item readable if the dish is ever deleted.
    @declared_attr
    def dish_id(cls) -> Mapped[UUID | None]:
        return mapped_column(
            PGUUID(as_uuid=True),
            ForeignKey("platos.id_plato", ondelete="SET NULL"),
            nullable=True,
        )


class Order(Base):
    """The confirmed pre-order of one reservation (spec 009). Every row is a confirmed order:
    the status comes from the reservation (P12), the totals from the items."""

    __tablename__ = "orders"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    reservation_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("reservations.id", ondelete="RESTRICT"),
        nullable=False,
        unique=True,
    )
    confirmed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="OrderItem.dish_name",
    )


class OrderItem(ItemColumns, Base):
    __tablename__ = "order_items"
    __table_args__ = (
        UniqueConstraint("order_id", "dish_id", name="uq_order_items_order_id_dish_id"),
        *item_checks(),
    )

    order_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False
    )
    order: Mapped[Order] = relationship(back_populates="items")


class Cart(Base):
    """The order a diner is building and hasn't confirmed (P1). The restaurant never reads it."""

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


class CartItem(ItemColumns, Base):
    __tablename__ = "cart_items"
    __table_args__ = (
        UniqueConstraint("cart_id", "dish_id", name="uq_cart_items_cart_id_dish_id"),
        *item_checks(),
    )

    cart_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("carts.id", ondelete="CASCADE"), nullable=False
    )
    cart: Mapped[Cart] = relationship(back_populates="items")

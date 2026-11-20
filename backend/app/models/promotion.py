"""Promotions of a restaurant and the copy an order keeps (spec 028, US-48).

A promotion is never deleted: pausing it is what removes it from new orders, so the orders that
already applied it keep a readable snapshot.
"""

from datetime import date, datetime, time
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    ARRAY,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    Time,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base

DISCOUNT_TYPES = ("percentage", "fixed")


class Promotion(Base):
    """A percentage or fixed-amount discount with its validity (US-48, P1–P3, P5)."""

    __tablename__ = "promotions"
    __table_args__ = (
        CheckConstraint("length(trim(name)) > 0", name="name_not_blank"),
        CheckConstraint("discount_type IN ('percentage', 'fixed')", name="discount_type_known"),
        CheckConstraint("discount_value > 0", name="discount_value_positive"),
        CheckConstraint(
            "discount_type <> 'percentage' OR (discount_value <= 100 AND minimum_amount IS NULL)",
            name="percentage_bounds",
        ),
        CheckConstraint(
            "discount_type <> 'fixed' OR "
            "(minimum_amount IS NOT NULL AND minimum_amount > 0 "
            "AND minimum_amount >= discount_value)",
            name="fixed_minimum",
        ),
        CheckConstraint(
            "(starts_on IS NULL AND ends_on IS NULL) OR "
            "(starts_on IS NOT NULL AND ends_on IS NOT NULL AND ends_on >= starts_on)",
            name="dates_complete",
        ),
        CheckConstraint(
            "(start_time IS NULL AND end_time IS NULL) OR "
            "(start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)",
            name="times_complete",
        ),
        CheckConstraint(
            "starts_on IS NOT NULL OR weekdays IS NOT NULL OR start_time IS NOT NULL",
            name="some_validity",
        ),
        CheckConstraint(
            "weekdays IS NULL OR weekdays <@ ARRAY[1,2,3,4,5,6,7]", name="weekdays_valid"
        ),
        Index("ix_promotions_restaurant_id_created_at", "restaurant_id", "created_at"),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    restaurant_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("restaurantes.id_restaurante", ondelete="RESTRICT"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    discount_type: Mapped[str] = mapped_column(String(10), nullable=False)
    discount_value: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    minimum_amount: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    starts_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    ends_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    weekdays: Mapped[list[int] | None] = mapped_column(ARRAY(Integer), nullable=True)
    start_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    end_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    # P5: whether the promotion may be added to another one when the restaurant stacks.
    stackable: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    request_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )


class OrderDiscount(Base):
    """The copy of a promotion an order applied, frozen at confirmation (P4)."""

    __tablename__ = "pedidos_descuentos"
    __table_args__ = (
        UniqueConstraint("order_id", "promotion_id", name="uq_pedidos_descuentos_order_promotion"),
        CheckConstraint("length(trim(name)) > 0", name="name_not_blank"),
        CheckConstraint("amount > 0", name="amount_positive"),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    order_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("pedidos.id", ondelete="CASCADE"), nullable=False
    )
    promotion_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("promotions.id", ondelete="RESTRICT"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

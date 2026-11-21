"""Promotion rules (spec 028, US-48): validity, the amount of each discount and which ones an order
applies under the restaurant's policy (P5).

Every rule is a pure function of a promotion, a subtotal and a local instant, so the same code
answers the cart preview, the confirmation and the tests.
"""

from dataclasses import dataclass
from datetime import date, datetime
from decimal import ROUND_HALF_UP, Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.promotion import Promotion
from app.models.restaurant import Restaurant
from app.services.availability import BUENOS_AIRES

CENTS = Decimal("0.01")
ZERO = Decimal("0.00")
PERCENTAGE = "percentage"
FIXED = "fixed"


class PromotionNotFoundError(Exception):
    pass


@dataclass(frozen=True)
class AppliedDiscount:
    """A promotion an order applies, with the amount it takes off (P4)."""

    promotion_id: UUID
    name: str
    amount: Decimal


def local_moment(moment: datetime) -> datetime:
    return moment.astimezone(BUENOS_AIRES)


def state(promotion: Promotion, today: date) -> str:
    """`paused`, `expired`, `programmed` or `active`, as the list shows it (US-48 S3)."""
    if not promotion.active:
        return "paused"
    if promotion.ends_on is not None and promotion.ends_on < today:
        return "expired"
    if promotion.starts_on is not None and promotion.starts_on > today:
        return "programmed"
    return "active"


def covers(promotion: Promotion, moment: datetime) -> bool:
    """Whether the promotion's validity covers this instant: every configured criterion must hold
    (P3). Dates and the time band are inclusive; weekdays are ISO 1–7."""
    if not promotion.active:
        return False
    local = local_moment(moment)
    day = local.date()
    if promotion.starts_on is not None and day < promotion.starts_on:
        return False
    if promotion.ends_on is not None and day > promotion.ends_on:
        return False
    if promotion.weekdays is not None and day.isoweekday() not in promotion.weekdays:
        return False
    if promotion.start_time is not None and promotion.end_time is not None:
        return promotion.start_time <= local.time() <= promotion.end_time
    return True


def discount_for(promotion: Promotion, subtotal: Decimal) -> Decimal:
    """The money this promotion takes off `subtotal`; zero when a fixed one doesn't reach its
    minimum (P1). Percentages are rounded half up to cents."""
    if promotion.discount_type == PERCENTAGE:
        return (subtotal * promotion.discount_value / Decimal(100)).quantize(
            CENTS, rounding=ROUND_HALF_UP
        )
    minimum = promotion.minimum_amount or ZERO
    return promotion.discount_value if subtotal >= minimum else ZERO


def _ranked(promotions: list[tuple[Promotion, Decimal]]) -> list[tuple[Promotion, Decimal]]:
    """Largest saving first; ties by the oldest promotion, then by id (deterministic)."""
    return sorted(promotions, key=lambda pair: (-pair[1], pair[0].created_at, str(pair[0].id)))


def resolve(
    promotions: list[Promotion],
    subtotal: Decimal,
    moment: datetime,
    *,
    stack: bool,
) -> list[AppliedDiscount]:
    """The promotions an order applies and their amounts (P5).

    Without stacking, only the one that saves the most. With stacking, if there are non-stackable
    eligible promotions, the best non-stackable one competes with the sum of the stackable ones and
    the larger saving wins. The amounts are applied one by one, each capped at what is left of the
    subtotal, so they add up and the total never goes below zero.
    """
    eligible = [
        (promotion, amount)
        for promotion in promotions
        if covers(promotion, moment) and (amount := discount_for(promotion, subtotal)) > ZERO
    ]
    if not eligible:
        return []
    chosen: list[tuple[Promotion, Decimal]] = []
    if not stack:
        chosen = _ranked(eligible)[:1]
    else:
        exclusive = _ranked([pair for pair in eligible if not pair[0].stackable])
        stacked = _ranked([pair for pair in eligible if pair[0].stackable])
        best_exclusive = exclusive[:1]
        exclusive_total = sum((amount for _, amount in best_exclusive), ZERO)
        stacked_total = sum((amount for _, amount in stacked), ZERO)
        chosen = best_exclusive if exclusive_total > stacked_total else stacked
        if not chosen:
            chosen = best_exclusive

    applied: list[AppliedDiscount] = []
    remaining = subtotal
    for promotion, amount in chosen:
        if remaining <= ZERO:
            break
        applied_amount = min(amount, remaining)
        applied.append(
            AppliedDiscount(
                promotion_id=promotion.id,
                name=promotion.name,
                amount=applied_amount.quantize(CENTS),
            )
        )
        remaining -= applied_amount
    return applied


def total_discount(applied: list[AppliedDiscount]) -> Decimal:
    return sum((discount.amount for discount in applied), ZERO)


def promotions_of(session: Session, restaurant_id: UUID) -> list[Promotion]:
    return list(
        session.scalars(
            select(Promotion)
            .where(Promotion.restaurant_id == restaurant_id)
            .order_by(Promotion.created_at, Promotion.id)
        )
    )


def active_promotions_of(session: Session, restaurant_id: UUID) -> list[Promotion]:
    return [promotion for promotion in promotions_of(session, restaurant_id) if promotion.active]


def applied_for(
    session: Session, restaurant: Restaurant, subtotal: Decimal, moment: datetime
) -> list[AppliedDiscount]:
    """What this restaurant's order applies at that arrival (P5)."""
    return resolve(
        active_promotions_of(session, restaurant.id_restaurante),
        subtotal,
        moment,
        stack=restaurant.stack_promotions,
    )

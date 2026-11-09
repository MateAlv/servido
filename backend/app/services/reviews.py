"""Reviews of finished reservations and what is derived from them (spec 014)."""

from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import distinct_on
from sqlalchemy.orm import Session

from app.models.diner import Diner
from app.models.reservation import Reservation
from app.models.restaurant import Restaurant
from app.models.review import Review

REVIEW_WINDOW = timedelta(days=30)
MIN_PEOPLE_FOR_PRICE_TIER = 5
PENDING_LIMIT = 20
RESTAURANT_PAGE_SIZE = 20
PRICE_TIERS = {"$", "$$", "$$$", "$$$$"}
UNNAMED_AUTHOR = "Comensal"


class ReservationNotFoundError(Exception):
    pass


class EmailNotVerifiedError(Exception):
    pass


class AlreadyReviewedError(Exception):
    pass


class NotReviewableError(Exception):
    """The reservation is cancelled, hasn't ended, or its 30 days are over."""


@dataclass(frozen=True)
class RatingSummary:
    average: float | None
    count: int


@dataclass(frozen=True)
class SpendSummary:
    """The mean and the people behind it; empty below MIN_PEOPLE_FOR_PRICE_TIER."""

    average: int | None
    people: int


def author_name(name: str | None) -> str:
    """«Juan Pablo Pérez» is shown as «Juan P.» (R10)."""
    words = (name or "").split()
    if not words:
        return UNNAMED_AUTHOR
    if len(words) == 1:
        return words[0]
    return f"{words[0]} {words[-1][0].upper()}."


def pending_reservations(session: Session, diner_id: UUID, now: datetime) -> list[Reservation]:
    """Finished reservations the diner can still review, the latest first (R2, R7, R9)."""
    return list(
        session.scalars(
            select(Reservation)
            .outerjoin(Review, Review.reservation_id == Reservation.id)
            .where(
                Reservation.diner_id == diner_id,
                Reservation.status == "confirmed",
                Reservation.ends_at <= now,
                Reservation.ends_at >= now - REVIEW_WINDOW,
                Review.id.is_(None),
            )
            .order_by(Reservation.ends_at.desc())
            .limit(PENDING_LIMIT)
        )
    )


def latest_reviewed_visits(
    session: Session, diner_id: UUID, restaurant_ids: set[UUID]
) -> dict[UUID, datetime]:
    """When the diner's most recent reviewed visit to each restaurant started."""
    rows = session.execute(
        select(Reservation.restaurant_id, func.max(Reservation.starts_at))
        .join(Review, Review.reservation_id == Reservation.id)
        .where(Reservation.diner_id == diner_id, Reservation.restaurant_id.in_(restaurant_ids))
        .group_by(Reservation.restaurant_id)
    ).all()
    return {restaurant_id: starts_at for restaurant_id, starts_at in rows}


def publish_review(
    session: Session,
    diner_id: UUID,
    reservation_id: UUID,
    rating: int,
    comment: str | None,
    spend_per_person: int | None,
    now: datetime,
) -> Review:
    # The lock makes a repeated publication wait and then find the first review.
    reservation = session.scalar(
        select(Reservation)
        .where(Reservation.id == reservation_id, Reservation.diner_id == diner_id)
        .with_for_update()
    )
    if reservation is None:
        raise ReservationNotFoundError
    if session.get_one(Diner, diner_id).email_verified_at is None:
        raise EmailNotVerifiedError
    if session.scalar(select(Review.id).where(Review.reservation_id == reservation_id)):
        raise AlreadyReviewedError
    if (
        reservation.status != "confirmed"
        or reservation.ends_at > now
        or reservation.ends_at < now - REVIEW_WINDOW
    ):
        raise NotReviewableError
    review = Review(
        reservation_id=reservation_id,
        rating=rating,
        comment=comment,
        spend_per_person=spend_per_person,
        published_at=now,
    )
    session.add(review)
    session.flush()
    return review


def latest_reviews(
    session: Session, restaurant_id: UUID
) -> list[tuple[Review, Reservation, Diner]]:
    """Each person's review of their most recent visit (R13), the most recent visit first."""
    rows = session.execute(
        select(Review, Reservation, Diner)
        .join(Reservation, Review.reservation_id == Reservation.id)
        .join(Diner, Reservation.diner_id == Diner.id_comensal)
        .where(Reservation.restaurant_id == restaurant_id)
        .ext(distinct_on(Reservation.diner_id))
        .order_by(Reservation.diner_id, Reservation.starts_at.desc(), Review.published_at.desc())
    ).all()
    return sorted(
        (tuple(row) for row in rows),
        key=lambda row: (row[1].starts_at, row[0].published_at),
        reverse=True,
    )


def rating_summary(session: Session, restaurant_id: UUID) -> RatingSummary:
    ratings = [review.rating for review, _, _ in latest_reviews(session, restaurant_id)]
    if not ratings:
        return RatingSummary(average=None, count=0)
    average = (Decimal(sum(ratings)) / len(ratings)).quantize(Decimal("0.1"), ROUND_HALF_UP)
    return RatingSummary(average=float(average), count=len(ratings))


def spend_summary(session: Session, restaurant_id: UUID) -> SpendSummary:
    """The mean of each person's latest reported spend, from 5 people on (R6, R15)."""
    amounts = session.scalars(
        select(Review.spend_per_person)
        .join(Reservation, Review.reservation_id == Reservation.id)
        .where(Reservation.restaurant_id == restaurant_id, Review.spend_per_person.is_not(None))
        .ext(distinct_on(Reservation.diner_id))
        .order_by(Reservation.diner_id, Reservation.starts_at.desc(), Review.published_at.desc())
    ).all()
    if len(amounts) < MIN_PEOPLE_FOR_PRICE_TIER:
        return SpendSummary(average=None, people=0)
    average = int((sum(amounts) / len(amounts)).quantize(Decimal("1"), ROUND_HALF_UP))
    return SpendSummary(average=average, people=len(amounts))


def price_tier_from_spend(spend: int) -> str:
    """The limits of spec 002-elegir-restaurante."""
    if spend < 15_000:
        return "$"
    if spend < 25_000:
        return "$$"
    if spend <= 40_000:
        return "$$$"
    return "$$$$"


def public_price_tier(restaurant: Restaurant, spend: int | None) -> str | None:
    if spend is not None:
        return price_tier_from_spend(spend)
    return restaurant.rango_precio if restaurant.rango_precio in PRICE_TIERS else None


def restaurant_reviews(
    session: Session, restaurant_id: UUID, offset: int, limit: int
) -> list[tuple[Review, Reservation, Diner]]:
    """Everything the restaurant received (US-24), the last published first."""
    rows = session.execute(
        select(Review, Reservation, Diner)
        .join(Reservation, Review.reservation_id == Reservation.id)
        .join(Diner, Reservation.diner_id == Diner.id_comensal)
        .where(Reservation.restaurant_id == restaurant_id)
        .order_by(Review.published_at.desc(), Review.id.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return [tuple(row) for row in rows]


def total_reviews(session: Session, restaurant_id: UUID) -> int:
    return session.scalar(
        select(func.count(Review.id))
        .join(Reservation, Review.reservation_id == Reservation.id)
        .where(Reservation.restaurant_id == restaurant_id)
    )

"""Finished reservations and reviews for a demo restaurant (spec 014, R18).

A reservation can't be created in the past, so the demo of reviews needs this data loaded directly.
It only works on a restaurant with "demo" in its name, loading it again replaces what it created,
and --remove deletes it. The password of the reviewer accounts comes from REVIEW_DEMO_PASSWORD.

    REVIEW_DEMO_PASSWORD=... python -m scripts.review_demo \
        --restaurant-email demo@servido.local --diner-email cliente@servido.local
    python -m scripts.review_demo --restaurant-email demo@servido.local --remove
"""

import argparse
import os
import sys
from dataclasses import dataclass
from datetime import datetime, time, timedelta
from decimal import Decimal
from uuid import NAMESPACE_URL, UUID, uuid5

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models.diner import Diner
from app.models.reservation import RESERVATION_MINUTES, Reservation
from app.models.restaurant import Restaurant
from app.models.review import Review
from app.services import availability
from app.services.auth import hash_password
from app.services.availability import BUENOS_AIRES

MIN_PASSWORD_LENGTH = 12
# Far above any real table number, so a demo reservation never overlaps a real one.
FIRST_TABLE_NUMBER = 9000
PENDING_DAYS_AGO = (1, 3)


@dataclass(frozen=True)
class DemoReview:
    reviewer: str
    days_ago: int
    hour: int
    rating: int
    comment: str | None
    spend: int | None


REVIEWERS = {
    "ana": "Ana Ríos",
    "beto": "Beto Sosa",
    "carla": "Carla Núñez",
    "dario": "Darío Vega",
    "elena": "Elena Paz",
    "fede": "Fede Luna",
}
REVIEWS = (
    DemoReview("ana", 2, 21, 5, "Los ravioles estaban increíbles y llegaron a tiempo.", 14000),
    DemoReview("beto", 4, 13, 4, "Muy rico. La mesa estaba lista cuando llegamos.", 12000),
    DemoReview("carla", 6, 20, 5, "Pedimos antes de salir y no esperamos nada.", 11000),
    DemoReview("dario", 8, 21, 3, None, 13000),
    DemoReview("elena", 10, 12, 4, "Buena atención, aunque el postre tardó un poco.", 14500),
    DemoReview("fede", 12, 20, 5, None, None),
    # Ana's older visit: it doesn't count, and only the restaurant sees it (R13, R14).
    DemoReview("ana", 20, 13, 2, "Esa vez la comida llegó fría.", 9000),
)


class NotADemoRestaurantError(Exception):
    pass


def reviewer_email(key: str) -> str:
    return f"resena-demo-{key}@servido.local"


def request_id(restaurant: Restaurant, key: str) -> UUID:
    return uuid5(NAMESPACE_URL, f"servido-review-demo/{restaurant.id_restaurante}/{key}")


def demo_keys() -> list[str]:
    return [f"review-{index}" for index in range(len(REVIEWS))] + [
        f"pending-{days_ago}" for days_ago in PENDING_DAYS_AGO
    ]


def require_demo_restaurant(restaurant: Restaurant) -> None:
    if "demo" not in restaurant.nombre.lower():
        raise NotADemoRestaurantError(restaurant.nombre)


def add_reservation(
    session: Session,
    restaurant: Restaurant,
    diner_id: UUID,
    key: str,
    table_offset: int,
    days_ago: int,
    hour: int,
    now: datetime,
) -> Reservation:
    day = now.astimezone(BUENOS_AIRES).date() - timedelta(days=days_ago)
    starts_at = datetime.combine(day, time(hour), tzinfo=BUENOS_AIRES)
    reservation = Reservation(
        diner_id=diner_id,
        restaurant_id=restaurant.id_restaurante,
        table_capacity=4,
        seating_area="indoor",
        table_number=FIRST_TABLE_NUMBER + table_offset,
        party_size=2,
        starts_at=starts_at,
        ends_at=starts_at + timedelta(minutes=RESERVATION_MINUTES),
        request_id=request_id(restaurant, key),
    )
    session.add(reservation)
    session.flush()
    return reservation


def remove_demo(session: Session, restaurant: Restaurant) -> None:
    require_demo_restaurant(restaurant)
    ids = [request_id(restaurant, key) for key in demo_keys()]
    reservations = select(Reservation.id).where(Reservation.request_id.in_(ids))
    session.execute(delete(Review).where(Review.reservation_id.in_(reservations)))
    session.execute(delete(Reservation).where(Reservation.request_id.in_(ids)))
    for key in REVIEWERS:
        reviewer = session.scalar(select(Diner).where(Diner.email == reviewer_email(key)))
        if reviewer is None:
            continue
        # Someone who signed in as a reviewer may have booked: never delete those reservations.
        booked = session.scalar(
            select(Reservation.id).where(Reservation.diner_id == reviewer.id_comensal).limit(1)
        )
        if booked is None:
            session.delete(reviewer)
    session.flush()


def load_demo(session: Session, restaurant: Restaurant, diner: Diner, password: str) -> None:
    require_demo_restaurant(restaurant)
    remove_demo(session, restaurant)
    now = availability.current_time()
    password_hash = hash_password(password)
    reviewers: dict[str, UUID] = {}
    for key, name in REVIEWERS.items():
        reviewer = session.scalar(select(Diner).where(Diner.email == reviewer_email(key)))
        if reviewer is None:
            reviewer = Diner(nombre=name, email=reviewer_email(key), password_hash="")
            session.add(reviewer)
        reviewer.password_hash = password_hash
        reviewer.email_verified_at = now
        session.flush()
        reviewers[key] = reviewer.id_comensal

    for index, demo in enumerate(REVIEWS):
        reservation = add_reservation(
            session,
            restaurant,
            reviewers[demo.reviewer],
            f"review-{index}",
            index,
            demo.days_ago,
            demo.hour,
            now,
        )
        session.add(
            Review(
                reservation_id=reservation.id,
                rating=demo.rating,
                comment=demo.comment,
                spend_per_person=Decimal(demo.spend) if demo.spend else None,
                published_at=reservation.ends_at + timedelta(hours=1),
            )
        )
    for offset, days_ago in enumerate(PENDING_DAYS_AGO, start=len(REVIEWS)):
        add_reservation(
            session, restaurant, diner.id_comensal, f"pending-{days_ago}", offset, days_ago, 20, now
        )
    session.flush()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--restaurant-email", required=True)
    parser.add_argument("--diner-email", help="The diner who gets reservations to review live")
    parser.add_argument("--remove", action="store_true", help="Delete what this script created")
    args = parser.parse_args()

    with SessionLocal.begin() as session:
        restaurant = session.scalar(
            select(Restaurant).where(Restaurant.email == args.restaurant_email)
        )
        if restaurant is None:
            sys.exit(f"No restaurant with email {args.restaurant_email}.")
        try:
            if args.remove:
                remove_demo(session, restaurant)
                print(f"Removed the review demo from {restaurant.nombre}.")
                return
            diner = session.scalar(select(Diner).where(Diner.email == args.diner_email))
            if diner is None:
                sys.exit(f"No diner with email {args.diner_email}.")
            password = os.environ.get("REVIEW_DEMO_PASSWORD", "")
            if len(password) < MIN_PASSWORD_LENGTH:
                sys.exit(
                    f"Set REVIEW_DEMO_PASSWORD, with at least {MIN_PASSWORD_LENGTH} characters."
                )
            load_demo(session, restaurant, diner, password)
            print(f"Loaded the review demo on {restaurant.nombre}.")
        except NotADemoRestaurantError:
            sys.exit(f"{restaurant.nombre} is not a demo restaurant: its name must say demo.")


if __name__ == "__main__":
    main()

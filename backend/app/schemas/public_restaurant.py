from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class PublicRestaurant(BaseModel):
    """A bookable restaurant as the diner's map, list and detail show it (decision D4)."""

    id: UUID
    name: str
    description: str | None
    cuisine: str | None
    # "$" to "$$$$": calculated from 5 people with a reported spend, else the declared one, and
    # null when the restaurant typed something else (spec 014, R6).
    price_tier: str | None
    # The mean behind a calculated price tier; null otherwise.
    average_spend_per_person: int | None
    spend_people: int
    # From the latest review of each person (spec 014, R12, R13); null without reviews.
    rating: float | None
    review_count: int
    dietary_restrictions: list[str]
    address: str | None
    neighborhood: str | None
    lat: float
    lng: float
    photo_url: str | None
    # Restaurants without a menu don't take part in the price filter
    # (spec 002-elegir-restaurante, US-7).
    has_menu: bool


class PublicRestaurantList(BaseModel):
    restaurants: list[PublicRestaurant]


class PublicDish(BaseModel):
    id: UUID
    name: str
    description: str | None
    category: str
    price: Decimal
    photo_url: str | None
    dietary_restrictions: list[str]


class PublicOpinion(BaseModel):
    """The latest review of a person, when it has a comment (spec 014, R14)."""

    author: str
    rating: int
    comment: str
    spend_per_person: int | None
    visit_date: date


class PublicRestaurantDetail(PublicRestaurant):
    menu: list[PublicDish]
    opinions: list[PublicOpinion]

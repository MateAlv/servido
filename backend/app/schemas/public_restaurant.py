from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel

from app.schemas.review import PhotoReference


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
    # The largest available table, the most one reservation seats (spec 027, F5).
    max_party_size: int
    # The distinct restriction sets of the available dishes that have any, so the filter can ask
    # for one dish that meets every chosen restriction (spec 027, F2 and F3).
    dish_restriction_sets: list[list[str]]


class PublicRestaurantList(BaseModel):
    restaurants: list[PublicRestaurant]


class OpenRestaurants(BaseModel):
    """Bookable restaurants where a reservation can start in the requested time (spec 027, F4)."""

    restaurant_ids: list[UUID]


class PublicDish(BaseModel):
    id: UUID
    name: str
    description: str | None
    category: str
    price: Decimal
    photo_url: str | None
    dietary_restrictions: list[str]


class PublicReply(BaseModel):
    """The restaurant's reply to an opinion (spec 025, US-42): the current text only (C3)."""

    text: str
    date: date
    edited: bool


class PublicOpinion(BaseModel):
    """A diner's review of their most recent reviewed visit, including ratings alone (R14)."""

    author: str
    rating: int
    comment: str | None
    photos: list[PhotoReference]
    spend_per_person: int | None
    visit_date: date
    reply: PublicReply | None


class PublicRestaurantDetail(PublicRestaurant):
    menu: list[PublicDish]
    opinions: list[PublicOpinion]

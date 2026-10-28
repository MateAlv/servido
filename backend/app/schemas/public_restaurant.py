from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class PublicRestaurant(BaseModel):
    """A bookable restaurant as the diner's map, list and detail show it (decision D4)."""

    id: UUID
    name: str
    description: str | None
    cuisine: str | None
    # "$" to "$$$$"; null when the restaurant typed something else.
    price_tier: str | None
    dietary_restrictions: list[str]
    address: str | None
    neighborhood: str | None
    lat: float
    lng: float
    photo_url: str | None
    # Restaurants without a menu don't take part in the price filter (spec 002, US-7).
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


class PublicRestaurantDetail(PublicRestaurant):
    menu: list[PublicDish]

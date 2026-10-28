from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.db import SessionDep
from app.models.dish import Dish
from app.models.restaurant import Restaurant
from app.schemas.public_restaurant import (
    PublicDish,
    PublicRestaurant,
    PublicRestaurantDetail,
    PublicRestaurantList,
)
from app.services.availability import bookable_condition

router = APIRouter(tags=["restaurant"])

PRICE_TIERS = {"$", "$$", "$$$", "$$$$"}
RESTAURANT_NOT_FOUND = "No encontramos ese restaurante."


def public_fields(restaurant: Restaurant) -> dict:
    assert restaurant.latitud is not None and restaurant.longitud is not None
    return {
        "id": restaurant.id_restaurante,
        "name": restaurant.nombre,
        "description": restaurant.descripcion,
        "cuisine": restaurant.tipo_comida,
        "price_tier": restaurant.rango_precio if restaurant.rango_precio in PRICE_TIERS else None,
        "dietary_restrictions": restaurant.restricciones_tags or [],
        "address": restaurant.direccion,
        "neighborhood": restaurant.barrio,
        "lat": float(restaurant.latitud),
        "lng": float(restaurant.longitud),
        "photo_url": restaurant.foto_url,
    }


@router.get("/restaurants", response_model=PublicRestaurantList)
def list_bookable_restaurants(session: SessionDep) -> PublicRestaurantList:
    restaurants = session.scalars(
        select(Restaurant).where(bookable_condition()).order_by(Restaurant.nombre)
    )
    return PublicRestaurantList(
        restaurants=[PublicRestaurant(**public_fields(restaurant)) for restaurant in restaurants]
    )


@router.get(
    "/restaurants/{restaurant_id}",
    response_model=PublicRestaurantDetail,
    responses={404: {"description": "El restaurante no existe o no toma reservas."}},
)
def get_bookable_restaurant(restaurant_id: UUID, session: SessionDep) -> PublicRestaurantDetail:
    restaurant = session.scalar(
        select(Restaurant).where(Restaurant.id_restaurante == restaurant_id, bookable_condition())
    )
    if restaurant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=RESTAURANT_NOT_FOUND)
    dishes = session.scalars(
        select(Dish).where(Dish.id_restaurante == restaurant_id).order_by(Dish.nombre)
    )
    return PublicRestaurantDetail(
        **public_fields(restaurant),
        menu=[
            PublicDish(
                id=dish.id_plato,
                name=dish.nombre,
                description=dish.descripcion,
                category=dish.categoria,
                price=dish.precio,
                photo_url=dish.foto_url,
                dietary_restrictions=dish.restricciones_alimenticias,
            )
            for dish in dishes
        ],
    )

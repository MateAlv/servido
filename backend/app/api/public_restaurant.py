from datetime import date, time
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.db import SessionDep
from app.models.restaurant import Restaurant
from app.models.review_reply import ReviewReply
from app.schemas.public_restaurant import (
    OpenRestaurants,
    PublicDish,
    PublicOpinion,
    PublicReply,
    PublicRestaurant,
    PublicRestaurantDetail,
    PublicRestaurantList,
)
from app.services import availability, review_replies, reviews
from app.services.availability import BUENOS_AIRES, bookable_condition
from app.services.menu import menu_dishes

router = APIRouter(tags=["restaurant"])

RESTAURANT_NOT_FOUND = "No encontramos ese restaurante."
INVERTED_RANGE = "El «hasta» no puede ser anterior al «desde»."


def public_fields(restaurant: Restaurant, session: SessionDep) -> dict:
    assert restaurant.latitud is not None and restaurant.longitud is not None
    summary = reviews.rating_summary(session, restaurant.id_restaurante)
    spend = reviews.spend_summary(session, restaurant.id_restaurante)
    dishes = menu_dishes(session, restaurant.id_restaurante)
    return {
        "id": restaurant.id_restaurante,
        "name": restaurant.nombre,
        "description": restaurant.descripcion,
        "cuisine": restaurant.tipo_comida,
        "price_tier": reviews.public_price_tier(restaurant, spend.average),
        "average_spend_per_person": spend.average,
        "spend_people": spend.people,
        "rating": summary.average,
        "review_count": summary.count,
        "dietary_restrictions": restaurant.restricciones_tags or [],
        "address": restaurant.direccion,
        "neighborhood": restaurant.barrio,
        "lat": float(restaurant.latitud),
        "lng": float(restaurant.longitud),
        "photo_url": restaurant.foto_url,
        "has_menu": bool(dishes),
        "max_party_size": availability.max_party_size(
            availability.available_groups(session, restaurant.id_restaurante)
        ),
        "dish_restriction_sets": sorted(
            {
                tuple(sorted(dish.restricciones_alimenticias))
                for dish in dishes
                if dish.restricciones_alimenticias
            }
        ),
    }


def public_reply(reply: ReviewReply | None) -> PublicReply | None:
    if reply is None:
        return None
    return PublicReply(
        text=reply.text,
        date=reply.created_at.astimezone(BUENOS_AIRES).date(),
        edited=reply.edited_at is not None,
    )


@router.get("/restaurants", response_model=PublicRestaurantList)
def list_bookable_restaurants(session: SessionDep) -> PublicRestaurantList:
    restaurants = session.scalars(
        select(Restaurant).where(bookable_condition()).order_by(Restaurant.nombre)
    )
    return PublicRestaurantList(
        restaurants=[
            PublicRestaurant(**public_fields(restaurant, session)) for restaurant in restaurants
        ]
    )


# Declared before /restaurants/{restaurant_id}, which would otherwise take "open" as an id.
@router.get(
    "/restaurants/open",
    response_model=OpenRestaurants,
    responses={400: {"description": "Día fuera del plazo o rango invertido."}},
)
def list_open_restaurants(
    date: date, start_from: time, start_to: time, session: SessionDep
) -> OpenRestaurants:
    """Bookable restaurants where a reservation can start that day between both times,
    inclusive (spec 027, F4). A point hour sends the same time twice."""
    now = availability.current_time()
    try:
        availability.check_date(date, now)
    except availability.UnavailableStartError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    if start_to < start_from:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=INVERTED_RANGE)
    restaurant_ids = session.scalars(
        select(Restaurant.id_restaurante).where(bookable_condition()).order_by(Restaurant.nombre)
    ).all()
    return OpenRestaurants(
        restaurant_ids=[
            restaurant_id
            for restaurant_id in restaurant_ids
            if availability.can_start_between(
                session, restaurant_id, date, start_from, start_to, now
            )
        ]
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
    dishes = menu_dishes(session, restaurant_id)
    opinions = [
        (review, reservation, diner)
        for review, reservation, diner in reviews.latest_reviews(session, restaurant_id)
        if review.comment
    ]
    replies = review_replies.replies_by_review(session, {review.id for review, _, _ in opinions})
    return PublicRestaurantDetail(
        **public_fields(restaurant, session),
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
        opinions=[
            PublicOpinion(
                author=reviews.author_name(diner.nombre),
                rating=review.rating,
                comment=review.comment,
                spend_per_person=review.spend_per_person,
                visit_date=reservation.starts_at.astimezone(BUENOS_AIRES).date(),
                reply=public_reply(replies.get(review.id)),
            )
            for review, reservation, diner in opinions
        ],
    )

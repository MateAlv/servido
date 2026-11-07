from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import TokenClaimsDep, require_diner
from app.api.restaurant import restaurant_from_claims
from app.db import SessionDep
from app.models.diner import Diner
from app.models.restaurant import Restaurant
from app.schemas.review import (
    PendingReview,
    PendingReviewsResponse,
    PublishedReviewResponse,
    RestaurantReview,
    RestaurantReviewsResponse,
    ReviewRequest,
)
from app.services import availability, reviews
from app.services.availability import BUENOS_AIRES

router = APIRouter(tags=["review"])

RESERVATION_NOT_FOUND = "No encontramos esa reserva."
EMAIL_NOT_VERIFIED = "Verificá tu email para dejar tu reseña."
ALREADY_REVIEWED = "Ya publicaste la reseña de esta reserva."
NOT_REVIEWABLE = "Esta reserva ya no se puede calificar."

SESSION_AND_ROLE = {
    401: {"description": "Falta la sesión o venció."},
    403: {"description": "No tenés permiso."},
}


@router.get("/reviews/pending", response_model=PendingReviewsResponse, responses=SESSION_AND_ROLE)
def list_pending_reviews(claims: TokenClaimsDep, session: SessionDep) -> PendingReviewsResponse:
    diner_id = require_diner(claims, session)
    now = availability.current_time()
    pending = reviews.pending_reservations(session, diner_id, now)
    restaurant_ids = {item.restaurant_id for item in pending}
    names = dict(
        session.execute(
            select(Restaurant.id_restaurante, Restaurant.nombre).where(
                Restaurant.id_restaurante.in_(restaurant_ids)
            )
        ).all()
    )
    latest_visits = reviews.latest_reviewed_visits(session, diner_id, restaurant_ids)
    return PendingReviewsResponse(
        author=reviews.author_name(session.get_one(Diner, diner_id).nombre),
        reservations=[
            PendingReview(
                reservation_id=item.id,
                restaurant_id=item.restaurant_id,
                restaurant_name=names[item.restaurant_id],
                date=item.starts_at.astimezone(BUENOS_AIRES).date(),
                start_time=item.starts_at.astimezone(BUENOS_AIRES).strftime("%H:%M"),
                party_size=item.party_size,
                hidden_by_later_visit=(
                    item.restaurant_id in latest_visits
                    and latest_visits[item.restaurant_id] > item.starts_at
                ),
                replaces_earlier_review=(
                    item.restaurant_id in latest_visits
                    and latest_visits[item.restaurant_id] <= item.starts_at
                ),
            )
            for item in pending
        ],
    )


@router.post(
    "/reservations/{reservation_id}/review",
    response_model=PublishedReviewResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        **SESSION_AND_ROLE,
        404: {"description": "La reserva no existe o es de otro comensal."},
        409: {"description": "La reserva ya tiene reseña o no se puede calificar."},
    },
)
def publish_review(
    reservation_id: UUID, body: ReviewRequest, claims: TokenClaimsDep, session: SessionDep
) -> PublishedReviewResponse:
    diner_id = require_diner(claims, session)
    try:
        review = reviews.publish_review(
            session,
            diner_id,
            reservation_id,
            body.rating,
            body.comment,
            body.spend_per_person,
            availability.current_time(),
        )
    except reviews.ReservationNotFoundError as error:
        raise HTTPException(status.HTTP_404_NOT_FOUND, RESERVATION_NOT_FOUND) from error
    except reviews.EmailNotVerifiedError as error:
        raise HTTPException(status.HTTP_403_FORBIDDEN, EMAIL_NOT_VERIFIED) from error
    except reviews.AlreadyReviewedError as error:
        raise HTTPException(status.HTTP_409_CONFLICT, ALREADY_REVIEWED) from error
    except reviews.NotReviewableError as error:
        raise HTTPException(status.HTTP_409_CONFLICT, NOT_REVIEWABLE) from error
    session.commit()
    return PublishedReviewResponse(
        id=review.id,
        rating=review.rating,
        comment=review.comment,
        spend_per_person=review.spend_per_person,
        published_at=review.published_at.astimezone(BUENOS_AIRES),
    )


@router.get(
    "/restaurant/reviews", response_model=RestaurantReviewsResponse, responses=SESSION_AND_ROLE
)
def list_restaurant_reviews(
    claims: TokenClaimsDep, session: SessionDep, offset: int = Query(default=0, ge=0)
) -> RestaurantReviewsResponse:
    restaurant = restaurant_from_claims(claims, session)
    restaurant_id = restaurant.id_restaurante
    summary = reviews.rating_summary(session, restaurant_id)
    total = reviews.total_reviews(session, restaurant_id)
    spend = reviews.spend_summary(session, restaurant_id)
    counted = {review.id for review, _, _ in reviews.latest_reviews(session, restaurant_id)}
    page = reviews.restaurant_reviews(session, restaurant_id, offset, reviews.RESTAURANT_PAGE_SIZE)
    next_offset = offset + len(page)
    return RestaurantReviewsResponse(
        rating=summary.average,
        review_count=summary.count,
        total_reviews=total,
        price_tier=reviews.public_price_tier(restaurant, spend.average),
        average_spend_per_person=spend.average,
        spend_people=spend.people,
        reviews=[
            RestaurantReview(
                id=review.id,
                author=reviews.author_name(diner.nombre),
                visit_date=reservation.starts_at.astimezone(BUENOS_AIRES).date(),
                visit_time=reservation.starts_at.astimezone(BUENOS_AIRES).strftime("%H:%M"),
                rating=review.rating,
                comment=review.comment,
                spend_per_person=review.spend_per_person,
                published_at=review.published_at.astimezone(BUENOS_AIRES),
                counts_in_average=review.id in counted,
            )
            for review, reservation, diner in page
        ],
        next_offset=next_offset if next_offset < total else None,
    )

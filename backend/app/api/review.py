from collections.abc import AsyncIterator
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import ValidationError
from sqlalchemy import select
from starlette.datastructures import UploadFile
from starlette.formparsers import MultiPartException, MultiPartParser

from app.api.deps import TokenClaimsDep, bearer_scheme, get_token_claims, require_diner
from app.api.restaurant import restaurant_from_claims
from app.db import SessionDep
from app.models.diner import Diner
from app.models.reservation import Reservation
from app.models.restaurant import Restaurant
from app.models.review import Review
from app.models.review_photo import ReviewPhoto
from app.models.review_reply import ReviewReply
from app.schemas.review import (
    PendingReview,
    PendingReviewsResponse,
    PhotoErrorDetail,
    PhotoErrorResponse,
    PublishedReviewResponse,
    ReplyEditRequest,
    ReplyRequest,
    RestaurantReview,
    RestaurantReviewsResponse,
    ReviewReplyResponse,
    ReviewRequest,
)
from app.services import availability, review_photos, review_replies, reviews
from app.services.availability import BUENOS_AIRES, bookable_condition

router = APIRouter(tags=["review"])

RESERVATION_NOT_FOUND = "No encontramos esa reserva."
EMAIL_NOT_VERIFIED = "Verificá tu email para dejar tu reseña."
ALREADY_REVIEWED = "Ya publicaste la reseña de esta reserva."
NOT_REVIEWABLE = "Esta reserva ya no se puede calificar."
REVIEW_NOT_FOUND = "No encontramos esa reseña."
ALREADY_REPLIED = "Esta reseña ya tiene tu respuesta. Podés editarla."
NOT_REPLIABLE = "Solo podés responder las reseñas que se ven en Opiniones."
REPLY_NOT_FOUND = "Esta reseña todavía no tiene tu respuesta."

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


async def review_submission(
    request: Request,
) -> AsyncIterator[tuple[ReviewRequest, list[UploadFile]]]:
    async def bounded_stream():
        size = 0
        async for chunk in request.stream():
            size += len(chunk)
            if size > review_photos.MAX_BODY_BYTES:
                # MultiPartParser closes its temporary files when this exception escapes.
                raise MultiPartException("La solicitud supera el tamaño permitido.")
            yield chunk

    form = None
    content_type = request.headers.get("content-type", "").split(";", 1)[0].strip().lower()
    try:
        if content_type == "multipart/form-data":
            form = await MultiPartParser(
                request.headers,
                bounded_stream(),
                max_files=12,
                max_fields=2,
                max_part_size=64 * 1024,
            ).parse()
            items = form.getlist("review")
            photos = form.getlist("photos")
            if (
                len(items) != 1
                or not isinstance(items[0], str)
                or any(not isinstance(photo, UploadFile) for photo in photos)
                or set(form) - {"review", "photos"}
            ):
                raise HTTPException(400, "Revisá los datos de la reseña.")
            yield ReviewRequest.model_validate_json(items[0]), photos
        elif content_type == "application/json":
            payload = b"".join([chunk async for chunk in bounded_stream()])
            yield ReviewRequest.model_validate_json(payload), []
        else:
            raise HTTPException(400, "Usá un formato válido para enviar la reseña.")
    except ValidationError as error:
        details = [
            {**item, "loc": ("body", *item["loc"])}
            for item in error.errors(include_context=False, include_input=False)
        ]
        raise RequestValidationError(details) from error
    except MultiPartException as error:
        if error.message in {
            "La solicitud supera el tamaño permitido.",
            "Too many files. Maximum number of files is 12.",
        }:
            raise HTTPException(413, "La solicitud supera el tamaño permitido.") from error
        raise HTTPException(400, "Revisá los datos y las fotos de la reseña.") from error
    finally:
        if form is not None:
            await form.close()


@router.post(
    "/reservations/{reservation_id}/review",
    response_model=PublishedReviewResponse,
    status_code=status.HTTP_201_CREATED,
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {
                "application/json": {"schema": {"$ref": "#/components/schemas/ReviewRequest"}},
                "multipart/form-data": {
                    "schema": {
                        "type": "object",
                        "required": ["review"],
                        "properties": {
                            "review": {"type": "string"},
                            "photos": {
                                "type": "array",
                                "items": {"type": "string", "format": "binary"},
                            },
                        },
                    }
                },
            },
        },
    },
    responses={
        **SESSION_AND_ROLE,
        400: {"model": PhotoErrorResponse},
        413: {"description": "La solicitud supera el tamaño permitido."},
        404: {"description": "La reserva no existe o es de otro comensal."},
        409: {"description": "La reserva ya tiene reseña o no se puede calificar."},
    },
)
def publish_review(
    reservation_id: UUID,
    claims: TokenClaimsDep,
    session: SessionDep,
    submission: Annotated[tuple[ReviewRequest, list[UploadFile]], Depends(review_submission)],
) -> PublishedReviewResponse:
    diner_id = require_diner(claims, session)
    body, files = submission
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
    paths = []
    try:
        valid, errors = review_photos.validate(files)
        if errors:
            raise HTTPException(
                400,
                PhotoErrorDetail(
                    message="Revisá las fotos antes de volver a publicar.",
                    photo_errors=errors,
                ).model_dump(),
            )
        photos = review_photos.store(session, review.id, valid, paths)
        references = [review_photos.reference(photo) for photo in photos]
    except Exception:
        session.rollback()
        for path in paths:
            path.unlink(missing_ok=True)
        raise
    try:
        session.commit()
    except Exception:
        review_photos.reconcile_failed_commit(session, reservation_id, paths)
        raise
    return PublishedReviewResponse(
        photos=references,
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
    shown = review_replies.shown_review_ids(session, restaurant_id)
    page = reviews.restaurant_reviews(session, restaurant_id, offset, reviews.RESTAURANT_PAGE_SIZE)
    replies = review_replies.replies_by_review(session, {review.id for review, _, _ in page})
    photos = review_photos.by_review(session, {review.id for review, _, _ in page})
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
                photos=photos.get(review.id, []),
                comment=review.comment,
                spend_per_person=review.spend_per_person,
                published_at=review.published_at.astimezone(BUENOS_AIRES),
                counts_in_average=review.id in counted,
                reply=reply_response(replies[review.id]) if review.id in replies else None,
                can_reply=review.id in shown and review.id not in replies,
            )
            for review, reservation, diner in page
        ],
        next_offset=next_offset if next_offset < total else None,
    )


@router.get(
    "/review-photos/{photo_id}",
    response_class=FileResponse,
    responses={
        200: {
            "content": {
                kind: {"schema": {"type": "string", "format": "binary"}}
                for kind in review_photos.EXTENSIONS
            }
        },
        404: {"description": "No encontramos esa foto."},
    },
)
def get_review_photo(
    photo_id: UUID,
    session: SessionDep,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> FileResponse:
    row = session.execute(
        select(ReviewPhoto, Reservation.restaurant_id)
        .join(Review, Review.id == ReviewPhoto.review_id)
        .join(Reservation, Reservation.id == Review.reservation_id)
        .where(ReviewPhoto.id == photo_id)
    ).one_or_none()
    missing = HTTPException(404, "No encontramos esa foto.")
    if row is None:
        raise missing
    photo, restaurant_id = row
    owner = False
    if credentials is not None:
        try:
            restaurant = restaurant_from_claims(get_token_claims(credentials), session)
            owner = restaurant.id_restaurante == restaurant_id
        except HTTPException:
            pass
    if not owner:
        public_restaurant = session.scalar(
            select(Restaurant.id_restaurante).where(
                Restaurant.id_restaurante == restaurant_id,
                bookable_condition(),
            )
        )
        if public_restaurant is None:
            raise missing
        latest = reviews.latest_reviews(session, restaurant_id)
        if not any(review.id == photo.review_id for review, _, _ in latest):
            raise missing
    path = review_photos.photo_path(photo)
    if not path.is_file():
        raise missing
    return FileResponse(
        path,
        media_type=photo.media_type,
        headers={
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


def reply_response(reply: ReviewReply) -> ReviewReplyResponse:
    return ReviewReplyResponse(
        text=reply.text,
        created_at=reply.created_at.astimezone(BUENOS_AIRES),
        edited_at=reply.edited_at.astimezone(BUENOS_AIRES) if reply.edited_at else None,
    )


@router.post(
    "/restaurant/reviews/{review_id}/reply",
    response_model=ReviewReplyResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        **SESSION_AND_ROLE,
        404: {"description": "La reseña no existe o es de otro restaurante."},
        409: {"description": "La reseña ya tiene respuesta o no se ve en Opiniones."},
    },
)
def reply_to_review(
    review_id: UUID, body: ReplyRequest, claims: TokenClaimsDep, session: SessionDep
) -> ReviewReplyResponse:
    restaurant = restaurant_from_claims(claims, session)
    try:
        reply = review_replies.reply(
            session, restaurant.id_restaurante, review_id, body.text, availability.current_time()
        )
    except review_replies.ReviewNotFoundError as error:
        raise HTTPException(status.HTTP_404_NOT_FOUND, REVIEW_NOT_FOUND) from error
    except review_replies.AlreadyRepliedError as error:
        raise HTTPException(status.HTTP_409_CONFLICT, ALREADY_REPLIED) from error
    except review_replies.NotRepliableError as error:
        raise HTTPException(status.HTTP_409_CONFLICT, NOT_REPLIABLE) from error
    session.commit()
    return reply_response(reply)


@router.put(
    "/restaurant/reviews/{review_id}/reply",
    response_model=ReviewReplyResponse,
    responses={
        **SESSION_AND_ROLE,
        404: {"description": "La reseña no existe, es de otro restaurante o no tiene respuesta."},
    },
)
def edit_reply(
    review_id: UUID, body: ReplyEditRequest, claims: TokenClaimsDep, session: SessionDep
) -> ReviewReplyResponse:
    restaurant = restaurant_from_claims(claims, session)
    try:
        reply = review_replies.edit_reply(
            session, restaurant.id_restaurante, review_id, body.text, availability.current_time()
        )
    except review_replies.ReviewNotFoundError as error:
        raise HTTPException(status.HTTP_404_NOT_FOUND, REVIEW_NOT_FOUND) from error
    except review_replies.ReplyNotFoundError as error:
        raise HTTPException(status.HTTP_404_NOT_FOUND, REPLY_NOT_FOUND) from error
    session.commit()
    return reply_response(reply)

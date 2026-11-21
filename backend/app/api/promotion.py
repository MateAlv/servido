"""Promotions of the signed-in restaurant (spec 028, US-48)."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select

from app.api.deps import TokenClaimsDep
from app.api.restaurant import restaurant_from_claims
from app.db import SessionDep
from app.models.promotion import Promotion
from app.models.restaurant import Restaurant
from app.schemas.promotion import (
    PromotionCreateRequest,
    PromotionListResponse,
    PromotionPayload,
    PromotionPolicyRequest,
    PromotionPolicyResponse,
    PromotionResponse,
    PromotionStateRequest,
)
from app.services import availability, promotions

router = APIRouter(tags=["promotions"])

NOT_FOUND = "No encontramos esa promoción."
NOT_OWNER = "Esta promoción es de otro restaurante."

MANAGEMENT_ERRORS = {
    400: {"description": "Datos inválidos."},
    401: {"description": "Falta la sesión o venció."},
    403: {"description": "Solo el Responsable del restaurante."},
}


def response_of(promotion: Promotion, today) -> PromotionResponse:
    return PromotionResponse(
        id=promotion.id,
        name=promotion.name,
        description=promotion.description,
        discount_type=promotion.discount_type,
        discount_value=promotion.discount_value,
        minimum_amount=promotion.minimum_amount,
        starts_on=promotion.starts_on,
        ends_on=promotion.ends_on,
        weekdays=promotion.weekdays,
        start_time=promotion.start_time,
        end_time=promotion.end_time,
        active=promotion.active,
        stackable=promotion.stackable,
        state=promotions.state(promotion, today),
    )


def find_own(session: SessionDep, restaurant: Restaurant, promotion_id: UUID) -> Promotion:
    promotion = session.scalar(
        select(Promotion).where(
            Promotion.id == promotion_id,
            Promotion.restaurant_id == restaurant.id_restaurante,
        )
    )
    if promotion is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=NOT_FOUND)
    return promotion


@router.get(
    "/restaurant/promotions",
    response_model=PromotionListResponse,
    responses={**MANAGEMENT_ERRORS},
)
def list_promotions(claims: TokenClaimsDep, session: SessionDep) -> PromotionListResponse:
    restaurant = restaurant_from_claims(claims, session)
    today = availability.current_time().date()
    return PromotionListResponse(
        stack_promotions=restaurant.stack_promotions,
        promotions=[
            response_of(promotion, today)
            for promotion in promotions.promotions_of(session, restaurant.id_restaurante)
        ],
    )


@router.post(
    "/restaurant/promotions",
    response_model=PromotionResponse,
    status_code=status.HTTP_201_CREATED,
    responses={**MANAGEMENT_ERRORS, 409: {"description": "Ese request_id es de otro restaurante."}},
)
def create_promotion(
    payload: PromotionCreateRequest,
    claims: TokenClaimsDep,
    session: SessionDep,
    response: Response,
) -> PromotionResponse:
    restaurant = restaurant_from_claims(claims, session)
    today = availability.current_time().date()
    existing = session.scalar(select(Promotion).where(Promotion.request_id == payload.request_id))
    if existing is not None:
        if existing.restaurant_id != restaurant.id_restaurante:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=NOT_OWNER)
        response.status_code = status.HTTP_200_OK
        return response_of(existing, today)
    promotion = Promotion(
        restaurant_id=restaurant.id_restaurante,
        request_id=payload.request_id,
        **payload.model_dump(exclude={"request_id"}),
    )
    session.add(promotion)
    session.commit()
    session.refresh(promotion)
    return response_of(promotion, today)


@router.put(
    "/restaurant/promotions/policies",
    response_model=PromotionPolicyResponse,
    responses={**MANAGEMENT_ERRORS},
)
def update_policy(
    payload: PromotionPolicyRequest, claims: TokenClaimsDep, session: SessionDep
) -> PromotionPolicyResponse:
    restaurant = restaurant_from_claims(claims, session)
    restaurant.stack_promotions = payload.stack_promotions
    session.commit()
    return PromotionPolicyResponse(stack_promotions=restaurant.stack_promotions)


@router.put(
    "/restaurant/promotions/{promotion_id}",
    response_model=PromotionResponse,
    responses={**MANAGEMENT_ERRORS, 404: {"description": NOT_FOUND}},
)
def update_promotion(
    promotion_id: UUID,
    payload: PromotionPayload,
    claims: TokenClaimsDep,
    session: SessionDep,
) -> PromotionResponse:
    restaurant = restaurant_from_claims(claims, session)
    promotion = find_own(session, restaurant, promotion_id)
    for field, value in payload.model_dump().items():
        setattr(promotion, field, value)
    session.commit()
    session.refresh(promotion)
    return response_of(promotion, availability.current_time().date())


@router.patch(
    "/restaurant/promotions/{promotion_id}",
    response_model=PromotionResponse,
    responses={**MANAGEMENT_ERRORS, 404: {"description": NOT_FOUND}},
)
def change_promotion_state(
    promotion_id: UUID,
    payload: PromotionStateRequest,
    claims: TokenClaimsDep,
    session: SessionDep,
) -> PromotionResponse:
    restaurant = restaurant_from_claims(claims, session)
    promotion = find_own(session, restaurant, promotion_id)
    promotion.active = payload.active
    session.commit()
    session.refresh(promotion)
    return response_of(promotion, availability.current_time().date())

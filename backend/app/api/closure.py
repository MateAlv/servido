from uuid import UUID

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select

from app.api.deps import TokenClaimsDep
from app.api.restaurant import restaurant_from_claims
from app.db import SessionDep
from app.models.closure import Closure
from app.schemas.closure import (
    ClosureListResponse,
    ClosureRequest,
    ClosureResponse,
    ClosureWarningResponse,
)
from app.services import availability, closures

router = APIRouter(tags=["closure"])


@router.post(
    "/restaurante/bloqueos",
    response_model=ClosureResponse,
    status_code=201,
    responses={409: {"model": ClosureWarningResponse}},
)
def create_closure(
    payload: ClosureRequest, claims: TokenClaimsDep, session: SessionDep, response: Response
):
    restaurant = restaurant_from_claims(claims, session)
    try:
        closure, created, reservations = closures.create(
            session, restaurant, payload, availability.current_time()
        )
    except closures.ClosureValidationError as error:
        raise HTTPException(
            status_code=409 if "guardar" in str(error) else 400, detail=str(error)
        ) from error
    if reservations and not created:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Hay reservas confirmadas en ese horario.",
                "reservations": [
                    item.model_dump(mode="json")
                    for item in closures.affected_response(reservations)
                ],
            },
        )
    if not created:
        response.status_code = status.HTTP_200_OK
    return closures.response(closure)


@router.get("/restaurante/bloqueos", response_model=ClosureListResponse)
def list_closures(claims: TokenClaimsDep, session: SessionDep):
    restaurant = restaurant_from_claims(claims, session)
    return {
        "closures": [
            closures.response(item)
            for item in closures.list_current(
                session, restaurant.id_restaurante, availability.current_time().date()
            )
        ]
    }


@router.delete("/restaurante/bloqueos/{closure_id}", status_code=204)
def delete_closure(closure_id: UUID, claims: TokenClaimsDep, session: SessionDep):
    restaurant = restaurant_from_claims(claims, session)
    closure = session.scalar(
        select(Closure).where(
            Closure.id == closure_id, Closure.restaurant_id == restaurant.id_restaurante
        )
    )
    if closure is None:
        raise HTTPException(status_code=404, detail="Bloqueo no encontrado.")
    session.delete(closure)
    session.commit()

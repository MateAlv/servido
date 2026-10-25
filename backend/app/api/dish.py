from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api.deps import TokenClaimsDep
from app.db import SessionDep
from app.models.dish import Dish
from app.schemas.dish import DishCreateRequest, DishResponse
from app.services.roles import RESTAURANT

router = APIRouter(tags=["dishes"])


def restaurant_id(claims: dict) -> UUID:
    if claims.get("rol") != RESTAURANT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los restaurantes pueden cargar platos.",
        )
    try:
        return UUID(claims["sub"])
    except (KeyError, ValueError) as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Tu sesión no es válida o venció."
        ) from error


@router.get("/restaurantes/me/platos", response_model=list[DishResponse])
def list_dishes(claims: TokenClaimsDep, session: SessionDep) -> list[Dish]:
    restaurant = restaurant_id(claims)
    return list(
        session.scalars(
            select(Dish)
            .where(Dish.id_restaurante == restaurant)
            .order_by(Dish.categoria, Dish.nombre)
        )
    )


@router.post(
    "/restaurantes/me/platos",
    response_model=DishResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_dish(
    claims: TokenClaimsDep,
    session: SessionDep,
    nombre: str = Form(...),
    descripcion: str | None = Form(None),
    categoria: str = Form(...),
    precio: str = Form(...),
    restricciones_alimenticias: list[str] = Form(default=[]),  # noqa: B008
    tiempo_preparacion_minutos: int | None = Form(None),
    foto: UploadFile | None = File(None),  # noqa: B008
) -> Dish:
    id_restaurante = restaurant_id(claims)
    try:
        payload = DishCreateRequest(
            nombre=nombre,
            descripcion=descripcion,
            categoria=categoria,
            precio=precio,
            restricciones_alimenticias=restricciones_alimenticias,
            tiempo_preparacion_minutos=tiempo_preparacion_minutos,
        )
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error

    foto_url = None
    if foto is not None:
        if foto.content_type not in {"image/jpeg", "image/png"}:
            raise HTTPException(status_code=400, detail="La foto debe estar en formato JPG o PNG.")
        content = foto.file.read()
        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="La foto no puede superar los 5 MB.")
        # Image storage is outside this MVP; retain the validated upload contract.
        foto_url = foto.filename

    dish = Dish(
        id_restaurante=id_restaurante,
        creado_en=datetime.now(UTC),
        foto_url=foto_url,
        **payload.model_dump(),
    )
    session.add(dish)
    try:
        session.commit()
    except IntegrityError as error:
        session.rollback()
        raise HTTPException(status_code=409, detail="Ya existe un plato con ese nombre.") from error
    session.refresh(dish)
    return dish

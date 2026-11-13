from datetime import UTC, datetime
from pathlib import Path
from typing import Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, File, Form, HTTPException, Response, UploadFile, status
from pydantic import ValidationError
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError

from app.api.deps import TokenClaimsDep
from app.api.restaurant import restaurant_from_claims
from app.db import SessionDep
from app.models.dish import Dish
from app.schemas.dish import (
    DishAvailabilityRequest,
    DishCreateRequest,
    DishEditRequest,
    DishManagementResponse,
    DishResponse,
    DishWriteResponse,
)

router = APIRouter(tags=["dishes"])
DISH_UPLOADS_DIR = Path("uploads/dishes")


def restaurant_id(claims: dict, session: SessionDep) -> UUID:
    """The signed-in restaurant, or 401/403. A token from before a password change is refused."""
    return restaurant_from_claims(claims, session).id_restaurante


@router.get("/restaurantes/me/platos", response_model=list[DishResponse])
def list_dishes(claims: TokenClaimsDep, session: SessionDep) -> list[Dish]:
    restaurant = restaurant_id(claims, session)
    return list(
        session.scalars(
            select(Dish)
            .where(Dish.id_restaurante == restaurant, Dish.deleted_at.is_(None))
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
    id_restaurante = restaurant_id(claims, session)
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

    stored_photo = store_photo(foto) if foto is not None and foto.filename else None
    foto_url = f"/media/dishes/{stored_photo.name}" if stored_photo else None

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
        if stored_photo is not None:
            stored_photo.unlink(missing_ok=True)
        raise HTTPException(status_code=409, detail="Ya existe un plato con ese nombre.") from error
    session.refresh(dish)
    return dish


MANAGEMENT_ERRORS = {
    400: {"description": "Datos inválidos."},
    401: {"description": "Falta la sesión o venció."},
    403: {"description": "Solo el restaurante dueño puede administrar este plato."},
    404: {"description": "No encontramos ese plato."},
    409: {"description": "Ya existe un plato con ese nombre."},
}


def store_photo(photo: UploadFile) -> Path:
    if photo.content_type not in {"image/jpeg", "image/png"}:
        raise HTTPException(status_code=400, detail="La foto debe estar en formato JPG o PNG.")
    content = photo.file.read(5 * 1024 * 1024 + 1)
    if not content:
        raise HTTPException(status_code=400, detail="La foto está vacía.")
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="La foto no puede superar los 5 MB.")
    extension = ".jpg" if photo.content_type == "image/jpeg" else ".png"
    stored = DISH_UPLOADS_DIR / f"{uuid4()}{extension}"
    try:
        DISH_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
        stored.write_bytes(content)
    except OSError as error:
        stored.unlink(missing_ok=True)
        raise HTTPException(
            status_code=500, detail="No pudimos guardar la foto. Intentá de nuevo."
        ) from error
    return stored


def owned_dish(session: SessionDep, claims: dict, dish_id: UUID, *, include_deleted=False) -> Dish:
    owner = restaurant_id(claims, session)
    dish = session.get(Dish, dish_id)
    if dish is None:
        raise HTTPException(status_code=404, detail="No encontramos ese plato.")
    if dish.id_restaurante != owner:
        raise HTTPException(
            status_code=403, detail="Solo podés administrar los platos de tu restaurante."
        )
    if dish.deleted_at is not None and not include_deleted:
        raise HTTPException(status_code=404, detail="No encontramos ese plato.")
    return dish


def save_changes(session: SessionDep, dish: Dish, values: dict) -> None:
    if not any(getattr(dish, field) != value for field, value in values.items()):
        return
    result = session.execute(
        update(Dish)
        .where(
            Dish.id_plato == dish.id_plato,
            Dish.id_restaurante == dish.id_restaurante,
            Dish.deleted_at.is_(None),
        )
        .values(**values, revision=Dish.revision + 1)
    )
    if result.rowcount != 1:
        session.rollback()
        raise HTTPException(status_code=404, detail="No encontramos ese plato.")


@router.get(
    "/restaurant/dishes/{dish_id}",
    response_model=DishManagementResponse,
    responses=MANAGEMENT_ERRORS,
)
def get_dish(dish_id: UUID, claims: TokenClaimsDep, session: SessionDep) -> Dish:
    return owned_dish(session, claims, dish_id)


@router.put(
    "/restaurant/dishes/{dish_id}", response_model=DishWriteResponse, responses=MANAGEMENT_ERRORS
)
def edit_dish(
    dish_id: UUID,
    claims: TokenClaimsDep,
    session: SessionDep,
    name: str = Form(...),
    category: str = Form(...),
    price: str = Form(...),
    photo_action: Literal["keep", "replace", "remove"] = Form(...),
    expected_revision: int = Form(..., gt=0),
    description: str | None = Form(None),
    dietary_restrictions: list[str] = Form(default=[]),  # noqa: B008
    prep_time_minutes: str | None = Form(None),
    photo: UploadFile | None = File(None),  # noqa: B008
) -> DishWriteResponse:
    dish = owned_dish(session, claims, dish_id)
    try:
        payload = DishEditRequest(
            name=name,
            category=category,
            price=price,
            description=description,
            dietary_restrictions=dietary_restrictions,
            prep_time_minutes=prep_time_minutes or None,
            photo_action=photo_action,
            expected_revision=expected_revision,
        )
    except ValidationError as error:
        # Match the application's structured field errors without exposing Pydantic context.
        field_messages = {
            "name": "Ingresá un nombre de hasta 150 caracteres.",
            "description": "La descripción puede tener hasta 2000 caracteres.",
            "price": (
                "Ingresá un precio mayor a cero, de hasta 99999999,99 y con hasta dos decimales."
            ),
            "prep_time_minutes": "Ingresá minutos enteros entre 1 y 2147483647.",
        }
        detail = [
            {
                "loc": ["body", *e["loc"]],
                "type": e["type"],
                "msg": e["msg"].removeprefix("Value error, ")
                if e["type"] == "value_error"
                else field_messages.get(e["loc"][0], "Revisá este campo."),
            }
            for e in error.errors()
        ]
        raise HTTPException(status_code=400, detail=detail) from error
    has_photo = photo is not None and bool(photo.filename)
    if (photo_action == "replace") != has_photo:
        raise HTTPException(
            status_code=400,
            detail="Elegí una foto para reemplazarla, o conservá o quitá la actual.",
        )
    stale = dish.revision != payload.expected_revision
    stored = store_photo(photo) if has_photo else None
    values = payload.stored_values()
    if photo_action != "keep":
        values["foto_url"] = f"/media/dishes/{stored.name}" if stored else None
    try:
        save_changes(session, dish, values)
        session.commit()
    except Exception as error:
        session.rollback()
        if stored:
            stored.unlink(missing_ok=True)
        if isinstance(error, IntegrityError):
            raise HTTPException(
                status_code=409, detail="Ya existe un plato con ese nombre."
            ) from error
        raise
    session.refresh(dish)
    return DishWriteResponse(
        dish=DishManagementResponse.model_validate(dish), changed_since_open=stale
    )


@router.patch(
    "/restaurant/dishes/{dish_id}/availability",
    response_model=DishWriteResponse,
    responses=MANAGEMENT_ERRORS,
)
def set_availability(
    dish_id: UUID, payload: DishAvailabilityRequest, claims: TokenClaimsDep, session: SessionDep
) -> DishWriteResponse:
    dish = owned_dish(session, claims, dish_id)
    stale = dish.revision != payload.expected_revision
    save_changes(session, dish, {"disponible": payload.available})
    session.commit()
    session.refresh(dish)
    return DishWriteResponse(
        dish=DishManagementResponse.model_validate(dish), changed_since_open=stale
    )


@router.delete("/restaurant/dishes/{dish_id}", status_code=204, responses=MANAGEMENT_ERRORS)
def remove_dish(dish_id: UUID, claims: TokenClaimsDep, session: SessionDep) -> Response:
    dish = owned_dish(session, claims, dish_id, include_deleted=True)
    if dish.deleted_at is None:
        save_changes(session, dish, {"deleted_at": datetime.now(UTC), "disponible": False})
        session.commit()
    return Response(status_code=204)

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Response, status

from app.api.deps import TokenClaimsDep, require_diner
from app.api.reservation import reservation_response
from app.db import SessionDep
from app.models.cart import Cart
from app.models.order import Order
from app.models.reservation import Reservation
from app.models.restaurant import Restaurant
from app.schemas.diner_order import (
    CartItemResponse,
    CartResponse,
    CartSaveResponse,
    ConfirmedOrderItemResponse,
    OrderMenuDish,
    OrderPageResponse,
    OrderRequest,
    OrderResponse,
)
from app.services import availability, orders
from app.services.availability import BUENOS_AIRES

router = APIRouter(tags=["order"])

RESERVATION_NOT_FOUND = "No encontramos esa reserva."

NOT_FOUND = {404: {"description": "La reserva no existe o es de otro comensal."}}
SESSION_AND_ROLE = {
    401: {"description": "Falta la sesión o venció."},
    403: {"description": "Solo para comensales."},
}


def order_response(order: Order) -> OrderResponse:
    summary = orders.order_summary(order.items)
    return OrderResponse(
        confirmed_at=order.confirmed_at.astimezone(BUENOS_AIRES),
        items=[
            ConfirmedOrderItemResponse(
                dish_id=item.dish_id,
                name=item.dish_name,
                unit_price=item.unit_price,
                prep_time_minutes=item.prep_time_minutes,
                quantity=item.quantity,
                subtotal=orders.subtotal(item),
            )
            for item in order.items
        ],
        total=summary.total,
        prep_time_minutes=summary.prep_time_minutes,
    )


def cart_response(cart: Cart) -> CartResponse:
    return CartResponse(
        updated_at=cart.updated_at.astimezone(BUENOS_AIRES),
        items=[
            CartItemResponse(
                dish_id=item.dish_id,
                quantity=item.quantity,
                name=item.dish_name,
                unit_price=item.unit_price,
                prep_time_minutes=item.prep_time_minutes,
            )
            for item in cart.items
        ],
    )


def order_page(session: SessionDep, reservation: Reservation, now: datetime) -> OrderPageResponse:
    order = orders.order_of(session, reservation.id)
    cart = orders.open_cart(session, reservation, now)
    return OrderPageResponse(
        reservation=reservation_response(
            session, reservation, session.get(Restaurant, reservation.restaurant_id), now
        ),
        order=order_response(order) if order else None,
        cart=cart_response(cart) if cart else None,
        menu=[
            OrderMenuDish(
                id=dish.id_plato,
                name=dish.nombre,
                description=dish.descripcion,
                category=dish.categoria,
                price=dish.precio,
                photo_url=dish.foto_url,
                dietary_restrictions=dish.restricciones_alimenticias,
                prep_time_minutes=dish.tiempo_preparacion_minutos,
            )
            for dish in orders.menu_dishes(session, reservation.restaurant_id)
        ],
    )


def item_inputs(payload: OrderRequest) -> list[orders.ItemInput]:
    return [
        orders.ItemInput(
            dish_id=item.dish_id,
            quantity=item.quantity,
            name=item.name,
            unit_price=item.unit_price,
            prep_time_minutes=item.prep_time_minutes,
        )
        for item in payload.items
    ]


def not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=RESERVATION_NOT_FOUND)


def conflict(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)


@router.get(
    "/reservations/{reservation_id}/order",
    response_model=OrderPageResponse,
    responses={**SESSION_AND_ROLE, **NOT_FOUND},
)
def get_order(
    reservation_id: UUID, claims: TokenClaimsDep, session: SessionDep
) -> OrderPageResponse:
    diner_id = require_diner(claims, session)
    try:
        reservation = orders.diner_reservation(session, diner_id, reservation_id)
    except orders.ReservationNotFoundError as error:
        raise not_found() from error
    return order_page(session, reservation, availability.current_time())


@router.put(
    "/reservations/{reservation_id}/order",
    response_model=OrderPageResponse,
    responses={
        400: {"description": "Datos inválidos, o no hay platos ni pedido que quitar."},
        **SESSION_AND_ROLE,
        **NOT_FOUND,
        409: {"description": "El pedido ya no se puede cambiar, o el menú cambió."},
    },
)
def put_order(
    reservation_id: UUID, payload: OrderRequest, claims: TokenClaimsDep, session: SessionDep
) -> OrderPageResponse:
    """Confirms the order: it replaces the previous one and the cart (P1, P11)."""
    diner_id = require_diner(claims, session)
    now = availability.current_time()
    try:
        reservation, _ = orders.confirm_order(
            session, diner_id, reservation_id, item_inputs(payload), now
        )
    except orders.ReservationNotFoundError as error:
        raise not_found() from error
    except orders.OrderClosedError as error:
        session.rollback()
        raise conflict(orders.ORDER_CLOSED) from error
    except orders.EmailNotVerifiedError as error:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=orders.EMAIL_NOT_VERIFIED
        ) from error
    except orders.NothingToConfirmError as error:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=orders.NOTHING_TO_CONFIRM
        ) from error
    except orders.MenuChangedError as error:
        session.rollback()
        raise conflict(orders.MENU_CHANGED) from error
    session.commit()
    return order_page(session, reservation, now)


@router.put(
    "/reservations/{reservation_id}/cart",
    response_model=CartSaveResponse,
    responses={
        400: {"description": "Datos inválidos."},
        **SESSION_AND_ROLE,
        **NOT_FOUND,
        409: {"description": "El pedido ya no se puede cambiar, o un plato ya no está."},
    },
)
def put_cart(
    reservation_id: UUID, payload: OrderRequest, claims: TokenClaimsDep, session: SessionDep
) -> CartSaveResponse:
    """Saves the order being built; the restaurant never sees it (P1)."""
    diner_id = require_diner(claims, session)
    try:
        cart = orders.save_cart(
            session, diner_id, reservation_id, item_inputs(payload), availability.current_time()
        )
    except orders.ReservationNotFoundError as error:
        raise not_found() from error
    except orders.OrderClosedError as error:
        session.rollback()
        raise conflict(orders.ORDER_CLOSED) from error
    except orders.MenuChangedError as error:
        session.rollback()
        raise conflict(orders.MENU_CHANGED) from error
    session.commit()
    return CartSaveResponse(cart=cart_response(cart) if cart else None)


@router.delete(
    "/reservations/{reservation_id}/cart",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**SESSION_AND_ROLE, **NOT_FOUND},
)
def delete_cart(reservation_id: UUID, claims: TokenClaimsDep, session: SessionDep) -> Response:
    """«Descartar cambios»: back to the confirmed order, if any."""
    diner_id = require_diner(claims, session)
    try:
        orders.discard_cart(session, diner_id, reservation_id)
    except orders.ReservationNotFoundError as error:
        raise not_found() from error
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

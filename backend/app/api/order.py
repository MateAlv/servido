from datetime import datetime, timedelta
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy.exc import IntegrityError

from app.api.deps import TokenClaimsDep, require_diner
from app.api.reservation import reservation_response
from app.config import settings
from app.db import SessionDep
from app.models.cart import Cart
from app.models.order import Order
from app.models.payment import Payment
from app.models.reservation import Reservation
from app.models.restaurant import Restaurant
from app.schemas.diner_order import (
    ArrivalWindow,
    CartItemResponse,
    CartResponse,
    CartSaveResponse,
    ConfirmationRequest,
    ConfirmationResult,
    ConfirmedOrderItemResponse,
    DraftRequest,
    OrderDiscountResponse,
    OrderMenuDish,
    OrderPageResponse,
    OrderResponse,
    PaymentConfigResponse,
    PaymentMethodRequest,
    PaymentReceiptResponse,
    PaymentRequest,
    PaymentResult,
)
from app.services import availability, mercadopago, orders, payments, promotions
from app.services.availability import BUENOS_AIRES

router = APIRouter(tags=["order"])

RESERVATION_NOT_FOUND = "No encontramos esa reserva."

NOT_FOUND = {404: {"description": "La reserva no existe o es de otro comensal."}}
SESSION_AND_ROLE = {
    401: {"description": "Falta la sesión o venció."},
    403: {"description": "Solo para comensales."},
}


def payment_response(payment: Payment) -> PaymentReceiptResponse:
    return PaymentReceiptResponse(
        status=payment.status,
        message=payments.message(payment),
        operation_number=payment.provider_payment_id,
        amount=payment.amount,
        card_brand=payments.brand_name(payment),
        card_last_four=payment.card_last_four,
        created_at=payment.created_at.astimezone(BUENOS_AIRES),
        approved_at=payment.approved_at.astimezone(BUENOS_AIRES) if payment.approved_at else None,
    )


def order_response(
    order: Order, reservation: Reservation, now: datetime, payment: Payment | None = None
) -> OrderResponse:
    summary = orders.order_summary(order.items)
    return OrderResponse(
        arrival_at=orders.arrival_time(reservation, order),
        prep_start_time=orders.prep_start_time(reservation, order),
        payment_method=order.payment_method,
        payment_status=order.payment_status,
        # A payment in review fixes the method too (spec 032, E8).
        payment_method_editable=orders.payment_editable(reservation, order, now)
        and not (payment and payment.status == "in_process"),
        payment=payment_response(payment) if payment else None,
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
        # The diner sees only the regular menu bill; promotions are restaurant-side for now.
        subtotal=order.subtotal,
        promotions=[
            OrderDiscountResponse(name=discount.name, amount=discount.amount)
            for discount in order.discounts
        ],
        discount=order.discount_amount,
        total=order.total,
        prep_time_minutes=summary.prep_time_minutes,
    )


def cart_response(
    session: SessionDep, cart: Cart, reservation: Reservation, restaurant: Restaurant
) -> CartResponse:
    subtotal = sum((orders.subtotal(item) for item in cart.items), Decimal("0.00"))
    applied = promotions.applied_for(
        session, restaurant, subtotal, orders.arrival_time(reservation, cart)
    )
    discount = promotions.total_discount(applied)
    return CartResponse(
        arrival_at=orders.arrival_time(reservation, cart),
        payment_method=cart.payment_method,
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
        subtotal=subtotal,
        promotions=[
            OrderDiscountResponse(name=discount.name, amount=discount.amount)
            for discount in applied
        ],
        discount=discount,
        total=subtotal - discount,
    )


def order_page(session: SessionDep, reservation: Reservation, now: datetime) -> OrderPageResponse:
    restaurant = session.get(Restaurant, reservation.restaurant_id)
    order = orders.order_of(session, reservation.id)
    cart = orders.open_cart(session, reservation, now)
    return OrderPageResponse(
        arrival_window=ArrivalWindow(
            starts_at=reservation.starts_at, latest_at=reservation.starts_at + timedelta(minutes=30)
        ),
        reservation=reservation_response(session, reservation, restaurant, now),
        order=order_response(order, reservation, now, payments.live(session, order.id))
        if order
        else None,
        cart=cart_response(session, cart, reservation, restaurant) if cart else None,
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


def item_inputs(payload: DraftRequest) -> list[orders.ItemInput]:
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
    now = availability.current_time()
    if payments.settle_in_review(session, reservation, now):
        session.commit()
        payments.send_receipt(session, reservation)
    return order_page(session, reservation, now)


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
    reservation_id: UUID, payload: ConfirmationRequest, claims: TokenClaimsDep, session: SessionDep
) -> OrderPageResponse:
    """Confirms the order: it replaces the previous one and the cart (P1, P11)."""
    diner_id = require_diner(claims, session)
    try:
        reservation, replayed = orders.confirm_operation(session, diner_id, reservation_id, payload)
    except orders.InvalidArrivalError as error:
        session.rollback()
        raise HTTPException(status_code=400, detail=str(error)) from error
    except IntegrityError as error:
        session.rollback()
        name = getattr(getattr(error.orig, "diag", None), "constraint_name", None)
        if name == "order_payment_paid":
            raise conflict(
                "Ya se registró el pago de este pedido. No podés cambiar el medio."
            ) from error
        if name == "order_payment_required":
            raise HTTPException(
                status_code=400, detail="Seleccioná un medio de pago para confirmar tu pedido."
            ) from error
        raise
    except orders.OrderConflictError as error:
        session.rollback()
        raise conflict(str(error)) from error
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
    result = order_page(session, reservation, availability.current_time())
    result.confirmation = ConfirmationResult(operation_id=payload.operation_id, replayed=replayed)
    return result


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
    reservation_id: UUID, payload: DraftRequest, claims: TokenClaimsDep, session: SessionDep
) -> CartSaveResponse:
    """Saves the order being built; the restaurant never sees it (P1)."""
    diner_id = require_diner(claims, session)
    try:
        cart = orders.save_cart(
            session,
            diner_id,
            reservation_id,
            item_inputs(payload),
            availability.current_time(),
            arrival_at=payload.arrival_at,
            payment_method=payload.payment_method,
        )
    except orders.InvalidArrivalError as error:
        session.rollback()
        raise HTTPException(status_code=400, detail=str(error)) from error
    except IntegrityError as error:
        session.rollback()
        name = getattr(getattr(error.orig, "diag", None), "constraint_name", None)
        if name == "order_payment_paid":
            raise conflict(
                "Ya se registró el pago de este pedido. No podés cambiar el medio."
            ) from error
        if name == "order_payment_required":
            raise HTTPException(
                status_code=400, detail="Seleccioná un medio de pago para confirmar tu pedido."
            ) from error
        raise
    except orders.OrderConflictError as error:
        session.rollback()
        raise conflict(str(error)) from error
    except orders.ReservationNotFoundError as error:
        raise not_found() from error
    except orders.OrderClosedError as error:
        session.rollback()
        raise conflict(orders.ORDER_CLOSED) from error
    except orders.MenuChangedError as error:
        session.rollback()
        raise conflict(orders.MENU_CHANGED) from error
    session.commit()
    reservation = orders.diner_reservation(session, diner_id, reservation_id)
    restaurant = session.get(Restaurant, reservation.restaurant_id)
    return CartSaveResponse(
        cart=cart_response(session, cart, reservation, restaurant) if cart else None
    )


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


@router.put(
    "/reservations/{reservation_id}/order/payment-method",
    response_model=OrderPageResponse,
    responses={
        **SESSION_AND_ROLE,
        **NOT_FOUND,
        400: {"description": "Medio inválido."},
        409: {"description": "El medio ya no se puede cambiar."},
    },
)
def put_payment_method(
    reservation_id: UUID, payload: PaymentMethodRequest, claims: TokenClaimsDep, session: SessionDep
) -> OrderPageResponse:
    diner_id = require_diner(claims, session)
    try:
        reservation = orders.change_payment_method(
            session, diner_id, reservation_id, payload.payment_method, availability.current_time()
        )
    except orders.ReservationNotFoundError as error:
        raise not_found() from error
    except IntegrityError as error:
        session.rollback()
        name = getattr(getattr(error.orig, "diag", None), "constraint_name", None)
        if name == "order_payment_paid":
            raise conflict(
                "Ya se registró el pago de este pedido. No podés cambiar el medio."
            ) from error
        if name == "order_payment_required":
            raise HTTPException(
                status_code=400, detail="Seleccioná un medio de pago para confirmar tu pedido."
            ) from error
        raise
    except orders.OrderConflictError as error:
        session.rollback()
        raise conflict(str(error)) from error
    session.commit()
    return order_page(session, reservation, availability.current_time())


PAYMENT_UNAVAILABLE = (
    "El pago electrónico no está disponible en este momento. Probá más tarde o pagá en efectivo."
)


@router.get("/payments/config", response_model=PaymentConfigResponse)
def get_payment_config() -> PaymentConfigResponse:
    return PaymentConfigResponse(
        public_key=settings.mercadopago_public_key if mercadopago.enabled() else None
    )


@router.post(
    "/reservations/{reservation_id}/order/payments",
    status_code=status.HTTP_201_CREATED,
    response_model=PaymentResult,
    responses={
        400: {"description": "Mercado Pago no aceptó los datos del pago."},
        **SESSION_AND_ROLE,
        **NOT_FOUND,
        409: {"description": "El pedido ya está pagado, tiene un pago en revisión o no se paga."},
        503: {"description": "El pago electrónico no está disponible."},
    },
)
def post_payment(
    reservation_id: UUID, payload: PaymentRequest, claims: TokenClaimsDep, session: SessionDep
) -> PaymentResult:
    """Charges the order through Mercado Pago (spec 032, US-56). A rejected card is still a
    created payment: the result says why, and the order stays pending."""
    diner_id = require_diner(claims, session)
    if not mercadopago.enabled():
        raise HTTPException(status_code=503, detail=PAYMENT_UNAVAILABLE)
    now = availability.current_time()
    card = payments.CardPayment(
        token=payload.token,
        payment_method_id=payload.payment_method_id,
        issuer_id=payload.issuer_id,
        payer=payload.payer.model_dump(exclude_none=True),
        request_id=payload.request_id,
    )
    try:
        reservation, payment, created = payments.pay_order(
            session, diner_id, reservation_id, card, now
        )
    except orders.ReservationNotFoundError as error:
        raise not_found() from error
    except payments.PaymentConflictError as error:
        # A payment in review may have just been settled: keep that.
        session.commit()
        raise conflict(str(error)) from error
    except mercadopago.CardDataError as error:
        session.rollback()
        raise HTTPException(
            status_code=400,
            detail="Mercado Pago no aceptó los datos del pago. Revisalos y probá de nuevo.",
        ) from error
    except mercadopago.MercadoPagoError as error:
        session.rollback()
        raise HTTPException(status_code=503, detail=PAYMENT_UNAVAILABLE) from error
    session.commit()
    if created:
        payments.send_receipt(session, reservation)
    return PaymentResult(
        payment=payment_response(payment), page=order_page(session, reservation, now)
    )

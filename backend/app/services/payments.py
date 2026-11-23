"""Electronic payment of a pre-order through Mercado Pago (spec 032, US-56)."""

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.diner import Diner
from app.models.order import Order
from app.models.payment import Payment
from app.models.reservation import Reservation
from app.models.restaurant import Restaurant
from app.services import mail, mercadopago, orders
from app.services.availability import BUENOS_AIRES

logger = logging.getLogger(__name__)

REJECTION_MESSAGES = {
    "cc_rejected_bad_filled_card_number": "Revisá el número de la tarjeta.",
    "cc_rejected_bad_filled_date": "Revisá la fecha de vencimiento.",
    "cc_rejected_bad_filled_security_code": "Revisá el código de seguridad.",
    "cc_rejected_bad_filled_other": "Revisá los datos de la tarjeta.",
    "cc_rejected_insufficient_amount": "La tarjeta no tiene fondos suficientes.",
    "cc_rejected_call_for_authorize": "Tenés que autorizar el pago con el banco de la tarjeta.",
    "cc_rejected_card_disabled": "La tarjeta no está activa. Comunicate con tu banco.",
    "cc_rejected_duplicated_payment": "Ya hiciste un pago por este importe. Usá otra tarjeta.",
}
REJECTED = "La tarjeta no autorizó el pago."
IN_REVIEW = "Tu pago está en revisión. Abrí el pedido más tarde para ver si se aprobó."
ALREADY_PAID = "Ya pagaste este pedido."
NOT_PAYABLE = (
    "No podés pagar este pedido: la reserva terminó o no está vigente, o el pedido ya no existe."
)
NOTHING_TO_PAY = "Este pedido no tiene importe a pagar."


CARD_BRANDS = {
    "visa": "Visa",
    "debvisa": "Visa Débito",
    "master": "Mastercard",
    "debmaster": "Mastercard Débito",
    "amex": "American Express",
    "naranja": "Naranja",
    "cabal": "Cabal",
    "debcabal": "Cabal Débito",
    "maestro": "Maestro",
}


class PaymentConflictError(Exception):
    pass


@dataclass(frozen=True)
class CardPayment:
    token: str
    payment_method_id: str
    issuer_id: str | None
    payer: dict[str, Any]
    request_id: UUID


def message(payment: Payment) -> str:
    if payment.status == "approved":
        return "Pago aprobado."
    if payment.status == "in_process":
        return IN_REVIEW
    return REJECTION_MESSAGES.get(payment.status_detail, REJECTED)


def brand_name(payment: Payment) -> str:
    return CARD_BRANDS.get(payment.card_brand or "", (payment.card_brand or "Tarjeta").title())


def card_label(payment: Payment) -> str:
    brand = brand_name(payment)
    return f"{brand} terminada en {payment.card_last_four}" if payment.card_last_four else brand


def receipt_mail(session: Session, reservation: Reservation, order: Order, payment: Payment):
    restaurant = session.get(Restaurant, reservation.restaurant_id)
    diner = session.get(Diner, reservation.diner_id)
    return mail.payment_receipt_mail(
        to=diner.email,
        restaurant_name=restaurant.nombre,
        reservation_start=reservation.starts_at.astimezone(BUENOS_AIRES),
        items=[(item.dish_name, item.quantity, orders.subtotal(item)) for item in order.items],
        discount=order.discount_amount,
        total=payment.amount,
        operation_number=payment.provider_payment_id,
        card=card_label(payment),
        paid_at=payment.approved_at.astimezone(BUENOS_AIRES),
    )


def send_receipt(session: Session, reservation: Reservation) -> None:
    order = orders.order_of(session, reservation.id)
    payment = live(session, order.id) if order else None
    if payment is None or payment.status != "approved":
        return
    try:
        mail.send_mail(receipt_mail(session, reservation, order, payment))
    except mail.MailError:
        logger.exception("Could not send the payment receipt")


def live(session: Session, order_id: UUID) -> Payment | None:
    return session.scalar(
        select(Payment).where(
            Payment.order_id == order_id, Payment.status.in_(("approved", "in_process"))
        )
    )


def mark_paid(order: Order, payment: Payment, now: datetime) -> None:
    payment.status = "approved"
    payment.approved_at = now
    order.payment_method = "online"
    order.payment_status = "paid"
    order.paid_amount = payment.amount
    order.paid_at = now


def settle(session: Session, order: Order, payment: Payment, now: datetime) -> bool:
    """Asks Mercado Pago again about a payment in review (E8). Returns whether it changed."""
    try:
        answer = mercadopago.fetch(payment.provider_payment_id)
    except mercadopago.MercadoPagoError:
        return False
    if answer.status == payment.status:
        return False
    payment.status_detail = answer.status_detail
    if answer.status == "approved":
        mark_paid(order, payment, now)
    else:
        payment.status = answer.status
    session.flush()
    return True


def settle_in_review(session: Session, reservation: Reservation, now: datetime) -> bool:
    order = orders.order_of(session, reservation.id)
    payment = live(session, order.id) if order else None
    if order is None or payment is None or payment.status != "in_process":
        return False
    return settle(session, order, payment, now)


def pay_order(
    session: Session, diner_id: UUID, reservation_id: UUID, card: CardPayment, now: datetime
) -> tuple[Reservation, Payment, bool]:
    """Charges the order's total, which includes the reservation's deposit (E2). The bool says
    whether this call created the payment (False when it repeats an earlier request)."""
    reservation = orders.diner_reservation(session, diner_id, reservation_id, lock=True)
    order = orders.order_of(session, reservation.id)
    replay = session.scalar(select(Payment).where(Payment.request_id == card.request_id))
    if replay is not None:
        if order is None or replay.order_id != order.id:
            raise PaymentConflictError(NOT_PAYABLE)
        return reservation, replay, False
    if order is None:
        raise PaymentConflictError(NOT_PAYABLE)
    current = live(session, order.id)
    if current is not None and current.status == "in_process":
        settle(session, order, current, now)
    if order.payment_status == "paid":
        raise PaymentConflictError(ALREADY_PAID)
    if current is not None and current.status == "in_process":
        raise PaymentConflictError(IN_REVIEW)
    if not orders.payment_editable(reservation, order, now):
        raise PaymentConflictError(NOT_PAYABLE)
    if order.total <= 0:
        raise PaymentConflictError(NOTHING_TO_PAY)
    restaurant = session.get(Restaurant, reservation.restaurant_id)
    answer = mercadopago.charge(
        token=card.token,
        amount=order.total,
        payment_method_id=card.payment_method_id,
        issuer_id=card.issuer_id,
        payer=card.payer,
        description=f"Pedido anticipado en {restaurant.nombre}",
        external_reference=str(order.id),
        idempotency_key=str(card.request_id),
    )
    payment = Payment(
        order_id=order.id,
        request_id=card.request_id,
        provider_payment_id=answer.id,
        amount=order.total,
        status="in_process" if answer.status == "in_process" else "rejected",
        status_detail=answer.status_detail,
        card_brand=answer.card_brand,
        card_last_four=answer.card_last_four,
    )
    session.add(payment)
    if answer.status == "approved":
        mark_paid(order, payment, now)
    session.flush()
    return reservation, payment, True

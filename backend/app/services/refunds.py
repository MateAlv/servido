from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.order import Order
from app.models.payment import Payment
from app.models.refund import Refund
from app.services import mercadopago

# Tests can force the next attempt to fail without going through Mercado Pago.
force_failure = False
BUENOS_AIRES = ZoneInfo("America/Argentina/Buenos_Aires")


class RefundFailedError(Exception):
    pass


def refund_order(session: Session, order: Order, now: datetime) -> Refund:
    refund = session.scalar(select(Refund).where(Refund.order_id == order.id).with_for_update())
    if refund is not None and refund.status == "completed":
        return refund
    if force_failure or not money_returned(session, order):
        refund = refund or Refund(
            order_id=order.id,
            amount=order.paid_amount,
            method=order.payment_method,
            status="failed",
        )
        refund.status = "failed"
        refund.completed_at = None
        session.add(refund)
        session.flush()
        raise RefundFailedError
    refund = refund or Refund(
        order_id=order.id,
        amount=order.paid_amount,
        method=order.payment_method,
        status="completed",
        completed_at=now,
    )
    refund.status = "completed"
    refund.completed_at = now
    session.add(refund)
    session.flush()
    return refund


def money_returned(session: Session, order: Order) -> bool:
    """Gives back the order's approved payment through Mercado Pago (spec 032, E7) and says
    whether the money is back. A paid order without one (only demo data) has nothing to return."""
    payment = session.scalar(
        select(Payment).where(Payment.order_id == order.id, Payment.status == "approved")
    )
    if payment is None:
        return True
    try:
        mercadopago.refund(payment.provider_payment_id, idempotency_key=f"refund-{order.id}")
    except mercadopago.MercadoPagoError:
        return False
    return True

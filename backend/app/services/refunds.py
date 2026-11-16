from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.order import Order
from app.models.refund import Refund

# Tests can force the next attempt to fail without introducing a payment provider.
force_failure = False
BUENOS_AIRES = ZoneInfo("America/Argentina/Buenos_Aires")


class RefundFailedError(Exception):
    pass


def refund_order(session: Session, order: Order, now: datetime) -> Refund:
    refund = session.scalar(select(Refund).where(Refund.order_id == order.id).with_for_update())
    if refund is not None and refund.status == "completed":
        return refund
    if force_failure:
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

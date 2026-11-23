"""A stand-in for Mercado Pago's payments API (spec 032, US-56).

The card token decides the answer, like the cardholder name does with Mercado Pago's test cards:
`approved` (APRO), `rejected` (FUND), `in_process` (CONT) and `invalid` (bad card data).
"""

from typing import Any

from app.services import mercadopago

OUTCOMES = {
    "approved": ("approved", "accredited"),
    "rejected": ("rejected", "cc_rejected_insufficient_amount"),
    "in_process": ("in_process", "pending_contingency"),
}


class FakeMercadoPago:
    def __init__(self) -> None:
        self.payments: dict[str, dict[str, Any]] = {}
        self.answers_by_key: dict[str, dict[str, Any]] = {}
        self.calls: list[tuple[str, str, dict[str, Any] | None]] = []
        self.down = False
        self.refunds_fail = False
        self.last_id = 1000

    def request(
        self,
        method: str,
        path: str,
        body: dict[str, Any] | None = None,
        idempotency_key: str | None = None,
    ) -> dict[str, Any]:
        self.calls.append((method, path, body))
        if self.down:
            raise mercadopago.MercadoPagoError
        if method == "POST" and path == "/v1/payments":
            return self.charge(body or {}, idempotency_key or "")
        payment_id = path.split("/")[3]
        if method == "GET":
            return self.payments[payment_id]
        if self.refunds_fail:
            raise mercadopago.MercadoPagoError
        self.payments[payment_id]["status"] = "refunded"
        return {"id": 1, "payment_id": int(payment_id), "status": "approved"}

    def charge(self, body: dict[str, Any], idempotency_key: str) -> dict[str, Any]:
        if idempotency_key in self.answers_by_key:
            return self.answers_by_key[idempotency_key]
        if body["token"] == "invalid":
            raise mercadopago.CardDataError
        status, detail = OUTCOMES[body["token"]]
        self.last_id += 1
        payment = {
            "id": self.last_id,
            "status": status,
            "status_detail": detail,
            "payment_method_id": body["payment_method_id"],
            "card": {"last_four_digits": "3704"},
            "transaction_amount": body["transaction_amount"],
        }
        self.payments[str(self.last_id)] = payment
        self.answers_by_key[idempotency_key] = payment
        return payment

    def decide(self, payment_id: str, status: str, detail: str) -> None:
        """Mercado Pago finishes reviewing a payment."""
        self.payments[payment_id].update(status=status, status_detail=detail)

    def charges(self) -> list[dict[str, Any]]:
        return [body for method, path, body in self.calls if path == "/v1/payments" and body]

    def refunded(self) -> list[str]:
        return [path.split("/")[3] for _, path, _ in self.calls if path.endswith("/refunds")]

"""Mercado Pago's payments API (spec 032, E1): charge a card token, read a payment, refund it.

It uses the standard library so the integration adds no dependency; tests replace `request`.
"""

import json
import logging
import urllib.error
import urllib.request
from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)

TIMEOUT_SECONDS = 20
# Mercado Pago's statuses folded into the three a payment of Servido! can have.
STATUSES = {
    "approved": "approved",
    "authorized": "in_process",
    "in_process": "in_process",
    "pending": "in_process",
}


class MercadoPagoError(Exception):
    """Mercado Pago is not configured, did not answer, or answered with an error."""


class CardDataError(MercadoPagoError):
    """Mercado Pago refused the card data (an expired token, an invalid identification…)."""


@dataclass(frozen=True)
class ProviderPayment:
    id: str
    status: str
    status_detail: str
    card_brand: str | None
    card_last_four: str | None


def enabled() -> bool:
    return bool(settings.mercadopago_access_token and settings.mercadopago_public_key)


def request(
    method: str, path: str, body: dict[str, Any] | None = None, idempotency_key: str | None = None
) -> dict[str, Any]:
    if not enabled():
        raise MercadoPagoError("Mercado Pago is not configured.")
    call = urllib.request.Request(
        settings.mercadopago_api_url + path,
        data=json.dumps(body).encode() if body is not None else None,
        method=method,
        headers={
            "Authorization": f"Bearer {settings.mercadopago_access_token}",
            "Content-Type": "application/json",
        },
    )
    if idempotency_key:
        call.add_header("X-Idempotency-Key", idempotency_key)
    try:
        with urllib.request.urlopen(call, timeout=TIMEOUT_SECONDS) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        logger.warning(
            "Mercado Pago answered %s to %s %s: %s", error.code, method, path, reason(error)
        )
        if error.code == 400:
            raise CardDataError from error
        raise MercadoPagoError from error
    except (urllib.error.URLError, TimeoutError, ValueError) as error:
        logger.warning("Mercado Pago did not answer %s %s", method, path)
        raise MercadoPagoError from error


def reason(error: urllib.error.HTTPError) -> str:
    """Mercado Pago's explanation, such as «payer.email must be a valid email». It never echoes
    the card data, which only travels inside the token."""
    try:
        return str(json.loads(error.read() or b"{}").get("message", ""))
    except ValueError:
        return ""


def provider_payment(data: dict[str, Any]) -> ProviderPayment:
    return ProviderPayment(
        id=str(data["id"]),
        status=STATUSES.get(data.get("status", ""), "rejected"),
        status_detail=data.get("status_detail") or "",
        card_brand=data.get("payment_method_id"),
        card_last_four=(data.get("card") or {}).get("last_four_digits"),
    )


def charge(
    *,
    token: str,
    amount: Decimal,
    payment_method_id: str,
    issuer_id: str | None,
    payer: dict[str, Any],
    description: str,
    external_reference: str,
    idempotency_key: str,
) -> ProviderPayment:
    body: dict[str, Any] = {
        # A JSON number: the amount always has two decimals, so the float is exact enough.
        "transaction_amount": float(amount),
        "token": token,
        "installments": 1,
        "payment_method_id": payment_method_id,
        "payer": payer,
        "description": description,
        "external_reference": external_reference,
    }
    if issuer_id:
        body["issuer_id"] = issuer_id
    return provider_payment(request("POST", "/v1/payments", body, idempotency_key))


def fetch(provider_payment_id: str) -> ProviderPayment:
    return provider_payment(request("GET", f"/v1/payments/{provider_payment_id}"))


def refund(provider_payment_id: str, idempotency_key: str) -> None:
    """Returns the whole payment. Raises MercadoPagoError unless Mercado Pago approved it."""
    data = request("POST", f"/v1/payments/{provider_payment_id}/refunds", {}, idempotency_key)
    if data.get("status") != "approved":
        raise MercadoPagoError(f"Refund {data.get('status')}")

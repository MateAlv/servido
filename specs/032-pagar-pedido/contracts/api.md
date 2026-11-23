# Contracts: Pay a pre-ordered meal in cash (US-60)

**Feature**: `specs/032-pagar-pedido` | **Date**: 2026-11-21

US-60 adds no endpoint and changes no payload. It relies on these existing contracts, which
`openapi.json` and `schema.d.ts` already describe.

## `PUT /api/reservations/{reservation_id}/order` — confirm the order with a method

- **Auth**: diner session (`TokenClaimsDep` + `require_diner`). Another diner's reservation is 404.
- **Body**: `ConfirmationRequest`, including `payment_method: "cash" | "online"` (required when
  there are items).
- **200**: `OrderPageResponse` with `order.payment_method`, `order.payment_status = "pending"` and
  `order.total`.
- **400**: missing method, invalid arrival.
- **403**: unverified email.
- **404**: reservation not found or not the diner's.
- **409**: order closed, menu changed, paid order with a different method.

## `PUT /api/reservations/{reservation_id}/order/payment-method` — switch the method

- **Auth**: diner session. Another diner's reservation is 404.
- **Body**: `{ "payment_method": "cash" | "online" }`.
- **200**: `OrderPageResponse` with the new method; `payment_status` stays `pending`.
- **404**: reservation not found or not the diner's.
- **409**: no order, reservation cancelled or already ended, or order already paid.

## `GET /api/reservations/{reservation_id}/order` — diner's order page

- **200**: `OrderPageResponse`; `order.total` is the amount to pay in cash.

## `GET /api/restaurant/orders/{order_id}` — restaurant's order detail (US-36)

- **Auth**: restaurant session; the order must belong to the restaurant.
- **200**: `RestaurantOrderResponse` with
  `payment: { status: "pending" | "paid", method: "cash" | "online" | "No seleccionado", total }`.
- **404**: order not found or from another restaurant.

## What US-60 must not do

- No endpoint writes `payment_status = "paid"` for a cash order.
- No endpoint accepts a payment on a cancelled reservation, a finished reservation, an empty order
  or another diner's order.

## US-56 (added 2026-11-23)

### `GET /api/payments/config` — Mercado Pago's public key

- **Auth**: none; the key is public by design.
- **200**: `{ "public_key": "TEST-…" }`, or `{ "public_key": null }` when electronic payment is not configured.

### `POST /api/reservations/{reservation_id}/order/payments` — pay the order

- **Auth**: diner session. Another diner's reservation is 404.
- **Body** (`PaymentRequest`, extra fields refused, so a card number never gets in):
  `{ "request_id": uuid, "token": str, "payment_method_id": "visa", "issuer_id": str | null, "payer": { "email": str, "identification": { "type": "DNI", "number": "12345678" } | null } }`.
- **201**: `PaymentResult` = `{ "payment": PaymentReceiptResponse, "page": OrderPageResponse }`. `payment.status` is `approved`, `rejected` (with `message` in Spanish, the order stays pending) or `in_process`. A repeated `request_id` returns the same payment without charging again.
- **400**: Mercado Pago refused the data (for example an invalid payer email).
- **409**: already paid, a payment in review, the reservation ended or is cancelled, or nothing to pay.
- **503**: Mercado Pago did not answer or is not configured.

### Changed

- `OrderResponse.payment`: the approved or in-review payment (`PaymentReceiptResponse`: status, message, operation number, amount, card brand and last four, dates), or null.
- `GET /api/reservations/{id}/order` asks Mercado Pago again about a payment in review before answering (E8).
- `PUT …/order` and `PUT …/cart` answer 409 for a paid order (E6); `order_open` is false once paid.
- `DELETE /api/reservations/{id}` refunds a paid order first; **502** when Mercado Pago does not return it (the reservation stays active).
- `GET /api/reservations/cancelled/{id}`: `refund_status` is `completed` once the refund went through, and `refund_amount` says how much was returned.

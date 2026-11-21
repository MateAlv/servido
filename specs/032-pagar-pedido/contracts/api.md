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

# Research: Pay a pre-ordered meal in cash (US-60)

**Feature**: `specs/032-pagar-pedido` | **Date**: 2026-11-21

## What already exists

`specs/020-tiempo-pago` (US-45) implemented the payment preference: `pedidos.payment_method`
(`cash` | `online`), `pedidos.payment_status` (`pending` | `paid`), `paid_amount` and `paid_at`,
the endpoint `PUT /api/reservations/{id}/order/payment-method`, and the rule that choosing a method
never marks the order paid. `specs/022-ver-pedido-restaurante` (US-36) exposes the same preference
and status to the restaurant.

US-60 asks for the same lifecycle but with an explicit cash reading: the order stays pending and
both sides see how much must be paid at the restaurant.

## Decisions

### D1 — Derive the cash amount instead of storing a new field

- **Decision**: The amount to pay in cash is the order's `total`, already returned by
  `OrderResponse.total` and `RestaurantOrderResponse.payment.total`.
- **Rationale**: The total is frozen at confirmation (spec 028, P4) and is the bill the diner pays.
  A new column would duplicate it and could drift.
- **Alternatives considered**: A `cash_amount` column (duplicates `total`); a new endpoint
  (returns data already in the page payload).

### D2 — No new state or "cash confirmed" transition

- **Decision**: US-60 keeps the order `pending`; nothing in this plan marks a cash order as paid.
- **Rationale**: The spec says «hasta que el pago en efectivo sea confirmado», but its own
  boundaries leave out a cash desk or turn closing, and no current US registers that confirmation.
  Inventing one would break Constitution principle II.
- **Alternatives considered**: A restaurant button «Marcar como pagado» (a different US; it would
  change the paid invariant and the refund rules of US-38).

### D3 — Show the cash note in the two existing screens, not a new component

- **Decision**: Add the copy inside `OrderPage` (review and confirmed steps) and
  `RestaurantOrdersPage` (order detail).
- **Rationale**: Each message appears once and has its own context (diner vs restaurant). A shared
  component would be an abstraction for two strings.
- **Alternatives considered**: A `PaymentSummary` component shared by both pages (more indirection
  than value for the MVP).

### D4 — Prove the lifecycle with US-60 tests on top of the US-45 code

- **Decision**: Add `backend/tests/test_us60_cash_payment.py` and US-60 cases in the two page
  tests, without changing the backend behavior.
- **Rationale**: Constitution principle III needs a test named after every acceptance scenario.
  Today the cash lifecycle is only proven under `US-45` names.
- **Alternatives considered**: Renaming US-45 tests (loses the trace to spec 020).

### D5 — Switch from cash to electronic uses the existing endpoint

- **Decision**: Reuse `PUT /api/reservations/{id}/order/payment-method` and the existing
  «Modificar medio de pago» modal.
- **Rationale**: It already allows changing only the method while the order is open and unpaid,
  which is exactly US-60 S4.
- **Alternatives considered**: A cash-specific endpoint (duplicates the same rule).

## Open questions

None that block the work. E5 is applied as written; E1–E4 belong to US-56, out of scope here.

## US-56 decisions

### R6 — Mercado Pago's Checkout API with the Card Payment Brick

- **Decision**: the order page embeds Mercado Pago's Card Payment Brick and the API charges the token with `POST /v1/payments`, using the test credentials of the team's application (Checkout API, Payments API).
- **Rationale**: the card fields live in Mercado Pago's iframes, so Servido! never handles card data; it works on localhost; the test environment is free and the test cards decide the result by the cardholder name (`APRO`, `OTHE`, `CONT`).
- **Alternatives considered**: the simulated checkout first proposed in E1 (no real integration to show); Checkout Pro (redirects, needs public return URLs and a test buyer account); Mercado Pago's Python SDK and `@mercadopago/sdk-react` (dependencies for three HTTP calls and one script tag).

### R7 — No webhooks: ask again on page load

- **Decision**: a payment in review is asked about with `GET /v1/payments/{id}` whenever the diner opens the order.
- **Rationale**: no background work (AGENTS.md) and no public URL locally. With test cards, review only happens on purpose (`CONT`).

### R8 — Refunds of real payments through Mercado Pago

- **Decision**: `refunds.refund_order` returns an approved payment with `POST /v1/payments/{id}/refunds` (idempotency key per order). Paid orders without a payment row (demo data and the US-38 tests) keep the simulated refund.
- **Rationale**: a cancelled reservation must give the money back (US-25 FR-011 of spec 013, US-38); a simulated refund would leave the test payment charged.

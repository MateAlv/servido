# API Contract: US-43 / US-45

**Base**: `/api` | **Auth**: existing Bearer JWT | **Date**: 2026-11-14

This is the planned contract, not a generated OpenAPI file. During implementation change Pydantic/router definitions, run `make api-types`, and commit both generated frontend contract files. Preserve the Spanish access API unchanged.

## Shared types

- `PaymentMethod`: `"cash" | "online"`; an incomplete draft or legacy response may represent absence with JSON null, never a Spanish sentinel in diner requests. A new non-empty confirmation/reconfirmation must choose cash/online.
- `arrival_at`: required ISO 8601 datetime WITH offset (for example `2026-11-15T21:10:00-03:00`). Server rejects naive datetimes with 400. Inclusive reservation start to start+30 minutes; must be future when a NEW confirmation is accepted. No invented minute grid.
- `items`: unchanged OrderItemRequest list; up to 50 distinct dish UUIDs, quantity 1–20, nonblank name <=150 chars, positive Decimal Numeric(10,2) money, optional positive preparation integer. Existing P9 comparisons remain.
- `DraftRequest`: `{items, arrival_at, payment_method}`. All keys required; payment_method may be null. Full replacement, not PATCH. It preserves the saved private snapshot; 45-minute closure still applies to cart writes.
- `ConfirmationRequest`: DraftRequest plus required UUID `operation_id`; for non-empty items, payment_method MUST be cash/online, never null or omitted. A conditional request validator returns 400 for missing selection without applying changes. An explicit P11 removal (empty items with an existing confirmed order) may retain null so legacy orders remain removable. Cart saves stay nullable.

## GET `/reservations/{reservation_id}/order`

200, existing OrderPageResponse plus:

- `order` when non-null: existing confirmed_at/items/total/prep_time_minutes plus `arrival_at`, `prep_start_time` (aware datetimes), `payment_method` (nullable), `payment_status` (pending/paid), `payment_method_editable` (boolean).
- `cart` when non-null: existing updated_at/items plus `arrival_at`, nullable `payment_method`. No payment status on a private cart.
- `arrival_window`: `{starts_at, latest_at}` aware datetimes, latest=start+30 minutes. Reservation order_deadline/start_time/end_time retain their current meaning.
- `confirmation`: null for GET, or `{operation_id, replayed}` on a confirmation response; one nullable response field avoids separate page-state schemas.

payment_method_editable = order exists and confirmed, reservation not cancelled, now < ends_at and payment_status != paid. This is independent of order_open, has_menu and verified email. Expiry flags are server snapshots: clients schedule a local boundary refresh/disable and the server always rechecks under lock.

When no cart exists, initialize arrival from confirmed order else arrival_window.starts_at, and preference from confirmed order else null. GET never changes confirmed state. Closed carts remain hidden under existing rules.

## PUT `/reservations/{reservation_id}/cart`

Request DraftRequest. 200 `{cart: CartResponse | null}` with the added private metadata. Keep existing behavior for empty first cart. Save metadata-only changes when a confirmed order exists even if dishes match. Keep P1 last save wins; no confirmation operation receipt for cart saves. Restaurant endpoints never read Cart.

## DELETE `/reservations/{reservation_id}/cart`

Unchanged 204. Discards private items, arrival and method. The UI returns to current confirmed state; it does not undo a payment-only change made on the confirmed order.

## PUT `/reservations/{reservation_id}/order`

Request ConfirmationRequest, for example:

```json
{
  "operation_id": "ed6837fa-e5f9-4e5a-a578-ef12588f87c5",
  "arrival_at": "2026-11-15T21:10:00-03:00",
  "payment_method": "cash",
  "items": [{
    "dish_id": "b7dc613c-04fa-40d6-8609-cb17ce4a52c5",
    "quantity": 2,
    "name": "Provoleta",
    "unit_price": "7500.00",
    "prep_time_minutes": 10
  }]
}
```

200 full current OrderPageResponse. `confirmation.replayed=false` for newly accepted operation; true for an accepted retry. Fresh non-empty confirmations and reconfirmations require an explicit cash/online method, then atomically update items + arrival + preference + preparation start and remove Cart. Missing selection returns 400 «Seleccioná un medio de pago para confirmar tu pedido.» without writing confirmed state, receipts or deleting Cart. Confirming empty items removes an existing order after the UI's explicit removal confirmation; it returns order=null, leaves the reservation unchanged, and records the operation. Empty first confirmation is 400.

Receipt rules are in data-model.md. Same reservation/key and canonical payload: no mutation and current state returned, even if subsequent state changed, deadline elapsed, reservation cancelled or original Order was deleted/recreated. Auth/ownership and valid payload shape always apply. Same key/different payload: 409. New deliberate operation must use a new UUID. Unknown operation after deadline: 409, never backdated. Failed/rejected operations have no successful receipt.

A joint confirmation must not change payment_method if the current order is paid; reject atomically, never reset payment_status. Existing P9 menu validation applies even for arrival-only reconfirmation. This endpoint does not charge money.

## PUT `/reservations/{reservation_id}/order/payment-method`

New narrow endpoint in the EXISTING `app/api/order.py` router. Body `{ "payment_method": "cash" }` or online. A draft may start with no choice, but must have one before non-empty confirmation; this endpoint selects/replaces one of the two choices, without introducing an extra clear-selection workflow.

200 current OrderPageResponse with confirmation=null. Existing confirmed order required; only method changes. No item list or arrival accepted. Require reservation not cancelled, now strictly before end, unpaid order. Works after the dish cutoff and during the visit. No receipt table for method updates; they are ordinary last accepted value updates. No charge, manual settlement or payment-status setter.

## Errors and privacy

| Status | Meaning / Spanish UI example |
| --- | --- |
| 400 | Missing/invalid operation UUID or metadata, missing/null method for non-empty confirmation, naive/out-of-range arrival, invalid method/items, empty first order: «La hora de llegada no es válida.» |
| 401 | Missing/expired session; no write; use existing return-path login |
| 403 | Wrong role, or unverified email on a new confirmation; preserve the existing message and draft |
| 404 | Reservation missing or belongs to another diner; same existing generic response |
| 409 | Deadline/cancelled reservation, missing confirmed order for method update, ended reservation, paid method change, menu conflict, or operation key reused with another payload |

New conflict examples: «Ya se registró el pago de este pedido. No podés cambiar el medio.» / «La reserva ya terminó. No podés cambiar el medio de pago.» / «Esta confirmación ya se usó con otros datos. Revisá el pedido antes de confirmar de nuevo.» Reuse existing orders errors where applicable. Validation remains 400, never 422. Return no other diner's data through receipts. No payload can set payment_status, confirmed_at or server flags; forbid extra keys on new mutation schemas.

## Restaurant compatibility

Keep existing restaurant list/detail routes and schema shapes. `arrival_time` and `prep_start_time` remain HH:MM in Buenos Aires; derive them from confirmed arrival/item snapshots rather than reservation start. Keep shift membership based on original reservation start and sort by confirmed arrival as today. `payment.status` reads stored pending/paid; `payment.method` reads cash/online or the existing `"No seleccionado"` sentinel for null. The diner-facing UI uses «Medio de pago no seleccionado» only for an incomplete cart or a historical order with no choice; this is not a valid new non-empty confirmation. Preserve existing prep_time_warning and item presentation. Private cart edits never leak through these endpoints.

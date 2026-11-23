# Data Model: Pay a pre-ordered meal in cash (US-60)

**Feature**: `specs/032-pagar-pedido` | **Date**: 2026-11-21

No new table, column or migration. US-60 reads the entities that `spec 020-tiempo-pago` and
`spec 022-ver-pedido-restaurante` already defined.

## Order (`pedidos`)

| Field | Type | US-60 use |
| --- | --- | --- |
| `id` | UUID | Identifies the order |
| `reservation_id` | UUID, unique | One order per reservation |
| `restaurant_id` | UUID | Owner restaurant |
| `status` | `confirmed` \| `pending` \| `cancelled` | Only a confirmed order can be paid or changed |
| `payment_method` | `cash` \| `online`, nullable | `cash` is US-60's selection |
| `payment_status` | `pending` \| `paid` | Stays `pending` for cash; never flips automatically |
| `paid_amount` | `Numeric(10,2)`, nullable | Set only by a real payment (US-56 or later) |
| `paid_at` | `timestamptz`, nullable | Set only by a real payment |
| `subtotal` | `Numeric(10,2)` | Frozen at confirmation |
| `discount_amount` | `Numeric(10,2)` | Frozen promotions (spec 028) |
| `total` | `Numeric(10,2)` | **The amount to pay in cash** |

### Constraints that protect US-60

- `payment_method_known`: `payment_method IS NULL OR payment_method IN ('cash', 'online')`.
- `payment_status_known`: `payment_status IN ('pending', 'paid')`.
- `payment_fields_match_status`: `pending` implies no `paid_amount`/`paid_at`; `paid` requires a
  method, an amount `>= 0` and a timestamp.
- `order_payment_paid`: a paid order cannot change its method or be charged again.
- `order_payment_required`: a confirmed order with items needs a method.
- `total = subtotal - discount_amount` and `discount_amount <= subtotal`: the amount shown is the
  frozen bill, never negative.

## Reservation (`reservations`)

US-60 reads `status` and `ends_at`: a cash order can only be shown or changed while the reservation
is `confirmed` and before it ends. A cancelled or finished reservation is rejected.

## State transitions (US-60 only)

```text
(no order) --confirm with cash--> pending/cash --switch to online--> pending/online
                                       |                                   |
                                       +-------- reservation ends --------+
                                       |                                   |
                                  stays pending                     stays pending
```

`pending -> paid` is out of scope: it belongs to US-56 (electronic) or to a future cash-confirmation
US. US-60 never writes `paid`.

## API payloads (unchanged)

- `OrderResponse` (diner): `payment_method`, `payment_status`, `total`.
- `RestaurantOrderResponse` (restaurant): `payment.method`, `payment.status`, `payment.total`.

Both already carry the fields US-60 displays, so `openapi.json` and `schema.d.ts` do not change.

## US-56: payments

New table `payments` (migration `payments_20261123`): one row per electronic payment attempt that Mercado Pago answered.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID | Primary key |
| `order_id` | UUID → `pedidos.id` | `ON DELETE CASCADE`: a removed unpaid order takes its rejected attempts |
| `request_id` | UUID, unique | The diner's attempt; a repeated request returns the same payment and Mercado Pago gets it as `X-Idempotency-Key` |
| `provider_payment_id` | `String(32)`, unique | Mercado Pago's operation number, shown in the receipt |
| `amount` | `Numeric(10,2)`, `> 0` | `pedidos.total` at the time of the charge (deposit included, E2) |
| `status` | `approved` \| `rejected` \| `in_process` | Mercado Pago's `pending`/`authorized` count as `in_process` |
| `status_detail` | `String(64)` | Mercado Pago's reason, mapped to a Spanish message |
| `card_brand`, `card_last_four` | nullable | The only card data kept (FR-014) |
| `created_at`, `approved_at` | timestamptz | `approved_at` is set exactly when `status = 'approved'` |

Invariants:

- `payments_one_live_per_order`: partial unique index on `order_id` where `status IN ('approved', 'in_process')`. An order is charged at most once and not again while a payment is in review (E4, E8).
- `ck_payments_approved_at_matches_status` and `ck_payments_amount_positive`.

Transitions:

- `POST …/order/payments` → Mercado Pago answers `approved` (the order becomes `paid`, `payment_method = 'online'`, `paid_amount`, `paid_at`), `rejected` (the order stays `pending`) or `in_process`.
- `in_process` → `approved` or `rejected` when the diner opens the order (`GET …/order`) and Mercado Pago has decided.
- A cancellation of a `paid` order refunds the approved payment through Mercado Pago and writes the existing `refunds` row (`completed`, or `failed` and the reservation is not cancelled).

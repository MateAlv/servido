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

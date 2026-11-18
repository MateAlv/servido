# Data Model: Restaurant Reservation Cancellation

## Order payment state

Extend `pedidos` with:

| Field | Type | Rules |
| --- | --- | --- |
| `payment_status` | varchar | `pending` or `paid`; defaults to `pending` |
| `payment_method` | varchar, nullable | `cash` or `online`; required when paid |
| `paid_amount` | numeric(10,2), nullable | Non-negative; required when paid |
| `paid_at` | timestamptz, nullable | Required when paid |

This state is only read by US-38. Payment collection remains outside the feature.

## Reservation cancellation audit fields

Extend `reservations` with:

| Field | Type | Rules |
| --- | --- | --- |
| `cancelled_by_restaurant_id` | UUID, nullable | FK to `restaurantes.id_restaurante`; required for a restaurant cancellation |
| `cancellation_request_id` | UUID, nullable | Unique when present; stores the idempotency key of the completed restaurant cancellation |

The existing `cancelled_at` remains the cancellation timestamp.

## Refund

New `refunds` table:

| Field | Type | Rules |
| --- | --- | --- |
| `id` | UUID | Primary key |
| `order_id` | UUID | FK to `pedidos.id`, unique |
| `amount` | numeric(10,2) | Positive and equal to `paid_amount` |
| `method` | varchar | Same method as the payment |
| `status` | varchar | `completed` or `failed` |
| `created_at` | timestamptz | Set once |
| `completed_at` | timestamptz, nullable | Set only for completed refunds |

Only a completed refund allows the cancellation transaction to commit. A failed
attempt may be retained by updating the same unique refund row on retry; implementation
must ensure only one completed refund exists.

## Notification

New `notifications` table:

| Field | Type | Rules |
| --- | --- | --- |
| `id` | UUID | Primary key |
| `diner_id` | UUID | FK to `comensales.id_comensal` |
| `reservation_id` | UUID | FK to `reservations.id` |
| `kind` | varchar | `restaurant_cancellation` |
| `message` | varchar | Spanish text with reservation and refund details |
| `created_at` | timestamptz | Set once |
| `read_at` | timestamptz, nullable | Not required by US-38 |

Unique `(reservation_id, kind)` prevents duplicate in-app notices.

## Reservation transition

`confirmed` → `cancelled` only when:

1. The authenticated restaurant owns the reservation.
2. The reservation starts at least 45 minutes in the future.
3. If an order is paid, the simulated refund completes.
4. `cancelled_at` is set and the reservation transaction commits.

The order remains stored and is considered cancelled through its reservation state,
consistent with specs 009 and 016.


# Data Model: US-14 baseline plus US-16 and US-18

US-14 remains read-only over the existing reservation data. US-16 adds a
minimal diner projection to the reservation detail; US-18 adds cancellation
metadata to `Reservation`. No independent `Cancellation` table is needed for
this increment because a cancellation is a state transition of a reservation.


## Reservation

Source: `backend/app/models/reservation.py`.

| Field | Calendar use |
|---|---|
| `id` | Stable row identity |
| `restaurant_id` | Ownership filter |
| `table_capacity` | Displayed table capacity |
| `seating_area` | Displayed seating area |
| `party_size` | Number of diners |
| `starts_at`, `ends_at` | Local reservation time and date |
| `status` | `confirmed` or `cancelled` |

| `cancelled_at` | Nullable UTC timestamp; required when `status = cancelled` |

`table_number` remains internal and is not returned, consistent with spec 005 D1.

## Diner contact projection (US-16)

The existing `Diner` entity is joined through `Reservation.diner_id`. The
restaurant API exposes only the fields needed to identify or contact the diner:

| Field | Rule |
|---|---|
| `id` | Stable identity; returned only inside an authorized reservation detail |
| `name` | Existing `Diner.nombre`; may be null for legacy accounts |
| `email` | Existing `Diner.email`; the only contact channel currently stored |

`password_hash`, verification timestamps and registration metadata are never
part of this projection. Ownership is checked from the authenticated restaurant
against `Reservation.restaurant_id` before loading the diner. A reservation
from another restaurant is indistinguishable from a missing reservation to the
restaurant API (`404`).

## Cancellation (US-18)

Cancellation is represented by the existing `Reservation.status` changing to
`cancelled` and `Reservation.cancelled_at` recording the instant in UTC. The
timestamp is converted to `America/Argentina/Buenos_Aires` in responses.

The optional `PreorderedOrderSummary` is a response projection, not a new
table in this increment. It is `null` until the order model from US-17 exists;
when an associated order exists, its cancellation state is exposed as
`status: "cancelled"` without returning item or payment data.

Validation and invariants:

* `status` remains limited to `confirmed` and `cancelled`.
* `cancelled_at` is null for confirmed reservations and non-null for cancelled
  reservations.
* Cancellation queries always filter by the authenticated
  `restaurant_id`, then optionally by the reservation's local Buenos Aires
  date.
* Availability continues to count only `confirmed` reservations, so changing a
  reservation to `cancelled` releases its table/time slot without changing the
  existing availability algorithm.
* Cancellation notification is an integration point of the existing/future
  cancellation transition, not a new restaurant cancellation operation in this
  increment.

## OpeningShift

The existing `turnos` rows provide day-of-week and start/end times used by the frontend to group reservations into turnos. The API does not persist a shift reference because shifts can be edited independently from historical reservations.

## Calendar response

The endpoint returns the requested local date and entries ordered by local start time. Each entry includes id, local start/end time, party size, table capacity, seating area and status. No diner identity or contact data is included; that belongs to US-16.


## Reservation diner detail

`GET /api/restaurante/reservas/{reservation_id}/comensal` returns the
`DinerContact` projection for one reservation after the restaurant ownership
check.

## Cancellation response

`GET /api/restaurante/cancelaciones?date=YYYY-MM-DD` returns only cancelled
reservations for the authenticated restaurant, ordered by reservation start
time. Each entry includes reservation date/time, table group, party size,
`cancelled_at`, and the optional preordered-order summary.


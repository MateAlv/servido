# Reservation Confirmation Contract

## `POST /api/reservations`

The existing authenticated diner endpoint remains the confirmation operation.

### Success

- `201 Created` when the `request_id` creates a reservation.
- `200 OK` when the same `request_id` was already confirmed.
- Response: `ReservationResponse`.

`ReservationResponse` includes:

```json
{
  "id": "uuid",
  "restaurant": {
    "id": "uuid",
    "nombre": "Nombre del restaurante",
    "address": "Dirección del restaurante"
  },
  "date": "YYYY-MM-DD",
  "start_time": "HH:MM",
  "end_time": "HH:MM",
  "party_size": 2,
  "table": {
    "capacity": 4,
    "seating_area": "indoor"
  },
  "status": "confirmed"
}
```

The actual response retains the existing order-related fields (`has_order`, `has_cart`,
`order_open`, `order_deadline`) for compatibility. `date`, `start_time` and `end_time` are
formatted for `America/Argentina/Buenos_Aires`.

### Failure

- `400 Bad Request` for invalid or unavailable input.
- `401 Unauthorized` for a missing or expired session.
- `403 Forbidden` for a non-diner.
- `404 Not Found` for an unavailable restaurant.
- `409 Conflict` when availability changed during confirmation.

Failure responses do not send a confirmation email and do not create a confirmed reservation.

## Confirmation mail

The existing configured mail backend receives one message addressed to the diner email. Its text
and HTML contain restaurant name/address, local date and time, party size, assigned table and
reservation id. A post-commit `MailError` is logged; it does not change the successful HTTP
response or reservation state.

## `GET /api/reservations/active`

The existing authenticated diner endpoint remains the source for «Mis reservas». A successful
confirmation is immediately returned with `status: "confirmed"` and the same restaurant address,
date/time, party size, table and id used by the receipt.

## UI contract

`ConfirmedStep` presents a focusable confirmation heading, a confirmed status and a receipt with
restaurant, address, date, time range, party size, assigned table and reservation id. The active
reservations page shows the reservation as `Confirmada` and exposes the same details.

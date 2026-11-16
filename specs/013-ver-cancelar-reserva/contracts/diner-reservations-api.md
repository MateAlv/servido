# Diner Reservations API Contract

All endpoints are mounted under `/api`, require the diner Bearer session and
return Spanish error messages intended for the UI.

## `GET /api/reservations/active`

Returns confirmed reservations whose start is in the future, ordered by
`starts_at ASC`, scoped to the authenticated diner.

```json
{
  "reservations": [
    {
      "id": "uuid",
      "restaurant": {"id": "uuid", "nombre": "La Esquina"},
      "date": "2026-11-10",
      "start_time": "20:00",
      "end_time": "21:30",
      "party_size": 3,
      "table": {"capacity": 4, "seating_area": "terrace"},
      "status": "confirmed"
    }
  ]
}
```

`401` means missing or expired session. `403` means the account is not a
diner.

## `DELETE /api/reservations/{reservation_id}`

Cancels the authenticated diner's confirmed reservation when its local start
is at least 45 minutes away. The operation locks the row, sets `status` to
`cancelled`, sets `cancelled_at` once, and commits the transition.

Success: `200` with the cancelled reservation projection and `message`:
`"La reserva se canceló correctamente."`

Errors:

- `401`: missing or expired session; no state change.
- `403`: account is not a diner.
- `404`: reservation does not belong to the diner or does not exist.
- `409`: fewer than 45 minutes remain, or the reservation is already
  cancelled/past.

The cancellation is idempotent with respect to state: repeated requests never
change `cancelled_at` or produce another transition. A cancelled reservation
is ignored by the existing availability queries, and any associated order is
considered cancelled through the reservation state.

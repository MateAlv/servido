# Restaurant Reservations API Contract (US-14, US-16 and US-18)

Base path: `/api`. The endpoint requires a valid restaurant session. Missing or expired sessions return `401`; diner tokens return `403`.

## `GET /restaurante/reservas?date=YYYY-MM-DD`

Returns reservations belonging to the authenticated restaurant for the requested Buenos Aires local date. Results are ordered by start time. Cancelled reservations remain in the result with `status: "cancelled"`.

### Response

```json
{
  "date": "2026-11-02",
  "reservations": [
    {
      "id": "a41e…",
      "start_time": "20:00",
      "end_time": "21:30",
      "party_size": 3,
      "table": { "capacity": 4, "seating_area": "terrace" },
      "status": "confirmed"
    }
  ]
}
```

The internal `table_number`, diner identity and contact data are not returned.

An empty date returns `200` with `"reservations": []`. Invalid dates return `400`; missing/expired sessions return `401`; a diner account returns `403`.


## `GET /restaurante/reservas/{reservation_id}/comensal` (US-16)

Returns the minimum contact projection of the diner who made one reservation.
The endpoint requires a restaurant session and the reservation must belong to
that restaurant.

### Response

```json
{
  "reservation_id": "a41e…",
  "diner": {
    "id": "d92b…",
    "name": "Ana Pérez",
    "email": "ana@example.com"
  }
}
```

`name` may be `null` for a legacy diner account. No password, verification
metadata, registration date or other account fields are returned. A reservation
belonging to another restaurant returns `404`, without disclosing whether it
exists. Missing/expired sessions return `401`; a diner token returns `403`.

## `GET /restaurante/cancelaciones?date=YYYY-MM-DD` (US-18)

Returns cancelled reservations for the authenticated restaurant only. The
optional `date` filters by the reservation start date in
`America/Argentina/Buenos_Aires`; without it, all of that restaurant's
cancellations are returned. Results are ordered by reservation start time.

### Response

```json
{
  "restaurant_id": "b73c…",
  "date": "2026-11-02",
  "cancellations": [
    {
      "reservation_id": "a41e…",
      "reservation_date": "2026-11-02",
      "start_time": "20:00",
      "end_time": "21:30",
      "party_size": 3,
      "table": { "capacity": 4, "seating_area": "terrace" },
      "status": "cancelled",
      "cancelled_at": "2026-11-01T18:42:00-03:00",
      "preordered_order": null
    }
  ]
}
```

`cancelled_at` is the cancellation instant, rendered in Buenos Aires time.
`preordered_order` is `null` until the order model from US-17 is available; if
an order is associated, it contains only its cancellation state:

```json
{ "status": "cancelled" }
```

An empty result returns `200` with `"cancellations": []`. Invalid dates return
`400`; missing/expired sessions return `401`; a diner account returns `403`.
The endpoint is read-only and does not cancel reservations.

## Cancellation side effects (US-18 integration contract)

The cancellation transition that sets `status` to `cancelled` MUST also set
`cancelled_at` and invoke the existing mail service with the restaurant
notification containing the reservation date, time, table group, party size
and cancellation instant. This feature does not add a manual restaurant
cancellation endpoint; it defines the contract consumed by the existing or
future cancellation flow (US-38).

Availability continues to count only reservations with
`status = "confirmed"`. Therefore a completed cancellation automatically
releases the table and time slot through the existing availability queries,
subject to the other configured restrictions.

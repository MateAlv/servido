# Restaurant Reservations API Contract (US-14)

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

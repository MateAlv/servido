# US-14 / US-16 / US-18 Quickstart


## Setup

```bash
make db
make migrate
```

Use a restaurant account with at least one opening shift, one available table
group and reservations on two dates, including one cancelled reservation with
`cancelled_at`. Sign in as that restaurant account.


## API

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/restaurante/reservas?date=2026-11-02"
```

Expected: `200`, only that restaurant's reservations, ordered by start time, with local times, table group, party size and status.


```bash
curl -H "Authorization: ******" \
  "http://localhost:8000/api/restaurante/reservas/<reservation-id>/comensal"
curl -H "Authorization: ******" \
  "http://localhost:8000/api/restaurante/cancelaciones?date=2026-11-02"
```

Expected: the first response contains only the diner's id, name and email for
an owned reservation. The second contains only cancelled reservations for the
restaurant, including `cancelled_at`; a reservation from another restaurant is
not disclosed.


## UI

Run `cd frontend && npm run dev`, open `/restaurante/reservas`, change the date, and verify that reservations are grouped by opening shift. A date without reservations shows the Spanish empty state.


Open the cancellation view, filter by date and verify the cancellation details.
Refreshing the calendar or changing its date is sufficient; automatic
real-time updates are not required.


## Automated validation

```bash
pytest backend/tests/test_restaurant_reservations.py
cd frontend && npx vitest run src/pages/RestaurantReservationsPage.test.tsx
```

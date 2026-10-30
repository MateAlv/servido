# US-14 Quickstart

## Setup

```bash
make db
make migrate
```

Use a restaurant account with at least one opening shift, one available table group and reservations on two dates. Sign in as that restaurant account.

## API

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/restaurante/reservas?date=2026-11-02"
```

Expected: `200`, only that restaurant's reservations, ordered by start time, with local times, table group, party size and status.

## UI

Run `cd frontend && npm run dev`, open `/restaurante/reservas`, change the date, and verify that reservations are grouped by opening shift. A date without reservations shows the Spanish empty state.

## Automated validation

```bash
pytest backend/tests/test_restaurant_reservations.py
cd frontend && npx vitest run src/pages/RestaurantReservationsPage.test.tsx
```

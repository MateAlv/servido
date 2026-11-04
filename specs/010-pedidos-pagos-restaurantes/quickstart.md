# Quickstart: restaurant orders

## Prerequisites

- Docker and the repository dependencies are installed.
- PostgreSQL is available through the project compose file.
- The database has opening shifts, dishes, reservations and order fixtures.

## Start the database

```bash
make db
```

## Validate US-20

Run the focused backend and frontend acceptance tests:

```bash
cd backend && uv run pytest tests/test_restaurant_orders.py -q
cd frontend && npx vitest run src/pages/RestaurantOrdersPage.test.tsx
```

Expected results:

- Confirmed orders for the active Buenos Aires shift are shown.
- Unconfirmed orders and orders for cancelled reservations are absent.
- Orders are ordered by arrival, then preparation start.
- Each order exposes its reservation, arrival time, dishes and quantities.
- The empty state appears outside an active shift or when no eligible orders
  exist.

## Validate the full feature design

US-22 tests are part of the planned acceptance map but are not part of the
current US-20 implementation slice. When US-22 is implemented, run:

```bash
make lint test
```

Payment approval and cash collection are expected to remain deferred until
their integration owner is defined.

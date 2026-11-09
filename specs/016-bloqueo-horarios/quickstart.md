# Quickstart validation

## Prerequisites

- Python 3.12, uv, Node.js and npm
- Docker with the repository PostgreSQL service available
- Dependencies installed with the repository setup

Start the database with:

```bash
make db
```

## Backend acceptance validation

Run the feature tests:

```bash
cd backend
uv run pytest tests/test_closures.py
```

Expected result: all US-32 acceptance and edge tests pass, including the warning/confirmation
flow, the cancellation side effects, the re-warning when a reservation appears between the
warning and the confirmation, the idempotent request, the isolation between restaurants and the
mail failure case.

## Frontend validation

Run the focused UI test:

```bash
cd frontend
npx vitest run src/pages/RestaurantClosuresPage.test.tsx
```

Expected result: the page lists the affected reservations before applying, applies only after the
explicit confirmation, does nothing when the restaurant desists, rejects an end before the start,
and lists/removes the current closures.

## Manual flow

1. Start the API and the web app (`cd backend && uv run uvicorn app.main:app --reload`,
   `cd frontend && npm run dev`), or `make up-local`.
2. Sign in as a restaurant with a complete profile, active shifts and tables.
3. Open `/restaurante/bloqueos` from the dashboard card "Bloqueos de horario".
4. Block a whole date. As a diner, open `/reservar/:restauranteId?fecha=<that date>` and check
   that the day is not offered.
5. Create a reservation on another future date, then block a range that overlaps it. The page
   must show the affected reservations (date, time and party size) before applying. Desist and
   check that the reservation is still confirmed; repeat and confirm, then check that it appears
   as cancelled in `/restaurante/cancelaciones` and that the diner received a mail (the
   `console` mail backend logs it locally).
6. Remove the closure and check that the slots are offered again according to the shifts. The
   cancelled reservation stays cancelled.
7. Repeat the whole-day case for today and the partial-range case that already started: the
   first is accepted, the second is rejected with a Spanish message.

## Contract and migration validation

From the repository root:

```bash
make api-types
make format lint test
```

Expected result: the generated OpenAPI contract and TypeScript types contain the three closure
endpoints and the warning schema; formatting, linting, type checks and all tests pass.

The complete mapping from these checks to acceptance scenarios is in [plan.md](plan.md); entity
constraints and rules are in [data-model.md](data-model.md); endpoint payloads are in
[contracts/closures-api.md](contracts/closures-api.md).

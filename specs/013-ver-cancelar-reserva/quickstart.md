# Quickstart: View and Cancel Diner Reservation

## Prerequisites

- Docker and the repository dependencies.
- A running PostgreSQL instance and migrated backend (`make db` and
  `make migrate`, or `make up-local`).
- A verified diner account with at least one future reservation.

## Automated validation

Run the backend acceptance tests:

```bash
cd backend && uv run pytest tests/test_diner_reservations.py
```

Run the frontend page/client tests:

```bash
cd frontend && npm run test -- src/pages/DinerReservationsPage.test.tsx src/api/reservations.test.ts
```

Expected outcomes:

- Active reservations are returned only for the authenticated diner and are
  ordered by the nearest start time.
- The empty state is shown when no confirmed future reservation exists.
- Dismissing the confirmation dialog makes no request.
- Confirming cancellation returns success, removes the reservation from the
  active list and makes its table available to the existing availability
  endpoint.
- Cancellation inside 45 minutes, foreign reservations, already-cancelled
  reservations and expired sessions do not change the reservation.

## Manual flow

1. Sign in as a diner and open `/reservas`.
2. Select a reservation and verify restaurant, date, time, table and party size.
3. Choose “Cancelar reserva”, dismiss it, and verify the reservation remains.
4. Repeat and confirm; verify the success message and that the reservation no
   longer appears in active reservations.

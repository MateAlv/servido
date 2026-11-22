# Quickstart: Reservation Confirmation Details

## Prerequisites

- Docker and the repository dependencies installed.
- A verified diner account and a verified restaurant with an available table.
- The repository root as the working directory.

## Run the application locally

```bash
make up-local
```

Open `http://localhost:5173`, sign in as a diner, select an available restaurant, date, time and
party size, and confirm the review. The confirmation receipt must show the restaurant, address,
local date/time, party size, assigned table and reservation identifier. The same reservation must
appear as `Confirmada` in «Mis reservas».

## Validate the automated scenarios

Backend acceptance and edge cases:

```bash
cd backend && uv run pytest tests/test_reservation.py -k us54
```

Frontend confirmation and active-list coverage:

```bash
cd frontend && npm test -- --run src/pages/ReservationPage.test.tsx src/pages/DinerReservationsPage.test.tsx
```

Regenerate and verify the API contract after backend changes:

```bash
make api-types
```

Expected outcomes:

1. A successful confirmation creates one `confirmed` reservation and one confirmation mail in the
   memory backend.
2. The email and receipt contain the same required details in Buenos Aires local time.
3. A repeated confirmation with the same review `request_id` returns the same reservation without
   another mail.
4. An availability conflict creates no confirmed reservation and no confirmation mail.
5. A mail backend error leaves the reservation confirmed and the receipt/API response usable.

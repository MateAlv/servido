# Quickstart: Restaurant Reservation Cancellation

## Prerequisites

- Docker and repository dependencies.
- PostgreSQL running with migrations (`make db` and `make migrate`, or `make up-local`).
- A verified restaurant account with a future reservation.
- The reservation may have an order marked `paid` in the test fixture; the refund is simulated.

## Automated validation

```bash
cd backend && uv run pytest tests/test_restaurant_cancellation.py
cd frontend && npm run test -- src/pages/RestaurantReservationsPage.test.tsx src/api/restaurantReservations.test.ts
```

Expected outcomes:

- A restaurant can cancel only its own future reservation with at least 45 minutes left.
- A paid order creates one completed simulated refund for its full paid amount.
- An unpaid reservation cancels without a refund.
- A simulated refund failure leaves the reservation active and allows retry.
- The diner receives one persistent in-app notice and one email attempt.
- Repeated requests do not create a second completed refund or notice.
- Cancelled reservations no longer occupy the table in availability.

## Manual flow

1. Sign in as a restaurant and open the reservations page.
2. Select a future reservation and choose “Cancelar reserva”.
3. Confirm the action and verify the success message.
4. Verify the reservation appears in cancelaciones and no longer blocks availability.
5. Sign in as the diner and verify the in-app notice and cancellation email fixture.

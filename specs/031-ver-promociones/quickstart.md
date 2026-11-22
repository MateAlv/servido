# Quickstart: US-55

## Prerequisites

Run the repository's local stack and test dependencies from the repository root:

```bash
make up-local
```

The acceptance tests use the repository's real PostgreSQL test database and the existing fixtures
for diners, restaurants, reservations, dishes, and promotions.

## Automated validation

Run the focused backend and frontend tests:

```bash
cd backend && uv run pytest tests/test_public_restaurant.py tests/test_order.py -k us55
cd ../frontend && npm test -- --run src/pages/RestaurantDetailPage.test.tsx src/pages/OrderPage.test.tsx
```

Expected result: all US-55 S1–S5 tests pass. The API tests verify that paused/expired
promotions are absent, minimums and local validity are enforced, draft totals recalculate, and
confirmed totals contain the frozen discount snapshot. The UI tests verify the public promotion
section and the transparent receipt/payment breakdown.

After an API schema change, regenerate the typed frontend contract:

```bash
make api-types
```

Then run the normal repository checks:

```bash
make format lint test
```

## Manual smoke path

1. Create an active percentage promotion and a fixed promotion with a minimum through the
   restaurant promotion management already delivered by spec 028.
2. Open `/restaurantes/:id` as an unauthenticated visitor and verify that active/programmed
   promotions show their benefit and conditions, while paused/expired ones do not.
3. Sign in as a diner, open a confirmed reservation's order, and add dishes below and then above
   the fixed minimum. Verify subtotal, promotion, discount, and total update.
4. Change the arrival time into and out of the promotion's time window and verify the same
   recalculation before confirmation.
5. Confirm the order and verify the payment amount matches the final discounted total; later
   promotion edits do not change that confirmed amount.

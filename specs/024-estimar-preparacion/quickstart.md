# Quickstart: Estimated Preparation Time

## Prerequisites

- Start PostgreSQL with `make db`.
- Install backend and frontend dependencies as described in `README.md`.

## Automated validation

Run the focused backend tests:

```bash
cd backend
uv run pytest tests/test_dish_management.py tests/test_order.py tests/test_restaurant_orders.py
```

Run the focused frontend tests:

```bash
cd frontend
npm test -- --run src/pages/EditDishPage.test.tsx src/pages/OrderPage.test.tsx src/pages/RestaurantOrdersPage.test.tsx
```

Run repository checks:

```bash
make format lint test
```

## Manual scenario

1. Sign in as a restaurant and create or edit a dish with a positive preparation
   time.
2. Verify the time is shown in the menu and create a new order containing dishes
   with different times.
3. Verify the order shows the slowest dish's time and the corresponding suggested
   preparation start.
4. Confirm the order.
5. Edit the source dish's time and verify the confirmed order still shows its
   original item time, while a new order uses the updated value.
6. Try zero, negative, non-integer and oversized values and verify the previous
   valid value remains unchanged.

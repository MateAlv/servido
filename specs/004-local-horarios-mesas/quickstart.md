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
uv run pytest tests/test_restaurant_profile.py tests/test_opening_hours.py tests/test_table_inventory.py
```

Expected result: all US-6, US-8 and US-10 acceptance tests pass, including
invalid-shift, unresolved-address, insufficient-per-table-capacity,
unavailable-table and transaction-conflict cases.

## Frontend validation

Run the focused UI tests:

```bash
cd frontend
npm run test -- --run src/pages/RestaurantProfilePage.test.tsx src/pages/OpeningHoursPage.test.tsx src/pages/TableInventoryPage.test.tsx
```

Expected result: the profile form displays the geocoded preview before save,
and invalid configuration responses are shown in Spanish without losing the
entered fields.

## Contract and migration validation

From the repository root:

```bash
make api-types
make lint
```

Expected result: the generated OpenAPI contract and TypeScript types contain
the configuration endpoints, and formatting, linting and type checks pass.

The complete mapping from these checks to acceptance scenarios is in
[plan.md](plan.md); entity constraints are in [data-model.md](data-model.md).

# Implementation plan

## Scope

- Add a restaurant-owned reservation order endpoint that returns reservation status and a confirmed order.
- Extend the existing restaurant reservation diner page with the order projection.
- Reuse confirmed-order mapping and keep cancelled orders unchanged in the database.

## Validation

- Backend tests cover all US-36 scenarios and restaurant ownership.
- Frontend tests cover confirmed, missing, pending, and cancelled order states.
- Regenerate the OpenAPI contract and TypeScript types.

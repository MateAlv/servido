# Implementation plan: 022 Ver pedido asociado (restaurante, US-36)

Source of truth: `specs/022-ver-pedido-restaurante/spec.md`. Context: `research.md` in this folder.

## Status
Most of US-36 is already implemented (backend endpoint, projection, backend tests, UI section, UI tests, generated contract). This plan finishes the remaining gaps and proves every acceptance scenario is covered.

## Scope
1. Backend: confirm the contract matches FR-001 to FR-006 and SC-005 (no foreign data). Add nothing new unless a test is missing.
2. Frontend: fix the FR-005 copy, separate the diner and order loads, make the list keys stable, cover the pending state in the UI tests.
3. Housekeeping: regenerate the contract only if the schema changes, update `tasks.md`.

Out of scope: accept, reject or edit the order, cancellation by the restaurant (US-38), payment and refund, the diner's view (spec 021), the arrival-time and payment display (PO question).

## Files likely touched
- `frontend/src/pages/RestaurantReservationDinerPage.tsx` (copy, split loads, keys)
- `frontend/src/pages/RestaurantReservationDinerPage.test.tsx` (pending state, failure isolation)
- `backend/tests/test_us36_restaurant_reservation_order.py` (only if a scenario is missing)
- `frontend/src/api/openapi.json` and `schema.d.ts` (only if the contract changes)

## Constraints (from AGENTS.md)
- UI text in Spanish (Argentina, voseo). Code, tests and comments in English.
- Every acceptance scenario has an automated test named `test_us36_sN_...` (backend) or `US-36 SN ...` (frontend).
- No new dependencies, no migrations, no abstractions for later.
- Money formatted with the existing `formatPrice`.

## Validation
- Backend: scenarios S1 to S5 plus the foreign reservation and session edge cases pass.
- Frontend: US-36 S1, S2, S3 and the pending case pass; a failing order request does not hide the diner contact.
- `make format lint test` passes.
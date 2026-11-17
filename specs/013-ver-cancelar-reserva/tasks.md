---

description: "Task list for viewing and cancelling diner reservations"
---

# Tasks: View and Cancel Diner Reservation

**Input**: Design documents from `/specs/013-ver-cancelar-reserva/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/diner-reservations-api.md, quickstart.md

**Tests**: REQUIRED. Every acceptance scenario has an automated test named after its US and scenario.

**Organization**: One phase per user story, in spec order, so each story can be implemented, tested and demoed independently after its prerequisites.

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Prepare shared reservation projections and test fixtures without adding a migration or new dependency. Existing `Reservation.status`, `Reservation.cancelled_at`, ownership constraints and availability queries already provide the required persistence foundation.

- [X] T001 [P] Add shared active-reservation response schemas and the cancellation response/error shapes in `backend/app/schemas/reservation.py`, preserving the existing `ReservationResponse` fields and the Buenos Aires date/time representation.
- [X] T002 [P] Verify and reuse the existing diner reservation fixtures for future, past, confirmed and cancelled reservations, table availability and optional associated orders in `backend/tests/reservations.py`.
- [X] T003 [P] Add the reservation API client result types and Spanish fallback error constants in `frontend/src/api/reservations.ts`, using `SessionExpiredError` for HTTP 401 responses.

**Checkpoint**: Shared schemas, fixtures and client conventions are ready; user story phases can start.

---

## Phase 2: US-23 — View active reservation 🎯

**Goal**: Let a signed-in diner open `/reservas` and see only their confirmed future reservations, ordered from nearest to farthest, with restaurant, date, time, table and party size; show an empty state when none exist.

**Independent Test**: With a diner who has one or more future confirmed reservations, request the active list and open the page; verify ownership filtering, chronological ordering, the complete detail and the empty state. A cancelled reservation must not appear.

### Tests for US-23 (write first; they must fail before implementation)

- [X] T004 [P] [US1] Add `test_us23_s1_lists_active_reservation` in `backend/tests/test_diner_reservations.py` for a signed-in diner with one future confirmed reservation.
- [X] T005 [P] [US1] Add `test_us23_s3_orders_active_reservations` in `backend/tests/test_diner_reservations.py` for multiple reservations ordered by `starts_at ASC`.
- [X] T006 [P] [US1] Add `test_us23_s5_excludes_cancelled_reservation` in `backend/tests/test_diner_reservations.py` for a cancelled reservation excluded from the active list.
- [X] T007 [P] [US1] Add `test_us23_edge_hides_foreign_reservations` in `backend/tests/test_diner_reservations.py` to verify the list is scoped to the authenticated diner.
- [X] T008 [P] [US1] Add `US-23 S2 shows reservation detail` and `US-23 S4 reports no active reservations` tests in `frontend/src/pages/DinerReservationsPage.test.tsx`, covering restaurant, local date/time, “Mesa para {capacity} · {seating area}”, party size and the Spanish empty state.

### Implementation for US-23

- [X] T009 [US1] Implement `GET /api/reservations/active` in `backend/app/api/reservation.py`, requiring the diner role and returning only owned reservations with `status = 'confirmed'` and `starts_at > now`, ordered by nearest start time.
- [X] T010 [US1] Add the active-list response schema in `backend/app/schemas/reservation.py`, reusing the existing restaurant and table projections and returning date/time converted to `America/Argentina/Buenos_Aires`.
- [X] T011 [US1] Add `fetchActiveReservations` to `frontend/src/api/reservations.ts` with the typed client, session headers, session-expiry handling and the Spanish load-error fallback.
- [X] T012 [US1] Build `frontend/src/pages/DinerReservationsPage.tsx` and `frontend/src/pages/DinerReservationsPage.module.css` with React Query loading/error/empty states, chronological reservation cards, accessible selection/detail interaction and the existing design-system components.
- [X] T013 [US1] Add the `/reservas` route in `frontend/src/router.tsx` and expose the reservations section to signed-in diners without changing restaurant routes.
- [X] T014 [US1] Regenerate `frontend/src/api/openapi.json` and `frontend/src/api/schema.d.ts` with `make api-types`, then update `frontend/src/pages/DinerReservationsPage.test.tsx` to use the generated contract.

**Checkpoint**: US-23 works end to end; the active list is private, ordered, complete and empty-safe, and all US-23 tests pass.

---

## Phase 3: US-25 — Confirm reservation cancellation 🎯

**Goal**: Let a diner explicitly confirm cancellation of one of their active reservations, rejecting cancellation when fewer than 45 minutes remain, releasing availability and treating the associated pre-order as cancelled.

**Independent Test**: From an active reservation, dismiss the confirmation and verify no state change; confirm it and verify cancellation, success feedback, removal from the active list and released availability. Verify that a reservation inside the 45-minute window, foreign reservation, already-cancelled reservation or expired session is not changed.

### Tests for US-25 (write first; they must fail before implementation)

- [X] T015 [P] [US2] Add `US-25 S1 asks before cancelling` and `US-25 S2 keeps reservation after dismissal` tests in `frontend/src/pages/DinerReservationsPage.test.tsx`, verifying the confirmation dialog and that dismissal sends no DELETE request.
- [X] T016 [P] [US2] Add `US-25 S4 reports successful cancellation` in `frontend/src/pages/DinerReservationsPage.test.tsx`, verifying the Spanish success toast and active-list refresh after a successful cancellation.
- [X] T017 [P] [US2] Add `test_us25_s3_cancels_owned_reservation` in `backend/tests/test_diner_reservations.py`, asserting `status = 'cancelled'` and one non-null `cancelled_at`.
- [X] T018 [P] [US2] Add `test_us25_s5_rejects_cancellation_inside_deadline` in `backend/tests/test_diner_reservations.py`, using the Buenos Aires clock and asserting that cancellation is rejected when fewer than 45 minutes remain.
- [X] T019 [P] [US2] Add `test_us25_s6_cancels_associated_order_with_reservation` in `backend/tests/test_diner_reservations.py`, asserting that an associated pre-order is no longer active through the cancelled reservation state without adding payment behavior.
- [X] T020 [P] [US2] Add `test_us25_s6_releases_table_availability` in `backend/tests/test_diner_reservations.py`, cancelling the only reservation occupying a table and asserting the existing availability endpoint reports that table/slot as free afterward.
- [X] T021 [P] [US2] Add `test_us25_edge_repeated_cancellation_is_idempotent`, `test_us25_edge_reports_already_cancelled` and `test_us25_edge_rejects_foreign_reservation` in `backend/tests/test_diner_reservations.py`, asserting one transition, stable `cancelled_at` and privacy.
- [X] T022 [P] [US2] Add `does not report cancellation success on 401` in `frontend/src/api/reservations.test.ts`, verifying an expired session produces a session failure and no success result.

### Implementation for US-25

- [X] T023 [US2] Implement the locked cancellation transition in `backend/app/services/reservations.py`: load the diner's reservation with `FOR UPDATE`, require `status = 'confirmed'`, calculate the cutoff in `America/Argentina/Buenos_Aires`, require at least 45 minutes before `starts_at`, set `status = 'cancelled'` and set `cancelled_at` exactly once.
- [X] T024 [US2] Implement `DELETE /api/reservations/{reservation_id}` in `backend/app/api/reservation.py`, mapping ownership/not-found, fewer-than-45-minutes and already-cancelled cases to documented Spanish HTTP errors and committing only after a successful transition.
- [X] T025 [US2] Ensure the cancellation transaction preserves the existing order association semantics in `backend/app/services/orders.py` and that availability continues to count only confirmed reservations, without adding an order status, refund or payment flow.
- [X] T026 [US2] Add `cancelReservation` to `frontend/src/api/reservations.ts`, mapping 401 to session expiry, 409 to a visible Spanish reason and successful cancellation to the typed response.
- [X] T027 [US2] Add the explicit confirmation modal, cancellation mutation, pending/error handling, success toast and active-list invalidation to `frontend/src/pages/DinerReservationsPage.tsx`, including the Spanish 45-minute restriction message.
- [X] T028 [US2] Add cancellation modal, button, status and responsive states to `frontend/src/pages/DinerReservationsPage.module.css`, using design tokens and reduced-motion-safe existing component patterns.
- [X] T029 [US2] Regenerate `frontend/src/api/openapi.json` and `frontend/src/api/schema.d.ts` with `make api-types`, then verify the DELETE contract and generated response/error types in frontend tests.

**Checkpoint**: US-25 works end to end; every cancellation is explicitly confirmed, respects the 45-minute cutoff, is private and idempotent, releases availability and reports the result.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [X] T030 [P] Run `make format` and review formatting changes only in files touched by this feature.
- [X] T031 [P] Run `make lint` and fix type, formatting or import errors in the feature files.
- [ ] T032 Run `make test` and verify all US-23/US-25 acceptance and edge-case tests pass against real PostgreSQL and the frontend test suite. The feature tests pass; the full backend suite currently has an unrelated pre-existing failure in `tests/test_public_restaurants.py::test_us9_edge_lists_only_bookable_restaurants` caused by persistent database data.
- [ ] T033 Follow `specs/013-ver-cancelar-reserva/quickstart.md` manually and update `spec.md`, `plan.md` or `tasks.md` only if implementation behavior diverges from the approved scope.

---

## Dependencies & Execution Order

1. **Foundational**: T001–T003 must complete before either user story.
2. **US-23**: T004–T014 implement and validate the active list. The frontend cancellation work depends on the page and query established here.
3. **US-25**: T015–T029 depend on US-23's page, reservation projection and route, but backend cancellation tests and service work can proceed in parallel with frontend confirmation tests.
4. **Polish**: T030–T033 run after both user stories.

### Parallel execution examples

- **US-23**: T004–T007 can run in parallel with T008; after tests are written, T009–T010 can run in parallel with T011–T012, then T013–T014 integrate the route and generated contract.
- **US-25**: T015–T016 can run in parallel with T017–T022; after the tests, T023–T025 can run in parallel with T026–T028, then T029 regenerates and validates the contract.

## Implementation Strategy

- **MVP first**: Complete US-23 (T001–T014) to deliver the private, ordered active-reservations view and its empty state.
- **Incremental cancellation**: Complete US-25 (T015–T029) on top of the existing view, keeping the 45-minute cutoff enforced server-side and reflected in the UI.
- **Scope guard**: Do not add reservation editing, cancelled-reservation detail, restaurant cancellation, payments, refunds or a new order status; those remain outside this spec.

## Notes

- Every task uses the required checklist format with a sequential ID and exact file path.
- `[P]` marks only tasks that can touch different files or independent test sections without waiting on incomplete work.
- Commit logical groups with the relevant US in the English conventional commit message.

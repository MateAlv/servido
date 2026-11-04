# Tasks: Restaurant Reservation Management — US-16 and US-18

**Input**: Design documents from `/specs/008-gestion-reservas-restaurante/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/restaurant-reservations-api.md`

**Scope**: Implement only US-16 and US-18 on top of the completed US-14
restaurant calendar. Do not modify or reimplement the US-14 calendar, add a
restaurant cancellation command, create orders, or add real-time updates.

**Tests**: Required for every acceptance scenario and relevant edge case.

## Phase 1: Foundational

**Purpose**: Add the shared persistence and response mapping required by both
stories without changing the existing US-14 behavior.

- [X] T001 Confirm the US-16/US-18 API contract, data model invariants and existing US-14 ownership helper in `specs/008-gestion-reservas-restaurante/contracts/restaurant-reservations-api.md`, `specs/008-gestion-reservas-restaurante/data-model.md` and `backend/app/api/restaurant.py`
- [X] T002 [P] Add nullable UTC `cancelled_at` to `Reservation` in `backend/app/models/reservation.py`, preserving `status IN ('confirmed', 'cancelled')` and requiring the field for cancelled rows at the cancellation transition
- [X] T003 Generate and review the Alembic migration for `reservations.cancelled_at` with `make migration m="add reservation cancellation timestamp"` in `backend/migrations/versions/`
- [X] T004 [P] Add shared response schemas for `DinerContact`, `ReservationDinerResponse`, `PreorderedOrderSummary`, `RestaurantCancellationResponse` and `RestaurantCancellationsResponse` in `backend/app/schemas/reservation.py`, keeping `preordered_order` nullable until US-17 provides order persistence

**Checkpoint**: Persistence, migration and shared contracts are ready; US-16
and US-18 can be implemented independently.

---

## Phase 2: US-16 — Ver cliente

**Goal**: Allow an authenticated restaurant responsible to see only the name
and contact data required to manage a reservation belonging to that restaurant.

**Independent Test**: With a restaurant session, request the diner projection
for an owned reservation and verify name/email are returned while password and
account metadata are absent. Request a reservation owned by another restaurant
and verify access is denied without disclosing its data.

### Tests for US-16

- [X] T005 [P] [US16] Add backend acceptance test `test_us16_s1_returns_minimal_diner_contact_for_owned_reservation` in `backend/tests/test_restaurant_reservations.py`, asserting the reservation id, diner name and email are returned and no password or account metadata is exposed
- [X] T006 [P] [US16] Add backend acceptance test `test_us16_s2_denies_foreign_reservation_diner_access` in `backend/tests/test_restaurant_reservations.py`, asserting a reservation belonging to another restaurant returns `404`
- [X] T007 [P] [US16] Add backend edge-case tests in `backend/tests/test_restaurant_reservations.py` for missing/expired session (`401`), diner token (`403`), unknown reservation (`404`) and a nullable legacy diner name
- [X] T008 [P] [US16] Add frontend acceptance test `US-16 S1 shows the diner contact projection` in `frontend/src/pages/RestaurantReservationsPage.test.tsx` or the new restaurant reservation detail test, mocking only the typed API client
- [X] T009 [P] [US16] Add frontend acceptance test `US-16 S2 hides contact data for a foreign reservation` in the corresponding restaurant reservation test file, asserting the Spanish error state and no contact data rendering

### Implementation for US-16

- [X] T010 [US16] Implement `GET /api/restaurante/reservas/{reservation_id}/comensal` in `backend/app/api/restaurant.py`, resolving the authenticated restaurant with `restaurant_from_claims`, filtering the reservation by both id and `restaurant_id`, and returning `404` for foreign or unknown reservations
- [X] T011 [US16] Join `Reservation.diner_id` to `Diner` in `backend/app/api/restaurant.py` and map only `id`, `nombre` as `name` and `email`; never serialize `password_hash`, verification timestamps or registration metadata
- [X] T012 [US16] Add the typed restaurant diner-detail request in `frontend/src/api/restaurantReservations.ts`, handling `401`, `403`, `404` and Spanish API errors through existing client/session helpers
- [X] T013 [US16] Regenerate `frontend/src/api/openapi.json` and `frontend/src/api/schema.d.ts` with `make api-types`; do not edit generated files by hand
- [X] T014 [US16] Add the restaurant reservation detail/contact view using existing design-system components, accessible labels and Spanish text in `frontend/src/pages/` and its CSS Module; expose only the contact fields from the contract
- [X] T015 [US16] Wire the US-16 detail/contact view from the existing restaurant reservation route in `frontend/src/router.tsx` without changing the US-14 calendar query or behavior

**Checkpoint**: US-16 works end to end and its backend/frontend scenarios
pass with restaurant ownership enforced.

---

## Phase 3: US-18 — Ver cancelaciones

**Goal**: Allow an authenticated restaurant responsible to consult its
cancelled reservations, filter them by local date and see cancellation details
without adding a cancellation operation.

**Independent Test**: Seed cancelled reservations for two dates and a confirmed
reservation. Query the cancellation endpoint with and without a date filter and
verify that only the authenticated restaurant's cancelled reservations are
returned with local date/time, table, status and `cancelled_at`.

### Tests for US-18

- [X] T016 [P] [US18] Add backend acceptance test `test_us18_s1_lists_only_cancelled_reservations` in `backend/tests/test_restaurant_reservations.py`, asserting `status: "cancelled"` and excluding confirmed reservations and other restaurants
- [X] T017 [P] [US18] Add backend acceptance test `test_us18_s2_returns_cancellation_details` in `backend/tests/test_restaurant_reservations.py`, asserting reservation date, local start/end time, table group, party size and `cancelled_at` converted to `America/Argentina/Buenos_Aires`
- [X] T018 [P] [US18] Add backend acceptance test `test_us18_s3_returns_cancelled_order_summary_when_present` in `backend/tests/test_restaurant_reservations.py`: a cancelled reservation with an order answers `preordered_order: {"status": "cancelled"}`, one without answers `null` (wired with US-17, spec 009, on 04/11)
- [X] T019 [P] [US18] Add backend acceptance test `test_us18_s4_filters_cancellations_by_local_date` in `backend/tests/test_restaurant_reservations.py`, including a UTC timestamp near midnight to verify Buenos Aires date semantics
- [X] T020 [P] [US18] Add backend contract test `test_us18_s5_cancellation_notification_contract` in `backend/tests/test_restaurant_reservations.py`, asserting the read model contains every field required by the future cancellation notification and that listing cancellations never sends mail as a side effect
- [X] T021 [P] [US18] Add backend acceptance test `test_us18_s6_cancelled_reservation_is_available_again` in `backend/tests/test_restaurant_reservations.py`, asserting the existing availability query ignores cancelled reservations while respecting other confirmed reservations
- [X] T022 [P] [US18] Add backend edge-case tests in `backend/tests/test_restaurant_reservations.py` for empty results, invalid date (`400`), missing/expired session (`401`), diner token (`403`) and cross-restaurant access
- [X] T023 [P] [US18] Add frontend acceptance test `US-18 S1 lists cancelled reservations and shows the cancelled state` in a restaurant cancellation page test, mocking the typed API client
- [X] T024 [P] [US18] Add frontend acceptance test `US-18 S4 filters cancellations by date` in the restaurant cancellation page test, asserting the selected date is sent to the API and only matching rows render

### Implementation for US-18

- [X] T025 [US18] Implement `GET /api/restaurante/cancelaciones?date=` in `backend/app/api/restaurant.py`, requiring restaurant authentication, filtering by `restaurant_id` and `status = "cancelled"`, applying the optional Buenos Aires local-date filter, and ordering by reservation start time
- [X] T026 [US18] Map `cancelled_at` to Buenos Aires local ISO output and return the optional `preordered_order` projection without creating an Order model or exposing item/payment data in `backend/app/api/restaurant.py`
- [X] T027 [US18] Add the typed cancellation-list request in `frontend/src/api/restaurantReservations.ts`, including optional date query parameters and existing session/error handling
- [X] T028 [US18] Regenerate `frontend/src/api/openapi.json` and `frontend/src/api/schema.d.ts` with `make api-types`; verify the generated contract includes both US-16 and US-18 endpoints
- [X] T029 [US18] Build the read-only restaurant cancellation page with date filter, Spanish empty/loading/error states, cancellation details and optional cancelled-order indicator in `frontend/src/pages/RestaurantCancellationsPage.tsx` and `frontend/src/pages/RestaurantCancellationsPage.module.css`
- [X] T030 [US18] Add the cancellation route and navigation entry in `frontend/src/router.tsx` and the existing restaurant navigation component, without adding controls that initiate cancellation

**Checkpoint**: US-18 works end to end; cancellation reads are isolated by
restaurant, cancelled reservations release availability through the existing
confirmed-only queries, and no cancellation command is exposed.

---

## Phase 4: Polish and validation

- [X] T031 Run the focused backend tests for US-16 and US-18 in `backend/tests/test_restaurant_reservations.py` against PostgreSQL; all 17 tests pass
- [X] T032 Run the focused frontend tests for the restaurant detail and cancellation pages with Vitest and fix only failures caused by this increment
- [X] T033 Run `make format` and review that only US-16/US-18 implementation files, generated API files, migration, tests and this task file changed
- [X] T034 Run `make lint` and resolve backend/frontend formatting, lint and type errors introduced by US-16/US-18
- [X] T035 Follow `specs/008-gestion-reservas-restaurante/quickstart.md` for the two new endpoints after the migration blocker is resolved, verifying empty states, ownership isolation, date filtering and read-only scope through the focused acceptance suite

## Dependencies & Execution Order

1. T001 is the prerequisite for the increment.
2. T002 and T004 can proceed in parallel after T001; T003 depends on T002.
3. T005–T009 are test-first tasks for US-16 and can proceed in parallel; T010–T015 follow the tests and depend on T002–T004.
4. US-18 depends on T002–T004 but is otherwise independent from US-16. T016–T024 are test-first tasks and can proceed in parallel; T025–T032 follow them.
5. T031–T035 run only after both story checkpoints.

## Parallel Opportunities

- **Foundational**: T002 and T004 touch different files and can run in parallel; T003 follows the model change.
- **US-16 tests**: T005–T009 can run in parallel because they use independent test cases or frontend test sections.
- **US-18 tests**: T016–T024 can run in parallel before implementation; T020 and T021 must use the existing mail/availability helpers rather than changing them.
- **Stories**: Once T002–T004 are complete, US-16 and US-18 can be assigned independently.

## Implementation Strategy

Deliver US-16 first as the smallest vertical slice: ownership-safe diner
projection, typed client and detail view. Then deliver US-18 as a read-only
cancelled-reservation query with persisted cancellation metadata, notification
integration and date-filtered UI. Preserve US-14 unchanged throughout. Do not
implement restaurant cancellation controls, order creation, payments or
real-time refresh.

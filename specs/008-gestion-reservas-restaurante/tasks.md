# Tasks: Restaurant Reservation Calendar

**Input**: Design documents from `/specs/008-gestion-reservas-restaurante/`

**Tests**: Required for every US-14 acceptance scenario.

## Phase 1: Foundational

The existing reservation model, restaurant authentication, opening shifts and test
fixtures are sufficient. No new model or migration is required.

- [X] T001 Confirm the US-14 contract and existing reservation fields in `specs/008-gestion-reservas-restaurante/contracts/restaurant-reservations-api.md` and `backend/app/models/reservation.py`

**Checkpoint**: Existing persistence and authentication are ready for the story.

---

## Phase 2: US-14 — Ver calendario de reservas 🎯

**Goal**: Let an authenticated restaurant responsible inspect its reservations for a
local date, grouped by opening shift and ordered chronologically.

**Independent Test**: Sign in as a restaurant with reservations on multiple dates and
shifts, open `/restaurante/reservas`, change dates, and verify each reservation's
time, table group, party size and status. Verify that another restaurant cannot see
the reservations.

### Tests for US-14

- [X] T002 [P] [US14] Add backend test for date filtering and restaurant ownership in `backend/tests/test_restaurant_reservations.py::test_us14_s1_lists_reservations_for_restaurant_by_date_and_shift`
- [X] T003 [P] [US14] Add backend test for chronological ordering in `backend/tests/test_restaurant_reservations.py::test_us14_s3_orders_reservations_by_start_time`
- [X] T004 [P] [US14] Add backend test for current reservations after a new row is added in `backend/tests/test_restaurant_reservations.py::test_us14_s5_reflects_current_reservations`
- [X] T005 [P] [US14] Add backend test for cancelled status in `backend/tests/test_restaurant_reservations.py::test_us14_s6_returns_cancelled_status`
- [X] T006 [P] [US14] Add backend tests for missing session, diner role and empty date behavior in `backend/tests/test_restaurant_reservations.py`
- [X] T007 [P] [US14] Add frontend test for displayed time, table, party size and status named `US-14 S2 shows time, table, party size and status` in `frontend/src/pages/RestaurantReservationsPage.test.tsx`
- [X] T008 [P] [US14] Add frontend test for date navigation named `US-14 S4 changes the selected date` in `frontend/src/pages/RestaurantReservationsPage.test.tsx`

### Implementation for US-14

- [X] T009 [US14] Add `RestaurantReservationResponse` and `RestaurantReservationsResponse` schemas to `backend/app/schemas/reservation.py`, exposing `table.capacity`, `table.seating_area`, local `start_time`/`end_time`, `party_size` and `status` without `table_number` or diner data
- [X] T010 [US14] Implement `GET /api/restaurante/reservas?date=` in `backend/app/api/restaurant.py`, using `restaurant_from_claims`, filtering by the requested Buenos Aires local date, retaining confirmed and cancelled rows, and ordering by `starts_at`
- [X] T011 [US14] Add the typed request function for the restaurant calendar in `frontend/src/api/restaurantReservations.ts`, handling session expiration and Spanish API errors
- [X] T012 [US14] Regenerate `frontend/src/api/openapi.json` and `frontend/src/api/schema.d.ts` with `make api-types`
- [X] T013 [US14] Replace the placeholder with `frontend/src/pages/RestaurantReservationsPage.tsx`, loading the selected date and existing opening shifts, grouping reservations by matching shift, and showing the Spanish empty/loading/error states
- [X] T014 [US14] Add mobile-first styles and date navigation controls in `frontend/src/pages/RestaurantReservationsPage.module.css`, using design tokens and accessible labels
- [X] T015 [US14] Update `frontend/src/router.tsx` to render `RestaurantReservationsPage` at `/restaurante/reservas`

**Checkpoint**: US-14 works end to end and all scenario tests pass.

---

## Phase 3: Polish and validation

- [X] T016 Run `make format` and review only files changed for US-14
- [X] T017 Run `make lint` and fix relevant backend/frontend formatting, lint and type errors
- [X] T018 Run the US-14 backend and frontend acceptance tests and verify the implementation
- [X] T019 Review `specs/008-gestion-reservas-restaurante/quickstart.md` and confirm the documented API/UI flow matches the implementation

## Dependencies & Execution Order

1. T001 is the prerequisite for the story.
2. T002–T008 can be written in parallel because they use separate test cases/files, but must be completed before implementation validation.
3. T009–T010 provide the backend contract; T011–T012 depend on the endpoint; T013–T015 depend on the generated types and API client.
4. T016–T019 run after the implementation.

## Parallel Opportunities

- Backend acceptance tests T002–T006 can be prepared in parallel with frontend tests T007–T008.
- Backend schema/endpoint work T009–T010 can proceed independently from frontend test setup T007–T008.
- CSS work T014 can proceed independently from the API client T011 once the page structure is agreed.

## Implementation Strategy

Deliver the smallest vertical slice first: restaurant-owned date query, typed client,
and a page showing an ordered list. Then add shift grouping, date navigation, empty
states and final accessibility styling. No cancellation operation or real-time
refresh is included in this story.

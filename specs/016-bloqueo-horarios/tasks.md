---
description: "Task list for US-32 (spec 016-bloqueo-horarios)"
---

# Tasks: Bloquear Horarios No Disponibles

**Input**: Design documents from `/specs/016-bloqueo-horarios/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: REQUIRED. The constitution (principle III) requires at least one automated test per acceptance scenario, named after its US and scenario.

**Organization**: One user story (US-32), so the phases are foundational, the US-32 story (tests first, then implementation) and the wrap-up.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: `[US32]`

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: The entity and the API shapes every US-32 test and endpoint needs.

- [X] T001 Create the `Closure` model in `backend/app/models/closure.py` with `id`, `restaurant_id`, `date`, `start_time`, `end_time`, `created_at`, `request_id`, the `closure_times_complete`/`end_after_start` checks, the unique `request_id` and the `(restaurant_id, date)` index; import it in `backend/app/models/__init__.py`
- [ ] T002 Generate and review the migration with `make migration m="add closures"` in `backend/migrations/versions/`; confirm `alembic check` reports no drift
- [X] T003 Add the request/response/warning schemas in `backend/app/schemas/closure.py`: `ClosureRequest`, `ClosureResponse`, `ClosureListResponse`, `AffectedReservation`, `ClosureWarningDetail`, `ClosureWarningResponse`

**Checkpoint**: The table and the JSON shapes exist; the story can start.

---

## Phase 2: US-32 — Bloquear horarios no disponibles 🎯

**Goal**: A restaurant can block a whole date or a range, see the reservations it would cancel, confirm or desist, list current closures and remove them; diners can no longer book blocked starts.

**Independent Test**: Block a whole date and a range and check that availability hides them; block a range with a confirmed reservation, check the warning, confirm and see the cancellation, then remove the closure and see the slots return.

### Tests for US-32 (write first; they must fail before the implementation)

- [X] T004 [P] [US32] Scenario 1 (`test_us32_s1_whole_day_closure_hides_every_slot`) in `backend/tests/test_closures.py`: a whole-day closure makes the day `open: false` with no slots
- [X] T005 [P] [US32] Scenario 2 (`test_us32_s2_time_range_closure_hides_overlapping_slots`) in `backend/tests/test_closures.py`: only the slots whose 90-minute block overlaps the range become unavailable
- [X] T006 [P] [US32] Scenario 3 (`test_us32_s3_warns_about_affected_reservations`) in `backend/tests/test_closures.py`: the first POST answers `409` with id, date, start/end time and party size, and writes nothing
- [X] T007 [P] [US32] Scenario 4 (`test_us32_s4_confirmation_cancels_affected_reservations`) in `backend/tests/test_closures.py`: the confirmed POST creates the closure, cancels the reservations with `cancelled_at`, frees their tables and sends the diner mail
- [X] T008 [P] [US32] Scenario 5 (`test_us32_s5_declining_keeps_reservations_and_creates_nothing`) in `backend/tests/test_closures.py`: after the warning, no confirmation leaves no closure and the reservations confirmed
- [X] T009 [P] [US32] Scenario 6 (`test_us32_s6_rejects_invalid_ranges_and_past_dates`) in `backend/tests/test_closures.py`: `end_time <= start_time`, past dates, an incomplete range and today's already-started range answer `400` with Spanish messages
- [X] T010 [P] [US32] Scenario 7 (`test_us32_s7_lists_and_deletes_restaurant_closures`) in `backend/tests/test_closures.py`: the list returns today/future closures ordered by date and time, and DELETE removes one (`204`)
- [X] T011 [P] [US32] Scenario 8 (`test_us32_s8_deleting_a_closure_restores_availability`) in `backend/tests/test_closures.py`: after DELETE the shifts are offered again according to the remaining closures
- [X] T012 [P] [US32] Edge tests in `backend/tests/test_closures.py`: `test_us32_edge_overlapping_closures_block_the_union`, `test_us32_edge_reservation_crossing_the_range_is_affected`, `test_us32_edge_new_reservation_between_warning_and_confirmation_rewarns`, `test_us32_edge_repeated_request_applies_once`, `test_us32_edge_restaurant_only_sees_and_removes_its_closures`, `test_us32_edge_closure_outside_shifts_is_saved_without_affected_reservations`, `test_us32_edge_cancelled_reservation_releases_table_and_order`, `test_us32_edge_blocked_start_cannot_be_confirmed`, `test_us32_edge_mail_failure_does_not_undo_the_closure`, `test_us32_edge_partial_range_started_today_is_rejected`, `test_us32_edge_changing_shifts_keeps_closures`
- [X] T013 [P] [US32] UI tests in `frontend/src/pages/RestaurantClosuresPage.test.tsx`: `US-32 S3 shows the affected reservations before applying`, `US-32 S4 applies the closure after confirming`, `US-32 S5 desisting keeps the reservations`, `US-32 S6 rejects an end before the start`, `US-32 S7 lists current closures and removes one`

### Implementation for US-32

- [X] T014 [US32] Read closures in `backend/app/services/availability.py`: add a whole-day check to `day_availability` (`open: false`), mark overlapping slots unavailable, reject a blocked start in `check_start` and add the `409` re-check in `confirm_reservation`
- [X] T015 [US32] Create `backend/app/services/closures.py`: validation, `closure_range`, affected-reservation query, warning/acknowledged-id comparison, create with `request_id` idempotency, cancellation of reservations/carts, listing, deletion and the diner mail
- [X] T016 [US32] Create `backend/app/api/closure.py` with `POST /restaurante/bloqueos` (`201`, `200` for a repeated request, `409` warning model), `GET /restaurante/bloqueos` and `DELETE /restaurante/bloqueos/{closure_id}`; reuse `restaurant_from_claims` and mount the router in `backend/app/api/__init__.py`
- [X] T017 [US32] Regenerate the API contract and types with `make api-types` (`frontend/src/api/openapi.json`, `frontend/src/api/schema.d.ts`)
- [X] T018 [US32] Create `frontend/src/api/closures.ts` with `fetchClosures`, `createClosure` (throws `ClosureWarningError` with the affected list on `409`) and `deleteClosure`, using the typed client and `sessionHeaders`
- [X] T019 [US32] Build `frontend/src/pages/RestaurantClosuresPage.tsx` and `RestaurantClosuresPage.module.css`: date input, "Todo el día" checkbox, time range, validation, warning `Modal` with the affected reservations, "Desistir"/"Confirmar bloqueo", current-closures list with "Quitar", Spanish text and 360 px layout
- [X] T020 [US32] Add the route `/restaurante/bloqueos` in `frontend/src/router.tsx`
- [X] T021 [US32] Add the "Bloqueos de horario" dashboard card in `frontend/src/pages/home/RestaurantHome.tsx` linking to the new page

**Checkpoint**: US-32 works end to end and every acceptance scenario has a passing test.

---

## Phase 3: Wrap-up

- [ ] T022 Run `make format lint test` and fix any failure
- [X] T023 Update `spec.md`, `plan.md`, `data-model.md`, `contracts/closures-api.md` and this file if the implementation diverged
- [X] T024 Update the 016 row and the pending-PO entry in `specs/README.md`
- [ ] T025 Follow `quickstart.md` to try the feature in the running app at 360 px and with the keyboard

---

## Dependencies & Execution Order

- **Foundational**: T001 → T002 and T003. The model blocks the migration; the schemas are independent.
- **Tests**: T004–T013 can be written in parallel once T001–T003 exist; they fail until T014–T021 are done.
- **Implementation**: T014 and T015 can be developed in parallel (different files) after T001/T003; T016 depends on T014, T015 and T003; T017 depends on T016; T018 depends on T017; T019 depends on T018; T020 and T021 depend on T019.
- **Wrap-up**: T022–T025 after the story is complete.

## Notes

- [P] tasks touch different files and have no dependencies on each other.
- Commit after each task or logical group with the US in the message: `feat(US-32): …`.
- Reuse the `client`, `session`, `mail_outbox` and `fixed_now` fixtures; the reservation builders in `backend/tests/reservations.py` already give a bookable restaurant, diners and reservations.
- The frontend tests mock `../api/closures`, following `RestaurantReservationsPage.test.tsx`.
- Do not add a "bloqueado" field to the availability response: the existing `open` and `available` fields already express the behavior (research R7/R11).

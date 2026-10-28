---

description: "Task list for reservar mesa (US-11 now, US-13 later)"
---

# Tasks: reservar mesa

**Input**: Design documents from `/specs/005-reservar-mesa/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/availability-api.md](contracts/availability-api.md), [quickstart.md](quickstart.md)

**Tests**: REQUIRED. The constitution (principle III) requires at least one automated test per acceptance scenario, named after its US and scenario. Test tasks come first and must fail before the implementation.

**Organization**: one phase per user story, in the order of `spec.md`. US-11 is built in Sprint 2; US-13 is later and stays deferred at the bottom so this file covers the whole spec.

**Scope note**: US-11 does not create reservations (FR-011, SC-005). The `reservations` table is created here only because availability must read it.

**Status note (23/10)**: spec 004 has no `plan.md` and no `Shift`/`Table` models in `backend/app/models/`, so the T001 checkpoint blocks the foundational phase (T002–T005) and the backend phase (T006–T011, T014–T018): the FK to `tables` and the availability queries cannot exist. US-11 is built on the mock path (T012–T013, T019–T024); the gap is recorded in `specs/README.md`.

**Decision note (23/10)**: US-11 does not choose a concrete table, following `prototipo-us11.html`: the page informs whether a table is free for the chosen preference and the table is assigned when the reservation is confirmed (US-13). T019, T020, T023 and T028 reflect that; the spec, plan, data model, contract and quickstart were updated together with it.

**Mock note**: anything the flow needs that is not implemented yet is mocked in `frontend/src/data/` so the screen can be shown (precedent: the fixture restaurants of spec 002). The mock mirrors `contracts/availability-api.md`, is labelled «Datos de prueba» in the UI, and its removal is a task of its own (T018). It never replaces a backend test and never writes to the database.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependencies)
- **[Story]**: backlog US number
- Exact file paths in every task

---

## Phase 1: Foundational (needs the tables of spec 004)

**Purpose**: have the tables of spec 004 available and create the one table this feature owns, with the anti-overbooking constraint.

**Checkpoint before starting**: if `Shift` and `Table` are not in `backend/app/models/`, **do not** create a second table model and do not write the migration (the FK to `tables` cannot exist). Record the gap in `specs/README.md` and continue with the mock path (T012–T013) so the sprint can still demo the flow.

- [x] T001 Confirm the dependency contract of spec 004: `Shift` (weekday, start, end, active) and `Table` (`capacity`, `seating_area`, `active`, `label`) must exist in `backend/app/models/`. **Result (23/10)**: neither exists, and 004 has no `plan.md` either. Per this checkpoint no second table model and no migration were created; the gap is recorded in `specs/README.md` and the feature followed the mock path (T012–T013, T019–T024)
- [ ] T002 **Superseded on 28/10 (see Phase 3, T034–T041).** [P] Create the `Reservation` model in `backend/app/models/reservation.py` with `id` (UUID), `diner_id`, `restaurant_id`, `table_id`, `starts_at` (`TIMESTAMP WITH TIME ZONE`), `ends_at` (generated: `starts_at + INTERVAL '90 minutes'`), `party_size` (`CHECK > 0`; the restaurant's maximum is validated by the service and the write path, not by a column) and `created_at`, following `data-model.md` — **blocked: needs spec 004's `tables` model**
- [ ] T003 **Superseded on 28/10 (see Phase 3, T034–T041).** Import `Reservation` in `backend/app/models/__init__.py` so Alembic sees it — **blocked: T002**
- [ ] T004 **Superseded on 28/10 (see Phase 3, T034–T041).** Generate the migration with `make migration m="add reservations"` in `backend/migrations/versions/`, then review and complete it by hand: `CREATE EXTENSION IF NOT EXISTS btree_gist`, `EXCLUDE USING gist (table_id WITH =, tstzrange(starts_at, ends_at) WITH &&)`, index `ix_reservations_restaurant_id_starts_at`, and a `downgrade()` that drops the table (the extension stays) — **blocked: T002**
- [ ] T005 **Superseded on 28/10 (see Phase 3, T034–T041).** [P] Add pytest helpers in `backend/tests/conftest.py` to create a restaurant with one shift and N tables (some of them inactive), and a reservation at a given start, reusing spec 004's models — **blocked: needs spec 004's models**

**Checkpoint**: `make migrate` applies cleanly and two manually inserted overlapping reservations on the same table fail with `IntegrityError`.

---

## Phase 2: US-11 — Crear reserva 🎯

**Goal**: the diner chooses date, time, party size (from 1 to the restaurant's maximum), seating preference and table, with availability computed from the restaurant's shifts, tables and existing reservations.

**Independent Test**: on a restaurant with shifts and tables, walk the spec's independent test — past date, closed day, occupied slot, change of date/time, seating preference, valid selection — and see the availability update every time; try to exceed the restaurant's maximum party size and confirm the stepper and a hand-edited URL stop at the cap. Without spec 004, the same walk works against the mock.

### Tests for US-11 (write first; they must fail before the implementation)

- [ ] T006 **Superseded on 28/10 (see Phase 3, T034–T041).** [P] [US11] `test_us11_s2_rejects_past_date` in `backend/tests/test_reservation.py` — **blocked: T016**
- [ ] T007 **Superseded on 28/10 (see Phase 3, T034–T041).** [P] [US11] `test_us11_s3_returns_only_slots_inside_shifts` and `test_us11_s3_returns_no_slots_on_a_closed_weekday` in `backend/tests/test_reservation.py` — **blocked: T016**
- [ ] T008 **Superseded on 28/10 (see Phase 3, T034–T041).** [P] [US11] `test_us11_s4_marks_a_slot_without_free_tables_unavailable` in `backend/tests/test_reservation.py` — **blocked: T016**
- [ ] T009 **Superseded on 28/10 (see Phase 3, T034–T041).** [P] [US11] `test_us11_s6_offers_only_tables_with_enough_capacity` in `backend/tests/test_reservation.py` — **blocked: T016**
- [ ] T010 **Superseded on 28/10 (see Phase 3, T034–T041).** [P] [US11] `test_us11_s7_returns_no_tables_when_none_fit` in `backend/tests/test_reservation.py` — **blocked: T016**
- [ ] T011 **Superseded on 28/10 (see Phase 3, T034–T041).** [P] [US11] Edge cases in `backend/tests/test_reservation.py`: `test_us11_edge_does_not_offer_past_times_of_today`, `test_us11_edge_returns_no_slots_without_shifts`, `test_us11_edge_returns_the_restaurant_max_party_size`, `test_us11_edge_returns_no_max_without_active_tables`, `test_us11_edge_offers_no_slots_above_the_restaurant_maximum`, `test_us11_edge_database_rejects_overlapping_reservations`, `test_us11_edge_requires_a_token`, `test_us11_edge_rejects_a_restaurant_account`, `test_us11_edge_returns_404_for_an_unknown_restaurant`, `test_us11_edge_rejects_an_invalid_request` — **blocked: T005, T016**

### Temporary mock (unblocked: it can start before spec 004 exists)

- [x] T012 [P] [US11] Create `frontend/src/api/availability.ts` with `fetchAvailability()` and `fetchAvailableTables()`, plus `frontend/src/data/reservationAvailability.fixture.ts`, mirroring `contracts/availability-api.md`: Monday closed, shifts 12:00–15:00 and 20:00–23:30 on the other days, five tables where `Mesa 5` is inactive and the four offered are `Mesa 1` and `Mesa 2` (indoor, 2), `Mesa 3` (outdoor, 4) and `Mesa 4` (terrace, 4), `max_party_size: 4`, one slot (20:30) marked `available: false` to show S4, `Mesa 4` taken at 21:00 so the Terraza preference shows «Sin mesas», past times removed, 30-minute starts, and only tables with `capacity >= party_size`. Export `isUsingMockData` so the UI can label it and the tests can assert it. "Today in Buenos Aires" lives in `frontend/src/lib/date.ts` so the page never imports the fixture
- [x] T013 [US11] Show a `StatusPill` «Datos de prueba» in `frontend/src/pages/ReservationPage.tsx` while `isUsingMockData` is true, so the demo never looks like real data

### Backend implementation (needs spec 004; skip until it exists)

- [ ] T014 **Superseded on 28/10 (see Phase 3, T034–T041).** [US11] Add the response schemas in `backend/app/schemas/reservation.py` (`AvailabilityResponse` with `restaurant_id`, `date`, `open`, `duration_minutes`, `max_party_size`, `slots`; `AvailableTablesResponse` with `restaurant_id`, `date`, `start_time`, `ends_at`, `tables`), with Spanish validation messages — **blocked: spec 004**
- [ ] T015 **Superseded on 28/10 (see Phase 3, T034–T041).** [US11] Implement `backend/app/services/availability.py`: BA date → UTC window, `max_party_size` as `max(capacity)` over the active tables (`0` when there are none), 30-minute starts that fit the 90-minute block inside the shift, past starts removed, free tables with the overlap predicate, no slots or tables above the cap, and the ordering of `data-model.md` — **blocked: spec 004**
- [ ] T016 **Superseded on 28/10 (see Phase 3, T034–T041).** [US11] Implement the two GET endpoints in `backend/app/api/reservation.py` (`/restaurants/{restaurant_id}/availability` and `/availability/tables`) with `TokenClaimsDep` + diner-role check (`403` for restaurants), `404` for unknown restaurants, `400` for a past date or start and for `party_size < 1`, and mount the router in `backend/app/api/__init__.py` — **blocked: spec 004**
- [ ] T017 [US11] Run `make api-types` and commit `frontend/src/api/openapi.json` and `frontend/src/api/schema.d.ts` — **blocked: T016**
- [ ] T018 [US11] Swap `frontend/src/api/availability.ts` to the generated typed client (`api.GET(...)`), delete `frontend/src/data/reservationAvailability.fixture.ts` and the «Datos de prueba» pill, and remove the pending item from `specs/README.md`. Only when T002–T017 are done

### Frontend implementation

- [x] T019 [P] [US11] Build `frontend/src/pages/ReservationPage.tsx` with `ReservationPage.module.css`: native date input with `min`, `QuantityStepper` with `min={1}` and `max={max_party_size}` (keep 1 and disable `+` until the first availability response gives the cap) plus the "Máximo N personas" hint, `Chip` grid for the slots (disabled and labelled «Ocupado» when unavailable, styles from the page's CSS Module), "Sin preferencia" + `Chip` per seating area inside a `role="group"` (disabled and labelled «Sin mesas» when that area has no free table), the availability message "Hay mesa disponible para ese día y horario" or the empty state "No hay mesas disponibles para esta fecha y horario" (no table list and no "Elegir mesa" button: the table is assigned at confirmation, decision of 23/10), "Ese día el restaurante no atiende", "El restaurante todavía no tiene mesas disponibles" when `max_party_size` is 0 and "La capacidad máxima de este restaurante es de N personas" above the cap, `Skeleton` while loading, `useToast` for the notices and Spanish (voseo) text. Import only `availability.ts` (T012) and `lib/date.ts`, never the fixture directly
- [x] T020 [US11] Keep the selection in the URL (`?fecha=&hora=&personas=&tipo=`) with `useSearchParams` and `replace: true`, derived through local `selectionFromParams` / `paramsFromSelection` helpers: ignore missing or invalid values (`personas` → 1, `tipo` → "Sin preferencia", no date → no slots query, no time → no tables query), clamp `personas` to `max_party_size` with a notice, never write an invalid value, and clear a `hora` that is not an available slot in the response with a notice (S5). Key the queries on the values each one uses (slots: date + party size; tables: date + time + party size) with TanStack Query
- [x] T021 [US11] Add the lazy route `/reservar/:restauranteId` in `frontend/src/router.tsx`, send a diner without a session to `/ingresar` and a restaurant account to `/` (the page is diner-only)
- [x] T022 [US11] Turn the disabled "Reservar mesa" button in `frontend/src/pages/RestaurantDetailPage.tsx` into the link to the new route only for a signed-in diner, leaving the "Próximamente" card for visitors and restaurant accounts (only this button changes; the rest of the page belongs to spec 002)
- [x] T023 [US11] Frontend tests in `frontend/src/pages/ReservationPage.test.tsx`, replacing `frontend/src/api/availability.ts` with a deterministic double while the mock exists (after T018, mock `src/api/client` like the other pages): `US-11 S1 offers date, time and seating preference`, `US-11 S2 does not allow a past date`, `US-11 S4 disables an occupied time`, `US-11 S5 asks again for the tables when the time changes`, `US-11 S5 clears a time that is no longer available and keeps the date`, `US-11 S6 shows only the tables of the chosen seating area`, `US-11 S7 informs there are no tables and keeps the controls usable`, `US-11 edge caps the party size at the restaurant maximum`, `US-11 edge keeps the selection when the page reloads`, `US-11 edge ignores an invalid value in the URL`, `US-11 edge sends a visitor to the sign-in page`, `US-11 edge sends a restaurant account back home` and `US-11 edge offers the reserve link to a diner only` (the test that discarded a stale `mesa` from the URL is gone with the concrete-table selection)
- [ ] T024 [US11] Check the page at 360 px, with keyboard only and with a screen reader's usual reading order: labelled fields, visible focus, buttons for actions, the «Ocupado» slot announced as text and not only by color, the "Máximo N personas" hint. Confirm no shared component was added (the disabled chip style is page CSS) and update only the `Chip` row in `docs/design/README.md`; `/diseno` needs no new entry. **Done**: the `Chip` row is updated and no shared component was added; the visual/keyboard pass in a browser is still pending (see Validation results)

**Checkpoint**: US-11 works end to end — with the mock if spec 004 is missing, with the real endpoints if it is merged — and its tests pass in both cases.

---

## Phase 3: US-13 — Confirmar datos (and the pieces it needs), planned 28/10

**Status note (28/10)**: spec 004 is merged with grouped tables, and the team took decisions D1–D9 (`research.md`). They replace the earlier foundational and backend tasks: T002–T011 and T014–T016 are superseded (marked on their lines) by T034–T041; T017–T018 stay; T025–T029 become the tasks below. Everything goes in **one PR** (team decision of 28/10), with commits in this order, so production never sees an intermediate state.

- [X] T033 [US13] Take decisions D1–D9, update `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, spec 004 and spec 002, and record them in `specs/README.md`; review the result with an independent reviewer and fix its findings
- [ ] T033a [US13] Add the overlap warning (D8) as a criterion of US-13 in the team workbook and export `docs/product/backlog.md` with `scripts/export_backlog.py` — **needs the Google Sheets connector or a human**

### 1. Backend foundations

- [X] T034 [P] [US10] Tests first in `backend/tests/test_table_inventory.py`: `test_us10_s1_groups_have_a_seating_area` (existing groups default to `indoor`; two groups with the same capacity and area answer `400`)
- [X] T035 [US10] `seating_area` on `TableInventoryGroup` (`backend/app/models/table_inventory.py`), its schemas, `replace_inventory` and the unique key (restaurant, capacity, seating area)
- [X] T036 [US13] `Reservation` model in `backend/app/models/reservation.py` per `data-model.md` (group identity + `table_number`, `ends_at`, `status`, `request_id`), with the exclusion constraint, checks and indexes in `__table_args__`, imported in `backend/app/models/__init__.py`
- [X] T037 [US13] Migration `backend/migrations/versions/006_reservations.py` after `005_merge_feature_heads`: `btree_gist`, `table_inventory.seating_area` (default `indoor`), the new unique key, `reservations`; `downgrade()` reverts them; `alembic check` clean
- [X] T038 [P] [US13] Pytest helpers in `backend/tests/conftest.py`: a bookable restaurant (coordinates, a shift, table groups), a confirmed reservation at a given start and table number, and a fixed `now`
- [X] T039 [P] [US11] Backend tests in `backend/tests/test_reservation.py`, rewritten for groups: `test_us11_s2_rejects_past_date`, `test_us11_s3_returns_only_slots_inside_shifts`, `test_us11_s3_returns_no_slots_on_a_closed_weekday`, `test_us11_s4_marks_a_slot_without_free_tables_unavailable`, `test_us11_s6_offers_only_groups_with_enough_capacity`, `test_us11_s7_returns_no_tables_when_none_fit`, `test_us11_edge_returns_the_restaurant_max_party_size`, `test_us11_edge_returns_no_max_without_active_tables`, `test_us11_edge_offers_no_slots_above_the_restaurant_maximum`, `test_us11_edge_does_not_offer_past_times_of_today` (fixed `now` in Buenos Aires), `test_us11_edge_returns_no_slots_without_shifts`, `test_us11_edge_one_table_with_two_reservations_counts_once`, `test_us11_edge_requires_a_token`, `test_us11_edge_rejects_a_restaurant_account`, `test_us11_edge_unknown_restaurant_is_not_found`, `test_us11_edge_rejects_an_invalid_request`
- [X] T040 [US11] `backend/app/services/availability.py` with rules 1–8, 12 and 13 of `data-model.md` (`now` as a parameter), and `backend/app/schemas/reservation.py`
- [X] T041 [US11] `GET /api/restaurants/{restaurant_id}/availability` and `/availability/tables` in `backend/app/api/reservation.py`, mounted in `app/api/__init__.py`; diner role only

### 2. Real restaurants and the US-11 page on the API (D4)

- [ ] T042 [US10] Seating area selector per group in `frontend/src/pages/TableInventoryPage.tsx` («Adentro», «Afuera», «Terraza») and its test
- [ ] T043 [P] [US9] Tests in `backend/tests/test_public_restaurants.py`: `test_lists_only_bookable_restaurants`, `test_detail_includes_the_menu`, `test_price_tier_is_null_unless_it_is_a_known_tier`, `test_unknown_or_not_bookable_answers_404`
- [ ] T044 [US9] `GET /api/restaurants` and `/api/restaurants/{restaurant_id}` in `backend/app/api/public_restaurant.py` per `contracts/restaurants-api.md`
- [ ] T017 (above) `make api-types`
- [ ] T045 [US5] [US7] [US9] [US33] `frontend/src/api/restaurants.ts`: fetch the bookable restaurants and map them into `RestaurantPublic` (price tier from `price_tier`, occupancy `null`); the map, the list and the detail show them next to the fixtures; the pin, the list and the detail get a «Sin datos» occupancy state; «Reservar mesa» only for real restaurants (fixtures keep «Próximamente»); `ReservationPage` reads its header from `GET /api/restaurants/{id}` instead of the fixture's `fetchRestaurant`; tests in the map/list and detail test files
- [ ] T018 (above) Swap `frontend/src/api/availability.ts` to the typed client for the group response, delete the fixture and the «Datos de prueba» label, update `ReservationPage.test.tsx`

### 3. US-13

- [ ] T046 [P] [US13] Backend tests in `backend/tests/test_reservation.py`: `test_us13_s2_tables_endpoint_lists_groups_smallest_first`, `test_us13_s5_confirmation_creates_a_confirmed_reservation`, `test_us13_s6_lists_the_diner_reservations_of_the_day`, `test_us13_s6_overlapping_reservation_can_still_be_confirmed` (also same restaurant and start), `test_us13_edge_full_group_answers_409`, `test_us13_edge_database_rejects_a_double_booking`, `test_us13_edge_repeated_request_returns_the_same_reservation`, `test_us13_edge_lists_only_the_diner_reservations`, `test_us13_edge_changes_during_the_review_answer_409`, `test_us13_edge_rejects_malformed_requests`, `test_us13_edge_restaurant_token_gets_403`, `test_us13_edge_inventory_change_keeps_booked_tables`
- [ ] T047 [US13] `POST /api/reservations` (rule 9, `FOR UPDATE` on the group, `request_id`) and `GET /api/reservations?date=` (rule 10) in `backend/app/api/reservation.py`
- [ ] T048 [US13] Rule 11 in `backend/app/services/reservation_conflicts.py` with the new interface `check_reservation_conflict(session, restaurant_id, capacity, seating_area, new_quantity)`; update `replace_inventory` to call it per changed group with its session, and rewrite the two tests in `backend/tests/test_table_inventory.py` that monkeypatch the stub (lines 30 and 96) to use real reservations
- [ ] T049 [US13] `make api-types`
- [ ] T050 [P] [US13] Frontend tests in `frontend/src/pages/ReservationPage.test.tsx`: `US-13 S1` to `S6`, `US-13 edge returns to the selection when the table was taken`, `US-13 edge returns to the review after signing in again`; in `LoginPage.test.tsx`: `US-13 edge goes back to the page it came from`; in `TableInventoryPage.test.tsx`: `US-10 S3 lists the reservations that block the change`
- [ ] T051 [US13] Review step (`paso=revision`, pushed in history), confirmation with `request_id`, overlap warning, and the 409/401/404 states in `frontend/src/pages/ReservationPage.tsx` and its CSS module, per the plan's US-13 design
- [ ] T052 [US13] `?volver=` in `frontend/src/pages/LoginPage.tsx` (same-site paths only) and in the visitor redirect of the reservation page
- [ ] T053 [US10] `TableInventoryPage` lists the reservations of a `409` (date, time, party size)
- [ ] T054 Docs: `AGENTS.md` (endpoints, routes, the reservation flow), `docs/design/README.md` (the «Sin datos» occupancy state and anything else that changes), `specs/README.md` (005 row), and tell the owner of spec 003 that US-4 S3 can be tested

### After the merge

- [ ] T055 Production demo data: La Esquina de Palermo (Laura) with location, shifts and table groups; book a table as Martín and check it end to end ([quickstart.md](quickstart.md))

---

## Phase 4: Wrap-up

- [x] T030 Run `make format lint test` and fix any failure
- [x] T031 Update `specs/README.md` (005 row, pending PO items, the 004 gap and the mock as a pending removal) and this file if the implementation deviated (the concrete-table selection was dropped: see the decision note above)
- [ ] T032 Follow [quickstart.md](quickstart.md) in the running app, both with the mock and, if spec 004 is merged, with a real restaurant, and record the result — **pending: the browser pass was not run; the automated checks are in Validation results**

---

## Dependencies & Execution Order

- **Spec 004 is preferred first**: T002–T004 need its `tables` model (the FK cannot be created before). Without it, T012–T013 unblock the UI and the demo; T014–T018 wait.
- **Foundational (T001–T005)** blocks the backend phase (T014–T018).
- **Tests first**: T006–T011 are written and fail before T014–T016 exist.
- **Mock first**: T012 blocks T013, T019 and T023; it depends on nothing else.
- **Page**: T019 depends on T012 and blocks T020; T021 and T022 need the page; T023 needs T019–T022.
- **Party-size cap (FR-013)**: T011 writes the backend cap tests, T015 computes `max_party_size`, T016 returns it, T019–T020 bound the input, and T023 proves the UI cap.
- **Swapping the mock**: T018 needs the endpoints (T016), the regenerated types (T017) and the page (T019–T023) so nothing breaks while it changes.
- **US-13 (28/10)**: one PR. Within it: T034–T041 first (tests before code), then T042–T045 with T017–T018, then T046–T054. T055 needs the merge and the deploy.
- **Wrap-up** runs after the stories of the sprint are done.

## Notes

- [P] tasks touch different files and have no dependency on each other.
- The restaurant's maximum party size is derived (`max(capacity)` of its active tables), not stored; do not add a column or a second source of truth for it (FR-013, `data-model.md`).
- Branch `005-us11-reserve-table`; commits in English with the US: `feat(US-11): mock restaurant availability for the demo`, `feat(US-11): show available tables for a date and time`, `feat(US-11): build the reservation selection page`. No AI attribution in commits.
- One PR for US-11 with the **AI usage** section filled in, plus the spec, plan, tasks and the new `research.md` / `data-model.md` / `contracts/` / `quickstart.md`. If the mock is still in use at merge time, say so in the PR and in `specs/README.md`.
- When the endpoints merge, tell the owner of spec 003: the US-4 S3 test (`403` for the restaurant role) can finally be written in `backend/tests/test_auth.py`.

## Validation results

### Mock path, US-11 frontend (2026-10-23)

- Built: `frontend/src/lib/date.ts`, `frontend/src/api/availability.ts`, `frontend/src/data/reservationAvailability.fixture.ts`, `frontend/src/pages/ReservationPage.tsx` (+ `.module.css`, `.test.tsx`), the `/reservar/:restauranteId` route and the enabled "Reservar mesa" button in the detail. Nothing was added to the backend: spec 004 has no `Shift`/`Table` models, so T002–T011 and T014–T018 stay blocked per the T001 checkpoint.
- `npx vitest run`: 20 files, 92 tests passed, including the 13 new tests of `ReservationPage.test.tsx` (S1, S2, S4, S5 ×2, S6, S7 and the URL/role edge cases of T023).
- `make lint` (Ruff + ESLint + Prettier + `tsc -b`) passed; `make test-backend` passed (28 tests, untouched backend).
- Deviation from the plan: the concrete-table selection was dropped (decision of 23/10, following `prototipo-us11.html`). The spec, `plan.md`, `data-model.md`, `contracts/availability-api.md` and `quickstart.md` were updated in the same change; the URL has no `mesa` parameter and the tables response is informational.
- Still pending: the browser pass of T024/T032 (360 px, keyboard, screen reader and the quickstart walkthrough). No commit was made: everything stays local on `011-crear-reserva`.

### «Siguiente» button (2026-10-24)

- Added the `primary` «Siguiente» button under the three steps, as in `prototipo-us11.html` (right-aligned, no arrow). It is disabled until the selection is complete — date, time and at least one free table for the chosen party size and preference — and performs no action yet: the review step it leads to belongs to US-13, per the user's instruction of 24/10. (`frontend/src/pages/ReservationPage.tsx`, `frontend/src/pages/ReservationPage.module.css`)
- Two tests cover it: `US-11 S1 enables «Siguiente» only when the selection is complete` and the «Siguiente stays disabled» assertion inside `US-11 S7 informs there are no tables and keeps the controls usable` (`frontend/src/pages/ReservationPage.test.tsx`, 14 tests in that file). No shared component changed: it is the existing design-system `Button`.
- Fix along the way: `US-11 S5 clears a time that is no longer available and keeps the date` asserted the cleared chip right after finding the toast, and the toast paints before the URL settles, so the assertion raced (it failed in about half of the runs once the extra button changed the render timing). It now waits with `waitFor`. Full run: `make format lint test` → 28 backend + 93 frontend tests.

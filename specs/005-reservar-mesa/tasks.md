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
- [ ] T002 [P] Create the `Reservation` model in `backend/app/models/reservation.py` with `id` (UUID), `diner_id`, `restaurant_id`, `table_id`, `starts_at` (`TIMESTAMP WITH TIME ZONE`), `ends_at` (generated: `starts_at + INTERVAL '90 minutes'`), `party_size` (`CHECK > 0`; the restaurant's maximum is validated by the service and the write path, not by a column) and `created_at`, following `data-model.md` — **blocked: needs spec 004's `tables` model**
- [ ] T003 Import `Reservation` in `backend/app/models/__init__.py` so Alembic sees it — **blocked: T002**
- [ ] T004 Generate the migration with `make migration m="add reservations"` in `backend/migrations/versions/`, then review and complete it by hand: `CREATE EXTENSION IF NOT EXISTS btree_gist`, `EXCLUDE USING gist (table_id WITH =, tstzrange(starts_at, ends_at) WITH &&)`, index `ix_reservations_restaurant_id_starts_at`, and a `downgrade()` that drops the table (the extension stays) — **blocked: T002**
- [ ] T005 [P] Add pytest helpers in `backend/tests/conftest.py` to create a restaurant with one shift and N tables (some of them inactive), and a reservation at a given start, reusing spec 004's models — **blocked: needs spec 004's models**

**Checkpoint**: `make migrate` applies cleanly and two manually inserted overlapping reservations on the same table fail with `IntegrityError`.

---

## Phase 2: US-11 — Crear reserva 🎯

**Goal**: the diner chooses date, time, party size (from 1 to the restaurant's maximum), seating preference and table, with availability computed from the restaurant's shifts, tables and existing reservations.

**Independent Test**: on a restaurant with shifts and tables, walk the spec's independent test — past date, closed day, occupied slot, change of date/time, seating preference, valid selection — and see the availability update every time; try to exceed the restaurant's maximum party size and confirm the stepper and a hand-edited URL stop at the cap. Without spec 004, the same walk works against the mock.

### Tests for US-11 (write first; they must fail before the implementation)

- [ ] T006 [P] [US11] `test_us11_s2_rejects_past_date` in `backend/tests/test_reservation.py` — **blocked: T016**
- [ ] T007 [P] [US11] `test_us11_s3_returns_only_slots_inside_shifts` and `test_us11_s3_returns_no_slots_on_a_closed_weekday` in `backend/tests/test_reservation.py` — **blocked: T016**
- [ ] T008 [P] [US11] `test_us11_s4_marks_a_slot_without_free_tables_unavailable` in `backend/tests/test_reservation.py` — **blocked: T016**
- [ ] T009 [P] [US11] `test_us11_s6_offers_only_tables_with_enough_capacity` in `backend/tests/test_reservation.py` — **blocked: T016**
- [ ] T010 [P] [US11] `test_us11_s7_returns_no_tables_when_none_fit` in `backend/tests/test_reservation.py` — **blocked: T016**
- [ ] T011 [P] [US11] Edge cases in `backend/tests/test_reservation.py`: `test_us11_edge_does_not_offer_past_times_of_today`, `test_us11_edge_returns_no_slots_without_shifts`, `test_us11_edge_returns_the_restaurant_max_party_size`, `test_us11_edge_returns_no_max_without_active_tables`, `test_us11_edge_offers_no_slots_above_the_restaurant_maximum`, `test_us11_edge_database_rejects_overlapping_reservations`, `test_us11_edge_requires_a_token`, `test_us11_edge_rejects_a_restaurant_account`, `test_us11_edge_returns_404_for_an_unknown_restaurant`, `test_us11_edge_rejects_an_invalid_request` — **blocked: T005, T016**

### Temporary mock (unblocked: it can start before spec 004 exists)

- [x] T012 [P] [US11] Create `frontend/src/api/availability.ts` with `fetchAvailability()` and `fetchAvailableTables()`, plus `frontend/src/data/reservationAvailability.fixture.ts`, mirroring `contracts/availability-api.md`: Monday closed, shifts 12:00–15:00 and 20:00–23:30 on the other days, five tables where `Mesa 5` is inactive and the four offered are `Mesa 1` and `Mesa 2` (indoor, 2), `Mesa 3` (outdoor, 4) and `Mesa 4` (terrace, 4), `max_party_size: 4`, one slot (20:30) marked `available: false` to show S4, `Mesa 4` taken at 21:00 so the Terraza preference shows «Sin mesas», past times removed, 30-minute starts, and only tables with `capacity >= party_size`. Export `isUsingMockData` so the UI can label it and the tests can assert it. "Today in Buenos Aires" lives in `frontend/src/lib/date.ts` so the page never imports the fixture
- [x] T013 [US11] Show a `StatusPill` «Datos de prueba» in `frontend/src/pages/ReservationPage.tsx` while `isUsingMockData` is true, so the demo never looks like real data

### Backend implementation (needs spec 004; skip until it exists)

- [ ] T014 [US11] Add the response schemas in `backend/app/schemas/reservation.py` (`AvailabilityResponse` with `restaurant_id`, `date`, `open`, `duration_minutes`, `max_party_size`, `slots`; `AvailableTablesResponse` with `restaurant_id`, `date`, `start_time`, `ends_at`, `tables`), with Spanish validation messages — **blocked: spec 004**
- [ ] T015 [US11] Implement `backend/app/services/availability.py`: BA date → UTC window, `max_party_size` as `max(capacity)` over the active tables (`0` when there are none), 30-minute starts that fit the 90-minute block inside the shift, past starts removed, free tables with the overlap predicate, no slots or tables above the cap, and the ordering of `data-model.md` — **blocked: spec 004**
- [ ] T016 [US11] Implement the two GET endpoints in `backend/app/api/reservation.py` (`/restaurants/{restaurant_id}/availability` and `/availability/tables`) with `TokenClaimsDep` + diner-role check (`403` for restaurants), `404` for unknown restaurants, `400` for a past date or start and for `party_size < 1`, and mount the router in `backend/app/api/__init__.py` — **blocked: spec 004**
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

**Status note (28/10)**: spec 004 is merged with grouped tables, and the team took decisions D1–D8 (`research.md`). They replace the earlier foundational and backend tasks: T002–T005 become T034–T037 (groups instead of a `tables` FK, `status` included), T006–T011 and T014–T016 become T038–T041, T017–T018 stay as they are, and T025–T029 become the tasks below. The superseded tasks are left unchecked on purpose and are not done separately.

- [X] T033 [US13] Take decisions D1–D8, update `spec.md` (US-13 S2 and S6, FR-014–FR-016, edge cases), `plan.md`, `research.md`, `data-model.md`, `contracts/` and spec 004 (`seating_area`, FR-009), record them in `specs/README.md`, and add the overlap warning to US-13 in the team workbook

### PR A — seating area, reservations table, real availability (US-11 backend)

- [ ] T034 [P] [US13] Tests first in `backend/tests/test_table_inventory.py`: `test_us10_s1_groups_have_a_seating_area` (existing groups default to `indoor`, two groups with the same capacity and area answer `400`)
- [ ] T035 [US13] `seating_area` on `TableInventoryGroup` (`backend/app/models/table_inventory.py`), its schema, `replace_inventory` and the unique key (restaurant, capacity, seating area)
- [ ] T036 [US13] `Reservation` model in `backend/app/models/reservation.py` per `data-model.md` (group identity + `table_number`, `ends_at` set by the service, `status`), imported in `backend/app/models/__init__.py`
- [ ] T037 [US13] Migration `backend/migrations/versions/006_reservations.py` after `005_merge_feature_heads`: `btree_gist`, `table_inventory.seating_area` with default `indoor`, the new unique key, `reservations` with the exclusion constraint, the unique index for double submits and both indexes; `downgrade()` drops them
- [ ] T038 [P] [US13] Pytest helpers in `backend/tests/conftest.py`: a bookable restaurant (coordinates, a shift, table groups) and a confirmed reservation at a given start
- [ ] T039 [P] [US11] The deferred US-11 backend tests in `backend/tests/test_reservation.py` (T006–T011), rewritten for groups: past date, slots inside shifts, closed weekday, occupied slot, groups with enough capacity, empty list, max party size, past times of today
- [ ] T040 [US11] `backend/app/services/availability.py` with rules 1–8 of `data-model.md`, and `backend/app/schemas/reservation.py`
- [ ] T041 [US11] `GET /api/restaurants/{restaurant_id}/availability` and `/availability/tables` in `backend/app/api/reservation.py`, mounted in `app/api/__init__.py`; diner role only
- [ ] T042 [US10] Seating area selector per group in `frontend/src/pages/TableInventoryPage.tsx` with «Adentro», «Afuera» and «Terraza», and its test
- [ ] T017 and T018 (above): `make api-types`, swap `frontend/src/api/availability.ts` to the typed client for the group response, delete the fixture and the «Datos de prueba» label, update `ReservationPage.test.tsx`

### PR B — bookable restaurants for the diner (D4)

- [ ] T043 [P] Tests in `backend/tests/test_public_restaurants.py`: only bookable restaurants are listed, the detail includes the menu, unknown or not bookable answers `404`
- [ ] T044 `GET /api/restaurants` and `/api/restaurants/{restaurant_id}` in `backend/app/api/public_restaurant.py` per `contracts/restaurants-api.md`
- [ ] T045 `frontend/src/api/restaurants.ts`: fetch the bookable restaurants and map them into `RestaurantPublic`; the map, the list and the detail show them next to the fixtures; «Reservar mesa» only for real ones; tests in the map/list and detail test files

### PR C — US-13

- [ ] T046 [P] [US13] Backend tests in `backend/tests/test_reservation.py`: `test_us13_s2_…`, `test_us13_s4_…`, `test_us13_s5_…`, `test_us13_s6_…` and the edge tests of the plan's test map (409 for a full group, double booking in the database, double submit, invalid requests, 403 for restaurants, inventory change keeps booked tables)
- [ ] T047 [US13] `POST /api/reservations` and `GET /api/reservations?date=` in `backend/app/api/reservation.py` with rule 9 of `data-model.md`
- [ ] T048 [US13] Replace the stub in `backend/app/services/reservation_conflicts.py` with rule 11 (future reservations with `table_number` above the new quantity), keeping 004's interface plus `seating_area`
- [ ] T049 [US13] `make api-types`
- [ ] T050 [P] [US13] Frontend tests in `frontend/src/pages/ReservationPage.test.tsx`: `US-13 S1` to `S6` and the `409` edge, mocking `src/api/client`
- [ ] T051 [US13] Review step (`paso=revision`), confirmation, overlap warning and `409` handling in `frontend/src/pages/ReservationPage.tsx` and its CSS module, per the plan's US-13 design
- [ ] T052 Docs: `AGENTS.md` (endpoints, routes, the reservation flow), `docs/design/README.md` if a component changes, `specs/README.md` (005 row), and tell the owner of spec 003 that US-4 S3 can be tested

### After PR C

- [ ] T053 Production demo data: La Esquina de Palermo (Laura) with location, shifts and table groups; book a table as Martín and check it end to end ([quickstart.md](quickstart.md))

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
- **US-13 (28/10)**: PR A (T034–T042, T017–T018) and PR B (T043–T045) can run in parallel; PR C (T046–T052) needs PR A and, to be tried end to end, PR B. T053 needs everything merged and deployed.
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

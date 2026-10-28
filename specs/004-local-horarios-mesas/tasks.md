---

description: "Task list for restaurant profile, opening hours and table capacity"
---

# Tasks: Configuración de Local, Horarios y Capacidad por Mesas

**Input**: Design documents from `/specs/004-local-horarios-mesas/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`

**Tests**: Required. The project constitution requires at least one automated test
per acceptance scenario, named after its US and scenario. Backend tests use the
real PostgreSQL test fixture; frontend tests cover UI-only behavior.

**Organization**: One phase per user story, in spec priority order, so each
story can be implemented, tested and demoed independently.

## Phase 1: Setup

**Purpose**: Confirm the existing feature structure and prepare the files that
will be extended without adding dependencies or infrastructure.

- [X] T001 Confirm the `004-local-horarios-mesas` feature documents and existing restaurant authentication patterns before implementation in `specs/004-local-horarios-mesas/` and `backend/app/api/deps.py`
- [X] T002 [P] Create the feature backend test modules `backend/tests/test_restaurant_profile.py`, `backend/tests/test_opening_hours.py`, and `backend/tests/test_table_inventory.py` with the repository `client` fixture and US/scenario test names
- [X] T003 [P] Create the feature frontend page test files `frontend/src/pages/RestaurantProfilePage.test.tsx`, `frontend/src/pages/OpeningHoursPage.test.tsx`, and `frontend/src/pages/TableInventoryPage.test.tsx` with the existing Vitest and Testing Library setup

**Checkpoint**: Test and implementation paths are known; no new dependency is
needed.

---

## Phase 2: Foundational

**Purpose**: Add shared persistence and authenticated resource plumbing that
the three configuration stories require.

- [X] T004 Add profile fields, nullable `foto_url` URL, and coordinates to `backend/app/models/restaurant.py`, preserving existing access API names and enforcing latitude in `[-90, 90]` and longitude in `[-180, 180]`; do not add image-file storage
- [X] T005 [P] Add the `OpeningShift` SQLAlchemy model in `backend/app/models/opening_shift.py` with `day_of_week` in ISO range 1–7, required local `start_time`/`end_time`, default `active=true`, owner foreign key, and unique restaurant/day/start/end identity
- [X] T006 [P] Add the `TableInventoryGroup` SQLAlchemy model in `backend/app/models/table_inventory.py` with positive `capacity`, positive `quantity`, default `available=true`, and owner foreign key; model groups only and do not expose identifiers for physical tables
- [X] T007 Register the new SQLAlchemy models in `backend/app/models/__init__.py` and add named PostgreSQL checks, foreign keys, unique constraints, and nullable profile columns through `backend/migrations/versions/003_restaurant_configuration.py`
- [X] T008 Add shared request and response schemas for restaurant profile fields, nullable URL `foto_url`, coordinates, and validation rules in `backend/app/schemas/restaurant.py`
- [X] T009 Add the authenticated restaurant ownership and role checks for configuration routes in `backend/app/api/restaurant.py`, reusing `TokenClaimsDep` and repository-standard 401/403/404 responses
- [X] T010 Generate and review the Alembic migration with `make migration m="add restaurant configuration"` and verify existing restaurant rows remain valid in `backend/migrations/versions/`

**Checkpoint**: Database entities, constraints, schemas and protected route
plumbing are ready for independent story implementation.

---

## Phase 3: US-6 — Ingresar nombre y características

**Goal**: Let a restaurant owner view and save the public profile, preview a
geocoded address, and reject unresolved or invalid profile data without
persisting it.

**Independent Test**: Authenticate as a restaurant, save complete profile
information, retrieve it, preview a valid address, and verify that blank names
and unresolved addresses return Spanish errors without changing the profile.

### Tests for US-6

- [X] T011 [P] [US6] Implement `test_us6_s1_profile_information_is_saved_and_available` in `backend/tests/test_restaurant_profile.py`, covering name, description, cuisine, price range, URL `foto_url`, restriction tags, address and persisted coordinates
- [X] T012 [P] [US6] Implement `test_us6_s2_name_is_required` in `backend/tests/test_restaurant_profile.py`, asserting HTTP 400 for missing or blank `nombre`
- [ ] T013 [P] [US6] Implement `test_us6_s3_geocoded_location_is_previewed_before_saving` in `frontend/src/pages/RestaurantProfilePage.test.tsx`, asserting the preview appears before the save request and coordinates are submitted only after confirmation
- [ ] T013a [P] [US6] Implement `US-6 S1 saves and previews foto_url` in `frontend/src/pages/RestaurantProfilePage.test.tsx`, covering URL entry, payload submission and profile preview without file upload
- [ ] T013b [P] [US6] Implement `US-6 S1 displays foto_url` in the existing restaurant map/list test, asserting diners can see the persisted profile photo URL
- [X] T014 [P] [US6] Implement `test_us6_s4_unresolved_address_is_rejected_without_saving` in `backend/tests/test_restaurant_profile.py`, asserting the address-not-found error and unchanged stored profile
- [ ] T015 [P] [US6] Add the geocoder adapter contract test for valid results, empty results, unusable responses and explicit network failures in `backend/tests/test_restaurant_profile.py` or a focused geocoding test module

### Implementation for US-6

- [X] T016 [US6] Implement the Nominatim adapter in `backend/app/services/geocoding.py` with the configured locale, identifying User-Agent, at most one request per second, numeric coordinate range validation, and explicit service errors
- [X] T017 [US6] Add profile read, profile update, and geocoding-preview schemas in `backend/app/schemas/restaurant.py`, including nullable `foto_url`, requiring nonblank `nombre`, and requiring latitude and longitude together when coordinates are supplied
- [X] T018 [US6] Implement `GET /api/restaurante/perfil`, `PUT /api/restaurante/perfil`, and `POST /api/restaurante/perfil/geocodificar` in `backend/app/api/restaurant.py`; return 400 for invalid input, 409 when an unaccepted lookup result is submitted, and never geocode on read
- [X] T019 [US6] Add the restaurant profile configuration page in `frontend/src/pages/RestaurantProfilePage.tsx` and `frontend/src/pages/RestaurantProfilePage.module.css`, using the design system, Spanish validation messages, an accessible URL field and preview for `foto_url`, and a mobile-first geocoded map preview; do not implement multipart upload
- [X] T020 [US6] Add the US-6 configuration route and navigation entry in `frontend/src/router.tsx`; extend the existing restaurant discovery/map response only with `foto_url` and render it in the restaurant map/list surface
- [X] T021 [US6] Regenerate `frontend/src/api/openapi.json` and `frontend/src/api/schema.d.ts` with `make api-types` after the profile and geocoding endpoints are implemented

**Checkpoint**: US-6 is independently usable and its four acceptance
scenarios plus geocoder failures pass.

---

## Phase 4: US-8 — Definir horarios de atención

**Goal**: Let a restaurant owner replace its weekly opening shifts, accepting
valid same-day intervals and rejecting invalid or overlapping shifts.

**Independent Test**: Save multiple shifts for a weekday, retrieve normalized
shifts, and verify reversed, zero-length, overlapping and inactive-day
configurations behave as specified.

### Tests for US-8

- [X] T022 [P] [US8] Implement `test_us8_s1_opening_shifts_are_saved` in `backend/tests/test_opening_hours.py`, covering one or more valid shifts for a weekday
- [X] T023 [P] [US8] Implement `test_us8_s2_invalid_shift_intervals_are_rejected` in `backend/tests/test_opening_hours.py`, covering reversed, zero-length and overlapping shifts with HTTP 400 and no partial replacement
- [ ] T024 [P] [US8] Implement `test_us8_edge_shifts_crossing_midnight_follow_validation_rule` in `backend/tests/test_opening_hours.py`, asserting a shift with `end_time <= start_time` is rejected while adjacent shifts are accepted
- [ ] T025 [P] [US8] Implement `test_us8_s3_inactive_weekday_has_no_opening_shifts` in `backend/tests/test_opening_hours.py`, asserting an inactive weekday returns an empty list and no reservation window
- [ ] T026 [P] [US8] Add `US-8 S1`, `US-8 S2` and `US-8 S3` UI coverage in `frontend/src/pages/OpeningHoursPage.test.tsx` for editing shifts and showing Spanish API validation errors without losing entered fields

### Implementation for US-8

- [X] T027 [US8] Add opening-hours request and response schemas in `backend/app/schemas/opening_hours.py`, including ISO weekday 1–7 and required local start/end times
- [X] T028 [US8] Implement sorted half-open interval validation in `backend/app/services/opening_hours.py`, rejecting `end_time <= start_time` and overlap when `next.start < current.end` while allowing adjacent shifts
- [X] T029 [US8] Implement `GET /api/restaurante/horarios` and atomic `PUT /api/restaurante/horarios` in `backend/app/api/restaurant.py`, replacing the submitted weekly configuration only after all days validate
- [X] T030 [US8] Build `frontend/src/pages/OpeningHoursPage.tsx` and `frontend/src/pages/OpeningHoursPage.module.css` with weekday editing, multiple shifts, inactive-day handling, accessible controls, and mobile-first Spanish UI
- [X] T031 [US8] Add the US-8 route and restaurant configuration navigation in `frontend/src/router.tsx` and the existing restaurant home surface
- [X] T032 [US8] Regenerate `frontend/src/api/openapi.json` and `frontend/src/api/schema.d.ts` with `make api-types` after the opening-hours endpoints are implemented

**Checkpoint**: US-8 is independently usable; all shift interval and inactive
weekday scenarios pass without partial writes.

---

## Phase 5: US-10 — Definir inventario de mesas y capacidad

**Goal**: Let a restaurant owner replace grouped table inventory while making
one quantity slot from an available group with sufficient capacity eligible for
reservations and preventing changes that conflict with confirmed reservations.

**Independent Test**: Configure table groups, query free quantity by capacity,
exclude unavailable groups, and attempt a conflicting update to verify HTTP
409 and unchanged inventory.

### Tests for US-10

- [ ] T033 [P] [US10] Implement `test_us10_s1_available_table_with_sufficient_capacity_is_selectable` in `backend/tests/test_table_inventory.py`, asserting one available quantity slot from a group is eligible only when `capacity >= party_size` and capacities are never combined
- [ ] T034 [P] [US10] Implement `test_us10_s2_unavailable_table_groups_are_excluded` in `backend/tests/test_table_inventory.py`, asserting unavailable groups contribute zero free quantity while remaining stored
- [X] T035 [P] [US10] *(Renamed 28/10 to `test_us10_s3_reducing_booked_tables_is_rejected`, now with real reservations, spec 005.)* Implement `test_us10_s3_reducing_group_quantity_returns_conflict_without_mutation` in `backend/tests/test_table_inventory.py`, injecting the reservation conflict-check stub, asserting HTTP 409 includes affected reservation context and preserves the prior group quantity/availability
- [ ] T036 [P] [US10] Implement `test_us10_edge_table_update_is_transaction_safe` in `backend/tests/test_table_inventory.py`, covering row locking and the transaction boundary that prevents consuming the same group quantity twice; use the reservation conflict-check stub rather than physical table IDs
- [ ] T037 [P] [US10] Add `US-10` UI coverage in `frontend/src/pages/TableInventoryPage.test.tsx` for positive capacity/quantity validation, unavailable groups and Spanish conflict feedback

### Implementation for US-10

- [X] T038 [US10] Add table inventory request and response schemas in `backend/app/schemas/table_inventory.py`, requiring `capacity > 0`, `quantity > 0`, and `available`, with grouped `quantity`/`capacity` fields and no physical-table identifiers
- [X] T039 [US10] Implement group-quantity eligibility and selection in `backend/app/services/table_inventory.py`, consuming one available quantity slot only when the group's capacity is at least the requested party size and never combining capacities
- [X] T040 [US10] Implement transaction-safe inventory replacement in `backend/app/services/table_inventory.py`, locking affected group rows, invoking the replaceable reservation conflict-check stub, and leaving state unchanged on conflict
- [X] T041 [US10] Implement `GET /api/restaurante/mesas` and atomic `PUT /api/restaurante/mesas` in `backend/app/api/restaurant.py`, returning free table counts by group capacity and HTTP 409 with affected reservation context when the stub reports a conflict
- [X] T042 [US10] Build `frontend/src/pages/TableInventoryPage.tsx` and `frontend/src/pages/TableInventoryPage.module.css` with grouped `quantity`/`capacity` editing, availability controls, accessible validation and Spanish conflict messaging; do not label individual tables
- [X] T043 [US10] Add the US-10 route and restaurant configuration navigation in `frontend/src/router.tsx` and the existing restaurant home surface
- [X] T044 [US10] Regenerate `frontend/src/api/openapi.json` and `frontend/src/api/schema.d.ts` with `make api-types` after the table inventory endpoints are implemented

**Checkpoint**: US-10 is independently usable and enforces grouped capacity,
quantity availability, reservation conflict handling and transaction safety.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T045 [P] Update `backend/app/schemas/__init__.py`, `backend/app/services/__init__.py`, and any resource exports required by the new modules
- [ ] T046 [P] Verify all configuration endpoints use the restaurant token owner, reject diner tokens with 403, and do not accept a restaurant ID from request bodies in `backend/app/api/restaurant.py`
- [ ] T047 [P] Verify generated API documentation and TypeScript types match `specs/004-local-horarios-mesas/contracts/restaurant-configuration-api.md` and `specs/004-local-horarios-mesas/contracts/geocoding.md`
- [X] T048 Run `make format lint test` and fix only feature-related failures across `backend/` and `frontend`
- [X] T049 Run the focused backend and frontend commands from `specs/004-local-horarios-mesas/quickstart.md` and record any environment limitation without weakening the acceptance tests
- [X] T050 Review `specs/004-local-horarios-mesas/spec.md`, `plan.md`, `data-model.md`, `contracts/`, and this file for implementation drift and update the design documents before merging

---

## Dependencies & Execution Order

### Story completion order

```text
Phase 1 Setup
    ↓
Phase 2 Foundational
    ↓
US-6 (profile, geocoding)
    ↓
US-8 (opening hours)
    ↓
US-10 (table inventory)
    ↓
Phase 6 Polish
```

- **Phase 1** has no story dependency and establishes test paths.
- **Phase 2** blocks all stories because models, database constraints,
  schemas and authenticated ownership are shared prerequisites.
- **US-6**, **US-8** and **US-10** are independently testable after Phase 2.
  Their listed order follows spec priority and is the recommended delivery
  order; no story introduces reservation creation.
- **Within each story**: write failing scenario tests first, then implement
  the service and API, then the page and route, then regenerate the contract.
- **Phase 6** runs after all in-scope stories and includes the final validation.

### Parallel execution examples

```text
After Phase 1:
  T004 (restaurant model) || T005 (opening shift model) || T006 (table model)
  T002 (backend test modules) || T003 (frontend test modules)

After Phase 2:
  T011–T015 (US-6 tests) can be prepared in parallel
  T022–T026 (US-8 tests) can be prepared in parallel
  T033–T037 (US-10 tests) can be prepared in parallel

Within US-6:
  T016 (geocoder service) || T019 (profile page scaffold)
  T011–T015 (tests) before T017–T021 implementation/integration

Within US-8:
  T027 (schemas) || T030 (page scaffold)
  T022–T026 (tests) before T028–T032 implementation/integration

Within US-10:
  T038 (schemas) || T042 (page scaffold)
  T033–T037 (tests) before T039–T044 implementation/integration
```

## Implementation Strategy

1. **MVP first**: complete Phase 2 and US-6 so a restaurant can publish a
   profile and verify its address, including all four US-6 scenarios.
2. **Incremental delivery**: add US-8 as a separate weekly-hours increment,
   then US-10 as the capacity and inventory increment.
3. **Risk control**: keep PostgreSQL constraints, atomic replacement and the
   inventory transaction boundary in the backend; do not add reservation
   entities or endpoints before the reservation feature spec.
4. **Validation**: run the focused quickstart commands after each story, then
   run `make format lint test` and inspect generated API artifacts before merge.

## Notes

- Every task uses the required checklist format: checkbox, sequential task ID,
  optional `[P]`, required story label in story phases, and an explicit path.
- UI text and user-visible errors are Spanish; code, identifiers and technical
  documents remain English.
- Commit logical groups with the relevant US in the conventional commit
  message, for example `feat(US-6): configure restaurant profile`.

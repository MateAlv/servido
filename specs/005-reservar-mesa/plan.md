# Implementation Plan: Reservar Mesa (Crear Reserva y Confirmar Datos)

**Feature**: `specs/005-reservar-mesa` | **Date**: 2026-10-23, updated 2026-10-28 | **Spec**: [spec.md](spec.md) | **US**: US-11 (Sprint 2), US-13 (Sprint 3) | **Sprint**: 2–3

**Input**: Feature specification from `/specs/005-reservar-mesa/spec.md`

**Note**: Project template (overrides Spec Kit's default). Write this plan in English; `spec.md` stays in Spanish. Name domain concepts with the glossary in `AGENTS.md`. Project-wide values below are fixed by the ADRs in `docs/decisions/`; change them only with a new ADR.

## Summary

US-11 turns the restaurant detail into a booking flow: the diner picks a date, a time inside the restaurant's opening hours and a party size, sees the available time slots, picks a seating preference and the page reports whether a table is free for it (team decision of 23/10, following `prototipo-us11.html`: US-11 does not choose a concrete table; the table is assigned when the reservation is confirmed, in US-13). The party size is capped by the restaurant itself: the availability response reports `max_party_size`, the largest capacity among the restaurant's active tables (spec 004), so no one can select a group the restaurant cannot seat. The backend exposes two read-only availability endpoints; availability is computed live from the shifts and tables that spec 004 (US-8, US-10) owns, and from the reservations table, which is created here because availability must know which tables are taken. US-11 does not create reservations: per FR-011 and SC-005 a reservation exists only after the explicit confirmation of US-13. No caching, no background jobs, no new dependencies.

**Mock policy**: whenever a piece this flow needs is not implemented yet (shifts and tables from spec 004, an occupied slot that only US-13 could create), the screen is shown anyway with a **temporary mock** in `frontend/src/data/`, following the precedent of the seven fixture restaurants of spec 002. The mock mirrors the real contract in `contracts/availability-api.md`, is labelled «Datos de prueba» in the UI, is registered as a team decision in `specs/README.md`, and has its own removal task. Mocks live in the frontend only: no fake tables in the database, no fixture inside the backend, and nothing is mocked in production's data path once the real source exists.

## Update of 28/10: US-13, the backend of US-11 and real restaurants

Spec 004 (shifts and grouped tables) and the US-11 page are merged. US-13 needs three things that are not built yet: the `reservations` table, the real availability (the backend of US-11, deferred on 23/10) and a real restaurant the diner can reach (everything on the diner side still reads fixtures). The team took eight decisions on 28/10 before planning (D1–D10 in [research.md](research.md), pending PO). This section is the plan for all of it; the sections below keep describing US-11 as built.

### What changes

| # | Work | Why | Order |
| --- | --- | --- | --- |
| 1 | `seating_area` on the table groups of spec 004 (D3, D6): migration, model, `PUT /api/restaurante/mesas`, the selector in `TableInventoryPage` | US-11 S6 filters by seating area | 1 |
| 2 | `reservations` table (D1, D5, D7) in the same migration | Base of US-13 and of the rest of Sprint 3 | 1 |
| 3 | The two availability endpoints of US-11 over groups ([contracts/availability-api.md](contracts/availability-api.md)), with the deferred backend tests | The page stops using the fixture | 1 |
| 4 | Swap `frontend/src/api/availability.ts` to the typed client and delete the fixture (T017–T018) | No test data in the booking flow | 1 |
| 5 | `GET /api/restaurants` and `/{id}` ([contracts/restaurants-api.md](contracts/restaurants-api.md)); the map, list and detail add the bookable restaurants (D4) | A diner can reach a real restaurant | 2 |
| 6 | US-13 backend: `POST /api/reservations` and `GET /api/reservations?date=` ([contracts/reservations-api.md](contracts/reservations-api.md)) | The story | 3 |
| 7 | US-13 frontend: review step, confirmation, overlap warning, `409` handling | The story | 3 |
| 8 | Replace 004's conflict-check stub with the real rule (data-model, rule 11) | No future reservation left without a table | 3 |
| 9 | Demo data in production: La Esquina de Palermo with location, shifts and table groups; a real reservation by Martín | Sprint 3 defense | After merge |

Everything ships in **one PR** (team decision, 28/10): no intermediate state reaches production, where `main` deploys on every merge. Inside the PR the commits follow the order column: backend foundations, real restaurants and the switch of the US-11 page to the API, then US-13.

### US-13 design

- **Route**: the review is a step of the same page, `/reservar/:restauranteId?…&paso=revision`. «Siguiente» **pushes** `paso=revision` (so the phone's back button returns to the selection); «Volver» goes back. The selection stays in the URL, so going back keeps everything (S3) and a reload stays in the review. If on reload the chosen time or group is no longer offered, the page returns to the selection with the notice US-11 already shows.
- **Review** (S1, S2): restaurant name, date (long Spanish format), time range (start and start + 90 minutes), party size and the assigned table («Mesa para 4 · Terraza», D2), computed from the tables response with rule 8 of [data-model.md](data-model.md). Built with the existing `Card`, `Ticket`-like rows from the design system and `Button`; no new shared component unless the review turns out to be reused.
- **Overlap warning** (S6, D8): the review fetches `GET /api/reservations?date=` and shows a `StatusPill`/notice per overlapping reservation. The «Confirmar reserva» button stays enabled.
- **Confirmation** (S4, S5): only «Confirmar reserva» calls `POST /api/reservations`, with a `request_id` generated when the review opens; the button shows its loading state and is disabled while the request runs, and a retry reuses the same `request_id` (a repeat returns the same reservation). On `201`/`200` the page shows the confirmed reservation with the same data and a link to the home, replacing the URL so going back can't confirm again. Every `409` shows its message, returns to the selection with every value kept and refetches availability. A `401` (expired session) goes to `/ingresar?volver=<review URL>`; the login page learns to return to `volver` (only same-site paths) instead of always `/`. The redirect for a visitor without a session uses the same parameter.
- **Backend**: see the Design section below.
- **Restaurant side**: when `PUT /api/restaurante/mesas` answers `409`, `TableInventoryPage` lists the affected reservations (date, time, party size) instead of a generic error.

### Migration

One revision after `005_merge_feature_heads`: `CREATE EXTENSION IF NOT EXISTS btree_gist` (a trusted extension, so the database owner can create it); add `table_inventory.seating_area` (default `indoor` for existing rows, then the `CHECK`), swap the unique constraint to (restaurant, capacity, seating area); create `reservations` with its constraints and indexes. The model declares the same constraints in `__table_args__`, so `alembic check` in CI sees no drift. Production has no reservations yet, so nothing is backfilled.

## Technical Context

**Language/Version**: Python 3.12 (backend) · TypeScript (frontend)

**Primary Dependencies**: FastAPI, SQLAlchemy 2, Alembic, Pydantic · React, Vite, React Router, TanStack Query, openapi-fetch, the design system in `frontend/src/components/` (see `docs/design/README.md`)

**Storage**: PostgreSQL 17 in Docker (locally, in CI and on the production instance)

**Testing**: pytest against a real Postgres in `backend/tests/` · Vitest + Testing Library in `frontend/src/**/*.test.tsx`

**Target Platform**: Mobile-first web app: static SPA plus JSON API under `/api`

**Performance Goals**: None beyond the spec's SC-001 (a diner finishes the selection in under 3 minutes). Availability is one query per request; the app never has more than one concurrent user.

**Constraints**: Single AWS free-tier account; no new services, paid APIs or dependencies without justification. Datetimes stored in UTC, business rules in `America/Argentina/Buenos_Aires`.

**Scale/Scope**: 1 model (`reservations`) + 1 migration, 2 GET endpoints, 1 service module, 1 page (`/reservar/:restauranteId`), 1 availability client module with a temporary fixture, and 1 enabled button in the existing detail. The availability response gains one field (`max_party_size`); no new column stores it. No new shared components: the page reuses `Chip`, `Card`, `Button`, `QuantityStepper`, `StatusPill` and `Skeleton`.

**New dependencies**: None. The date field uses the native `<input type="date">` with `min` instead of a calendar library (see [research.md](research.md)).

**Open clarifications**: the six `[NEEDS CLARIFICATION]` items of the spec are handled as explicit assumptions; all of them stay pending with the PO (see `specs/README.md#pendientes-de-aclarar-con-la-po`). The maximum party size (FR-013) is a team decision of 23/10 recorded in `specs/README.md` and communicated to the PO. One additional question, raised while planning and not covered by the spec, is escalated in the same table:

| Spec item | Plan handles it as | Status |
| --- | --- | --- |
| Party size (`spec.md:51`) | The diner enters it, from 1 to `max_party_size` (the restaurant's maximum); only tables with `capacity >= party_size` are offered | Pending PO |
| **Maximum party size** (`spec.md` FR-013, added 23/10) | The restaurant defines it through its active tables: `max_party_size = max(capacity)` of its `active` tables (`0` if it has none). One reservation holds one table, so no group can be larger than the biggest table. No new column in `restaurantes`: a second restaurant-level number would duplicate what the tables already say and would need spec 004. The API reports the value and the UI caps the input; the confirmation (US-13) rejects a larger `party_size` with `409`, since the maximum can change during the review | Team decision 23/10; PO informed |
| Concrete table (`spec.md` Edge Cases) | US-11 does not pick one: the page informs whether a table is free for the chosen preference and the table is assigned when the reservation is confirmed (US-13). This still requires spec 004 to store **one row per physical table**, because the assignment and US-13's review name a single table | Team decision 23/10 (prototype); PO pending + 004 plan |
| Occupied slot (`spec.md:53`) | A slot is offered while at least one table with enough capacity is free for the whole 90-minute block; a slot with no free table is shown as not selectable | Pending PO |
| Granularity/duration (`spec.md:54`) | Starts every 30 minutes, fixed duration of 90 minutes; a start is offered only if the whole block fits inside the shift | Pending PO |
| Seating types (`spec.md:55`) | The restaurant defines them in 004 (`SeatingArea`: indoor / outdoor / terrace per glossary); "Sin preferencia" means no filter. The API returns the stored value and the UI maps it to a Spanish label | Pending PO |
| Approval (`spec.md:56`) | No approval; a confirmed reservation is final. Not exercised by US-11, which does not create reservations | Pending PO |
## Dependency on spec 004 (order preferred, mock while missing)

US-11 **consumes** shifts and tables; it does not define, create or duplicate them.

**Status (28/10)**: spec 004 is merged with grouped tables; see the update of 28/10 above. **Status (23/10)**: spec 004 had no `plan.md` and no `Shift`/`Table` models in `backend/app/models/`, so the checkpoint of `tasks.md` (T001) blocks the model, the migration and the two backend endpoints: they cannot query tables that do not exist and creating a second `tables` model would fork 004's scope. US-11 is therefore built on the mock path (T012–T013 and T019–T024); T014–T018 wait for 004, and the gap is recorded in `specs/README.md`.

| US-11 needs | Provided by | If it is not there yet |
| --- | --- | --- |
| Opening hours per weekday (start, end, active) | Spec 004, US-8 (`Shift`) | Mocked as shifts 12:00–15:00 and 20:00–23:30, Monday closed; the real endpoint is written as soon as 004 exists |
| Individual tables per restaurant: `capacity`, `seating_area`, `active`, `label` | Spec 004, US-10. The spec describes groups (capacity × count); this plan needs one row per physical table, which is the first item of the table above | Mocked with five tables, one of them inactive: 2 indoor for 2, 1 outdoor for 4, 1 terrace for 4 |
| Maximum party size = `max(capacity)` of the active tables | Spec 004, US-10 (derived, not a new column) | Mocked as `max_party_size: 4`, the capacity of the two 4-person tables |
| Occupied slots (a table that already has a reservation) | This feature's `reservations` table, written only by US-13 | The fixture marks one slot as `available: false` so S4 can be shown in the demo without inventing a write endpoint |
| Restaurant name for the page header | Spec 004, US-6 (`GET /api/restaurants/{id}`). Until it exists the page reads `frontend/src/data/restaurants.fixture.ts` through `fetchRestaurant`, as the detail does today (spec 002) | Already mocked by spec 002 |
| Table not available (`active = false`) discounts availability | Spec 004, US-10 S2 | Mocked: the fixture declares one inactive table that never appears in the list, the same rule the real query applies |

**Sequencing**: spec 004 should merge first, because the backend availability endpoints query its tables and cannot run without them. If 004 is late, the sprint still demos the flow: `frontend/src/api/availability.ts` serves the fixture while **both** the real query and the UI are ready, and the swap to the typed client (`api.GET('/api/restaurants/{id}/availability')`) is the only change the page needs — the same pattern `fetchRestaurants()` follows for the map since Sprint 1. The fixture is never the source of truth for the backend and never reaches the database.

**What the mock must not hide**: the backend tests never use it (they run against real PostgreSQL with tables created through 004's models), and it is deleted in the same PR that wires the real endpoints. Its presence is listed as a pending item in `specs/README.md` and as a removal task in `tasks.md`.

**Demo implication**: with the fixture, the Sprint 2 demo can show a full selection on the seven restaurants of spec 002, even though those restaurants are not in the database. With 004 merged, the demo uses a restaurant created through the app with its hours and tables loaded.

**Coordination with spec 003 (arrastre US-4 S3)**: this feature creates the first role-exclusive endpoints, so the `403` scenario of US-4 can finally be tested. That test belongs to spec 003 (`backend/tests/test_auth.py`), not to this feature; the owner of 003 is told when these endpoints merge.

## Design

### Data model (details in [data-model.md](data-model.md))

*(Rewritten 28/10: spec 004 stores tables as groups.)*

- `reservations`: `diner_id`, `restaurant_id`, the assigned group (`table_capacity`, `seating_area`) and `table_number` inside it (D1), `starts_at`, `ends_at` (set by the service, checked to be 90 minutes later), `party_size`, `status` (`confirmed` / `cancelled`), `request_id` (unique, double submit) and `created_at`.
- Anti-overbooking invariant in the database (risk 2): an exclusion constraint over the group, the table number and `tstzrange(starts_at, ends_at)` for confirmed reservations, with `btree_gist`.
- Table groups (spec 004) gain `seating_area`; their unique key becomes (restaurant, capacity, seating area).
- The maximum party size is not stored: `max(capacity)` over the restaurant's available groups.

### API

- US-11 reads ([contracts/availability-api.md](contracts/availability-api.md)): `GET /api/restaurants/{id}/availability` (slots, `max_party_size`) and `/availability/tables` (groups with their free count).
- US-13 ([contracts/reservations-api.md](contracts/reservations-api.md)): `POST /api/reservations` (the confirmation) and `GET /api/reservations?date=` (the diner's reservations of a day, for the overlap warning).
- Bookable restaurants ([contracts/restaurants-api.md](contracts/restaurants-api.md)): `GET /api/restaurants` and `/{id}`, public.
- The diner endpoints require a diner token: `401` without one, `403` for a restaurant account (US-4 S3), `404` for an unknown restaurant, `400` for malformed input, `409` for whatever stopped being possible during the review.

### Backend

- `backend/app/services/availability.py`: rules 1–13 of `data-model.md` (window, slots, free tables per group, assigned group, confirmation, inventory conflicts, `now`), shared by the reads and the confirmation.
- `backend/app/api/reservation.py`: the four diner endpoints; `backend/app/api/public_restaurant.py`: the two public ones; both mounted in `app/api/__init__.py`.
- `backend/app/schemas/reservation.py`: request and response models; messages in Spanish.
- `backend/app/services/reservation_conflicts.py`: the real inventory rule with the new interface (`session`, `seating_area`).

### Frontend

- Route `/reservar/:restauranteId` (`frontend/src/router.tsx`, lazy like the other pages) → `frontend/src/pages/ReservationPage.tsx` with its `.module.css` and `.test.tsx`.
- One page with three blocks instead of a wizard: (1) date (`<input type="date">` with `min` = today in Buenos Aires) and party size (`QuantityStepper` with `min={1}` and `max={max_party_size}`, plus a visible "Máximo N personas" hint, because the component defaults to `max={20}` and the restaurant's cap must win). Until the first availability response gives the cap, the stepper keeps `1` and its `+` is disabled, so the page never offers a party the restaurant has not confirmed it can seat; (2) time slots as `Chip`s (`aria-pressed`, `disabled` when `available` is false, labelled with a visible «Ocupado» so the state does not depend on color, and styled from the page's CSS Module through `Chip`'s `className` so the shared component does not change), (3) seating preference (`Chip` group: "Sin preferencia" + the areas present among the available tables, wrapped in a `role="group"` with `aria-label` and a single pressed chip, disabled and labelled «Sin mesas» when that area has no free table) and the availability message: "Hay mesa disponible para ese día y horario" or the empty state of S7 (team decision of 23/10, following `prototipo-us11.html`: no concrete table is chosen in US-11, so there is no table list and no "Elegir mesa" button; the table is assigned when the reservation is confirmed, US-13). `SegmentedControl` is not used for the preference because four labels do not fit at 360 px and it cannot wrap (see [research.md](research.md)). Below the three blocks, a **«Siguiente» `Button`** (`primary`, right-aligned, as in `prototipo-us11.html`) is the hand-off to the review of US-13: it stays disabled until the selection is complete (date, time and a free table for the party size and the preference) and does **not navigate yet**.
- **The selection lives in the URL**, not in `useState`: `/reservar/:restauranteId?fecha=2026-10-28&hora=20:00&personas=2&tipo=indoor`. The page derives the four values with `useSearchParams` (the same pattern as `?precio=` in `RestaurantExplorer.tsx`) and writes them with `replace: true`, so the browser history does not fill up with clicks. Reloading, going back or reopening the link keeps everything chosen; nothing is stored on the server and no row exists until US-13 confirms. The URL holds no table: which table is used is decided at confirmation.
  - Missing or invalid values are ignored (`personas` falls back to 1, `tipo` to "Sin preferencia", no date means no availability query and no time means no table query); the page never writes an invalid value to the URL.
  - `personas` above `max_party_size` is not accepted: once the availability response gives the cap, the page clamps the value to the cap with a notice («La capacidad máxima de este restaurante es de N personas.») and refetches. A hand-edited or stale link can never keep a group the restaurant cannot seat.
  - A `hora` that is not available in the response for the current date and party size is cleared with a notice («El horario de las HH:MM ya no está disponible. Elegí otro.»), so a hand-edited or stale link cannot keep an occupied time selected.
  - The helpers are local functions in `ReservationPage.tsx` (`selectionFromParams` / `paramsFromSelection`), as `tiersFromParams` is in `RestaurantExplorer.tsx`; no new module or dependency.
- Changing date or party size refetches the slots; changing date, time or party size refetches the tables (`TanStack Query`, keyed by the values each query uses). A time that is no longer available after a refetch is **cleared**, with a short notice (S5 and its edge case), and a seating preference with no table left in the new response goes back to "Sin preferencia" with a notice. Notices use the design system's `useToast`, not color alone.
- Empty state "No hay mesas disponibles para esta fecha y horario" with the controls still enabled (S7). When `max_party_size` is `0` (the restaurant has no active tables), the page says "El restaurante todavía no tiene mesas disponibles", hides the stepper (there is no valid party size) and disables the table list instead of pretending the day is closed.
- **Temporary mock** *(removed in the US-13 PR, T018)*: `frontend/src/api/availability.ts` exposes `fetchAvailability()` and `fetchAvailableTables()`. While spec 004 is missing they answer from `frontend/src/data/reservationAvailability.fixture.ts`; when the endpoints exist, the same two functions call the typed client and the fixture file is deleted. The page imports only these functions, so the swap touches one file. The page shows a `StatusPill` «Datos de prueba» while the fixture is in use, so the demo never looks like real data.
- A diner without a session is sent to `/ingresar`; a restaurant account is sent to its home (`/`), because the page is diner-only (the API would answer `403`). In the detail, the disabled "Reservar mesa" button becomes a link to this route only for a signed-in diner; visitors and restaurant accounts keep the "Próximamente" card (the detail belongs to 002; only that button changes).
- Mobile first at 360 px, labelled inputs, visible focus, Spanish (voseo) text, tokens from `tokens.css`. No entrance animation is added, so no `data-entrance` and no reduced-motion work beyond the existing components.
- Reuses the design system; no new shared component. The `Chip` row in `docs/design/README.md` is updated because it now also documents the single-choice slot and seating groups; no catalog entry or `/diseno` change is needed. If a component turns out to be shared, it is registered in both before the PR.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Pass |
| --- | --- | --- |
| I. Backlog-bound scope | Builds only US-11's scenarios of spec 005; no caching, queues, workers, flags or speculative abstractions; availability is computed per request. The temporary fixture is UI data with a removal task, not a second source of truth | [x] |
| II. Spec before code | Spec validated by the PO; every open clarification is an explicit assumption above and stays in the PO table; the sprint-scope question is escalated instead of decided by the agent. The mock is recorded as a team decision in `specs/README.md`, like the fixtures of spec 002 | [x] |
| III. Every scenario tested | S1–S7 appear in the test map; the no-double-booking invariant is a database constraint with a test; the party-size cap (FR-013) has backend and frontend tests | [x] |
| IV. Humans own AI output | Two read endpoints, one model, one page; nothing outside the glossary or the existing patterns | [x] |
| V. Simple, cheap, conventional | Standard stack, no new dependency, native date input, existing design-system components | [x] |

## Acceptance Scenario → Test Map

| Scenario | Test | Layer |
| --- | --- | --- |
| US-11 S1 — choose date, time and seating preference | `frontend/src/pages/ReservationPage.test.tsx` › `US-11 S1 offers date, time and seating preference` | Frontend |
| US-11 S2 — past dates are not selectable | `ReservationPage.test.tsx` › `US-11 S2 does not allow a past date` · `backend/tests/test_reservation.py::test_us11_s2_rejects_past_date` | Both |
| US-11 S3 — only dates and times inside opening hours | `backend/tests/test_reservation.py::test_us11_s3_returns_only_slots_inside_shifts` and `test_us11_s3_returns_no_slots_on_a_closed_weekday` | Backend |
| US-11 S4 — an occupied slot cannot be selected | `ReservationPage.test.tsx` › `US-11 S4 disables an occupied time` · backend twin in `test_reservation.py` | Both |
| US-11 S5 — changing date or time updates the tables | `ReservationPage.test.tsx` › `US-11 S5 asks again for the tables when the time changes` and `US-11 S5 clears a time that is no longer available and keeps the date` | Frontend |
| US-11 S6 — the seating preference offers the tables of that type | `ReservationPage.test.tsx` › `US-11 S6 shows only the tables of the chosen seating area` · backend twin in `test_reservation.py` | Both |
| US-11 S7 — no availability is informed and the choice can change | `ReservationPage.test.tsx` › `US-11 S7 informs there are no tables and keeps the controls usable` · backend twin in `test_reservation.py` | Both |
| FR-013 — the restaurant defines the maximum party size | `ReservationPage.test.tsx` › `US-11 edge caps the party size at the restaurant maximum`; backend twins `test_us11_edge_returns_the_restaurant_max_party_size` and `test_us11_edge_returns_no_max_without_active_tables` in `test_reservation.py` | Both |
| Edge — a party above the restaurant maximum is never offered | `backend/tests/test_reservation.py::test_us11_edge_offers_no_slots_above_the_restaurant_maximum` | Backend |
| Edge — today with times already past | `test_us11_edge_does_not_offer_past_times_of_today` | Backend |
| Edge — restaurant without shifts or tables | `test_us11_edge_returns_no_slots_without_shifts`, `test_us11_edge_returns_no_max_without_active_tables` | Backend |
| Edge — two overlapping reservations for one table | `test_us11_edge_database_rejects_overlapping_reservations` → replaced by `test_us13_edge_database_rejects_a_double_booking` | Backend |
| Edge — one table holding two reservations counts once | `test_reservation.py::test_us11_edge_one_table_with_two_reservations_counts_once` (a 19:00 and a 21:00 on table 1 leave a 20:00 slot free while table 2 is free) | Backend |
| Edge — wrong role, no token, unknown restaurant | `ReservationPage.test.tsx` › `US-11 edge sends a visitor to the sign-in page`, `US-11 edge sends a restaurant account back home` and `US-11 edge offers the reserve link to a diner only` (the API twins are deferred) | Both |
| Edge — invalid date, party size or start time | `backend/tests/test_reservation.py::test_us11_edge_rejects_an_invalid_request` | Backend |
| Edge — the URL keeps the selection | `ReservationPage.test.tsx` › `US-11 edge keeps the selection when the page reloads` | Frontend |
| Edge — invalid value in the URL | `ReservationPage.test.tsx` › `US-11 edge ignores an invalid value in the URL` | Frontend |
| US-13 S1 — the selection can be reviewed before confirming | `frontend/src/pages/ReservationPage.test.tsx` › `US-13 S1 opens the review with the selection` | Frontend |
| US-13 S2 — the review shows restaurant, date, time, party size and the assigned table | `ReservationPage.test.tsx` › `US-13 S2 shows every chosen value and the assigned table` · `backend/tests/test_reservation.py::test_us13_s2_tables_endpoint_lists_groups_smallest_first` | Both |
| US-13 S3 — going back keeps the selection | `ReservationPage.test.tsx` › `US-13 S3 goes back with the selection kept` | Frontend |
| US-13 S4 — no confirmation, no reservation | `ReservationPage.test.tsx` › `US-13 S4 creates nothing until the diner confirms` (opening, reloading and leaving the review never call the POST) | Frontend |
| US-13 S5 — explicit confirmation creates a confirmed reservation | `test_reservation.py::test_us13_s5_confirmation_creates_a_confirmed_reservation` · `ReservationPage.test.tsx` › `US-13 S5 confirms and shows the reservation` | Both |
| US-13 S6 — an overlapping reservation is warned about and can still be confirmed | `test_reservation.py::test_us13_s6_lists_the_diner_reservations_of_the_day`, `test_us13_s6_overlapping_reservation_can_still_be_confirmed` (also at the same restaurant and start) · `ReservationPage.test.tsx` › `US-13 S6 warns about an overlapping reservation and still confirms` | Both |
| Edge — a table taken meanwhile answers 409 and keeps the selection | `test_reservation.py::test_us13_edge_full_group_answers_409` · `ReservationPage.test.tsx` › `US-13 edge returns to the selection when the table was taken` | Both |
| Edge — the database rejects a double booking | `test_reservation.py::test_us13_edge_database_rejects_a_double_booking` | Backend |
| Edge — a repeated confirmation creates one reservation | `test_reservation.py::test_us13_edge_repeated_request_returns_the_same_reservation` | Backend |
| Edge — a diner only sees their own reservations | `test_reservation.py::test_us13_edge_lists_only_the_diner_reservations` | Backend |
| Edge — what changed during the review answers 409 | `test_reservation.py::test_us13_edge_changes_during_the_review_answer_409` (time passed, group disabled, shift removed, maximum lowered) | Backend |
| Edge — an expired session returns to the review after signing in | `ReservationPage.test.tsx` › `US-13 edge returns to the review after signing in again` · `LoginPage.test.tsx` › `US-13 edge goes back to the page it came from` | Frontend |
| Edge — malformed requests answer 400 | `test_reservation.py::test_us13_edge_rejects_malformed_requests` | Backend |
| Edge — restaurants and other diners can't use the diner endpoints | `test_reservation.py::test_us13_edge_restaurant_token_gets_403` (also US-4 S3) | Backend |
| Edge — a restaurant can't remove, shrink or change a booked group (D9) | `test_reservation.py::test_us13_edge_inventory_change_keeps_booked_tables` · `TableInventoryPage.test.tsx` › `US-10 S3 lists the reservations that block the change` | Both |
| D3 — table groups carry a seating area | `backend/tests/test_table_inventory.py::test_us10_s1_groups_have_a_seating_area` · `TableInventoryPage.test.tsx` › `US-10 S1 saves the seating area of each group` | Both |
| D4 — only bookable restaurants are listed | `backend/tests/test_public_restaurants.py::test_lists_only_bookable_restaurants`, `test_detail_includes_the_menu` | Backend |

**Deferred means**: spec 004 has no `Shift`/`Table` models yet, so the endpoints (T014–T016) and their backend tests (T006–T011) are on hold per the T001 checkpoint; they are the first thing to build once 004 merges. **Update (28/10)**: spec 004 is merged, so these backend tests are written in the US-13 PR (T039; see the update of 28/10).

Success criteria SC-001 (under 3 minutes) is checked in the PO demo; SC-002, SC-003, SC-004 and SC-005 are covered by the scenario and edge tests above (SC-005 by the absence of any write endpoint in US-11).

Frontend tests replace `frontend/src/api/availability.ts` — the page's only data seam — with a small deterministic double (the same shape as the contract), because while the fixture exists that module is what stands between the page and the API. After T018 wires the typed client, the tests mock `src/api/client` like the other pages (`AGENTS.md`), so the same UI rules — past dates, disabled slots, refreshed tables, seating filter, empty state, party-size cap — stay covered without spec 004. Backend tests never use the fixture: they create a restaurant, shifts and tables through 004's models against the real database.

## Project Structure

### Documentation (this feature)

```text
specs/005-reservar-mesa/
├── spec.md                  # Spanish, validated by the PO
├── plan.md                  # This file
├── research.md              # Decisions and rejected alternatives
├── data-model.md            # Entities, columns, constraints
├── quickstart.md            # How to try the flow locally
├── contracts/availability-api.md  # US-11 reads
├── contracts/reservations-api.md  # US-13 confirmation and the diner's day
├── contracts/restaurants-api.md   # Bookable restaurants (D4)
└── tasks.md                 # /speckit-tasks output
```

### Source Code (repository root)

```text
backend/
├── app/models/reservation.py           # + Reservation model
├── app/models/__init__.py              # ~ import it so Alembic sees it
├── migrations/versions/006_reservations.py  # + seating_area on table groups, reservations, btree_gist
├── app/schemas/reservation.py          # + availability responses
├── app/services/availability.py        # + slots and free tables
├── app/api/reservation.py              # + availability reads, the diner's day, POST /reservations
├── app/api/public_restaurant.py        # + GET /restaurants and /restaurants/{id} (D4)
├── app/services/reservation_conflicts.py  # ~ real inventory conflict rule (replaces 004's stub)
├── app/models/table_inventory.py       # ~ seating_area
├── app/api/__init__.py                 # ~ mount the router
└── tests/test_reservation.py           # + US-11 scenarios and edge cases
frontend/
├── src/api/openapi.json, schema.d.ts   # ~ make api-types
├── src/api/availability.ts             # + fetches availability (fixture while 004 is missing)
├── src/data/reservationAvailability.fixture.ts  # + temporary mock of the contract, deleted when 004 merges
├── src/pages/ReservationPage.tsx       # + with ReservationPage.module.css and .test.tsx; ~ review and confirmation (US-13)
├── src/pages/TableInventoryPage.tsx    # ~ seating area per group (D3)
├── src/api/restaurants.ts              # + bookable restaurants, mapped to the map's shape (D4)
├── src/pages/RestaurantDetailPage.tsx  # ~ enable the "Reservar mesa" button
└── src/router.tsx                      # ~ add /reservar/:restauranteId
```

**Structure Decision**: only the existing layout. Models, schemas, service, router, migration and tests follow the backend conventions; the page and the one modified button follow the frontend ones. Nothing is added to `src/components/` because the page composes existing design-system pieces.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. The exclusion constraint is not extra complexity: it is the only way to enforce SC-003 and risk 2 at the database level with a 30-minute grid and a 90-minute duration. A `UNIQUE` on the start was rejected because it still allows a 12:00 and a 12:30 reservation on the same table.

## Risks

| Risk | Mitigation |
| --- | --- |
| Spec 004 is not merged and the real endpoints cannot query anything | Its `plan.md` and models are still missing (23/10), so this is the path taken for Sprint 2: the flow is demoed with `reservationAvailability.fixture.ts`, the fixture is deleted in the PR that wires the real endpoints, and `tasks.md` tracks that removal |
| The mock outlives the feature and becomes a second source of truth | It lives in one file, is labelled «Datos de prueba», is not used by backend tests, and is listed in `specs/README.md` as pending |
| A hand-edited or stale link keeps an occupied time or a party above the cap | The availability response is the source: an unavailable `hora` is cleared with a notice, a `personas` above `max_party_size` is clamped, and US-13 revalidates availability on confirmation |
| The diner never learns which table was assigned | The assignment happens at confirmation (US-13); its review screen must show the assigned table before the diner commits |
| The PO confirms 004 keeps table *groups* instead of individual tables | Individual tables stop being possible; while the PO answers, the fixture shows individual tables and the assumption is escalated before the real query is written |
| The PO/PM expects the reservation to be created in Sprint 2 | Escalated; if they confirm, US-13 moves part of its scope into Sprint 2 and this plan is updated first. The mock never fakes a created reservation |
| A diner asks for a group the restaurant cannot seat (an unbounded stepper) | `max_party_size` comes from the active tables in the availability response, the stepper's `max` uses it, the URL value is clamped with a notice, and US-13 rejects a larger `party_size` with `409` |
| The PO rejects one of D1–D10 | Each decision is local: D2 is the review text, D8 one notice, D5 two constants; D1 and D3 are the only schema ones and are recorded before any data exists in production |
| A restaurant re-saves its tables while a diner confirms | The confirmation reads the group `FOR SHARE`; the inventory update locks the groups `FOR UPDATE` and runs the conflict rule, so one waits for the other |
| Availability rules drift between US-11 and US-13 | Both call `app/services/availability.py`; US-13 revalidates with the same function inside its transaction |

# Implementation Plan: Reservar Mesa (Crear Reserva y Confirmar Datos)

**Feature**: `specs/005-reservar-mesa` | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md) | **US**: US-11 (this sprint)| **Sprint**: 2

**Input**: Feature specification from `/specs/005-reservar-mesa/spec.md`

**Note**: Project template (overrides Spec Kit's default). Write this plan in English; `spec.md` stays in Spanish. Name domain concepts with the glossary in `AGENTS.md`. Project-wide values below are fixed by the ADRs in `docs/decisions/`; change them only with a new ADR.

## Summary

US-11 turns the restaurant detail into a booking flow: the diner picks a date, a time inside the restaurant's opening hours and a party size, sees the available time slots, picks a seating preference and the page reports whether a table is free for it (team decision of 23/10, following `prototipo-us11.html`: US-11 does not choose a concrete table; the table is assigned when the reservation is confirmed, in US-13). The party size is capped by the restaurant itself: the availability response reports `max_party_size`, the largest capacity among the restaurant's active tables (spec 004), so no one can select a group the restaurant cannot seat. The backend exposes two read-only availability endpoints; availability is computed live from the shifts and tables that spec 004 (US-8, US-10) owns, and from the reservations table, which is created here because availability must know which tables are taken. US-11 does not create reservations: per FR-011 and SC-005 a reservation exists only after the explicit confirmation of US-13. No caching, no background jobs, no new dependencies.

**Mock policy**: whenever a piece this flow needs is not implemented yet (shifts and tables from spec 004, an occupied slot that only US-13 could create), the screen is shown anyway with a **temporary mock** in `frontend/src/data/`, following the precedent of the seven fixture restaurants of spec 002. The mock mirrors the real contract in `contracts/availability-api.md`, is labelled «Datos de prueba» in the UI, is registered as a team decision in `specs/README.md`, and has its own removal task. Mocks live in the frontend only: no fake tables in the database, no fixture inside the backend, and nothing is mocked in production's data path once the real source exists.

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
| **Maximum party size** (`spec.md` FR-013, added 23/10) | The restaurant defines it through its active tables: `max_party_size = max(capacity)` of its `active` tables (`0` if it has none). One reservation holds one table, so no group can be larger than the biggest table. No new column in `restaurantes`: a second restaurant-level number would duplicate what the tables already say and would need spec 004. The API reports the value and the UI caps the input; the write path (US-13) rejects a larger `party_size` with `400` | Team decision 23/10; PO informed |
| Concrete table (`spec.md` Edge Cases) | US-11 does not pick one: the page informs whether a table is free for the chosen preference and the table is assigned when the reservation is confirmed (US-13). This still requires spec 004 to store **one row per physical table**, because the assignment and US-13's review name a single table | Team decision 23/10 (prototype); PO pending + 004 plan |
| Occupied slot (`spec.md:53`) | A slot is offered while at least one table with enough capacity is free for the whole 90-minute block; a slot with no free table is shown as not selectable | Pending PO |
| Granularity/duration (`spec.md:54`) | Starts every 30 minutes, fixed duration of 90 minutes; a start is offered only if the whole block fits inside the shift | Pending PO |
| Seating types (`spec.md:55`) | The restaurant defines them in 004 (`SeatingArea`: indoor / outdoor / terrace per glossary); "Sin preferencia" means no filter. The API returns the stored value and the UI maps it to a Spanish label | Pending PO |
| Approval (`spec.md:56`) | No approval; a confirmed reservation is final. Not exercised by US-11, which does not create reservations | Pending PO |
## Dependency on spec 004 (order preferred, mock while missing)

US-11 **consumes** shifts and tables; it does not define, create or duplicate them.

**Status (23/10)**: spec 004 has no `plan.md` and no `Shift`/`Table` models in `backend/app/models/`, so the checkpoint of `tasks.md` (T001) blocks the model, the migration and the two backend endpoints: they cannot query tables that do not exist and creating a second `tables` model would fork 004's scope. US-11 is therefore built on the mock path (T012–T013 and T019–T024); T014–T018 wait for 004, and the gap is recorded in `specs/README.md`.

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

- `reservations` (new, English table name per glossary): `id`, `diner_id` → `comensales`, `restaurant_id` → `restaurantes`, `table_id` → `tables` (004), `starts_at` (timestamptz, UTC), `ends_at` (generated: `starts_at + 90 minutes`), `party_size`, `created_at`.
- Anti-overbooking invariant in the database (risk 2): `EXCLUDE USING gist (table_id WITH =, tstzrange(starts_at, ends_at) WITH &&)`, which needs the `btree_gist` extension. A plain `UNIQUE (table_id, starts_at)` is not enough: with a 30-minute grid and a 90-minute duration, 12:00 and 12:30 overlap.
- No `status` column yet: US-11 never writes a reservation and `status` only exists to distinguish confirmed/cancelled, which arrives with US-13. It is added in that migration, together with the write endpoint.
- `seating_area` and `capacity` live in 004's `Table`; this feature only reads them.
- The maximum party size is not stored: it is `max(capacity)` over the restaurant's `active` tables (`0` when there are none), computed by the service on each request. It is the largest group a single table can seat, and the spec assumes one table per reservation.

### API (details in [contracts/availability-api.md](contracts/availability-api.md))

Both endpoints are `GET`, require a diner token (`TokenClaimsDep`, role `diner`) and answer `403` to a restaurant account, `401` without a valid token, `404` for an unknown restaurant and `400` for invalid input (malformed query parameters, a past date or start, `party_size < 1`).

1. `GET /api/restaurants/{restaurant_id}/availability?date=YYYY-MM-DD&party_size=N`
   Returns `max_party_size` (the restaurant's cap, `0` when it has no active tables), `open` (whether that weekday has active shifts) and `slots`, one entry per 30-minute start with `start_time` and `available`. Past starts (today) are not returned; starts outside the shifts are not returned; a start whose 90-minute block does not fit inside the shift is not returned. A `party_size` above `max_party_size` is a valid read: the response carries the cap and no slots, and the page clamps the value and explains it, so the diner can never keep a group the restaurant cannot seat.
2. `GET /api/restaurants/{restaurant_id}/availability/tables?date=YYYY-MM-DD&start_time=HH:MM&party_size=N`
   Returns the tables that are `active`, have `capacity >= party_size` and have no overlapping reservation. Each entry carries `id`, `label`, `capacity` and `seating_area`. The seating preference filters this list in the UI, so the page needs one request per date and time, not one per preference. Above `max_party_size` the list is empty, as in S7.

No write endpoint in US-11. The eventual `POST /api/reservations` (US-13) revalidates availability inside the same transaction, rejects `party_size > max_party_size` with `400` and relies on the exclusion constraint to answer `409` when the table was taken meanwhile.

### Backend

- `backend/app/services/availability.py`: slot generation for a date, the restaurant's `max_party_size`, timezone handling (`ZoneInfo("America/Argentina/Buenos_Aires")` → UTC), and the "is this table free for this block" query. Rules outgrow the router, so they live in a service that the tests and US-13's confirmation share.
- `backend/app/api/reservation.py`: the two endpoints, mounted in `app/api/__init__.py`.
- `backend/app/schemas/reservation.py`: response models. Validation errors surface as `400` through the existing handler; messages are in Spanish.
- Queries use `select()` with the overlap predicate `starts_at < :end AND ends_at > :start`, filtered by `table_id`/`restaurant_id` and ordered by start time.

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
- **Temporary mock**: `frontend/src/api/availability.ts` exposes `fetchAvailability()` and `fetchAvailableTables()`. While spec 004 is missing they answer from `frontend/src/data/reservationAvailability.fixture.ts`; when the endpoints exist, the same two functions call the typed client and the fixture file is deleted. The page imports only these functions, so the swap touches one file. The page shows a `StatusPill` «Datos de prueba» while the fixture is in use, so the demo never looks like real data.
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
| US-11 S2 — past dates are not selectable | `ReservationPage.test.tsx` › `US-11 S2 does not allow a past date`; the backend twin `test_us11_s2_rejects_past_date` waits for the endpoints (spec 004 missing) | Frontend (backend deferred) |
| US-11 S3 — only dates and times inside opening hours | `backend/tests/test_reservation.py::test_us11_s3_returns_only_slots_inside_shifts` and `test_us11_s3_returns_no_slots_on_a_closed_weekday` (deferred with the endpoints; the fixture already answers closed for Mondays) | Backend (deferred) |
| US-11 S4 — an occupied slot cannot be selected | `ReservationPage.test.tsx` › `US-11 S4 disables an occupied time`; backend twin deferred | Frontend (backend deferred) |
| US-11 S5 — changing date or time updates the tables | `ReservationPage.test.tsx` › `US-11 S5 asks again for the tables when the time changes` and `US-11 S5 clears a time that is no longer available and keeps the date` | Frontend |
| US-11 S6 — the seating preference offers the tables of that type | `ReservationPage.test.tsx` › `US-11 S6 shows only the tables of the chosen seating area`; backend twin deferred | Frontend (backend deferred) |
| US-11 S7 — no availability is informed and the choice can change | `ReservationPage.test.tsx` › `US-11 S7 informs there are no tables and keeps the controls usable`; backend twin deferred | Frontend (backend deferred) |
| FR-013 — the restaurant defines the maximum party size | `ReservationPage.test.tsx` › `US-11 edge caps the party size at the restaurant maximum`; backend twins `test_us11_edge_returns_the_restaurant_max_party_size` and `test_us11_edge_returns_no_max_without_active_tables` deferred | Frontend (backend deferred) |
| Edge — a party above the restaurant maximum is never offered | `backend/tests/test_reservation.py::test_us11_edge_offers_no_slots_above_the_restaurant_maximum` (deferred) | Backend (deferred) |
| Edge — today with times already past | `test_us11_edge_does_not_offer_past_times_of_today` (deferred) | Backend (deferred) |
| Edge — restaurant without shifts or tables | `test_us11_edge_returns_no_slots_without_shifts`, `test_us11_edge_returns_no_max_without_active_tables` (deferred) | Backend (deferred) |
| Edge — two overlapping reservations for one table | `test_us11_edge_database_rejects_overlapping_reservations` (deferred with the `reservations` table) | Backend (deferred) |
| Edge — wrong role, no token, unknown restaurant | `ReservationPage.test.tsx` › `US-11 edge sends a visitor to the sign-in page`, `US-11 edge sends a restaurant account back home` and `US-11 edge offers the reserve link to a diner only` (the API twins are deferred) | Frontend (backend deferred) |
| Edge — invalid date, party size or start time | `backend/tests/test_reservation.py::test_us11_edge_rejects_an_invalid_request` (deferred) | Backend (deferred) |
| Edge — the URL keeps the selection | `ReservationPage.test.tsx` › `US-11 edge keeps the selection when the page reloads` | Frontend |
| Edge — invalid value in the URL | `ReservationPage.test.tsx` › `US-11 edge ignores an invalid value in the URL` | Frontend |

**Deferred means**: spec 004 has no `Shift`/`Table` models yet, so the endpoints (T014–T016) and their backend tests (T006–T011) are on hold per the T001 checkpoint; they are the first thing to build once 004 merges.

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
├── contracts/availability-api.md  # Endpoints, payloads, status codes
└── tasks.md                 # /speckit-tasks output
```

### Source Code (repository root)

```text
backend/
├── app/models/reservation.py           # + Reservation model
├── app/models/__init__.py              # ~ import it so Alembic sees it
├── migrations/versions/003_add_reservations.py  # + make migration m="add reservations"
├── app/schemas/reservation.py          # + availability responses
├── app/services/availability.py        # + slots and free tables
├── app/api/reservation.py              # + the two GET endpoints
├── app/api/__init__.py                 # ~ mount the router
└── tests/test_reservation.py           # + US-11 scenarios and edge cases
frontend/
├── src/api/openapi.json, schema.d.ts   # ~ make api-types
├── src/api/availability.ts             # + fetches availability (fixture while 004 is missing)
├── src/data/reservationAvailability.fixture.ts  # + temporary mock of the contract, deleted when 004 merges
├── src/pages/ReservationPage.tsx       # + with ReservationPage.module.css and .test.tsx
├── src/pages/RestaurantDetailPage.tsx  # ~ enable the "Reservar mesa" button
└── src/router.tsx                      # ~ add /reservar/:restauranteId
```

**Structure Decision**: only the existing layout. Models, schemas, service, router, migration and tests follow the backend conventions; the page and the one modified button follow the frontend ones. Nothing is added to `src/components/` because the page composes existing design-system pieces.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. The exclusion constraint is not extra complexity: it is the only way to enforce SC-003 and risk 2 at the database level with a 30-minute grid and a 90-minute duration. The simpler `UNIQUE (table_id, starts_at)` was rejected because it still allows a 12:00 and a 12:30 reservation on the same table.

## Risks

| Risk | Mitigation |
| --- | --- |
| Spec 004 is not merged and the real endpoints cannot query anything | Its `plan.md` and models are still missing (23/10), so this is the path taken for Sprint 2: the flow is demoed with `reservationAvailability.fixture.ts`, the fixture is deleted in the PR that wires the real endpoints, and `tasks.md` tracks that removal |
| The mock outlives the feature and becomes a second source of truth | It lives in one file, is labelled «Datos de prueba», is not used by backend tests, and is listed in `specs/README.md` as pending |
| A hand-edited or stale link keeps an occupied time or a party above the cap | The availability response is the source: an unavailable `hora` is cleared with a notice, a `personas` above `max_party_size` is clamped, and US-13 revalidates availability on confirmation |
| The diner never learns which table was assigned | The assignment happens at confirmation (US-13); its review screen must show the assigned table before the diner commits |
| The PO confirms 004 keeps table *groups* instead of individual tables | Individual tables stop being possible; while the PO answers, the fixture shows individual tables and the assumption is escalated before the real query is written |
| The PO/PM expects the reservation to be created in Sprint 2 | Escalated; if they confirm, US-13 moves part of its scope into Sprint 2 and this plan is updated first. The mock never fakes a created reservation |
| A diner asks for a group the restaurant cannot seat (an unbounded stepper) | `max_party_size` comes from the active tables in the availability response, the stepper's `max` uses it, the URL value is clamped with a notice, and US-13 rejects a larger `party_size` with `400` |
| Availability rules drift between US-11 and US-13 | Both call `app/services/availability.py`; US-13 revalidates with the same function inside its transaction |

# Research: reservar mesa (US-11)

## Decision: US-11 stops at the table selection; nothing is written

US-11's scenarios end with "elegir una preferencia de tipo de mesa y completar la selección con datos válidos"; the only scenario that confirms a reservation is US-13 S5, and FR-011/SC-005 forbid creating one without an explicit confirmation.

**Consequence**: the feature ships two read-only endpoints and the page collects date, time, party size, seating preference and table. `reservations` is created now because availability must know which tables are taken, but no endpoint writes it.

**Escalated**: `docs/product/plan.md` promises that the diner "crea una reserva" in Sprint 2. The plan keeps the spec rule and asks the PO/PM; if they confirm that creation belongs to Sprint 2, US-13 moves forward and the plan changes first (spec before code).

**Alternatives considered**: creating the reservation at the end of the selection and adding a `pending` status — rejected because SC-005 counts "0 reservas creadas sin confirmación" and US-13 S4 requires that no reservation exists before the explicit action.

## Decision: availability computed per request, no cache

**Rationale**: the app never has more than one concurrent user (constitution I), and an occupancy cache would be the only reason to invalidate it. Two indexed queries answer both endpoints.

**Alternatives considered**: materialised slot table or a background job that refreshes availability — rejected as speculative infrastructure.

## Decision: block overlaps in the database with an exclusion constraint

*(Revised 28/10: tables are groups, see D1 below.)*

`EXCLUDE USING gist (restaurant_id WITH =, table_capacity WITH =, seating_area WITH =, table_number WITH =, tstzrange(starts_at, ends_at) WITH &&) WHERE (status = 'confirmed')`, with `ends_at` set by the service to `starts_at + 90 minutes` and checked to be after `starts_at`.

**Rationale**: risk 2 and SC-003 require the database itself to reject a double booking, and the constitution makes that invariant a constraint, not a Python check. With a 30-minute grid and a 90-minute duration, a `UNIQUE` on the start still accepts 12:00 and 12:30 on the same table.

**Why `ends_at` is not a generated column**: PostgreSQL only accepts immutable expressions in generated columns, and `timestamptz + interval` is not immutable. The service sets it and a `CHECK` keeps it after the start.

**Cost**: the migration runs `CREATE EXTENSION IF NOT EXISTS btree_gist` (shipped with PostgreSQL, no cost, no new service).

**Alternatives considered**: a Python check before insert (racy, and the constitution requires the constraint); storing a fixed slot number (forces a 90-minute grid); a partial unique index (cannot express a range).

## Decision: 30-minute starts, 90-minute duration, block must fit inside the shift

This is the spec's proposal for its open edge case, kept as an explicit assumption pending with the PO.

**Rationale**: a fixed duration makes the overlap predicate trivial and the table reusable afterwards. Requiring the block to fit inside the shift avoids defining what happens with a reservation that outlives the kitchen's closing time; it is the simplest rule that can be explained in one sentence and tested with two cases.

**Alternatives considered**: letting a reservation start anywhere inside the shift and extend past it — needs an extra rule ("the table stays busy after closing") with no scenario asking for it.

## Decision: two GET endpoints, seating preference filtered in the UI

**Rationale**: the seating preference does not change what the backend must return; one request per date and time serves every preference, and the diner can switch from "Adentro" to "Sin preferencia" without a round trip (S6, S5).

**Alternatives considered**: a `seating_area` query parameter on the tables endpoint — more requests and a second code path for the same rule.

## Decision: native date input instead of a calendar library

`<input type="date">` with `min` set to today in Buenos Aires (S2), plus a server-side rejection of past dates so the rule does not live only in the browser.

**Rationale**: no new dependency (constitution V), accessible by default, and the mobile browsers of the personas show their own picker.

**Alternatives considered**: a custom calendar grid (more code, more accessibility work, no scenario requires a particular calendar look); `react-day-picker` or similar (new dependency with no justification).

## Decision: the selection lives in the URL, not in component state

`/reservar/:restauranteId?fecha=&hora=&personas=&tipo=`, read with `useSearchParams` and written with `replace: true`. (The first version of this plan also carried `mesa=`; it is gone since the 23/10 decision that US-11 does not choose a concrete table.)

**Rationale**: reloading or going back would otherwise lose everything the diner had chosen, and there is no server state to keep it in: US-11 writes nothing. The price filter already uses this pattern (`tiersFromParams` in `RestaurantExplorer.tsx`), so it is the same concept with the same tools, and US-13 S3 ("volver atrás y los datos ya elegidos se conservan") comes for free. Invalid or missing values are ignored locally, so a hand-edited URL never preselects something the availability response does not offer.

**Alternatives considered**: component state (loses the selection on reload, and the demo breaks if the browser refreshes); `sessionStorage` (survives a reload but needs expiry rules and a second source of truth); a draft row in `reservations` (would need a write endpoint in US-11, cleanup of abandoned drafts, and contradicts SC-005).

## Decision: reuse the design system, add no component

The page composes `Card` (the three blocks), `Chip` (time slots and seating preference), `QuantityStepper` (party size), `StatusPill` (the «Datos de prueba» label while the fixture answers) and `Skeleton` (loading).

**Rationale**: the components already cover every pattern the screen needs, and `AGENTS.md` asks to extend the catalog only when something is genuinely new. No new component is added; the `Chip` row in `docs/design/README.md` is updated to mention the single-choice groups, and `/diseno` needs no new entry. If a component later turns out to be shared with the restaurant calendar (US-18), it is extracted then.

## Decision: the restaurant's largest active table sets the maximum party size

`max_party_size = max(capacity)` over the restaurant's `active` tables, returned by the availability endpoint; the stepper's `max` is that value and the URL value above it is clamped with a notice.

**Rationale**: the spec assumes one table per reservation, so a group bigger than the biggest table cannot be seated; the restaurant already expresses its capacity when it loads its tables (spec 004, US-10), and a second restaurant-level number would duplicate that rule. Deriving it keeps the read endpoints read-only and needs no migration, no new model and no new field in `restaurantes`.

**Rejected alternatives**: a fixed system limit (the `QuantityStepper` default is 20, which has nothing to do with the restaurant); a `max_party_size` column in `restaurantes` (a second source of truth for the same capacity, and spec 004's scope); accepting any number and answering "no tables" (the diner can ask for 50 in a 4-table restaurant, which FR-013 forbids); rejecting the read request with `400` (the page would not know the cap on a hand-edited link, so it could not clamp or explain it; the deferred write path is where a `400` belongs).

## Decision: chips for time slots and seating preference, not `SegmentedControl`

**Rationale**: `SegmentedControl` is the design system's single-choice control, but it is a one-row grid with `white-space: nowrap` and four labels ("Sin preferencia", "Adentro", "Afuera", "Terraza") do not fit at 360 px. `Chip` wraps, already supports `aria-pressed`, and is used for filters elsewhere. The seating group is wrapped in `role="group"` with an `aria-label` and only one chip is pressed; the time slots use the same chip with a visible «Ocupado» label when they are not available, so the state is not conveyed by color only. The occupied chip's disabled look is page CSS through `Chip`'s `className`, so the shared component and the design catalog stay unchanged.

## Decision: English table and column names for the new table

`reservations` with `diner_id`, `restaurant_id`, `table_id`, `party_size`. The Spanish names of `comensales`/`restaurantes` stay because they are the documented exception for the access API (team decision, 21/10); new code follows the glossary.

## Decision: US-11 does not choose a concrete table (23/10)

The page reports whether a table is free for the chosen date, time, party size and seating preference («Hay mesa disponible…», or the empty state of S7, and «Sin mesas» on the preference with no free table). The table itself is assigned when the reservation is confirmed, in US-13, and its review screen shows it. Follows `prototipo-us11.html`, the prototype the team used for this screen.

**Rationale**: US-11's scenarios never require picking a row, and the concrete choice would ask the diner for an identifier the restaurant does not expose (labels are not unique). The assignment can be made at confirmation, where availability is revalidated anyway (FR-012), and US-13 S2 already expects to *show* the table rather than to have it pre-chosen.

**Alternatives considered**: a "Elegir mesa" list with `?mesa=<uuid>` in the URL — it was planned in the first version of `plan.md` and dropped with this decision, because it adds a selection the prototype does not have and a stale link could preselect a taken table; informing nothing and assigning silently — rejected because S6/S7 must tell the diner whether the preference has a table.

**Consequences**: the URL is `?fecha=&hora=&personas=&tipo=` (no `mesa`); the tables endpoint response is informational; `reservations.table_id` is filled by the confirmation path of US-13, not by the diner. Still pending with the PO.

## Decision: temporary frontend mock for anything not implemented yet

`frontend/src/api/availability.ts` + `frontend/src/data/reservationAvailability.fixture.ts` answer the two availability calls while spec 004 or the endpoints are missing. The fixture mirrors `contracts/availability-api.md`, reports `max_party_size: 4`, one slot is already occupied so S4 can be shown, one terrace table is taken at 21:00 so S7 can be shown, and the UI carries a «Datos de prueba» pill.

**Rationale**: the sprint has to demo the flow even if 004 arrives late, and the team already accepted this pattern for the seven restaurants of spec 002 (team decision of 21/10: fixtures in `frontend/src/data/` until the endpoint exists). Putting it in one module means the swap to the typed client touches one file, and the page never imports fixture data directly.

**What it must not do**: fake a created reservation (that behavior belongs to US-13 and needs the real constraint), write to the database, live in the backend, or survive the PR that wires the real endpoints.

**Alternatives considered**: a backend endpoint that returns invented availability — rejected because it would ship fake business data behind the real API and could reach production; a SQL seed of shifts and tables — rejected because it needs 004's models (the same dependency) and would leave mock rows in the database; a `localStorage` flag — more moving parts than a module constant.

## Dependency: spec 004 owns shifts and tables

US-11 reads `tables` (capacity, seating area, active) and the shifts from 004. Duplicating them here — or falling back to a fixture — would create two sources of truth for the same product rule. If 004 is not merged, this feature waits.

## Decisions of 28/10 for US-13 (team, pending PO)

Taken by the team before planning US-13, once spec 004 and US-11 were merged. They are recorded in `specs/README.md` and wait for the PO.

### D1. A reservation names its table as (group, number), not by id

The table groups of spec 004 are deleted and recreated every time the restaurant saves them, so their `id` is not stable. A reservation stores the group's identity (`restaurant_id`, `table_capacity`, `seating_area`) plus `table_number`, which of the group's `quantity` tables it takes. The number is internal: spec 004 says tables have no visible identity, and the diner never sees it.

**Rationale**: the exclusion constraint needs something to compare per table; the number gives it without changing 004 into individual tables, and it survives the restaurant re-saving its groups.

**Alternatives considered**: counting the overlapping reservations of a group under a row lock (works, but the "no double booking" rule would live in Python, against AGENTS.md); one row per physical table in 004 (rewrites 004's model, API and screen).

### D2. "La mesa asignada" is the group: «Mesa para 4 · Terraza»

The review shows the smallest group of the chosen seating area that seats the party; with «Sin preferencia», the smallest of any area (ties: indoor, outdoor, terrace). The confirmation sends that group and the service takes its lowest free table number.

**Rationale**: the review can show the assigned table before confirming (US-13 S2) while the concrete table is picked at confirmation (decision of 23/10). The smallest fitting group keeps big tables for big parties.

### D3 and D6. Table groups get a seating area from a fixed catalog

`seating_area` in `indoor`, `outdoor`, `terrace` (the glossary's `SeatingArea`), one per group; existing groups become `indoor`. The unique key of a group becomes (restaurant, capacity, seating area).

**Rationale**: US-11 S6 filters by seating area, which real data could not answer. A fixed catalog keeps the filter, the labels and the constraint simple; free text per restaurant would make all three dynamic.

### D4. Real restaurants reach the diner next to the test ones

`GET /api/restaurants` and `GET /api/restaurants/{id}` list the bookable restaurants (coordinates, an active shift, an available table group). The map, the list and the detail add them to the fixtures of spec 002; only real ones can be booked.

**Rationale**: without it no diner can reach a restaurant that has shifts and tables, so no real reservation can exist. Replacing every fixture needs ratings, occupancy and reviews that don't exist yet; that stays with spec 002.

### D5. 90-minute reservations, offered every 30 minutes

Unchanged from the spec's proposal, which the US-11 page already uses.

### D7. A reservation is confirmed on creation

`status` starts as `confirmed`; `cancelled` arrives with cancellations (Sprint 3). No story asks the restaurant to approve.

### D8. Overlapping reservations of one diner: warn, don't block

The review reads the diner's reservations of that day (`GET /api/reservations?date=`) and warns about any overlap; the diner can still confirm. Added to US-13 as scenario 6 and, in the backlog, as a criterion of US-13.

**Rationale**: blocking would invent a product rule; a warning prevents the obvious mistake (booking twice by accident) and leaves the decision to the diner.

### Inventory changes stop at booked tables

The conflict-check stub of spec 004 is replaced: lowering a group's quantity below the number of a future confirmed reservation of that group (or removing or disabling the group) answers `409` and lists the reservations. Renumbering reservations to make room was rejected: it would move a confirmed diner to another table behind their back, and the rule "you can't remove a booked table" is easy to explain.

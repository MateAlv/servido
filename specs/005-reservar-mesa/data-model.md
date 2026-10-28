# Data model: reservar mesa (US-11, US-13)

Two groups of tables:

- **Owned by spec 004** (US-8, US-10): the opening shifts (`turnos`) and the table groups (`table_inventory`). This feature reads them; the only change it asks of 004 is the `seating_area` of each group (team decision of 28/10, below).
- **Owned by this feature**: `reservations`. US-11 only reads it to compute availability; US-13 writes it when the diner confirms.

Decisions of 28/10 (team, pending PO) that shape this model: D1 how a reservation identifies its table, D2 what "la mesa asignada" is, D3 the seating area of each group, D5 90-minute reservations every 30 minutes, D6 a fixed catalog of seating areas, D7 a reservation is confirmed on creation, D8 overlapping reservations of one diner are warned about, not blocked. Rationale in [research.md](research.md).

## Provided by spec 004 (consumed here)

### Table groups (`table_inventory`) — spec 004, US-10

One row is a group of equivalent tables: `quantity` tables of `capacity` seats in one `seating_area`.

| Column | Type | Null | Constraints / behavior |
| --- | --- | --- | --- |
| `id` | UUID | no | Primary key. **Not stable**: `PUT /api/restaurante/mesas` deletes and recreates every group, so nothing may reference it |
| `restaurant_id` | UUID | no | FK → `restaurantes.id_restaurante` |
| `capacity` | `INTEGER` | no | `> 0` |
| `quantity` | `INTEGER` | no | `> 0` |
| `seating_area` | `VARCHAR(20)` | no | **New (D3, D6)**: `CHECK (seating_area IN ('indoor', 'outdoor', 'terrace'))`. The migration sets `indoor` on existing rows |
| `available` | `BOOLEAN` | no | Default `TRUE`; `FALSE` removes the group from availability (US-10 S2) |

The group's stable identity is **(restaurant, capacity, seating area)**: the unique constraint changes from `(restaurant_id, capacity)` to `(restaurant_id, capacity, seating_area)`.

### Shift (`turnos`) — spec 004, US-8

`restaurant_id`, `day_of_week` (ISO 1 = Monday … 7 = Sunday), `start_time`, `end_time`, `active`. Shifts do not cross midnight (004 rejects `end_time <= start_time`).

## Owned by this feature

### `reservations` (Reserva)

Model: `backend/app/models/reservation.py`. Created by one migration after `005_merge_feature_heads`, together with the `seating_area` column of 004.

| Column | Type | Null | Constraints / behavior |
| --- | --- | --- | --- |
| `id` | UUID | no | Primary key |
| `diner_id` | UUID | no | FK → `comensales.id_comensal`, `ON DELETE RESTRICT` |
| `restaurant_id` | UUID | no | FK → `restaurantes.id_restaurante`, `ON DELETE RESTRICT` |
| `table_capacity` | `INTEGER` | no | Capacity of the assigned group; `CHECK (table_capacity > 0)` |
| `seating_area` | `VARCHAR(20)` | no | Seating area of the assigned group; same `CHECK` as `table_inventory` |
| `table_number` | `INTEGER` | no | Which table of the group, from 1 to the group's `quantity` when booked. **Internal**: never shown (spec 004, FR-005); `CHECK (table_number > 0)` |
| `party_size` | `INTEGER` | no | `CHECK (party_size > 0 AND party_size <= table_capacity)` |
| `starts_at` | `TIMESTAMPTZ` | no | Start of the block, UTC |
| `ends_at` | `TIMESTAMPTZ` | no | `starts_at + 90 minutes`, set by the service; `CHECK (ends_at > starts_at)`. Not a generated column: `timestamptz + interval` is not immutable, and PostgreSQL only accepts immutable expressions there |
| `status` | `VARCHAR(20)` | no | `confirmed` or `cancelled`, `CHECK`, default `confirmed` (D7). Only `confirmed` exists until cancellations (Sprint 3) |
| `created_at` | `TIMESTAMPTZ` | no | Default `CURRENT_TIMESTAMP` |

Constraints and indexes:

- `ex_reservations_table_no_overlap` (D1, risk 2, SC-003): `EXCLUDE USING gist (restaurant_id WITH =, table_capacity WITH =, seating_area WITH =, table_number WITH =, tstzrange(starts_at, ends_at) WITH &&) WHERE (status = 'confirmed')`. Two confirmed reservations can never hold the same table of a group at overlapping times; a cancelled one frees it. Needs `CREATE EXTENSION IF NOT EXISTS btree_gist` (bundled with PostgreSQL; `downgrade()` leaves it).
- `uq_reservations_confirmed_once` (double submit): unique index on `(diner_id, restaurant_id, starts_at) WHERE status = 'confirmed'`. A second confirmation of the same reservation cannot create another row.
- `ix_reservations_restaurant_id_starts_at` for the availability queries, and `ix_reservations_diner_id_starts_at` for the overlap warning.

Not added yet: order links, deposit, payment, arrival or prep times (later specs).

## Rules (single source: `backend/app/services/availability.py`)

1. **Window**: the requested BA date becomes `[date 00:00, date+1 00:00)` in `America/Argentina/Buenos_Aires`, compared in UTC.
2. **Open**: the weekday is open if it has an active shift; otherwise `open = false` and no slots.
3. **Candidate starts** (D5): every 30 minutes from each shift's start while `start + 90 minutes <= end`. Starts already past (today) are dropped.
4. **Maximum party size**: `max(capacity)` over the restaurant's `available` groups, `0` without any.
5. **Free tables of a group at a block**: `quantity` minus the confirmed reservations of that group (same capacity and seating area) that overlap the block (`starts_at < block_end AND ends_at > block_start`).
6. **Slot available**: at least one `available` group with `capacity >= party_size` has a free table.
7. **Table groups for a start** (`/availability/tables`): every `available` group with `capacity >= party_size` and at least one free table, with its free count, ordered by `capacity` then `seating_area`.
8. **Assigned table** (D2, FR-014): the group with the smallest `capacity` among those of rule 7, filtered by the chosen seating area; with "Sin preferencia", ties go `indoor`, `outdoor`, `terrace`. The page computes it from rule 7's list to show it in the review, and sends it in the confirmation.
9. **Confirmation** (US-13, inside one transaction):
   1. Revalidate the request: date and start on the grid, inside a shift, not in the past; `party_size <= max_party_size`; the chosen group exists, is `available` and `capacity >= party_size`. Read the group `FOR SHARE`, so a concurrent `PUT /api/restaurante/mesas` waits.
   2. Pick the lowest `table_number` in `1..quantity` with no overlapping confirmed reservation of that group. None free → `409`.
   3. Insert with `status = 'confirmed'`. If a concurrent confirmation took the same table, the exclusion constraint fails → `409`; if the same diner submitted twice, the unique index fails → `409`.
10. **Overlap warning** (D8, US-13 S6): the review lists the diner's confirmed reservations of that day and flags any that overlaps the chosen block. It never blocks the confirmation.
11. **Inventory changes** (replaces the conflict-check stub of spec 004): when `PUT /api/restaurante/mesas` lowers a group's `quantity` to `Q` (removing it or marking it unavailable means `Q = 0`), it conflicts if a future confirmed reservation of that group has `table_number > Q`. The conflict lists those reservations, answers `409` and changes nothing.

## Invariants and their tests

- No two confirmed reservations on one table of a group at overlapping times: the exclusion constraint (`test_us13_edge_database_rejects_a_double_booking`).
- One confirmation cannot create two reservations: the unique index (`test_us13_edge_double_submit_creates_one_reservation`).
- No reservation outside the shifts, in the past or for a party above the maximum: the service, `400` (`test_us13_edge_rejects_…`).
- A restaurant cannot leave a future reservation without a table: the inventory check (`test_us13_edge_inventory_change_keeps_booked_tables`).

## Where the selection lives

Until the diner confirms, the selection lives in the URL of `/reservar/:restauranteId` (`?fecha=&hora=&personas=&tipo=`): nothing is stored on the server, and going back from the review keeps every value (US-13 S3). The confirmation request carries it whole, plus the group shown in the review.

## Real and test restaurants (D4)

Only restaurants stored in the database can be booked. A restaurant is **bookable** when it has coordinates, at least one active shift and at least one available table group. The map and the detail show bookable restaurants next to the test restaurants of spec 002 (`frontend/src/data/restaurants.fixture.ts`), which keep their «Próximamente» booking card. The reservation fixture (`reservationAvailability.fixture.ts`) is deleted when the availability endpoints are wired.

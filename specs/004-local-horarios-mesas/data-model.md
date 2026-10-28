# Data model

## Restaurant profile (`restaurantes`)

The existing one-to-one restaurant account remains the owner. Extend it with:

| Field | Type | Rules |
| --- | --- | --- |
| `descripcion` | `text` nullable | Optional public description |
| `tipo_cocina` | `varchar` nullable | Optional cuisine type |
| `rango_precio` | `varchar` nullable | Optional price range |
| `foto_url` | `text` nullable | Optional URL entered by the restaurant; no image file is uploaded or stored by this MVP; returned to diners and shown from the restaurant map |
| `restricciones_tags` | `text[]` nullable | Declared dietary restriction tags |
| `latitud` | numeric decimal nullable | Required together with `longitud` after successful geocoding |
| `longitud` | numeric decimal nullable | Required together with `latitud` after successful geocoding |

Reuse the existing address/name columns and preserve the existing access API
names (`nombre`, `direccion`, `tipo_comida`) where compatibility requires it.
The profile update must reject a blank `nombre`; latitude and longitude must
be within `[-90, 90]` and `[-180, 180]`.

## Opening shift (`turnos`)

| Field | Type | Rules |
| --- | --- | --- |
| `id` | UUID | Primary key |
| `restaurant_id` | UUID FK | Required owner |
| `day_of_week` | smallint | ISO weekday 1–7 (Monday–Sunday) |
| `start_time` | time | Required local time |
| `end_time` | time | Required and strictly later than start |
| `active` | boolean | Defaults true |

The service sorts active shifts for a restaurant/day and rejects any
`current.end_time > next.start_time`; adjacent shifts are allowed. An
inactive weekday has no active shifts and produces no reservation windows.
The database enforces valid weekday bounds, and uniqueness prevents duplicate
rows with the same owner/day/start/end.

## Table inventory group (`table_inventory`)

Each row represents a group of physically equivalent individual tables. The
group is the complete inventory representation: `quantity` means “there are X
tables of `capacity` seats”. Tables have no unique or physical identifiers and
there is no “Table 1” or “Table 2” in the domain or API. Any database row
identity used internally identifies the group record, not an individual table.

| Field | Type | Rules |
| --- | --- | --- |
| `restaurant_id` | UUID FK | Required owner |
| `capacity` | integer | Greater than 0 (the API also caps it at 100); capacity of each table in the group |
| `quantity` | integer | Greater than 0 (the API also caps it at 200); number of individual tables in the group |
| `seating_area` | varchar(20) | *(Added 28/10 by spec 005, migration `006_reservations`.)* `indoor`, `outdoor` or `terrace`; existing groups became `indoor` |
| `available` | boolean | Defaults true for every table in the group |

Unique key *(since 28/10)*: (`restaurant_id`, `capacity`, `seating_area`), which is the group's identity: `PUT /api/restaurante/mesas` deletes and recreates the rows, so nothing references their `id`. A save accepts at most 50 groups.

For a reservation for `N` people, one available quantity slot in a group is
eligible only when `capacity >= N`. The algorithm must decrement the
available quantity for that group for the requested restaurant and time slot.
It must not add capacities across multiple groups to seat one reservation or
create an identifier for the consumed slot.

An unavailable group contributes no eligible tables, while its rows remain
stored. Updates lock the restaurant's inventory rows and check confirmed
reservations of the affected group before changing availability or quantity.
A conflict leaves the previous state unchanged.

*(Replaced 28/10 by spec 005, decision D9.)* The check is real now:
`check_reservation_conflict(session, restaurant_id, capacity, seating_area, new_quantity, now)`
conflicts when a confirmed reservation of that group that hasn't ended holds a
table numbered above the new quantity (removing, disabling or changing the
group means 0). See rule 11 of `specs/005-reservar-mesa/data-model.md`.

## Relationships

```text
Restaurant 1 ── * OpeningShift
Restaurant 1 ── * TableInventoryGroup
Restaurant 1 ── 1 PublicProfile (same restaurantes row)
```

Reservations were deliberately not added here. *(28/10: spec 005 added the
`reservations` table; a reservation names its table by the group's identity
plus an internal number, D1, so no physical table identifier was introduced.
The tests now use real reservations instead of the stub.)*

## Migration and integrity

Create one Alembic revision after the existing restaurant migrations. Add
named checks for coordinate ranges, weekday range, positive per-table
capacity and positive quantity, plus foreign keys and unique constraints.
Existing
restaurant rows must remain valid: new profile fields, `foto_url`, and
coordinates are nullable until the owner completes US-6.

# Availability API contract (US-11, read by US-13)

Base path: `/api`. Both endpoints are read-only: the reservation is created only by the confirmation of US-13 (FR-011, SC-005).

## Authentication and roles

- Requires a Bearer token (`TokenClaimsDep`, `app/api/deps.py`).
- `401` without a valid token: `{"detail": "Tu sesión no es válida o venció. Volvé a ingresar."}`.
- `403` when the token belongs to a restaurant account (US-4 S3): `{"detail": "Esta acción es solo para comensales."}`.

## Shared rules

- `date` is a calendar date in `America/Argentina/Buenos_Aires`, format `YYYY-MM-DD`. A past date answers `400`.
- `start_time` is a local time in `America/Argentina/Buenos_Aires`, format `HH:MM`. A start in the past (today) answers `400`.
- `party_size` is an integer `>= 1`. The restaurant's maximum is `max_party_size`: the capacity of its largest `available` table group (`0` when it has none). The read endpoints report it; a group above it is never offered (see below), and the confirmation (`POST /api/reservations`) answers `409`, because the maximum can change during the review. A `date` more than 60 days ahead answers `400` (decision D10). `party_size < 1` answers `400`.
- Duration is fixed at 90 minutes; starts are on a 30-minute grid. A start is only offered if the whole block fits inside the shift (see `data-model.md`).
- `404` when the restaurant does not exist: `{"detail": "No encontramos ese restaurante."}`.
- `400` for invalid input. Two shapes:
  - A malformed or missing query parameter (bad date/time format, `party_size < 1`) uses the project's standard validation shape: `{"detail": [{"loc": [...], "msg": "...", ...}]}`. FastAPI writes some of those `msg` texts in English; the page never shows them and uses its own Spanish copy.
  - A business rejection (a past date or start, a date beyond 60 days) is a plain `{"detail": "<Spanish message>"}`.
- Suggested messages for the business rejections: `"No podés reservar en una fecha pasada."`, `"Ese horario ya pasó."` and, in the confirmation, `"El grupo supera la capacidad máxima del restaurante."`. The frontend shows its own copy, so the tests assert the status code.

## Maximum party size

The restaurant defines the largest group it accepts through its tables: `max_party_size = max(capacity)` over the `available` table groups, `0` when there is none. One reservation holds one table, so this is also the largest group the flow can seat. The response of the slots endpoint always carries it, so the page can bound the party-size input before it asks for anything else. The read endpoint answers a larger `party_size` with `200`, the cap and no availability (it creates nothing); the UI clamps the value and explains it, and the US-13 confirmation answers `409`.

## `GET /restaurants/{restaurant_id}/availability`

Time slots of one day.

### Query parameters

| Name | Type | Required | Notes |
| --- | --- | --- | --- |
| `date` | `date` | yes | Requested day; not in the past |
| `party_size` | `int` | yes | `>= 1`. Above the restaurant's `max_party_size` the response has the cap and no slots (not an error) |

### `200 OK`

```json
{
  "restaurant_id": "6f1c…",
  "date": "2026-10-28",
  "open": true,
  "duration_minutes": 90,
  "max_party_size": 4,
  "seating_areas": ["indoor", "terrace"],
  "slots": [
    { "start_time": "20:00", "available": true },
    { "start_time": "20:30", "available": false },
    { "start_time": "21:00", "available": true }
  ]
}
```

- `seating_areas` lists, in catalog order, the areas where the restaurant has available table groups. The page offers only those (plus «Sin preferencia»): it never shows an area the restaurant doesn't have.
- `max_party_size` is the largest capacity among the restaurant's active tables (`0` when it has none); it is the largest group the restaurant accepts.
- `open` is `false` when the weekday has no active shift; `slots` is then empty.
- `available` is `false` when no table with `capacity >= party_size` is free for the whole block. The slot is still returned so the UI can show it as not selectable (S4).
- A `party_size` above `max_party_size` returns `open` as the shifts say, the cap, and `slots: []`; the UI clamps the value and explains the cap. When `max_party_size` is `0`, the restaurant has no tables yet and the slots are empty too.
- Slots in the past (today) are not returned.
- Times are local to `America/Argentina/Buenos_Aires`; the database stores UTC.

## `GET /restaurants/{restaurant_id}/availability/tables`

Table groups that can host the party at one specific start. Tables are stored as groups (spec 004: `quantity` tables of `capacity` seats in one `seating_area`), so the answer lists groups with their free count, never individual tables (team decision of 28/10).

### Query parameters

| Name | Type | Required | Notes |
| --- | --- | --- | --- |
| `date` | `date` | yes | Requested day; not in the past |
| `start_time` | `time` | yes | Must be one of the slots returned above, on the 30-minute grid and not in the past |
| `party_size` | `int` | yes | `>= 1`. Above the restaurant's `max_party_size` the list is empty |

### `200 OK`

```json
{
  "restaurant_id": "6f1c…",
  "date": "2026-11-02",
  "start_time": "20:00",
  "ends_at": "2026-11-02T21:30:00-03:00",
  "tables": [
    { "capacity": 4, "seating_area": "indoor", "free": 2 },
    { "capacity": 4, "seating_area": "terrace", "free": 1 },
    { "capacity": 6, "seating_area": "indoor", "free": 1 }
  ]
}
```

- `tables` holds every `available` group with `capacity >= party_size` and at least one free table at that block, ordered by `capacity`, then `seating_area` (`indoor`, `outdoor`, `terrace`).
- The page filters it by the seating preference (one request serves every preference) and proposes the **assigned table** for the review: the first entry of the filtered list, which is the smallest group that fits (`data-model.md`, rule 8).
- An empty list is a valid answer (`200`): there is no availability (S7). The UI informs it and keeps the controls usable.
- A `start_time` outside the shifts, off the grid or in the past answers `400`.
- `seating_area` values follow the glossary: `indoor`, `outdoor`, `terrace`. The UI shows «Adentro», «Afuera» and «Terraza».

## Frontend data source

`frontend/src/api/availability.ts` exposes `fetchAvailability()` and `fetchAvailableTables()`. They answered from `frontend/src/data/reservationAvailability.fixture.ts` while spec 004 was missing; T018 switches them to the typed client (`api.GET('/api/restaurants/{restaurant_id}/availability', …)`) and deletes the fixture and the «Datos de prueba» label in the same PR.

## Not in this contract

- Creating the reservation and the diner's reservations for the overlap warning: [reservations-api.md](reservations-api.md) (US-13).
- Bookable restaurants for the map and the page header: [restaurants-api.md](restaurants-api.md).
- Opening hours and table groups CRUD: spec 004 (US-8, US-10).

# Availability API contract (US-11)

Base path: `/api`. Both endpoints are read-only: US-11 creates no reservation (FR-011, SC-005).

## Authentication and roles

- Requires a Bearer token (`TokenClaimsDep`, `app/api/deps.py`).
- `401` without a valid token: `{"detail": "Tu sesión no es válida o venció. Volvé a ingresar."}`.
- `403` when the token belongs to a restaurant account (US-4 S3): `{"detail": "Esta acción es solo para comensales."}`.

## Shared rules

- `date` is a calendar date in `America/Argentina/Buenos_Aires`, format `YYYY-MM-DD`. A past date answers `400`.
- `start_time` is a local time in `America/Argentina/Buenos_Aires`, format `HH:MM`. A start in the past (today) answers `400`.
- `party_size` is an integer `>= 1`. The restaurant's maximum is `max_party_size`: the capacity of its largest `active` table (`0` when it has no active tables). The read endpoints report it; a group above it is never offered (see below), and the deferred write endpoint will reject it with `400`. `party_size < 1` answers `400`.
- Duration is fixed at 90 minutes; starts are on a 30-minute grid. A start is only offered if the whole block fits inside the shift (see `data-model.md`).
- `404` when the restaurant does not exist: `{"detail": "No encontramos ese restaurante."}`.
- `400` for invalid input. Two shapes:
  - A malformed or missing query parameter (bad date/time format, `party_size < 1`) uses the project's standard validation shape: `{"detail": [{"loc": [...], "msg": "<Spanish message>", ...}]}`.
  - A business rejection (a past date or start; the deferred US-13 write also rejects `party_size > max_party_size`) is a plain `{"detail": "<Spanish message>"}`.
- Suggested messages for the business rejections: `"No podés reservar en una fecha pasada."`, `"Ese horario ya pasó."` and, in the deferred write, `"El grupo supera la capacidad máxima del restaurante."`. The frontend shows its own copy, so the tests assert the status code.

## Maximum party size

The restaurant defines the largest group it accepts through its tables: `max_party_size = max(capacity)` over the `active` tables, `0` when there is none. One reservation holds one table, so this is also the largest group the flow can seat. The response of the slots endpoint always carries it, so the page can bound the party-size input before it asks for anything else. The read endpoint answers a larger `party_size` with `200`, the cap and no availability (it creates nothing); the UI clamps the value and explains it, and US-13's write path will answer `400`.

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
  "slots": [
    { "start_time": "20:00", "available": true },
    { "start_time": "20:30", "available": false },
    { "start_time": "21:00", "available": true }
  ]
}
```

- `max_party_size` is the largest capacity among the restaurant's active tables (`0` when it has none); it is the largest group the restaurant accepts.
- `open` is `false` when the weekday has no active shift; `slots` is then empty.
- `available` is `false` when no table with `capacity >= party_size` is free for the whole block. The slot is still returned so the UI can show it as not selectable (S4).
- A `party_size` above `max_party_size` returns `open` as the shifts say, the cap, and `slots: []`; the UI clamps the value and explains the cap. When `max_party_size` is `0`, the restaurant has no tables yet and the slots are empty too.
- Slots in the past (today) are not returned.
- Times are local to `America/Argentina/Buenos_Aires`; the database stores UTC.

## `GET /restaurants/{restaurant_id}/availability/tables`

Tables that can host the party at one specific start.

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
  "date": "2026-10-28",
  "start_time": "20:00",
  "ends_at": "2026-10-28T21:30:00-03:00",
  "tables": [
    { "id": "0ab2…", "label": "Mesa 4", "capacity": 4, "seating_area": "indoor" },
    { "id": "9cd1…", "label": "Mesa 12", "capacity": 4, "seating_area": "terrace" }
  ]
}
```

- `tables` is ordered by `seating_area`, then `capacity`, then `label`.
- The list is informational in US-11 (team decision of 23/10, following `prototipo-us11.html`): the diner does not pick a concrete table, the page uses the list to say whether a table is free for the chosen preference, and the table is assigned when the reservation is confirmed (US-13).
- An empty list is a valid answer (`200`): there is no availability (S7). The UI informs it and keeps the controls usable.
- A `start_time` outside the shifts, off the grid or in the past answers `400`.
- When `party_size` is above `max_party_size`, the list is empty (S7-like) and the UI clamps the value with a notice; the read endpoint does not answer `400` for it.
- `seating_area` values follow the glossary: `indoor`, `outdoor`, `terrace`. The UI shows «Adentro», «Afuera» and «Terraza», and "Sin preferencia" means no filter (filtering happens in the UI, so one request serves every preference).

## Temporary mock (while spec 004 is missing)

`frontend/src/api/availability.ts` exposes `fetchAvailability()` and `fetchAvailableTables()` with exactly these request/response shapes. While the endpoints or spec 004 are missing, both functions answer from `frontend/src/data/reservationAvailability.fixture.ts`:

- Monday: `open: false`, `slots: []`.
- Other days: starts every 30 minutes inside 12:00–15:00 and 20:00–23:30, last start such that 90 minutes fit; `20:30` is `available: false` to exercise S4.
- Tables: `Mesa 1` and `Mesa 2` (indoor, capacity 2), `Mesa 3` (outdoor, capacity 4), `Mesa 4` (terrace, capacity 4), filtered by `capacity >= party_size`. A fifth table, `Mesa 5` (indoor, capacity 2), is `active: false` and never returned, which is the "not available table" rule of US-10 S2.
- `max_party_size: 4` (the largest active table). The page caps the stepper at it and clamps a URL value above it, so the mock never receives a larger party and has no HTTP status to answer.
- At 21:00 `Mesa 4` is taken, so a party of 4 that prefers Terraza sees that preference as unavailable («Sin mesas») while the slot stays available for the other areas.
- Past dates answer `open: false, slots: []`; a party within the cap for which no table fits answers `tables: []`.
- The mock does not simulate `401`/`403`/`404`: those are proven by the backend tests, not by the demo.

The mock is replaced by the typed client (`api.GET('/api/restaurants/{restaurant_id}/availability', …)`) in T018 of `tasks.md`, and the fixture file is deleted in that same PR. It never exists in the backend and never writes data.

## Not in this contract

- `POST /restaurants/{id}/reservations` or `POST /reservations`: the reservation is created in US-13, after the review and the explicit confirmation (FR-011, FR-012). That endpoint will revalidate availability in the same transaction, reject `party_size > max_party_size` with `400` and answer `409` if the table was taken meanwhile.
- Opening hours and tables CRUD: spec 004 (US-8, US-10).
- Restaurant name and profile for the page header: spec 004 (US-6) via `GET /api/restaurants/{id}`; meanwhile the page reads the spec 002 fixture.

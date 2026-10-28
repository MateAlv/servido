# Restaurant configuration API contract

All endpoints are under `/api`, require a valid authorization token and operate only on
the restaurant represented by the token. A diner receives `403`.

## Profile

### `GET /api/restaurante/perfil`

Returns `200` with the public profile, including `nombre`, description,
cuisine, price range, optional `foto_url`, restriction tags, address and
persisted coordinates. When present, `foto_url` is the image displayed from
the restaurant map. Unconfigured optional fields are `null` or empty
according to the generated schema.

### `PUT /api/restaurante/perfil`

Accepts the profile fields, an optional `foto_url` URL, and the coordinates
selected by the geocoding preview. `nombre` is required. Returns `200` with
the saved profile.

The request payload includes `foto_url` as a nullable URL string. The
restaurant enters or pastes this URL; the frontend sends it and may show a
preview. The backend validates and persists the URL and returns it on profile
and restaurant-map queries. This MVP does not accept multipart uploads,
base64 image data, or perform image storage.

Responses:

- `400` for missing/blank name, invalid coordinates, or invalid field values.
- `401` for a missing/invalid token.
- `403` for a diner token.
- `409` when the address lookup result is not accepted for saving.

### `POST /api/restaurante/perfil/geocodificar`

Accepts an address and returns a geocoding preview (`display_name`,
`latitude`, `longitude`) without changing the database. An empty result is a
`400` with a Spanish explanation. The final profile update persists the
coordinates; the server never geocodes on read.

## Opening hours

### `GET /api/restaurante/horarios`

Returns the restaurant's shifts grouped by weekday. Inactive weekdays return
an empty list.

### `PUT /api/restaurante/horarios`

Replaces the submitted weekly shift configuration atomically. It accepts one or
more shifts with start and end times per active weekday. Reversed, zero-length,
or overlapping shifts return `400`; invalid weekday values return `400`.
Success returns `200` with the normalized saved configuration.

## Table inventory

### `GET /api/restaurante/mesas`

Returns all table groups as `quantity` tables of `capacity` seats in one
`seating_area` (`indoor`, `outdoor` or `terrace`), together with the number of
free tables by group. Groups do not expose identifiers
for individual physical tables; no “Mesa 1” or “Mesa 2” exists.

### `PUT /api/restaurante/mesas`

Replaces table groups atomically. Each group requires positive per-table
`capacity` and `quantity`, a `seating_area` (`indoor`, `outdoor` or `terrace`;
team decision of 28/10), plus `available`. Two groups with the same `capacity`
and `seating_area` answer `400`. A reservation for `N` people may
consume one available quantity slot only when the group's capacity is at least
`N`; capacities from separate groups are never combined. If the requested
state would compromise a confirmed reservation consuming quantity from an
affected group, the endpoint returns `409` with the affected reservation
context and does not mutate the inventory.

### Reservation conflict-check stub (test contract)

US-10 does not create or depend on the future reservation API. The inventory
service depends on a replaceable reservation conflict-check interface. Tests
MUST provide a stub/mock implementing this request and response contract:

```json
{
  "restaurant_id": "uuid",
  "group_capacity": 4,
  "seating_area": "terrace",
  "date": "2026-11-20",
  "start_time": "20:00:00",
  "end_time": "22:00:00",
  "quantity_delta": -1
}
```

The stub returns:

```json
{
  "has_conflict": true,
  "affected_reservations": [
    {
      "reservation_id": "uuid",
      "date": "2026-11-20",
      "start_time": "20:00:00",
      "quantity": 1
    }
  ]
}
```

For no conflict it returns
`{"has_conflict": false, "affected_reservations": []}`.
The check MUST be invoked inside the inventory update transaction after
locking the affected group rows and before mutation. A conflict returns HTTP
`409` and preserves the previous inventory. The future reservation feature may
replace the stub implementation as long as it preserves this contract; it
must report group capacity and consumed quantity, not a physical table ID.

**Replaced by spec 005 (US-13, 28/10).** Reservations exist now, so the check
is real: lowering a group's `quantity`, marking it unavailable or removing it
conflicts when a future confirmed reservation of that group (same `capacity`
and `seating_area`) would be left without a table. See
`specs/005-reservar-mesa/data-model.md`.

## Error shape

Use the repository's standard JSON error shape: `{"detail": ...}`. Validation
errors are HTTP 400 rather than FastAPI's default 422.

# Reservations API contract (US-13)

Base path: `/api`. Both endpoints need a diner session: `401` without a valid token (`{"detail": "Tu sesión no es válida o venció. Volvé a ingresar."}`), `403` for a restaurant account (`{"detail": "Esta acción es solo para comensales."}`, US-4 S3).

Times in requests and responses are local to `America/Argentina/Buenos_Aires`; the database stores UTC. Rules: [data-model.md](../data-model.md).

## `POST /reservations` — confirm the reservation (US-13 S4, S5)

The only way a reservation is created: the diner presses «Confirmar reserva» in the review (FR-011). It carries the whole selection plus the table group the review showed.

### Request

```json
{
  "restaurant_id": "6f1c…",
  "date": "2026-11-02",
  "start_time": "20:00",
  "party_size": 3,
  "table": { "capacity": 4, "seating_area": "terrace" },
  "request_id": "5c0e…"
}
```

`request_id` is a UUID the page generates when it opens the review and reuses for every retry of that confirmation.

### `201 Created` (or `200 OK` for a repeated `request_id`)

```json
{
  "id": "a41e…",
  "restaurant": { "id": "6f1c…", "nombre": "La Esquina de Palermo" },
  "date": "2026-11-02",
  "start_time": "20:00",
  "end_time": "21:30",
  "party_size": 3,
  "table": { "capacity": 4, "seating_area": "terrace" },
  "status": "confirmed"
}
```

The response never includes `table_number`: which table of the group was taken is internal (spec 004, FR-005).

### Errors

`400` means the request itself is wrong; `409` means it was valid when the diner chose it but is no longer possible (spec edge case "Disponibilidad que cambia entre la revisión y la confirmación").

| Status | When | `detail` |
| --- | --- | --- |
| `400` | Malformed body (standard validation shape), `party_size` or `capacity` outside 1–100, a start off the 30-minute grid or with a time zone | list of errors, or `"Ese horario no es válido."` |
| `400` | A date more than 60 days ahead (D10) | `"Podés reservar hasta 60 días antes."` |
| `404` | Unknown restaurant id | `"No encontramos ese restaurante."` |
| `409` | The start is past now | `"Ese horario ya pasó. Elegí otro."` |
| `409` | Its 90 minutes are no longer inside a shift of that day | `"El restaurante ya no atiende en ese horario. Elegí otro."` |
| `409` | `party_size` is above the restaurant's current maximum | `"El grupo supera la capacidad máxima del restaurante."` |
| `409` | The chosen group no longer exists, is unavailable or is too small | `"Esa mesa ya no está disponible. Elegí otro horario o tipo de mesa."` |
| `409` | The group has no free table left for that block (or a concurrent confirmation took it) | `"La mesa se ocupó mientras confirmabas. Elegí otro horario o tipo de mesa."` |
| `409` | The restaurant stopped being bookable during the review | `"El restaurante ya no está tomando reservas."` |

A repeated `request_id` is not an error: the endpoint answers `200` with the reservation it already created, so a double click or a retry after a lost response shows the confirmation once.

### How the page reacts

- `201` / `200`: shows the confirmed reservation and replaces the URL so going back can't confirm again.
- `409`: shows the message, returns to the selection with every value kept and refetches the availability.
- `400`: shows the message and stays in the review (it means the page built a wrong request).
- `401` (the 1-hour session expired): sends the diner to `/ingresar?volver=<this URL>`, and after signing in comes back to the review with the selection kept.
- `404`: shows "No encontramos ese restaurante" with a link to the map.

## `GET /reservations?date=YYYY-MM-DD` — the diner's reservations of a day (US-13 S6)

The confirmed reservations of the signed-in diner whose block touches that BA date, in any restaurant, ordered by start. The review uses it to warn about overlaps (FR-016); it never blocks the confirmation. Later stories that list the diner's reservations (US-23) can reuse it.

### `200 OK`

```json
{
  "date": "2026-11-02",
  "reservations": [
    {
      "id": "77b0…",
      "restaurant": { "id": "e2d4…", "nombre": "Bodegón Estudiantil" },
      "start_time": "19:30",
      "end_time": "21:00",
      "party_size": 2,
      "table": { "capacity": 2, "seating_area": "indoor" },
      "status": "confirmed"
    }
  ]
}
```

- Only the signed-in diner's reservations: never anyone else's.
- An empty list is a valid answer.
- A date more than a year back or more than 60 days ahead answers `400`.
- The page flags an entry when `start_time < chosen end` and `end_time > chosen start`, and shows «Ya tenés una reserva en Bodegón Estudiantil de 19:30 a 21:00. Podés confirmar igual.»

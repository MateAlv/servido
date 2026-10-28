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
  "table": { "capacity": 4, "seating_area": "terrace" }
}
```

### `201 Created`

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

| Status | When | `detail` |
| --- | --- | --- |
| `400` | Malformed body (standard validation shape) | list of errors |
| `400` | Date or start in the past | `"Ese horario ya pasó."` |
| `400` | Start off the 30-minute grid or its 90 minutes outside every shift of that day | `"El restaurante no atiende en ese horario."` |
| `400` | `party_size` above the restaurant's maximum | `"El grupo supera la capacidad máxima del restaurante."` |
| `400` | The chosen group doesn't exist, isn't available, or is smaller than `party_size` | `"Esa mesa no está disponible para tu grupo."` |
| `404` | Unknown or not bookable restaurant | `"No encontramos ese restaurante."` |
| `409` | No free table left in the group for that block, or a concurrent confirmation took it (exclusion constraint) | `"La mesa se ocupó mientras confirmabas. Elegí otro horario o tipo de mesa."` |
| `409` | The diner already has this exact reservation confirmed: same restaurant and start (double submit, unique index) | `"Ya confirmaste esta reserva."` |

After a `409` for a taken table, the page goes back to the selection with every value kept and refreshes the availability (spec edge cases).

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
- The page flags an entry when `start_time < chosen end` and `end_time > chosen start`, and shows «Ya tenés una reserva en Bodegón Estudiantil de 19:30 a 21:00. Podés confirmar igual.»

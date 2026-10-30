# Data Model: US-14

US-14 adds no persistent entities or migrations. It reads existing entities.

## Reservation

Source: `backend/app/models/reservation.py`.

| Field | Calendar use |
|---|---|
| `id` | Stable row identity |
| `restaurant_id` | Ownership filter |
| `table_capacity` | Displayed table capacity |
| `seating_area` | Displayed seating area |
| `party_size` | Number of diners |
| `starts_at`, `ends_at` | Local reservation time and date |
| `status` | `confirmed` or `cancelled` |

`table_number` remains internal and is not returned, consistent with spec 005 D1.

## OpeningShift

The existing `turnos` rows provide day-of-week and start/end times used by the frontend to group reservations into turnos. The API does not persist a shift reference because shifts can be edited independently from historical reservations.

## Calendar response

The endpoint returns the requested local date and entries ordered by local start time. Each entry includes id, local start/end time, party size, table capacity, seating area and status. No diner identity or contact data is included; that belongs to US-16.

# Data Model: Reservation Confirmation Details

## Existing entities

### Reservation

The existing `reservations` row remains the source of truth.

| Field | Use in this feature | Rules |
|---|---|---|
| `id` | Stable confirmation identifier and UI receipt value | UUID primary key |
| `diner_id` | Recipient and ownership | Must equal the authenticated diner |
| `restaurant_id` | Restaurant projection lookup | Existing restaurant foreign key |
| `starts_at`, `ends_at` | Date/time in the receipt and email | Stored timezone-aware UTC; displayed in Buenos Aires |
| `party_size` | Number of people | Positive and no greater than assigned table capacity |
| `table_capacity`, `seating_area` | Assigned table description | Selected available group; internal table number remains private |
| `status` | Confirmation state | `confirmed` only after successful transaction |
| `request_id` | Confirmation idempotency key | Unique; repeated confirmation returns the existing row |

### Restaurant

| Field | Use in this feature | Rules |
|---|---|---|
| `id_restaurante` | Restaurant identity in the projection | Existing UUID primary key |
| `nombre` | Receipt and email | Existing non-blank restaurant name |
| `direccion` | Receipt and email | Existing nullable public address; display a clear unavailable value if absent |
| `email_verified_at` | Eligibility check before confirmation | Unverified restaurants remain unavailable to diners |

### Diner

| Field | Use in this feature | Rules |
|---|---|---|
| `id_comensal` | Reservation owner | Derived from the authenticated token |
| `email` | Confirmation email recipient | Existing registered account email |

## API projection

`ReservationResponse.restaurant` gains `address` (nullable string) while preserving the existing
Spanish `nombre` field. `ReservationResponse.id` is the confirmation code shown in the receipt.
The response continues to expose local `date`, `start_time`, `end_time`, `party_size`, `table`,
`status`, order flags and order deadline so the confirmation and active-reservation views remain
consistent.

## Mail projection

The confirmation mail contains:

- restaurant name and address;
- local date and start/end time in `America/Argentina/Buenos_Aires`;
- party size;
- assigned table capacity and seating area;
- reservation id.

The memory backend stores one `Mail` for tests. A mail delivery error is logged after commit and
does not change the reservation state or the response.

## State and side effects

```text
available review
  --successful availability confirmation + commit--> confirmed reservation
  --post-commit mail--> confirmation email (at most once for one request_id)

available review
  --availability conflict/invalid input--> no reservation and no email

confirmed reservation
  --duplicate request_id--> same reservation response, no second email

confirmed reservation
  --mail backend error--> unchanged confirmed reservation, on-screen receipt still available
```

No new table, column, migration or reservation state is required.

# Data Model: View and Cancel Diner Reservation

## Existing entities

### Reservation

The existing `reservations` row is the source of truth.

| Field | Use in this feature | Rules |
|---|---|---|
| `id` | List/detail identity and cancellation path | UUID |
| `diner_id` | Ownership filter | Must equal the authenticated diner |
| `restaurant_id` | Restaurant name in the projection | Existing restaurant FK |
| `starts_at`, `ends_at` | Ordering, display and deadline | Stored UTC; displayed/calculated in Buenos Aires |
| `party_size` | Detail | Positive and no greater than table capacity |
| `table_capacity`, `seating_area` | Detail such as “Mesa para 4 · Terraza” | Existing table-group identity |
| `status` | Active/cancelled state | Active list accepts only `confirmed` |
| `cancelled_at` | Cancellation timestamp | Null when confirmed; set once when cancelled |

### Order

The existing `pedidos` row remains associated by `reservation_id`. No schema
change is made. Its effective lifecycle is bounded by the reservation:
when the reservation is cancelled, the associated pre-order is not active and
must not be offered for further changes.

## Derived projections

### Active reservation response

Reuse the existing reservation projection fields: reservation id, restaurant
id/name, local date, local start/end time, party size, table capacity/seating
area and status. Order-related fields remain present only where already
required by the shared response; the page does not display or edit the order.

### Cancellation response

Return the cancelled reservation projection plus `cancelled_at` and a stable
success message. Error responses distinguish the 45-minute restriction and an
already-cancelled reservation.

## State transitions

```text
confirmed + starts_at - now >= 45 minutes
    --DELETE with owner and row lock--> cancelled + cancelled_at = now

confirmed + starts_at - now < 45 minutes
    --DELETE--> unchanged (409)

cancelled
    --DELETE--> unchanged (409, already cancelled)
```

Past reservations are excluded from active results and cannot be cancelled.
The existing availability queries count only `confirmed` reservations, so the
successful transition releases the table and slot atomically with the state
change.

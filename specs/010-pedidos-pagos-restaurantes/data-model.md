# Data model: restaurant orders and payment status

## Existing entities consumed

### Restaurant

The existing `restaurantes` row owns opening shifts, dishes, orders and
reservations. Every restaurant order query is scoped by the authenticated
restaurant ID.

### Opening shift

`turnos` stores `restaurant_id`, ISO `day_of_week` (1–7), `start_time`,
`end_time` and `active`. The active shift is the one containing the current
Buenos Aires local time. No shift crossing midnight is supported.

### Reservation

The existing reservation stores `restaurant_id`, `starts_at`, `ends_at` and
`status`. It remains confirmed for the 90-minute interval and starts on the
30-minute grid. Order queries join it and exclude `cancelled` rows.

### Dish

The existing dish stores its restaurant ownership, name, price and optional
`tiempo_preparacion_minutos`. A missing preparation time contributes zero to
the order's maximum and the user-facing order view shows a warning that the
preparation time is 0.

## New entities

### Order (`pedidos`)

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `reservation_id` | UUID | Required FK to `reservations`, unique per reservation |
| `restaurant_id` | UUID | Required FK to `restaurantes` |
| `status` | varchar | `confirmed` or a non-visible/unconfirmed state; database check |
| `prep_start_time` | timestamptz | Derived from arrival minus maximum item prep time |
| `created_at` | timestamptz | Server timestamp |

The order's restaurant must match its reservation and every item dish. The
restaurant query filters `status = confirmed` and `reservation.status =
confirmed`.

### Order item (`pedido_items`)

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `order_id` | UUID | Required FK to `pedidos` |
| `dish_id` | UUID | Required FK to `platos` |
| `quantity` | integer | Greater than zero |
| `unit_price` | numeric(10,2) | Snapshot of dish price at order confirmation |
| `prep_time_minutes` | integer | Snapshot of dish preparation time |

The snapshots keep historical order details stable if the restaurant later
edits a dish.

### Payment (`pagos`)

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `order_id` | UUID | Required FK to `pedidos`, one payment per order |
| `method` | varchar nullable | `cash`, `online`, or null before selection |
| `status` | varchar | `pending` or `paid` |
| `total` | numeric(10,2) | Non-negative total derived from item snapshots |
| `paid_at` | timestamptz nullable | Set when a future confirmation operation marks paid |

US-22 displays this entity. Payment transition operations are intentionally
outside the current US-20 implementation slice.

## Relationships

```text
Restaurant 1 ── * OpeningShift
Restaurant 1 ── * Reservation
Restaurant 1 ── * Order
Reservation 1 ── 0..1 Order
Order 1 ── * OrderItem
Dish 1 ── * OrderItem
Order 1 ── 0..1 Payment
```

## Integrity and ordering

- Foreign keys prevent cross-restaurant order, reservation and dish links.
- Positive quantities and valid enum values are database constraints.
- A unique reservation/order relation prevents duplicate advance orders.
- Restaurant queries order by reservation arrival, `prep_start_time`, then order
  UUID for stable results.
- All timestamps are stored in UTC and converted to Buenos Aires for business
  rules and user-facing times.

# Data Model: Estimated Preparation Time

## Dish

Existing entity representing a restaurant's menu item.

Relevant data:

| Field | Rule |
| --- | --- |
| `tiempo_preparacion_minutos` | Nullable for an incomplete estimate; when present, integer greater than zero |
| restaurant ownership | Only the owning restaurant may create or modify it |

The dish may remain published without an estimate. New values must be positive;
clearing an existing value is allowed only where the existing menu flow explicitly
supports an empty estimate and must result in the nullable "not provided" state.

## Order item

Existing confirmed snapshot of one dish in an order.

Relevant data:

| Field | Rule |
| --- | --- |
| `prep_time_minutes` | Nullable snapshot of the dish time at confirmation |
| `name`, `unit_price` | Existing immutable confirmation snapshots |
| `quantity` | Existing positive quantity |

The snapshot is not updated when the source dish changes.

## Order

Existing advance order associated with one reservation.

Derived values:

- `prep_time_minutes`: maximum non-null item snapshot time, or null when all
  items lack an estimate.
- `prep_time_warning`: true when at least one item lacks an estimate.
- `prep_start_time`: arrival time minus the derived maximum, with the existing
  Buenos Aires business-time rules.

## State and invariants

1. A restaurant can modify only its own dishes.
2. A new order reads the current dish estimate when the order is confirmed.
3. A confirmed order keeps the item snapshot and derived preparation estimate.
4. Invalid preparation values never replace a previously valid value.
5. Missing estimates are represented as null, not as a fabricated positive value.

# Data Model: Ver promociones y aplicar descuento

This feature extends existing entities; it does not add a table or migration.

## Promotion (existing, spec 028)

| Field | Type | Use in US-55 |
| --- | --- | --- |
| `restaurant_id` | UUID | Restricts the promotion to its restaurant |
| `name` / `description` | string / nullable string | Public description |
| `discount_type` | `percentage` or `fixed` | Benefit label and calculation |
| `discount_value` | Decimal | Percentage or ARS amount |
| `minimum_amount` | nullable Decimal | Required for fixed discounts |
| `starts_on`, `ends_on` | nullable date pair | Public visibility and validity |
| `weekdays` | nullable ISO day list | Validity |
| `start_time`, `end_time` | nullable time pair | Validity |
| `active` | boolean | Paused promotions are excluded |
| `stackable` | boolean | Resolved by the existing restaurant policy |

Database checks from spec 028 continue to enforce valid discount values, minimums and validity
ranges.

## Cart (existing draft)

The cart keeps the diner-entered item snapshot and `arrival_delay`. Its response summary is
derived, not persisted:

- `arrival_at`: reservation start plus the selected delay.
- `subtotal`: sum of item quantity × unit price.
- `promotions`: currently eligible promotion summaries, if any.
- `discount`: sum of resolved promotion amounts.
- `total`: `subtotal - discount`.

The derived summary is recalculated from current promotions for every read/save. A cart never
creates `OrderDiscount` rows and remains invisible to the restaurant.

## Order (existing confirmed order)

At confirmation, the backend resolves promotions using the current reservation arrival instant
and subtotal, then persists:

- `subtotal`
- `discount_amount`
- `total`
- `OrderDiscount` rows with promotion id, name and applied amount

These values are immutable for later promotion edits/pauses. Existing database constraints keep
the discount non-negative, no greater than the subtotal, and the total equal to subtotal minus
discount.

## Public promotion projection

The public restaurant detail exposes only the read-only fields needed by V1:
`name`, `description`, `discount_type`, `discount_value`, `minimum_amount`, date/day/time
conditions. It excludes management fields such as `request_id` and does not expose paused or
expired rows.

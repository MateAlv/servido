# Data model — promotions (spec 028, US-48)

Money is `Numeric(10, 2)` (ARS); instants are timezone-aware and stored in UTC; dates, weekdays and
times are local to `America/Argentina/Buenos_Aires`.

## `promotions` — `Promotion`

One row per promotion of a restaurant. Never deleted: `active = false` is a pause (spec, «Pausar vs.
eliminar»).

| Column | Type | Rules |
| --- | --- | --- |
| `id` | UUID | PK, generated |
| `restaurant_id` | UUID | FK `restaurantes.id_restaurante`, `ON DELETE RESTRICT`, indexed with `created_at` |
| `name` | `String(120)` | Not blank |
| `description` | `Text` | Optional |
| `discount_type` | `String(10)` | `percentage` \| `fixed` |
| `discount_value` | `Numeric(10,2)` | `> 0`; `<= 100` when `percentage` |
| `minimum_amount` | `Numeric(10,2)` | `NULL` when `percentage`; `> 0` and `>= discount_value` when `fixed` |
| `starts_on` | `Date` | Optional; both dates or none; `ends_on >= starts_on` |
| `ends_on` | `Date` | Optional; inclusive |
| `weekdays` | `ARRAY(Integer)` | Optional, distinct ISO 1–7 (1 = Monday); 1 to 7 values |
| `start_time` | `Time` | Optional; both times or none; `end_time > start_time` |
| `end_time` | `Time` | Optional; inclusive |
| `active` | `Boolean` | Default `true` |
| `stackable` | `Boolean` | Default `true`; P5 override |
| `request_id` | UUID | Unique; the double-submit edge case |
| `created_at` | `DateTime(tz)` | Server default `CURRENT_TIMESTAMP`; tie-breaker |

Database constraints (all named):

- `discount_type_known`, `discount_value_positive`
- `percentage_bounds`: `discount_type <> 'percentage' OR (discount_value <= 100 AND minimum_amount IS NULL)`
- `fixed_minimum`: `discount_type <> 'fixed' OR (minimum_amount > 0 AND minimum_amount >= discount_value)`
- `dates_complete`: both `NULL`, or both set with `ends_on >= starts_on`
- `times_complete`: both `NULL`, or both set with `end_time > start_time`
- `some_validity`: `starts_on IS NOT NULL OR weekdays IS NOT NULL OR start_time IS NOT NULL`
- `weekdays_valid`: `weekdays IS NULL OR weekdays <@ ARRAY[1,2,3,4,5,6,7]`

Derived `state` (not stored), relative to today in Buenos Aires:

| `active` | `ends_on < today` | `starts_on > today` | State |
| --- | --- | --- | --- |
| `false` | any | any | `paused` |
| `true` | yes | no | `expired` |
| `true` | no | yes | `programmed` |
| `true` | no | no | `active` |

A promotion with only weekdays and/or a time band (no dates) is `active` while `active = true`.

## `restaurantes` — new column

| Column | Type | Rules |
| --- | --- | --- |
| `stack_promotions` | `Boolean` | Not null, default `false`. P5 policy: `false` = largest saving only, `true` = stack |

## `pedidos` — new columns (P4)

| Column | Type | Rules |
| --- | --- | --- |
| `subtotal` | `Numeric(10,2)` | Not null, `>= 0`; sum of `quantity * unit_price` at confirmation |
| `discount_amount` | `Numeric(10,2)` | Not null, `>= 0` and `<= subtotal` |
| `total` | `Numeric(10,2)` | Not null, `total = subtotal - discount_amount` |

Existing rows are backfilled in the migration with `subtotal = SUM(pedido_items.quantity *
unit_price)`, `discount_amount = 0` and `total = subtotal`.

## `pedidos_descuentos` — `OrderDiscount` (P4)

The snapshot of what was applied: one row per promotion. Kept when the promotion changes.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | UUID | PK, generated |
| `order_id` | UUID | FK `pedidos.id`, `ON DELETE CASCADE` |
| `promotion_id` | UUID | FK `promotions.id`, `ON DELETE RESTRICT` |
| `name` | `String(120)` | Copy of `promotions.name` at confirmation |
| `amount` | `Numeric(10,2)` | `> 0`; the rows add up to `discount_amount` |

`UNIQUE (order_id, promotion_id)`.

## Resolution rules (P1, P2, P3, P5)

Given a set of promotions of the restaurant, a subtotal and the reservation's arrival instant
(`starts_at + arrival_delay`, in Buenos Aires):

1. **Eligible** when `active` and the arrival falls inside every configured criterion (dates,
   weekday, time band — the criteria are ANDed) and the amount is positive.
2. **Amount**: `percentage` → `round(subtotal * value / 100, 2)` (half up), no minimum;
   `fixed` → `value` when `subtotal >= minimum_amount`, otherwise `0` and not eligible.
3. **Policy** (`stack_promotions = false`): the single eligible promotion with the largest amount.
   Tie: oldest `created_at`, then `id`.
4. **Policy** (`stack_promotions = true`): if there are non-stackable eligible promotions, compare
   the best non-stackable alone against the sum of the stackable ones and use the larger; if there
   are no stackable ones, use the best non-stackable. Ties go to the non-stackable option only when
   it is not smaller.
5. **Application**: chosen promotions are sorted by amount (largest first, then oldest) and applied
   one by one, each capped at what is left of the subtotal, so `Σ amounts == discount_amount` and
   `total >= 0`.
6. **Frozen at confirmation**: `pedidos.subtotal`, `pedidos.discount_amount`, `pedidos.total` and
   the `pedidos_descuentos` rows. Editing, pausing or changing a promotion never touches them.

## Example

Subtotal `$18.500`, policy `stack = false`:

- «20% los martes» → `$3.700`
- «$3.000 desde $10.000» → `$3.000`

The largest saving is applied: `$3.700`. With `stack = true` and both stackable: `$6.700`; if the
second is non-stackable, the choice is `$3.700` (the best non-stackable is not larger than the
stackable one).

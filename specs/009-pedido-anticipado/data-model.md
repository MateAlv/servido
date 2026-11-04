# Data Model: Pedido Anticipado

**Feature**: `specs/009-pedido-anticipado` | **Date**: 2026-10-30

Decisions P1–P14 are in [research.md](research.md). New tables use English names (`AGENTS.md` glossary); the existing `platos` table keeps its Spanish names (team decision, 21/10). These tables replace the `reserva_platos` design in `scripts/sql/servido.sql`; build on them, not on that script.

## Entities

> **Reconciled with main on 04/11.** PR #32 (US-20, US-22) merged its own order tables, `pedidos` and `pedido_items`, before this code. The team chose to keep them (decision of 04/11) and add what US-17 needs, instead of the `orders` and `order_items` first designed here. The differences are marked below.

### `pedidos` (PR #32, extended) — `Order`

The confirmed pre-order of one reservation (P1, P5). A row exists only while the reservation has an order: confirming an empty order deletes it (P11).

| Column | Type | Rules |
| --- | --- | --- |
| `id` | UUID | Primary key |
| `reservation_id` | UUID, not null | FK `reservations.id` `ON DELETE RESTRICT`; **unique** (one order per reservation, P5) |
| `restaurant_id` | UUID, not null | FK `restaurantes.id_restaurante`; the reservation's restaurant (from PR #32) |
| `status` | varchar(20), not null | `confirmed` or `pending` (from PR #32). US-17 always writes `confirmed`: what the diner hasn't confirmed lives in `carts`, never here |
| `prep_start_time` | timestamptz, not null | Suggested preparation start (from PR #32), written at each confirmation as arrival minus the slowest dish's time (`suggested_start`). US-20 recomputes it from the items |
| `created_at` | timestamptz, not null | First confirmation |
| `confirmed_at` | timestamptz, not null | **Added**: last time the diner confirmed it (UTC); existing rows take `CURRENT_TIMESTAMP` |

The order's state still comes from the reservation: it counts as cancelled when its reservation is (P12).

### `pedido_items` (PR #32, extended) — `OrderItem`

One dish of an order, with what the menu said when the diner confirmed (P8).

| Column | Type | Rules |
| --- | --- | --- |
| `id` | UUID | Primary key |
| `order_id` | UUID, not null | FK `pedidos.id` `ON DELETE CASCADE` (the relationship uses `passive_deletes=True`) |
| `dish_id` | UUID, not null | FK `platos.id_plato` `ON DELETE RESTRICT` (from PR #32): a dish in an order can't be deleted, so the first design's `SET NULL` isn't needed |
| `dish_name` | varchar(150), not null | **Added**: copied from `platos.nombre`; existing items take the dish's current name. `CHECK (length(trim(dish_name)) > 0)`. US-20 now shows this name |
| `unit_price` | numeric(10, 2), not null | Copied from `platos.precio`; `CHECK (unit_price > 0)` |
| `prep_time_minutes` | integer, nullable | Copied from `platos.tiempo_preparacion_minutos`; `CHECK (... >= 0)` (from PR #32) |
| `quantity` | integer, not null | `CHECK (quantity > 0)`, and **added** `CHECK (quantity <= 20)` as `NOT VALID`, so an older item can't fail the deploy (P10) |

There is no unique (`order_id`, `dish_id`): the request validation rejects a repeated dish, and a confirmation deletes the old items before inserting the new ones.

### `carts` (new) — `Cart`

The order a diner is building for one reservation and hasn't confirmed (P1). Never read by the restaurant-side stories. A row exists from the first saved change until the diner confirms or discards; a cart of a closed order stays but is ignored (research, technical choices).

| Column | Type | Rules |
| --- | --- | --- |
| `id` | UUID | Primary key |
| `reservation_id` | UUID, not null | FK `reservations.id` `ON DELETE CASCADE` (a cart is worthless without its reservation); **unique** (one cart per reservation) |
| `updated_at` | timestamptz, not null | Last save (UTC) |

### `cart_items` (new) — `CartItem`

One dish of a cart, with the values the page showed when the diner added it. Same columns as `pedido_items`, with `cart_id` in place of `order_id`, a nullable `dish_id` (`ON DELETE SET NULL`) and a unique (`cart_id`, `dish_id`):

| Column | Type | Rules |
| --- | --- | --- |
| `id` | UUID | Primary key |
| `cart_id` | UUID, not null | FK `carts.id` `ON DELETE CASCADE` (`passive_deletes=True`) |
| `dish_id` | UUID, nullable | FK `platos.id_plato` `ON DELETE SET NULL`; unique per cart (`cart_id`, `dish_id`) |
| `dish_name` | varchar(150), not null | As shown; `CHECK (length(trim(dish_name)) > 0)` |
| `unit_price` | numeric(10, 2), not null | As shown; `CHECK (unit_price > 0)` |
| `prep_time_minutes` | integer, nullable | As shown; `CHECK (prep_time_minutes IS NULL OR prep_time_minutes > 0)` |
| `quantity` | integer, not null | `CHECK (quantity BETWEEN 1 AND 20)` (P10) |

A cart may have no items only while the reservation has an order: that is a confirmed order the diner emptied and hasn't confirmed yet (P11). An empty save with no order deletes the cart instead (rule 7).

### `platos` (specs 006 and 007-agregar-plato, unchanged)

Read for the menu: `id_plato`, `id_restaurante`, `nombre`, `descripcion`, `categoria`, `precio`, `foto_url`, `restricciones_alimenticias`, `tiempo_preparacion_minutos`, `disponible`. "A dish on the menu" is decided by one helper (`menu_dishes(session, restaurant_id)`): since US-15 (spec 011) it is a dish with `disponible = true`, and a dish that stops being available counts as off the menu at confirmation (P9).

### `reservations` (spec 005, unchanged)

Gives the order its restaurant (`restaurant_id`), its diner (`diner_id`), its arrival time (`starts_at`, P7) and whether it is still confirmed (`status`). A restaurant with reservations can't be deleted (`RESTRICT`), so its dishes never disappear under an order through a cascade.

## Derived values

Each is one function in `app/services/orders.py`; every reader calls it instead of recomputing. Never stored, except the preparation start that PR #32 keeps in `pedidos.prep_start_time`.

| Value | Function | Rule |
| --- | --- | --- |
| Item subtotal | `order_summary` | `quantity × unit_price` |
| Order total | `order_summary` | Sum of the subtotals (P3: prices include taxes) |
| Estimated preparation time | `order_summary` | `max(prep_time_minutes)` over the items that have one; `None` if none has (P2) |
| Order deadline | `order_deadline` | `reservations.starts_at − 45 minutes` (P6), sent as ISO 8601 with offset |
| Order open | `order_open` | Reservation `confirmed`, now (`availability.current_time()`) before the deadline, and the restaurant has at least one dish on the menu (P6, P14) |
| Arrival time (for US-20) | `arrival_time` | `reservations.starts_at` (P7; US-43 changes this function) |
| Suggested preparation start (for US-20) | `prep_start_time` | Arrival time − estimated preparation time; the arrival time when there is no estimate |
| Order cancelled (for US-18) | — | The reservation is `cancelled` and has an order (P12) |
| Has a cart | `has_cart` | A cart exists and the order is open; a cart of a closed order counts as none |

For US-20, ordering the orders of a shift by arrival time, then by suggested preparation start (ascending), then by `confirmed_at` makes the list deterministic. Which reservations belong to the "turno actual" is for the US-20 spec to define (spec 008 already groups reservations by shift).

## Rules

1. Through the diner endpoints of this feature, only the diner of the reservation reads or writes its order and its cart; for anyone else the reservation doesn't exist (404). A restaurant account gets 403 (US-4 S3). Restaurants read the orders of their own reservations through their own endpoints (US-20, US-22, US-36), and never read carts.
2. Writing an order or a cart requires the order to be open (`order_open`); otherwise 409, and nothing changes. Discarding a cart is always allowed.
3. Confirming requires a verified email (spec 007, US-51 S5; P13); otherwise 403 with its own message. Saving a cart doesn't.
4. A confirmation is one transaction: lock the reservation row `FOR UPDATE`; read its order **after** the lock; check rules 2 and 3 on the locked row; check every item against the menu (rule 5); then delete the old items with one `DELETE` statement and flush before inserting the new ones, and set `confirmed_at`. With no items, delete the order (its items cascade). In the same transaction, delete the reservation's cart.
5. Each item of a confirmation must name a dish on the menu of the reservation's restaurant, with the name, price and preparation time the page showed. A dish that is missing, belongs to another restaurant or has a different value answers 409 and changes nothing (P9).
6. Confirmation checks run in this order, and the first failure answers: request shape (400), reservation not the diner's (404), not open (409), email not verified (403), no items and no order to remove (400), menu changed (409).
7. Saving a cart takes the same lock, reads the cart and the order **after** the lock, and replaces the cart the same way (bulk `DELETE` of its items, flush, insert; create the cart if there is none; set `updated_at`). An empty save when the reservation has no order deletes the cart and answers no cart. Each dish must be on the menu of the reservation's restaurant, or it answers the menu-changed 409; its values are stored as sent, not compared (that happens at confirmation). Checks: request shape (400), not the diner's (404), not open (409), dish not on the menu (409).
8. Input bounds, for orders and carts: 0 to 50 items, unique dish ids, quantity 1 to 20, name 1 to 150 characters, price as a positive decimal with up to 10 digits and 2 decimals, preparation time null or a positive integer within the database `integer` range (400 otherwise).
9. Cancelling a reservation only changes `reservations.status`; it never deletes or edits its order (P12; US-18, US-25 and US-38 rely on it).
10. Nothing else writes orders or carts; the restaurant-side stories only read orders.

## Not in this model (on purpose)

- **Payments**: US-45 adds the payment method to the order; US-56 and US-60 add payment records that point at `pedidos`. The deposit (*seña*) belongs to the reservation or the restaurant (risk 1), not to the order. Until then, every order is unpaid with no method. Once payments exist, those stories decide what happens when a paid order is changed or emptied.
- **A different arrival time** (US-43) and **a restaurant-set preparation time per order** (US-40): both change `arrival_time` and the estimate in one function each. If US-40 adds an order-level time, the diner's re-confirmation (rule 4) must keep it.
- **Notes per dish** (`aclaraciones` in `scripts/sql/servido.sql`): no story asks for them.

## Migration

`2026_11_04_1116-e0e674653e2f_pre_order_and_cart.py`, after `8f3c1a2b4d5e` (dish availability, US-15): creates `carts` and `cart_items`, adds `pedidos.confirmed_at` and `pedido_items.dish_name` (filled from `platos`), and the two new checks. It downgrades cleanly.

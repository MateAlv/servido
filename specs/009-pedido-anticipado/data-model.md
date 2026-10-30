# Data Model: Pedido Anticipado

**Feature**: `specs/009-pedido-anticipado` | **Date**: 2026-10-30

Decisions P1–P14 are in [research.md](research.md). New tables use English names (`AGENTS.md` glossary); the existing `platos` table keeps its Spanish names (team decision, 21/10). These tables replace the `reserva_platos` design in `scripts/sql/servido.sql`; build on them, not on that script.

## Entities

### `orders` (new) — `Order`

The confirmed pre-order of one reservation (P1, P5). A row exists only while the reservation has an order: confirming an empty order deletes it (P11).

| Column | Type | Rules |
| --- | --- | --- |
| `id` | UUID | Primary key |
| `reservation_id` | UUID, not null | FK `reservations.id` `ON DELETE RESTRICT`; **unique** (one order per reservation, P5) |
| `confirmed_at` | timestamptz, not null | Last time the diner confirmed it (UTC) |
| `created_at` | timestamptz, not null | First confirmation; server default `CURRENT_TIMESTAMP` |

No status column (research, technical choices): the order is confirmed while it exists and its reservation is confirmed, and cancelled when its reservation is (P12). Restaurant, diner and arrival time come from the reservation.

### `order_items` (new) — `OrderItem`

One dish of an order, with what the menu said when the diner confirmed (P8).

| Column | Type | Rules |
| --- | --- | --- |
| `id` | UUID | Primary key |
| `order_id` | UUID, not null | FK `orders.id` `ON DELETE CASCADE` (the relationship uses `passive_deletes=True`) |
| `dish_id` | UUID, nullable | FK `platos.id_plato` `ON DELETE SET NULL`; unique per order (`order_id`, `dish_id`); NULLs are distinct, so a deleted dish doesn't clash |
| `dish_name` | varchar(150), not null | Copied from `platos.nombre`; `CHECK (length(trim(dish_name)) > 0)` |
| `unit_price` | numeric(10, 2), not null | Copied from `platos.precio`; `CHECK (unit_price > 0)` |
| `prep_time_minutes` | integer, nullable | Copied from `platos.tiempo_preparacion_minutos`; `CHECK (prep_time_minutes IS NULL OR prep_time_minutes > 0)` |
| `quantity` | integer, not null | `CHECK (quantity BETWEEN 1 AND 20)` (P10) |

The unique keys cover the lookups; no other index is needed. Every confirmation replaces the items, so nothing may reference `order_items.id`.

### `platos` (specs 006 and 007-agregar-plato, unchanged)

Read for the menu: `id_plato`, `id_restaurante`, `nombre`, `descripcion`, `categoria`, `precio`, `foto_url`, `restricciones_alimenticias`, `tiempo_preparacion_minutos`. "A dish on the menu" is decided by one helper (`menu_dishes(session, restaurant_id)`), so that availability (US-15, US-34) changes one place.

### `reservations` (spec 005, unchanged)

Gives the order its restaurant (`restaurant_id`), its diner (`diner_id`), its arrival time (`starts_at`, P7) and whether it is still confirmed (`status`). A restaurant with reservations can't be deleted (`RESTRICT`), so its dishes never disappear under an order through a cascade.

## Derived values

Each is one function in `app/services/orders.py`; every reader calls it instead of recomputing. Never stored.

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

For US-20, ordering the orders of a shift by arrival time, then by suggested preparation start (ascending), then by `confirmed_at` makes the list deterministic. Which reservations belong to the "turno actual" is for the US-20 spec to define (spec 008 already groups reservations by shift).

## Rules

1. Through the diner endpoints of this feature, only the diner of the reservation reads or writes its order; for anyone else the reservation doesn't exist (404). A restaurant account gets 403 (US-4 S3). Restaurants read the orders of their own reservations through their own endpoints (US-20, US-22, US-36).
2. Writing requires the order to be open (`order_open`); otherwise 409, and nothing changes.
3. Writing requires a verified email (spec 007, US-51 S5; P13); otherwise 403 with its own message.
4. A write is one transaction: lock the reservation row `FOR UPDATE`; read its order **after** the lock; check rules 2 and 3 on the locked row; check every item against the menu (rule 5); then delete the old items with one `DELETE` statement and flush before inserting the new ones, and set `confirmed_at`. With no items, delete the order (its items cascade).
5. Each item must name a dish on the menu of the reservation's restaurant, with the name, price and preparation time the page showed. A dish that is missing, belongs to another restaurant or has a different value answers 409 and changes nothing (P9).
6. Checks run in this order, and the first failure answers: request shape (400), reservation not the diner's (404), not open (409), email not verified (403), no items and no order to remove (400), menu changed (409).
7. Input bounds: 0 to 50 items, unique dish ids, quantity 1 to 20, name 1 to 150 characters, price as a positive decimal with up to 10 digits and 2 decimals, preparation time null or a positive integer within the database `integer` range (400 otherwise).
8. Cancelling a reservation only changes `reservations.status`; it never deletes or edits its order (P12; US-18, US-25 and US-38 rely on it).
9. Nothing else writes orders; the restaurant-side stories only read them.

## Not in this model (on purpose)

- **Payments**: US-45 adds the payment method to the order; US-56 and US-60 add payment records that point at `orders`. The deposit (*seña*) belongs to the reservation or the restaurant (risk 1), not to the order. Until then, every order is unpaid with no method. Once payments exist, those stories decide what happens when a paid order is changed or emptied.
- **A different arrival time** (US-43) and **a restaurant-set preparation time per order** (US-40): both change `arrival_time` and the estimate in one function each. If US-40 adds an order-level time, the diner's re-confirmation (rule 4) must keep it.
- **Notes per dish** (`aclaraciones` in `scripts/sql/servido.sql`): no story asks for them.

## Migration

One Alembic migration after `006_reservations` creates both tables with their named constraints. No data changes: no order exists yet. If another branch adds a migration after `006_reservations` first, the second to merge rebases its `down_revision` instead of adding a merge migration.

# Data Model: US-34

## Dish (existing `platos` table)

| Domain field | Persisted field | Type / rule |
| --- | --- | --- |
| ID | `id_plato` | UUID primary key, unchanged |
| Restaurant | `id_restaurante` | Existing non-null restaurant FK |
| Name | `nombre` | Trimmed, nonblank, at most 150 characters |
| Description | `descripcion` | Optional, at most 2,000 characters; blank normalizes to null |
| Category | `categoria` | Required US-12 catalog: `entrada`, `plato_principal`, `postre`, `bebida` |
| Price | `precio` | Decimal / Numeric(10,2), finite, greater than zero, at most two decimals and within storage range |
| Photo URL | `foto_url` | Nullable existing local media URL |
| Dietary restrictions | `restricciones_alimenticias` | Existing JSON list, unique values from `sin_tacc`, `vegetariano`, `vegano`; empty allowed |
| Preparation time | `tiempo_preparacion_minutos` | Optional positive integer within PostgreSQL integer range |
| Available | `disponible` | Non-null boolean, existing default true |
| Created at | `creado_en` | Existing timezone-aware UTC timestamp |
| Deleted at | `deleted_at` | New nullable timezone-aware UTC timestamp; null means still managed in menu |
| Revision | `revision` | New non-null integer, default/server default 1, positive constraint |

Use English names for new fields, schemas and local variables; retain existing stored field names. New management request/response names are mapped in `contracts/dish-management.md`. Share US-12 normalization and validation; close storage-boundary gaps needed to keep invalid edits from causing 500s. Existing category and restriction values are compatibility values, not a new English catalog.

### Database invariants and migration

- Keep existing positive-price, nonblank-name and positive-preparation checks and all foreign keys.
- Add `revision > 0` and `deleted_at IS NULL OR disponible = false` checks.
- Replace the existing full name unique constraint with a unique partial index named `uq_platos_live_restaurante_nombre` on `(id_restaurante, nombre)` where `deleted_at IS NULL`.
- No index for scale or new table is needed.
- Existing rows become live (`deleted_at=NULL`) at revision 1. Backfill safely before enforcing new non-null constraints.
- Generate a new Alembic revision and review it, including the partial index predicate; do not edit applied migrations. Upgrade preserves all orders/carts and names.
- Downgrade cannot recreate full uniqueness if removed names were reused. Check for duplicate `(id_restaurante, nombre)` groups first and fail with an actionable migration error before destructive changes. Do not delete or rename historical rows to force downgrade. Test downgrade on compatible data and its refusal on duplicates.

### State transitions

| Current state | Action | Result |
| --- | --- | --- |
| Available (live, true) | Edit | Live with updated fields, availability unchanged |
| Unavailable (live, false) | Edit | Live with updated fields, still unavailable |
| Available | Disable | Unavailable; remains in owner menu |
| Unavailable | Enable | Available; returns to public menu |
| Either live state | Confirm removal | Deleted; `deleted_at` set, `disponible=false` |
| Either live state | Cancel removal | No request or mutation |
| Deleted | Repeat removal by same owner | Success, no new mutation |
| Deleted | Edit/enable/read management detail | 404; never restore |

Only effective changes increment revision. A stale expected revision produces a notice on success, not rejection. Removal is one-way; a newly created dish with the same name has a new UUID and no association to old order items.

## Restaurant

Existing account/restaurant relationship is unchanged. Derive ownership exclusively from authenticated claims. Check owner for reads and all mutations, including repeated removal. Foreign ownership is 403 and missing ID is 404; never disclose another owner's dish fields.

## Order and OrderItem

No schema change. `OrderItem.dish_id` retains its non-null `RESTRICT` FK, and its `dish_name`, `unit_price`, `quantity`, `prep_time_minutes` remain untouched by menu management. `Order.prep_start_time`, confirmation time, totals computed from copied items and restaurant views remain unchanged. A later explicit diner reconfirmation follows US-17 and is distinct from a menu mutation.

## Cart and CartItem

No schema change. Keep existing dish references and snapshots. Reconciliation compares them with live available dishes and removes unavailable/deleted lines in the UI with an explanation; copied prices/name/time update for review. Do not proactively rewrite a cart on restaurant save. The narrow empty-menu response adjustment is defined in `contracts/ui-and-order-integration.md`.

## Read predicates

Owner list: matching restaurant and `deleted_at IS NULL`, regardless of availability. Public menu, order menu and `has_menu`: matching restaurant, `deleted_at IS NULL` and `disponible=true`. Keep both existing menu query sites consistent. Empty categories remain absent because public adapters build sections only from returned dishes.

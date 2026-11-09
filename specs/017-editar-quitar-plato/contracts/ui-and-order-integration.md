# UI and Order Integration Contract — US-34

## Owner menu and edit page

- Existing route `/restaurante/menu` shows all owned, nondeleted dishes, including a text-labelled unavailable state. Add “Editar”, availability action (“Marcar como no disponible” / “Marcar como disponible”) and “Quitar plato”.
- Add `/restaurante/menu/:dishId/editar`. Load the owned detail, prefill the US-12 fields, permit photo keep/replace/remove, and save only after valid input. Show field errors; preserve entered values on network/validation failure. Save success returns to the menu with an accessible success/changed-since-open notice. Back/cancel performs no save.
- Use the detail revision for edit saves. For availability actions retrieve current detail/revision before mutation if the owner list has no revision. Do not maintain a second handwritten dish type.
- The removal Modal names the dish, explains irreversible removal and offers “Cancelar” and “Quitar plato”. Keep it open with an error on failure; disable repeat submission while pending. Escape/backdrop dismissal cancels; restore focus to the initiating action or a suitable remaining menu element after removal.
- Use TanStack Query and the typed API adapter for the touched menu/edit paths. Scope keys to account and dish ID. Invalidate the owner list, relevant detail and existing public restaurant queries after successful writes; delete invalid owned-detail data after removal. Never show another account's cached menu after sign-out/account change.
- Query invalidation is normal server-state synchronization, not a new cache layer. Other sessions see changes on their ordinary reload/refetch; no push/polling protocol is added.
- Reuse `Modal`, `TextField`, `Card`, `Button`, `StatusPill` and toast primitives from folder exports. Labels/errors are Argentine Spanish. Keyboard/focus behavior, visible focus, 360 px layout, token-based styling and reduced motion follow `docs/design/README.md`.

## Public menu

Both public/detail and order menus exclude unavailable and deleted dishes. Owner menus exclude only deleted dishes. Build categories from actual returned dishes so empty categories disappear. Optional photo removal renders the existing no-image presentation. No fixture restaurant management, new menu design or promotion editing is introduced.

## Diner order contract (existing endpoints retained)

`GET /api/reservations/{id}/order`, PUT order and cart endpoints keep their current payload shapes. Backend confirmation compares submitted name, unit price and preparation time with the current live available menu. Changed/absent dishes produce the existing 409 menu-changed response; failed confirmation never modifies the confirmed order. The page reloads current data, calls the existing reconciliation helper, displays changes and requires a fresh explicit confirmation. Missing dishes are automatically removed from the draft with an explanation. No automatic retry confirms an updated price.

Description, category, photo and dietary restrictions refresh through current menu reads and are not new historical order fields. Snapshot comparisons remain US-17's name/price/preparation-time checks.

## Last available dish

The existing empty-menu restriction remains: `order_open=false`, no new order/cart save or confirmation while no dishes are available. Time cutoff (45 minutes), cancelled reservations and access checks remain unchanged.

For an otherwise editable reservation whose last menu dish disappears:

1. A confirmation containing stale dishes receives menu-changed 409 rather than only the generic closed message. Separate time/status eligibility from menu presence when choosing this error; do not bypass authentication, ownership, verification or deadline policy.
2. GET exposes its existing saved cart snapshot while status/time remain eligible, even though `order_open=false`. This uses the existing nullable `cart` field; its presence is not permission to save. No contract schema extension is required.
3. The page reconciles the current draft (or loaded saved cart) against the empty menu before taking the closed rendering branch. Show the existing change notice there and accurate text such as “El restaurante no tiene platos disponibles por ahora.” Do not claim that the deadline passed.
4. Preserve and display any confirmed order from snapshots unchanged. Do not persist an empty replacement order automatically. A later menu restoration uses ordinary reload and reconciliation.

When closed because of cutoff/cancellation, keep ignoring saved carts as US-17 already does. Regression tests distinguish these reasons and prove the confirmed order survives both removal and menu restoration.

## Historical order readers

Diner and restaurant responses continue reading copied item values and the stored preparation start, not live dish data. Soft deletion keeps foreign keys intact. Menu operations never update `Order`, `OrderItem`, `Cart` or `CartItem`; only the diner's existing explicit actions may save/reconfirm a draft under US-17.

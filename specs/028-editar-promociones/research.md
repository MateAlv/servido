# Research — promotions (spec 028, US-48)

## Existing code this builds on

| Need | Where it already is |
| --- | --- |
| A restaurant-only CRUD with validation | `app/api/dish.py`, `app/api/closure.py`; `restaurant_from_claims` in `app/api/restaurant.py` |
| Money, time zones, 400 for validation | `AGENTS.md`, `app/services/availability.py` (`BUENOS_AIRES`), `app/main.py` (validation handler) |
| The order and its bill | `app/services/orders.py` (`OrderSummary`, `confirm_order`), `app/models/order.py`, `app/models/cart.py` |
| Restaurant order views | `app/services/restaurant_orders.py`, `app/api/restaurant.py` |
| Double submit protection | `closures.request_id` + unique constraint and 200 replay |
| Frontend restaurant page pattern | `pages/RestaurantClosuresPage.tsx`, `pages/MenuPage.tsx`, `components/ui` |
| Doubled totals in the browser | `frontend/src/lib/orderSummary.ts` already mirrors the backend's P2/P3 |
| Frozen data at confirmation | `pedido_items` copies the dish name and price (spec 009, P8) |

## Decisions and reasons

**D1 — P5 is implemented in full.** The spec's edge case P5 described a restaurant policy and a
per-promotion override that were missing from the Key Entities and FRs. The team resolved it on
19/11: `restaurantes.stack_promotions` plus `promotions.stackable`. The resolution rule is written
in `spec.md` and `data-model.md`: the largest saving by default; with stacking, the best
non-stackable promotion competes with the sum of the stackable ones.

**D2 — A single promotion wins by default.** P5's default option (a) is a single promotion. It is
also the simpler behaviour when the restaurant never touches the setting, and it keeps the first
release easy to explain.

**D3 — A fixed amount requires a minimum.** P1 requires `minimum_amount >= discount_value` for
`fixed`, which guarantees a non-negative total even without clamping. Percentages have no minimum
(P1, «Fuera»). The UI hides the field for percentages.

**D4 — Validity criteria are ANDed and inclusive.** Dates are inclusive (`starts_on <= date <=
ends_on`), weekdays are ISO (1 = Monday, like `OpeningShift.day_of_week`) and the time band includes
both ends, so a promotion 12:00–15:00 covers a reservation that starts at 15:00. All criteria are
evaluated against the arrival instant in `America/Argentina/Buenos_Aires`, as P3 asks.

**D5 — The state is derived, not stored.** `paused` when `active = false`; otherwise `expired` if
`ends_on` is in the past, `programmed` if `starts_on` is in the future, `active` otherwise. It is
computed at read time with today's date in Buenos Aires, so a promotion «expires» without a
scheduled job.

**D6 — The confirmed bill is frozen in `pedidos` + `pedidos_descuentos`.** The Key Entities asked
for a single `promocion_id`; with P5 a confirmed order can carry several promotions, so the snapshot
is a child table with one row per promotion (name and amount copied). P4's «copia de la promoción
aplicada» is satisfied by the copy, and later edits or pauses cannot touch it.

**D7 — The diner page uses only the normal menu total in this stage.** The page computes
`subtotal` and `total` from its dish quantities and prices. Promotions remain restaurant-only;
it does not receive promotion rules or show discount lines. If discount application is enabled
later, its backend contract and confirmation snapshots can be added as a separate change.

**D8 — The restaurant order view is where names appear.** The user asked explicitly for it: the
detail shows the subtotal, each applied promotion with its amount and the new total. The frozen
snapshot makes it stable after edits.

**D9 — Nothing is deleted.** «Pausar» is `active = false`; the spec leaves physical deletion out of
the MVP to keep traceability, so the API has no `DELETE`.

**D10 — Double submit uses `request_id`.** Like closures, the create body carries a client UUID and
the table has a unique constraint; a replay returns the stored promotion with 200. The form keeps
the same id until the save succeeds.

**D11 — No promotion exposure to the diner.** US-55 is a separate US. In this implementation,
the diner-facing order API and UI do not expose promotion values, names or discount totals.

**D12 — Orders without items carry no discount.** Confirming an empty order removes it (spec 009,
P11), so there is no bill to discount. Re-confirming after an edit recomputes and replaces the
snapshot.

**D13 — Existing orders are backfilled.** `subtotal`/`discount_amount`/`total` are not null, so the
migration fills the old rows from `pedido_items` with no discount. Test builders and any code that
creates an `Order` set them explicitly.

## Alternatives discarded

- **A restaurant-level discount column** (`restaurantes.descuento`): it cannot express the minimum,
  the validity window, pausing or more than one promotion.
- **Per-dish promotions**: out of scope (P2), and they would break when a dish is paused or deleted.
- **Coupons entered by the diner**: out of scope (US-55 is not this spec; the spec's «Fuera»).
- **Deleting promotions**: out of scope; a pause is reversible and keeps history.
- **A background job for validity**: unnecessary; the state is derived at read time.
- **Computing the discount only on save**: the page would show a total that doesn't match the
  visible lines for the 500 ms debounce, and the diner could confirm the old total.

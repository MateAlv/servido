# Research: Pedido Anticipado

**Feature**: `specs/009-pedido-anticipado` | **Date**: 2026-10-30

The team took these decisions on 30/10 before planning: P1–P4 by choosing among the options below, P5–P14 as defaults proposed with them. They are recorded in `specs/README.md` and all are pending PO validation.

## P1 — When an order is stored

**Decision**: the order being built (the cart) is saved in the diner's account, on the server, in its own tables (`carts`, `cart_items`), separate from confirmed orders. Each change is saved, so the cart survives a reload, a sign-out and a change of device. It is not part of the reservation: only «Confirmar pedido» turns it into the reservation's order, and the restaurant never reads carts. While there are unconfirmed changes the page says the restaurant doesn't see them yet. A confirmed order can be reopened, changed and confirmed again while more than 45 minutes remain before the reservation; then it is read-only. With two tabs or devices, the last saved change and the last confirmation win.

The team first chose a cart in the browser (`localStorage`) on 30/10, and Mateo replaced it the same day with this one, after checking that logged-in carts are usually stored on the server.

**Rationale**: the backlog distinguishes building ("eliminar un plato antes de confirmar el pedido", US-17; "si el pedido se modifica antes de confirmarlo", US-19) from the confirmed order, and US-20 shows the restaurant "solo pedidos confirmados". Keeping carts in their own tables keeps that line in the schema: every row of `orders` is a confirmed order, so US-20, US-22 and US-36 need no status filter. A logged-in diner expects what they picked on the phone to be there on the laptop, which a browser cart can't do. "No pueden modificarse cosas del pedido 45 minutos restantes al horario reservado" implies a confirmed order is editable before that point.

**Cost**: two more tables, two more endpoints (save and discard the cart) and one write per change, debounced in the page. It fits in US-17's 3 SP, but it is more work than the browser cart; the PM should know.

**Alternatives rejected**:
- Cart in the browser (`localStorage`), the first choice: simpler (no endpoints, no writes until confirming), but the cart belongs to one browser: it is lost on another device, and a diner who switches devices sees the confirmed order instead of what they were building.
- A draft status in `orders`: one table, but every restaurant-side query (US-20, US-22, US-36) must exclude drafts, and a bug there shows the kitchen an order nobody confirmed.
- Confirmed means closed: simpler, but contradicts the 45-minute rule, which only makes sense if changes are allowed before it.

## P2 — Estimated preparation time

**Decision**: the order's estimate is the longest preparation time among its dishes, whatever the quantities. Dishes without a time are left out, so with partial data the estimate is that of the slowest dish that has one; if none has one, no estimate is shown and nothing says it is missing.

**Rationale**: a kitchen cooks the dishes of one table in parallel; the order is ready when its slowest dish is. US-19 only asks that the estimate "corresponde a los platos incluidos". Hiding a missing estimate follows the rule the team set on 28/10 for occupancy (spec 002): missing data is hidden, never announced. The preparation time is optional in spec 007-agregar-plato (FR-006), so the demo restaurants need their times loaded (task T037).

**Alternatives rejected**: the sum of the dishes (four 20-minute dishes would read 80 minutes); the slowest dish plus a margin per extra dish (a made-up rule the team can't justify to the PO).

## P3 — Taxes in the bill

**Decision**: menu prices are final consumer prices, taxes included. The bill lists dish, quantity, unit price and subtotal; the total is the sum of the subtotals and reads «Impuestos incluidos».

**Rationale**: in Argentina prices shown to final consumers must already include taxes, so "el total incluye … impuestos aplicables" (US-21) holds without adding anything. Restaurants under the *monotributo* regime don't itemize VAT, so a computed VAT line would be wrong for some of them.

**Alternatives rejected**: showing «IVA incluido: $X» as 21/121 of the total (wrong for *monotributistas*); waiting for the PO before building the bill (blocks a 1 SP story for one line of text).

## P4 — How the diner reaches the order

**Decision**: «Armar pedido» on the confirmed reservation screen (spec 005, US-13 S5), and a minimal «Tus próximas reservas» list on the diner home with «Armar pedido», «Seguir armando» (a saved cart, on any device) or «Ver pedido» on each.

**Rationale**: there is no "my reservations" screen until US-23 (Sprint 4). Without the home list, a diner who leaves the confirmation can't get back to the order. The list shows only what the order needs (restaurant, date, time, party size, whether it has an order); the reservation detail stays in US-23. «Ver pedido» covers most of US-47 (Sprint 5); the spec states what US-47 keeps.

**Alternatives rejected**: only the confirmation screen (the order is lost once the diner leaves it); a notice in the restaurant detail (only reachable by going back to that restaurant).

## Smaller decisions (30/10)

| # | Decision | Why |
| --- | --- | --- |
| P5 | One order per reservation, for the whole party | The glossary defines an order as the dishes for one reservation (`docs/product/README.md`) |
| P6 | The 45-minute cutoff counts from the reservation start and applies to creating, changing and removing; a reservation that starts within 45 minutes takes no new order. The page shows it as a clock time («Podés cambiarlo hasta las 20:15») | US-17 says both "modificarse" and "agregarse"; creating is adding. A clock time is clearer than a countdown and is right at the boundary |
| P7 | Arrival time is the reservation start until US-43 (Sprint 5); the cutoff stays tied to the reservation start even after US-43 | US-20 orders by arrival time and needs a value now |
| P8 | Each item keeps the dish name, unit price and preparation time it had at confirmation; confirming a change re-takes the current values, which the diner sees before confirming | US-40: changes "no modifican los ya confirmados"; prices too, or the bill would change after the diner agreed to it |
| P9 | If the menu changed while the diner built the order (a dish gone, or a new name, price or time), the confirmation is refused and the page shows what changed and the updated order | The diner must agree to the amount they will pay (US-21) and know what they are ordering |
| P10 | 1 to 20 units per dish, at most 50 different dishes per order | Bounds every input (lesson of PR #29's security review). A larger party orders more than one kind of dish; the cap can be raised if the PO asks |
| P11 | Removing every dish of a confirmed order and confirming leaves the reservation without an order, after a confirmation dialog; an order never confirmed can't be confirmed empty | The diner can undo an order before the cutoff; nothing in the backlog forbids it |
| P12 | An order of a cancelled reservation counts as cancelled; cancelling a reservation never deletes or edits its order | US-18 S3 (spec 008); there is no order status to keep in sync |
| P13 | A diner with an unverified email can build an order but not confirm it; the page learns it from the confirmation's answer, not from a local check | Reading of spec 007, US-51 S5 («intento realizar un pedido… no me lo permite»): what is not allowed is placing it. Letting them build it keeps their work while they verify |
| P14 | A reservation at a restaurant without dishes offers no order, and nothing says the menu is missing | The rule of 28/10: missing data is hidden, never announced |

## Technical choices

- **No order status column.** Every stored order is confirmed (P1), and a cancelled reservation cancels its order (P12): the status is derived from the reservation. Avoids a second status that could disagree with the reservation's.
- **Totals, the estimate, the arrival time and the suggested preparation start are computed, not stored.** Each one is a function in `app/services/orders.py` (`order_summary`, `arrival_time`, `prep_start_time`), and every reader, including the restaurant stories, calls them. US-43 and US-40 then change one function each.
- **The confirmation replaces the whole order (PUT).** The page sends the full list it shows. This is idempotent, so a double click or a retry is harmless. The old items are removed with one `DELETE` statement before the new ones are inserted, because the ORM would insert first and break the unique (`order_id`, `dish_id`).
- **The page sends the name, price and time it showed for each dish.** The backend compares them with the current menu and answers a plain 409 when anything differs (P9). The page then reloads the order (which brings the current menu), compares it with what it had, and lists what changed. No polling.
- **The order endpoint returns the restaurant's menu**, with its own dish schema. The order page needs one request, and the public restaurant endpoint answers 404 once a restaurant stops being bookable, which must not hide the order of an existing reservation.
- **The cart is a pair of tables shaped like the order's** (`carts`, `cart_items`), one cart per reservation. Each item holds the dish id, the quantity and the name, price and time the diner saw: the menu's values when the dish was added, refreshed only after the page told the diner what changed. The page shows those values, and saves and confirmations send them, so the confirmation's comparison with the menu (P9) catches any change the diner hasn't seen, on any device. Saving replaces the whole cart (PUT), like the confirmation, under the same reservation lock. Confirming deletes the cart in the same transaction; «Descartar cambios» deletes it.
- **The page owns the cart while it is open and saves it debounced** (about 500 ms after the last change). Saves, the confirmation and the discard go through one queue, one request at a time: confirming sends the pending save at once, waits for it, then confirms, so the server has the latest cart if the confirmation fails (403, 401) and no save can land after the confirmation and recreate the cart. Discarding drops the pending save and waits for the one in flight. Leaving the page sends the pending save (with `keepalive` when the tab closes). The page doesn't refetch on window focus: a tab left open saves over changes made elsewhere (last change wins), and a reload shows them. A cart equal to the confirmed order is discarded, so changing something and changing it back leaves nothing unconfirmed.
- **Carts of closed orders are ignored, not cleaned up.** Once the deadline passes, or the reservation is cancelled or over, its cart is never returned or confirmed. The rows stay; a cleanup job would be a background worker the project doesn't need (`AGENTS.md`, ground rule 1). The one way an order closes and reopens is a restaurant that removes every dish and then adds one (P14); its carts come back, which is harmless.
- **Money in the browser is handled in integer cents** and formatted with up to two decimals, so totals add up with prices like $100,50 (SC-003). A confirmed order shows the subtotals and total the backend computed.
- **Order items keep the dish id with `ON DELETE SET NULL`.** No endpoint deletes dishes today (US-34, Sprint 4, may); the copied name and price keep a past order readable. Postgres treats NULLs as distinct, so this doesn't clash with the unique (`order_id`, `dish_id`).
- **The unverified-email rule is enforced in the backend** (403 with its own message), not only in the page. It applies to the confirmation only: an unverified diner can save a cart (P13).

## Open points for the PO and the team

- **US-22 in Sprint 3.** Of its criteria, only the total and the breakdown per dish can exist this sprint: the payment method arrives with US-45 (Sprint 5), and paid/pending with US-56 and US-60 (Sprint 6). The PM and the PO should decide whether US-22 moves or is accepted partially. Payment fields are not added to `orders` now ([data-model.md](data-model.md), "Not in this model").
- **The kitchen may start before the cutoff.** With a 60-minute dish, the suggested start is 60 minutes before arrival, but the diner can still change the order until 45 minutes before. Options: accept it, or make the cutoff the larger of 45 minutes and the order's estimate. Built as 45 minutes until the PO answers.
- **Cancellation after the cutoff.** US-25 allows cancelling a reservation up to 30 minutes before, after the order is closed and possibly being prepared (risk 1). A backlog-level question for US-25 and US-38, not this spec.
- **US-47 re-estimation**, since «Ver pedido» already covers most of it (P4).
- **US-15 has no owner** after the Sprint 3 poll; the order page shows the menu it describes (dishes by category with name, description and price). Whoever takes it should extend that menu instead of building a second one.
- **US-23** (Ver reserva activa, Sprint 4): «Tus próximas reservas» on the diner home is close to its «sección de reservas». Whoever takes US-23 should extend that list.
- **The server cart (P1) adds work to US-17**: two tables and two endpoints more than the browser cart. Still within its 3 SP by the team's estimate; to be told to the PM.
- **US-20 and US-22** (the teammates who took them in the poll) and **US-18** (spec 008, PR #30) read the tables defined here: they should confirm [data-model.md](data-model.md) before this spec is merged.
- The backlog workbook still lists US-17 for Integrante 4 and US-19 and US-21 for Integrante 5; the Sprint 3 poll (30/10) gave them to Mateo.

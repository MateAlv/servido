# Implementation Plan: Pedido Anticipado (Crear Pedido, Tiempo Estimado y Cuenta)

**Feature**: `specs/009-pedido-anticipado` | **Date**: 2026-10-30 | **Spec**: [spec.md](spec.md) | **US**: US-17, US-19, US-21 | **Sprint**: 3

**Input**: Feature specification from `/specs/009-pedido-anticipado/spec.md`

## Summary

From a confirmed reservation, the diner opens its order page, adds dishes from the restaurant's menu, changes quantities and removes dishes, and sees the estimated preparation time (US-19) and the bill with every item and the total (US-21) update with each change. Nothing is stored until «Confirmar pedido» (US-17); a confirmed order can be changed and confirmed again until 45 minutes before the reservation. The backend stores confirmed orders only, with each dish's name, price and preparation time as they were at confirmation, and computes totals, the estimate, the arrival time and the suggested preparation start in one service, so the restaurant-side stories of this sprint (US-20, US-22) read one consistent model. The diner reaches the page from the confirmed reservation screen and from a new «Tus próximas reservas» list on their home.

## Technical Context

**Language/Version**: Python 3.12 (backend) · TypeScript (frontend)

**Primary Dependencies**: FastAPI, SQLAlchemy 2, Alembic, Pydantic · React, Vite, React Router, TanStack Query, openapi-fetch, the design system in `frontend/src/components/` (see `docs/design/README.md`)

**Storage**: PostgreSQL 17 in Docker (locally, in CI and on the production instance)

**Testing**: pytest against a real Postgres in `backend/tests/`, with the fixed clock of spec 005 (`fixed_now`; routers and services call `availability.current_time()` through the module so the patch applies) · Vitest + Testing Library in `frontend/src/**/*.test.tsx`

**Target Platform**: Mobile-first web app: static SPA plus JSON API under `/api`

**Project Type**: Web application (backend + frontend)

**Performance Goals**: Only SC-001 (an order of 3 dishes in under 2 minutes, checked in the PO demo). The order page is one request; a confirmation is one transaction.

**Constraints**: AWS Free plan; no new services or dependencies. Datetimes stored in UTC; the 45-minute cutoff evaluated with `availability.current_time()` (Buenos Aires). The backend clock decides; the page never closes the order on its own clock.

**Scale/Scope**: 2 tables (`orders`, `order_items`) in one migration; 3 endpoints (read and confirm an order, the diner's upcoming reservations) and 3 fields added to `ReservationResponse`; 1 service module; 1 new page (`/reservas/:reservaId/pedido`), a button on the confirmed reservation step and a list on the diner home.

**New dependencies**: None.

**Open clarifications**: None in the spec. P1–P14 are team decisions of 30/10, pending PO validation ([research.md](research.md), `specs/README.md`); the PM accepted building ahead of that validation, as with specs 005 and 007. The open points for the PO and the team are at the end of research.md.

## Decisions (30/10, pending PO)

P1 the cart lives in the page until «Confirmar pedido», a confirmed order is editable until 45 minutes before, the last confirmation wins · P2 estimate = slowest dish with a time, hidden without data · P3 prices include taxes · P4 access from the confirmed step and the diner home · P5 one order per reservation · P6 the cutoff applies to creating, changing and removing, shown as a clock time · P7 arrival = reservation start · P8 name, price and time frozen at each confirmation · P9 a changed menu stops the confirmation and the page says what changed · P10 1–20 units, 50 dishes · P11 an empty confirmation removes the order after a dialog · P12 a cancelled reservation cancels its order · P13 an unverified diner builds but doesn't confirm · P14 no order offered without a menu. Rationale and rejected alternatives: [research.md](research.md).

## Design

### Data model ([data-model.md](data-model.md))

`orders` (one per reservation, unique `reservation_id`, `confirmed_at`) and `order_items` (copied dish name, unit price and preparation time; quantity 1–20; unique dish per order). No status column and no stored totals: both are derived. The database enforces one order per reservation, non-blank names, positive prices and times, and the quantity bounds.

### API ([contracts/orders-api.md](contracts/orders-api.md))

- `GET /api/reservations/{id}/order` — the reservation (with `order_open` and `order_deadline`), the confirmed order with subtotals, total and estimate, and the menu.
- `PUT /api/reservations/{id}/order` — confirm: replaces the order with the items sent; empty items remove it. Checks in a fixed order: 400 shape, 404 not the diner's, 409 closed, 403 unverified, 409 menu changed.
- `GET /api/reservations/upcoming` — the diner's confirmed reservations that haven't started, for the home list.
- `ReservationResponse` gains `has_order`, `order_open` and `order_deadline`.

### Backend

- `app/api/deps.py`: `require_diner` and `DINERS_ONLY` move here from `app/api/reservation.py`, since a second router needs them.
- `app/models/order.py`: `Order`, `OrderItem` (relationship with `passive_deletes=True`); imported in `app/models/__init__.py`.
- `app/services/orders.py`: `ORDER_CUTOFF_MINUTES = 45`, `MAX_UNITS_PER_DISH = 20`, `MAX_DISHES = 50`; `menu_dishes`, `order_deadline`, `order_open`, `arrival_time`, `prep_start_time`, `order_summary` (the only place each rule lives), and `confirm_order(session, diner_id, reservation_id, items, now)` following data-model.md rules 4–6: lock the reservation, read the order after the lock, check open, verified and the menu, then `DELETE` the old items and flush before inserting, or delete the order. Errors as small exception classes the router maps to 403/409 (`OrderClosedError`, `EmailNotVerifiedError`, `MenuChangedError`), like `availability.ConfirmationConflictError`.
- `app/api/order.py`: the two order routes; mounted in `app/api/__init__.py`.
- `app/api/reservation.py`: `GET /reservations/upcoming`, and `reservation_response(session, reservation, restaurant, now)` filling the three new fields for every caller (`POST /reservations`, the day list, upcoming, the order page).
- `app/schemas/order.py`: `OrderItemRequest` (`quantity` 1–20, `name`, `unit_price` `Decimal` with `gt=0, max_digits=10, decimal_places=2`, `prep_time_minutes` nullable, compared but never stored), `OrderRequest` (at most 50 items, unique `dish_id`), `OrderItemResponse` (nullable `dish_id`), `OrderResponse`, `OrderMenuDish`, `OrderPageResponse`.

### Frontend

**Route and access.** `/reservas/:reservaId/pedido` → `pages/OrderPage.tsx`. As in `ReservationPage`, the page itself sends a visitor to `/ingresar?volver=…` and a restaurant account home. A 401 from the confirmation (a mutation) calls `signOut` in the page; after signing in, `?volver=` brings the diner back and the cart is still in `localStorage`.

**Layout (mobile first, 360 px).**
- Top: the reservation summary (restaurant, date, time, party size) and «Podés cambiarlo hasta las 20:15» (`order_deadline`).
- Menu: dishes grouped by category with labels «Entradas», «Platos principales», «Postres», «Bebidas»; empty categories skipped. Each dish shows name, price and, only when present, description, photo thumbnail (empty `alt`), preparation time («10 min», accessible name «Se prepara en 10 min») and dietary restriction labels (the ones of the menu page: «Sin TACC», «Vegetariano»…). An `AddToOrderButton` per dish; once added, a `QuantityStepper`, swapped after the button's "¡Agregado!" animation, with focus moved to the stepper's increase button.
- «Tu pedido»: one row per item with its stepper. At quantity 1 the decrease button reads «Sacar Provoleta del pedido» and removes it; there is no separate remove button. On removal, focus goes to the next item, or to the dish's add button if none is left, and a polite message says «Provoleta: lo sacaste del pedido». At 20 the increase button is disabled with a visually hidden «Máximo 20 por plato».
- Estimate (US-19), when there is one: «Preparación: unos 25 min», and under it «La cocina lo prepara para tu llegada a las 21:00».
- Bill (US-21): «Total del pedido» with «Impuestos incluidos», and a `<button aria-expanded aria-controls>` «Ver detalle de la cuenta» / «Ocultar detalle» that opens a `<table>` with `<caption>Detalle de la cuenta</caption>` and `th scope="col"`. At 360 px each row shows the dish, then «2 × $7.500» and the subtotal. Money is formatted like the menu page, with up to two decimals.
- Bottom bar on phones (toasts on this page rise above it through a CSS variable, `--toast-bottom`, that `Toast.module.css` reads with its current 24px as the default and `OrderPage` sets while mounted): «3 platos · $33.500» with «Impuestos incluidos» underneath, and the primary button on the right. While the cart differs from the confirmed order it also reads «Sin confirmar: el restaurante todavía no lo ve». The page gets bottom padding of the bar height plus `env(safe-area-inset-bottom)`, plus `scroll-padding-bottom`, so the bar never hides focus (WCAG 2.4.11). Tapping the count scrolls to «Tu pedido».
- Live updates: one visually hidden polite region, debounced about 600 ms, says «Total $33.500. Preparación: unos 25 min.» `RollingNumber` has no `aria-live` of its own.

**States.**
- Empty cart, no order: no disabled button, only «Agregá platos del menú para armar tu pedido.»
- Building, or changed after confirming: «Confirmar pedido» (or «Confirmar cambios»), and «Descartar cambios» as a ghost button, which shows «Volviste al pedido confirmado.»
- Confirmed: focus moves to a heading «¡Pedido confirmado!» with «El restaurante ya lo tiene. Podés cambiarlo hasta las 20:15.» and «Ir al inicio».
- Emptying a confirmed order: the button becomes «Quitar pedido», which opens a `Modal` «¿Quitás tu pedido?» / «Tu reserva sigue en pie, pero el restaurante no va a tener platos preparados para tu llegada.» with «Quitar pedido» and «Volver».
- Closed with an order: the order read-only, without steppers or buttons, and «Tu pedido ya está cerrado. Se podía cambiar hasta las 20:15.»
- Closed without an order: «Ya no se pueden hacer pedidos para esta reserva. Igual te esperamos a las 21:00.» with «Ir al inicio». The menu is hidden.
- Unverified email: the confirm button stays active and the page sends the confirmation; on the 403 it shows «Para confirmar, verificá tu email. Tus platos quedan guardados en este dispositivo.» next to `UnverifiedNotice` and its resend button. No local check, so a closed order still answers «closed» first and a diner who verified in another tab can confirm. That notice's text changes from «para poder hacer pedidos» to «para confirmar pedidos».
- 409 menu changed: an inline notice (`role="alert"`, focused, like `ReservationPage`'s return notice) lists each change («Cambió el precio de Provoleta: $7.500 → $8.000.», «Bife de chorizo ya no está en el menú, lo sacamos.») with the updated cart, comparing the reloaded menu with the values the cart stored. The same comparison runs when the page loads a cart whose dishes changed, and when reopening a confirmed order whose items differ from the menu.
- 409 closed: the page reloads into the closed state and focuses its message.
- Errors: loading failed shows «No pudimos cargar tu pedido.» with «Reintentar». A failed confirmation shows «No pudimos confirmar tu pedido. Tus platos siguen acá, probá de nuevo.» A 404 shows «No encontramos esa reserva.» with «Ir al inicio».

**Cart and money.**
- `lib/cart.ts` stores, under `servido:pedido:<reservationId>` in `localStorage`, `{confirmedAt, items: {dishId, quantity, name, unitPrice, prepTimeMinutes}[]}`: the values as shown when each dish was added, used only to say what changed. Every read and write is wrapped in `try`/`catch`.
- The cart is cleared on confirm, on discard and when the order loads closed. It is dropped when the server's `confirmed_at` differs from the stored one (a stale cart, P1).
- Items whose dish left the menu are dropped, with the menu-changed notice.
- `lib/orderSummary.ts` computes subtotals, the total and the estimate in integer cents, with the backend's rules. The confirmed order shows the backend's strings.

**API.** `api/orders.ts`: `fetchOrder`, `confirmOrder`, `fetchUpcomingReservations`, with the `SessionExpiredError` handling of spec 005.

**Entry points.**
- `pages/reservation/ConfirmedStep.tsx`, when `order_open`:
  - «Armar pedido» as the primary button and «Ir al inicio» as secondary;
  - the hint «Elegí tus platos ahora y los tenemos en cuenta para tu llegada. Podés cambiarlo hasta las 20:15.»
- `pages/home/DinerHome.tsx`, «Tus próximas reservas», shown only when there are any:
  - each card shows «Hoy/Mañana/fecha · 21:00 · 4 personas»;
  - when `order_open` and this browser has a cart for it: «Pedido sin confirmar» (no order yet) or «Pedido confirmado · con cambios sin confirmar», and «Seguir armando»;
  - otherwise, with an order: a «Pedido confirmado» `StatusPill` and «Ver pedido»;
  - otherwise, when `order_open`: «Armar pedido»;
  - else nothing.
  - The list is refetched after confirming an order.
- `pages/RestaurantDetailPage.tsx` keeps no way to order (US-17 S2). Its «Próximamente» text only applies to the test restaurants, which can't be booked.

**Design system.** New shared pieces, if any (for example the bill table), go in `components/order/` with their entry in `/diseno` and `docs/design/README.md`.

## Constitution Check

| Principle | Gate | Pass |
| --- | --- | --- |
| I. Backlog-bound scope | US-17, US-19, US-21, plus the minimal access of P4; no drafts, payments, notes per dish or restaurant views. The home list is an entry point, not US-23; the overlap with US-47 and US-15 is stated in the spec | [x] |
| II. Spec before code | Spec, plan and tasks reviewed and merged in their own PR before any code. **P1–P14 are pending PO validation**; the PM accepted building ahead of it | [x] with risk |
| III. Every scenario tested | Every scenario in the map below; one order per reservation, quantity bounds, non-blank names and positive prices are database constraints | [x] |
| IV. Humans own AI output | Two tables, one service, one page; reviewed by agents and by teammates before merging | [ ] pending approval |
| V. Simple, cheap, conventional | No new dependency or service; `localStorage` is the browser's | [x] |

## Acceptance Scenario → Test Map

Backend tests in `backend/tests/test_order.py`; frontend tests in `frontend/src/pages/OrderPage.test.tsx` unless noted.

| Scenario | Backend | Frontend |
| --- | --- | --- |
| US-17 S1 added dish listed with its quantity | `test_us17_s1_confirmed_order_lists_each_dish_and_quantity` | `US-17 S1 adds a dish to the order list with its quantity` |
| US-17 S2 an order needs a reservation of the diner | `test_us17_s2_order_of_an_unknown_or_foreign_reservation_is_not_found` | `US-17 S2 says the reservation was not found`; `MapPage.test.tsx` › `US-17 S2 the restaurant detail offers no way to order` |
| US-17 S3 increase and decrease | — (the page holds the cart) | `US-17 S3 increases and decreases the quantity of a dish` |
| US-17 S4 remove a dish | — | `US-17 S4 removes a dish from the order` |
| US-17 S5 total follows each change | — | `US-17 S5 updates the total when the order changes` |
| US-17 S6 explicit confirmation | `test_us17_s6_confirmation_stores_the_order` | `US-17 S6 stores nothing and says so until the diner confirms`, `US-17 S6 confirms the order` |
| US-17 S7 change a confirmed order | `test_us17_s7_confirming_again_replaces_the_order` | `US-17 S7 changes a confirmed order and confirms again` |
| US-17 S8 closed within 45 minutes | `test_us17_s8_no_new_order_within_45_minutes`, `test_us17_s8_no_change_within_45_minutes` | `US-17 S8 shows the order read-only once closed` |
| US-17 S9 the deadline passed while editing | (the S8 tests: 409 and nothing changes) | `US-17 S9 explains the order can no longer change when the confirmation is late` |
| US-17 edge: the menu changed (P9) | `test_us17_edge_changed_name_price_or_time_answers_409`, `test_us17_edge_dish_gone_answers_409`, `test_us17_edge_dish_of_another_restaurant_answers_409` | `US-17 edge says what changed in the menu` |
| US-17 edge: frozen values (P8) | `test_us17_edge_confirmed_order_keeps_its_values_when_the_menu_changes` | — |
| US-17 edge: empty confirmation (P11) | `test_us17_edge_confirming_no_dishes_removes_the_order`, `test_us17_edge_empty_first_order_is_rejected` | `US-17 edge asks before removing the whole order` |
| US-17 edge: unverified email (P13; spec 007 US-51 S5) | `test_us51_s5_unverified_diner_cannot_order`, `test_us17_edge_closed_wins_over_unverified` | `US-17 edge asks an unverified diner to verify and keeps the dishes` |
| US-17 edge: cancelled reservation (P12) | `test_us17_edge_cancelled_reservation_takes_no_order` | — |
| US-17 edge: roles, privacy, input | `test_us17_edge_restaurant_token_gets_403`, `test_us17_edge_requires_a_token`, `test_us17_edge_rejects_out_of_bounds_items` | `US-17 edge sends a visitor to sign in and back` |
| US-17 edge: reload, stale cart, expired session | — | `US-17 edge keeps the order being built when the page reloads`, `US-17 edge drops a cart older than the confirmed order`, `US-17 edge keeps the order when the session expired at confirmation`; `frontend/src/lib/cart.test.ts` |
| US-17 FR-011 entry points (P4, P14) | `test_us17_edge_reservation_says_whether_it_takes_an_order`, `test_us17_edge_restaurant_without_menu_takes_no_order`, `test_us17_edge_upcoming_lists_only_future_confirmed_reservations_of_the_diner` | `ReservationPage.test.tsx` › `US-17 edge offers to build the order after confirming the reservation`; `HomePage.test.tsx` › `US-17 edge lists the upcoming reservations with their order` |
| US-19 S1 estimate shown | `test_us19_s1_order_returns_its_estimated_time` | `US-19 S1 shows the estimated time while building and once confirmed` |
| US-19 S2 slowest dish | `test_us19_s2_estimate_is_the_slowest_dish` | `frontend/src/lib/orderSummary.test.ts` › `US-19 S2 the estimate is the slowest dish with a time` |
| US-19 S3 updates with changes | — | `US-19 S3 updates the estimate when dishes change` |
| US-19 S4 no estimate without data | `test_us19_s4_no_estimate_without_preparation_times` | `US-19 S4 shows no estimate when no dish has a time` |
| US-21 S1 value of each item | — | `US-21 S1 opens the bill detail with the value of each item` |
| US-21 S2 total with taxes included | `test_us21_s2_total_is_the_sum_of_the_subtotals` | `US-21 S2 shows the total with taxes included` |
| US-21 S3 breakdown per item | `test_us21_s3_each_item_has_quantity_unit_price_and_subtotal` | `US-21 S3 lists dish, quantity, unit price and subtotal`; `orderSummary.test.ts` › `US-21 S3 adds prices with cents exactly` |
| US-20 helpers (for the restaurant stories) | `test_us17_edge_arrival_and_suggested_preparation_start` | — |

SC-001 is checked in the PO demo; SC-002 by the S8 tests; SC-003 and SC-004 by the US-21 and US-19 tests on both layers; SC-005 by the S6 test (only the confirmation writes) and the frozen-values edge.

## Project Structure

### Documentation (this feature)

```text
specs/009-pedido-anticipado/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md · tasks.md
├── checklists/requirements.md
└── contracts/orders-api.md
```

### Source Code (repository root)

```text
backend/
├── app/api/deps.py                           # ~ require_diner and DINERS_ONLY moved here
├── app/models/order.py                       # + Order, OrderItem; ~ app/models/__init__.py
├── migrations/versions/007_orders.py         # + `make migration m="orders"`, renamed, revision "007_orders"
├── app/services/orders.py                    # + menu, deadline, open, arrival, prep start, summary, confirmation
├── app/api/order.py                          # + GET/PUT /reservations/{id}/order; ~ app/api/__init__.py
├── app/api/reservation.py                    # ~ GET /reservations/upcoming, reservation_response fields
├── app/schemas/order.py                      # + request, responses, OrderMenuDish
├── app/schemas/reservation.py                # ~ has_order, order_open, order_deadline, UpcomingReservationsResponse
└── tests/test_order.py                       # + acceptance tests; ~ tests/reservations.py (verify_diner, add_dish, add_order)
frontend/src/
├── api/openapi.json, schema.d.ts             # ~ `make api-types`
├── api/orders.ts                             # + fetchOrder, confirmOrder, fetchUpcomingReservations
├── pages/OrderPage.tsx                       # + with OrderPage.module.css and OrderPage.test.tsx
├── lib/cart.ts · lib/orderSummary.ts         # + with tests
├── pages/reservation/ConfirmedStep.tsx       # ~ «Armar pedido»
├── pages/home/DinerHome.tsx                  # ~ «Tus próximas reservas»
├── components/access/UnverifiedNotice.tsx    # ~ «para confirmar pedidos»
├── components/ui/Toast.module.css            # ~ bottom offset from --toast-bottom (default unchanged)
├── components/order/                         # ~ only if a piece is shared (bill table)
└── router.tsx                                # ~ /reservas/:reservaId/pedido
```

**Structure Decision**: the standard layout. The order routes get their own router module because they are a new resource; the upcoming list stays with the other diner reservation reads.

## Risks

| Risk | Mitigation |
| --- | --- |
| The PO rejects one of P1–P14 | Each is local: P2 and P3 are display rules in one function per layer; P6 and P10 are constants; P1 is the only one that would add a stored draft |
| US-20 and US-22 (other teammates) need a different model | This spec PR is merged before any code, after they confirm data-model.md; the derived values they need are functions they call |
| US-22 can't be complete in Sprint 3 (no payments yet) | Raised to the PM and PO in research.md; no payment columns are added speculatively |
| PR #30 (spec 008) also edits `schemas/reservation.py` and `router.tsx` | Trivial conflicts; rebase and rerun `make api-types` |
| The menu changes while a diner builds an order | The confirmation compares every item with the menu (P9), answers 409 with nothing changed, and the page lists the changes |
| Replacing items trips the unique (`order_id`, `dish_id`) | Bulk `DELETE` and flush before inserting (data-model rule 4); covered by the S7 test, which keeps a dish |
| Prices with cents don't add up in the browser | Integer cents in `orderSummary.ts`, tested with cents; the confirmed order shows the backend's amounts |
| Two tabs confirm different orders | The confirmation replaces the order under a row lock; the last one wins, and the other tab drops its stale cart on reload |

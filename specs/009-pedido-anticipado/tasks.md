---

description: "Task list for pedido anticipado (US-17, US-19, US-21, Sprint 3)"
---

# Tasks: pedido anticipado

**Input**: Design documents from `/specs/009-pedido-anticipado/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/orders-api.md](contracts/orders-api.md), [quickstart.md](quickstart.md)

**Tests**: REQUIRED. The constitution (principle III) requires at least one automated test per acceptance scenario, named after its US and scenario. Test tasks come first and must fail before the implementation.

**Organization**: Phase 1 is the shared model, service and API every story needs. Phases 2–4 follow spec.md (US-17, US-19, US-21); US-19 and US-21 are small and build on the US-17 page.

**Process note**: this spec, plan and task list are merged in their own PR before any code (decision of 30/10), so the teammates of US-20, US-22 and US-18 can review the order model first.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependencies)
- **[Story]**: backlog US number
- Exact file paths in every task

---

## Phase 0: Specification

- [X] T001 Take decisions P1–P4 with the team before writing the spec (30/10); propose P5–P14 with them. Recorded in `specs/009-pedido-anticipado/research.md` and `specs/README.md`
- [X] T002 Write `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/orders-api.md`, `quickstart.md` and this file; link US-17, US-19 and US-21 to spec 009 in `docs/product/backlog.md`
- [X] T003 Independent review by four agents (backlog fidelity, technical design against the code, UX and accessibility, impact on the other stories); every finding applied or recorded as an open point in research.md. Then P1 changed from a browser cart to a server cart in its own tables (Mateo, 30/10), across every document
- [X] T004 Review of the spec PR by teammates (approved on the team's WhatsApp, 30/10): whoever took US-20 and US-22 in the Sprint 3 poll, and Ezequiel for US-18 (spec 008, PR #30). Each confirms (a) the model covers their reads, (b) `arrival_time`, `prep_start_time` and the ordering, (c) that payment fields wait for US-45, US-56 and US-60, (d) the derived cancellation with no order status, (e) that carts are never read by the restaurant side. Merge before T006
- [ ] T005 PO validation of P1–P14 and answers to the open points of research.md (sprint review); record them in `specs/README.md`

---

## Phase 1: Foundational (blocking)

**Purpose**: the order and cart tables, the rules that compute totals and the estimate, and the endpoints.

- [ ] T006 Move `require_diner` and `DINERS_ONLY` from `backend/app/api/reservation.py` to `backend/app/api/deps.py` and update their imports
- [ ] T007 Create `Order`, `OrderItem`, `Cart` and `CartItem` in `backend/app/models/order.py` per `data-model.md` (unique `reservation_id` on orders and carts; unique (`order_id`, `dish_id`) and (`cart_id`, `dish_id`); `ON DELETE SET NULL` on the dish; `ON DELETE CASCADE` on the order and the cart with `passive_deletes=True`, and from the reservation to its cart; quantity 1–20; non-blank name; positive price and time; `confirmed_at` and `updated_at` not null; item columns shared through a mixin) and import them in `backend/app/models/__init__.py`
- [ ] T008 Generate the migration with `make migration m="orders"`, rename it to `backend/migrations/versions/007_orders.py` and set `revision = "007_orders"` by hand, as the earlier migrations did; review it: the four tables, every constraint named, `down_revision = "006_reservations"`, no data changes
- [ ] T009 Add `verify_diner`, `add_dish`, `add_order` and `add_cart` builders to `backend/tests/reservations.py`, next to `diner_headers` and `add_reservation` (the existing diner builder leaves the email unverified, and confirming requires a verified one)
- [ ] T010 Write `backend/app/services/orders.py`:
  - constants `ORDER_CUTOFF_MINUTES = 45`, `MAX_UNITS_PER_DISH = 20` and `MAX_DISHES = 50`;
  - `menu_dishes`, `order_deadline`, `order_open`, `has_cart`, `arrival_time`, `prep_start_time` and `order_summary`;
  - `confirm_order`, which follows data-model.md rules 4–6: lock the reservation `FOR UPDATE` and read the order after the lock; check in order closed → unverified → nothing to remove → menu; then bulk-`DELETE` the old items and flush before inserting, or delete the order; and delete the cart in the same transaction;
  - `save_cart` (data-model.md rule 7: same lock, closed → dish off the menu, replace the items) and `discard_cart`;
  - errors `OrderClosedError`, `EmailNotVerifiedError` and `MenuChangedError`.
- [ ] T011 [P] Write `backend/app/schemas/order.py` per `contracts/orders-api.md`:
  - `OrderItemRequest`: `quantity` 1–20, `name` 1–150 characters, `unit_price` `Decimal(gt=0, max_digits=10, decimal_places=2)`, `prep_time_minutes` nullable, positive, within the database `integer` range.
  - `OrderRequest`: at most 50 items, unique `dish_id`.
  - Responses: `OrderItemResponse` (nullable `dish_id`), `OrderResponse`, `CartResponse`, `OrderMenuDish` and `OrderPageResponse` (with `cart`).
- [ ] T012 Add `has_order`, `has_cart`, `order_open` and `order_deadline` to `ReservationResponse` in `backend/app/schemas/reservation.py`; change `reservation_response` in `backend/app/api/reservation.py` to `(session, reservation, restaurant, now)` and update its callers
- [ ] T013 Write `backend/app/api/order.py` with `GET` and `PUT /reservations/{reservation_id}/order`, and `PUT` and `DELETE /reservations/{reservation_id}/cart` (404 when the reservation isn't the diner's, 403/409 mapped from the service errors, `responses=` documented), and mount it in `backend/app/api/__init__.py`
- [ ] T014 Add `GET /reservations/upcoming` to `backend/app/api/reservation.py` (confirmed, not started, soonest first, at most 20)
- [ ] T015 Run `make api-types` and commit `frontend/src/api/openapi.json` and `schema.d.ts`
- [ ] T016 [P] Write `frontend/src/api/orders.ts`: `fetchOrder`, `confirmOrder`, `saveCart`, `discardCart` and `fetchUpcomingReservations`, with the `SessionExpiredError` handling of `api/errors.ts`, and the order types from `schema.d.ts`
- [ ] T017 [P] Write `frontend/src/lib/orderSummary.ts` (integer cents; subtotal, total, estimate with the backend's rules; money formatted with up to two decimals) and `frontend/src/lib/useOrderCart.ts` (items with each dish's id, quantity and shown name, price and time; saved with `saveCart` about 500 ms after the last change, one save in flight, the latest wins; saves, confirmation and discard in one queue, one request at a time: confirming sends the pending save, waits, then confirms; discarding drops it and waits; `discardCart` when the last item goes with no order or the items equal the order's; the pending save sent on unmount and on `pagehide` with `keepalive`; the menu-changed 409 keeps local items), with `orderSummary.test.ts` and `useOrderCart.test.ts`. T017 needs T016

**Checkpoint**: the API answers every case of the contract; the page can start.

---

## Phase 2: US-17 — Crear pedido 🎯

**Goal**: from a confirmed reservation the diner builds, confirms and changes the order until 45 minutes before.

**Independent Test**: the US-17 rows of [quickstart.md](quickstart.md).

### Tests for US-17 (write first; they must fail before the implementation)

- [ ] T018 [P] [US17] Backend scenarios in `backend/tests/test_order.py`:
  - `test_us17_s1_confirmed_order_lists_each_dish_and_quantity`
  - `test_us17_s2_order_of_an_unknown_or_foreign_reservation_is_not_found`
  - `test_us17_s6_confirmation_stores_the_order`
  - `test_us17_s6_a_saved_cart_is_not_an_order`
  - `test_us17_s7_confirming_again_replaces_the_order` (keeps one dish, to cover the unique key)
  - `test_us17_s8_no_new_order_within_45_minutes`
  - `test_us17_s8_no_change_within_45_minutes`
- [ ] T019 [P] [US17] Backend edges in `backend/tests/test_order.py`. Every name listed in the plan's test map under US-17 edges and FR-011, including:
  - `test_us17_edge_dish_of_another_restaurant_answers_409`
  - `test_us17_edge_empty_first_order_is_rejected`
  - `test_us51_s5_unverified_diner_cannot_order` (the name spec 007's plan reserved for US-51 S5)
  - `test_us17_edge_closed_wins_over_unverified`
  - `test_us17_edge_restaurant_without_menu_takes_no_order`
  - `test_us17_edge_arrival_and_suggested_preparation_start`
  - the saved-cart edges (P1), as named in the plan's test map, including `test_us17_edge_cart_of_a_closed_order_is_hidden` and `test_us17_edge_empty_cart_kept_only_with_an_order`
- [ ] T020 [P] [US17] Frontend scenarios in `frontend/src/pages/OrderPage.test.tsx` (`US-17 S1` to `US-17 S9`, as named in the plan's test map) and `MapPage.test.tsx` › `US-17 S2 the restaurant detail offers no way to order`
- [ ] T021 [P] [US17] Frontend edges in `frontend/src/pages/OrderPage.test.tsx`, every `US-17 edge` name of the plan's test map exactly as written there:
  - the menu changed, removing the whole order, the unverified diner, the visitor redirect;
  - the saved-cart edges, including `US-17 edge does not recreate the cart when a save is in flight at confirmation`, `US-17 edge says when a change could not be saved` and `US-17 edge closes the order when a save arrives late`;
  - the queue rules in `frontend/src/lib/useOrderCart.test.ts`.

  Also `ReservationPage.test.tsx` › `US-17 edge offers to build the order after confirming the reservation`, and `HomePage.test.tsx` › `US-17 edge lists the upcoming reservations with their order`. Mock the upcoming endpoint in the existing `HomePage.test.tsx` tests.

### Implementation for US-17

- [ ] T022 [US17] Create `frontend/src/pages/OrderPage.tsx` and `OrderPage.module.css` following the plan's Frontend section:
  - layout, states and copy;
  - focus management and the debounced live region;
  - the bottom bar, with its padding and `scroll-padding-bottom`;
  - the visitor and restaurant redirects inside the page;
  - `signOut` on a 401 from a save or the confirmation.
- [ ] T023 [US17] Add the route `/reservas/:reservaId/pedido` in `frontend/src/router.tsx`
- [ ] T024 [US17] Add «Armar pedido» (primary) and its hint to `frontend/src/pages/reservation/ConfirmedStep.tsx` when `order_open`
- [ ] T025 [US17] Add «Tus próximas reservas» to `frontend/src/pages/home/DinerHome.tsx`:
  - hidden when there are none;
  - per the plan's Entry points: `has_cart` gives «Seguir armando»; otherwise «Ver pedido», «Armar pedido» or nothing;
  - refetched after a confirmation, a save or a discard settles.
- [ ] T026 [P] [US17] Change `frontend/src/components/access/UnverifiedNotice.tsx` to say «para confirmar pedidos», and make `frontend/src/components/ui/Toast.module.css` read its bottom offset from `--toast-bottom` (default 24px, unchanged elsewhere), which `OrderPage` sets while mounted

**Checkpoint**: US-17 works end to end and its scenario tests pass.

---

## Phase 3: US-19 — Ver tiempo estimado

**Goal**: the order shows the slowest dish's time, updated with every change, and nothing without data.

- [ ] T027 [P] [US19] Backend tests in `backend/tests/test_order.py`: `test_us19_s1_order_returns_its_estimated_time`, `test_us19_s2_estimate_is_the_slowest_dish`, `test_us19_s4_no_estimate_without_preparation_times`
- [ ] T028 [P] [US19] Frontend tests: `US-19 S1`, `US-19 S3` and `US-19 S4` in `OrderPage.test.tsx`; `US-19 S2` in `frontend/src/lib/orderSummary.test.ts`
- [ ] T029 [US19] Show «Preparación: unos N min» and «La cocina lo prepara para tu llegada a las HH:MM» in «Tu pedido», and each dish's time in the menu, all hidden when there is no time

**Checkpoint**: US-19 scenario tests pass.

---

## Phase 4: US-21 — Ver cuenta y total a pagar

**Goal**: the total with «Impuestos incluidos» and a bill with every item.

- [ ] T030 [P] [US21] Backend tests in `backend/tests/test_order.py`: `test_us21_s2_total_is_the_sum_of_the_subtotals`, `test_us21_s3_each_item_has_quantity_unit_price_and_subtotal`
- [ ] T031 [P] [US21] Frontend tests: `US-21 S1`, `US-21 S2` and `US-21 S3` in `OrderPage.test.tsx`; `US-21 S3 adds prices with cents exactly` in `orderSummary.test.ts`
- [ ] T032 [US21] Add «Total del pedido» («Impuestos incluidos», `RollingNumber`) and the «Ver detalle de la cuenta» disclosure with the bill table to `OrderPage.tsx`. If the table is reused elsewhere, move it to `frontend/src/components/order/` with its `/diseno` entry and a row in `docs/design/README.md`

**Checkpoint**: US-21 scenario tests pass.

---

## Phase 5: Wrap-up

- [ ] T033 Run `make format lint test`, and check that every scenario of the plan's test map has its test
- [ ] T034 Walk through [quickstart.md](quickstart.md) locally, at 360 px and with the keyboard
- [ ] T035 Update the docs:
  - `AGENTS.md`: "Where things stand", routes and endpoints, glossary rows `OrderItem` and `Cart` / `CartItem` (Pedido en armado);
  - `specs/README.md`: index, implemented;
  - `docs/design/README.md`, if a component was added;
  - `specs/007-cuenta-comensal-google-verificacion/plan.md` and `specs/README.md`: US-51 S5 covered by `test_us51_s5_unverified_diner_cannot_order`;
  - optionally the domain diagram in `docs/architecture/diagrams.py` («Pedido»).
- [ ] T036 Run review agents (functional, security, accessibility, UI/UX) on the implementation PR and fix what they find
- [ ] T037 After merging, try the quickstart in production with the demo restaurant. Its dishes need preparation times (P2)

---

## Dependencies & Execution Order

- T004 (spec PR reviewed and merged) blocks every task from T006 on.
- Phase 1 blocks Phases 2–4. Inside it:
  - T007 → T008 and T009;
  - T010 needs T007;
  - T012 needs T007 and T010;
  - T013 needs T006, T010 and T011;
  - T015 needs T012–T014;
  - T016 needs T015;
  - T017 needs T016.
- Phase 2 goes before Phases 3 and 4, because they add to the same page. T027, T028, T030 and T031 can be written together with T018–T021.
- Phase 5 goes last.

## Notes

- The restaurant side of orders (US-20, US-22, US-36) belongs to other teammates. Nothing here writes orders for them; `data-model.md` lists the functions they call. They never read carts.
- Test names must match the plan's test map exactly (constitution, principle III).

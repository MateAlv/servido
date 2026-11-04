# Tasks: Gestión de Pedidos y Estados de Pago del Restaurante

**Input**: Design documents from `/specs/010-pedidos-pagos-restaurantes/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/restaurant-orders-api.md`, `quickstart.md`

**Tests**: Required. The constitution requires at least one automated test per
acceptance scenario, named after its US and scenario.

## Phase 1: Setup

- [X] T001 Confirm the US-20 and US-22 contract, existing reservation timing rules, and current restaurant authentication in `specs/010-pedidos-pagos-restaurantes/plan.md`, `specs/010-pedidos-pagos-restaurantes/contracts/restaurant-orders-api.md`, and `backend/app/api/restaurant.py`
- [X] T002 Verify the active feature configuration points to `specs/010-pedidos-pagos-restaurantes` in `.specify/feature.json`

**Checkpoint**: The repository context and complete feature contract are ready.

---

## Phase 2: Foundational (Blocking Prerequisites)

- [X] T003 [P] Create the `Order` model with `reservation_id`, `restaurant_id`, `status`, `prep_start_time`, and `created_at` in `backend/app/models/order.py`; enforce confirmed/unconfirmed status values and one order per reservation
- [X] T004 [P] Create the `OrderItem` model with required `order_id`, `dish_id`, positive `quantity`, `unit_price`, and `prep_time_minutes` snapshots in `backend/app/models/order_item.py`
- [ ] T005 [P] Create the `Payment` model with one payment per order, nullable method (`cash`/`online`), status (`pending`/`paid`), non-negative decimal total, and nullable `paid_at` in `backend/app/models/payment.py`
- [X] T006 Import order and order-item models in `backend/app/models/__init__.py` and verify SQLAlchemy metadata relationships
- [X] T007 Generate and review the Alembic migration with `make migration m="add restaurant orders"` in `backend/migrations/versions/`; include foreign keys, positive-value checks, enum checks and unique order/reservation relationships
- [X] T008 [P] Add shared order fixtures for restaurants, opening shifts, dishes, reservations and items in `backend/tests/test_restaurant_orders.py`, preserving 30-minute reservation starts and 90-minute capacity occupancy
- [X] T009 [P] Add shared order response types in `backend/app/schemas/order.py`

**Checkpoint**: Persistence, fixtures and shared response vocabulary are ready.

---

## Phase 3: US-20 — Ver pedidos del turno actual 🎯

**Goal**: Let an authenticated restaurant responsible inspect confirmed advance
orders for the active opening shift, with item quantities and deterministic
arrival/preparation ordering.

**Independent Test**: Sign in as a restaurant with confirmed and unconfirmed
orders across active and inactive shifts, including an order whose reservation
is cancelled. Open the restaurant orders page and verify that only confirmed
orders for the current shift remain, with reservation arrival, dishes,
quantities, detail view, empty state and required ordering.

### Tests for US-20

- [X] T010 [P] [US20] Add `test_us20_s1_lists_confirmed_orders` in `backend/tests/test_restaurant_orders.py` for confirmed orders in the active Buenos Aires shift
- [X] T011 [P] [US20] Add `US-20 S2 shows order summary` in `frontend/src/pages/RestaurantOrdersPage.test.tsx` for reservation, arrival, dishes and quantities
- [X] T012 [P] [US20] Add `test_us20_s3_excludes_unconfirmed_and_cancelled` in `backend/tests/test_restaurant_orders.py`
- [X] T013 [P] [US20] Add `US-20 S4 opens order detail` in `frontend/src/pages/RestaurantOrdersPage.test.tsx`
- [X] T014 [P] [US20] Add `test_us20_s5_orders_by_arrival` in `backend/tests/test_restaurant_orders.py`
- [X] T015 [P] [US20] Add `test_us20_s6_orders_ties_by_prep_start` in `backend/tests/test_restaurant_orders.py`, including a stable order-ID tie-break
- [X] T016 [P] [US20] Add edge-case tests for no active shift, no orders, diner access, expired session and foreign restaurant ownership in `backend/tests/test_restaurant_orders.py`

### Implementation for US-20

- [X] T017 [US20] Implement active Buenos Aires shift lookup and order filtering/ordering in `backend/app/services/restaurant_orders.py`; use arrival time, `prep_start_time`, then order ID, calculate preparation start as arrival minus the maximum item preparation time, treat missing preparation times as 0, and expose `prep_time_warning`
- [X] T018 [US20] Add restaurant order list and detail response schemas in `backend/app/schemas/order.py`, including reservation arrival, item names, quantities and preparation start
- [X] T019 [US20] Implement `GET /api/restaurante/pedidos/turno-actual` and `GET /api/restaurante/pedidos/{order_id}` in `backend/app/api/restaurant.py` with restaurant ownership, confirmed-order and confirmed-reservation filters
- [X] T020 [US20] Add the typed client in `frontend/src/api/restaurantOrders.ts` and regenerate `frontend/src/api/openapi.json` and `frontend/src/api/schema.d.ts` with `make api-types`
- [X] T021 [US20] Build `RestaurantOrdersPage` in `frontend/src/pages/RestaurantOrdersPage.tsx` and `RestaurantOrdersPage.module.css` with Spanish loading, empty, error, list and detail states, plus a warning when preparation time is 0, using existing design components
- [X] T022 [US20] Add the restaurant orders route in `frontend/src/router.tsx` and ensure it is reachable only through the existing restaurant shell/auth behavior

**Checkpoint**: US-20 works end to end and T010–T016 pass.

---

## Phase 4: US-22 — Ver estado de pago

**Goal**: Show payment state, totals, item breakdown and selected method for
restaurant orders, and provide the explicitly defined future transition seams.

**Independent Test**: View orders with paid, pending, cash, online and missing
payment methods. Verify state, total, item breakdown, method text and visual
distinction. When transition ownership is implemented, verify electronic
approval and cash collection update the state without double charging.

### Tests for US-22

- [ ] T023 [P] [US22] Add `US-22 S1 shows payment state` in `frontend/src/pages/RestaurantOrdersPage.test.tsx`
- [ ] T024 [P] [US22] Add `US-22 S2 shows total and breakdown` in `frontend/src/pages/RestaurantOrdersPage.test.tsx`
- [ ] T025 [P] [US22] Add `US-22 S3 shows payment method` in `frontend/src/pages/RestaurantOrdersPage.test.tsx`, including `No seleccionado`
- [ ] T026 [P] [US22] Add `test_us22_s4_electronic_payment_updates_state` in `backend/tests/test_restaurant_orders.py` for the defined future integration operation
- [ ] T027 [P] [US22] Add `test_us22_s5_cash_payment_stays_pending` in `backend/tests/test_restaurant_orders.py`
- [ ] T028 [P] [US22] Add `test_us22_s6_cash_collection_updates_state` in `backend/tests/test_restaurant_orders.py` for the defined future integration operation
- [ ] T029 [P] [US22] Add `US-22 S7 distinguishes payment states` in `frontend/src/pages/RestaurantOrdersPage.test.tsx`
- [ ] T030 [P] [US22] Add ownership, invalid-state, missing-payment and no-double-charge tests in `backend/tests/test_restaurant_orders.py`

### Implementation for US-22

- [ ] T031 [US22] Extend `backend/app/schemas/order.py` with payment status, decimal total, item breakdown and `No seleccionado` method response fields
- [ ] T032 [US22] Add payment total calculation from immutable order-item snapshots in `backend/app/services/restaurant_orders.py`; use Decimal/Numeric values and reject inconsistent totals explicitly
- [ ] T033 [US22] Extend `GET /api/restaurante/pedidos/turno-actual` and `GET /api/restaurante/pedidos/{order_id}` in `backend/app/api/restaurant.py` with payment information and restaurant ownership
- [ ] T034 [US22] Define the documented payment transition boundary in `specs/010-pedidos-pagos-restaurantes/contracts/restaurant-orders-api.md`; do not add a gateway, webhook or cash-confirmation UI until an owner and integration are approved
- [ ] T035 [US22] If the transition boundary is approved, implement an idempotent backend operation in `backend/app/api/restaurant.py` or a dedicated service that changes `pending` to `paid`, records `paid_at`, and prevents double charging
- [ ] T036 [US22] Update `frontend/src/api/restaurantOrders.ts`, `RestaurantOrdersPage.tsx` and `RestaurantOrdersPage.module.css` to display paid/pending states, totals, breakdown and missing method accessibly
- [ ] T037 [US22] Regenerate `frontend/src/api/openapi.json` and `frontend/src/api/schema.d.ts` with `make api-types`

**Checkpoint**: US-22 displays payment information and all approved transition
tests pass; deferred transitions remain explicitly documented if not approved.

---

## Phase 5: Polish and Cross-Cutting Validation

- [X] T038 Run `make format` and review only files changed for spec 010
- [X] T039 Run `make lint` and fix backend/frontend formatting, lint and type errors
- [ ] T040 Run `make test` and verify every US-20 and US-22 acceptance scenario
- [ ] T041 Follow `specs/010-pedidos-pagos-restaurantes/quickstart.md` through the restaurant UI at 360px width and with keyboard navigation
- [X] T042 Verify `make api-types` leaves `frontend/src/api/openapi.json` and `frontend/src/api/schema.d.ts` synchronized with the backend
- [ ] T043 Update `specs/010-pedidos-pagos-restaurantes/plan.md`, `research.md`, `data-model.md`, `contracts/`, and `quickstart.md` if implementation decisions diverge

## Dependencies & Execution Order

1. T001–T002 establish the feature context.
2. T003–T009 are shared prerequisites for both stories.
3. T010–T016 are US-20 tests and should be written before T017–T022.
4. T023–T030 are US-22 tests and may be prepared in parallel with US-20 tests,
   but depend on the shared models and fixtures.
5. T031–T037 depend on the order/payment persistence and US-20 response shape.
6. T038–T043 run after the implementation slice being delivered.

## Parallel Opportunities

- T003–T005 can run in parallel because they create separate model files.
- T008–T009 can run in parallel with model work.
- T010–T016 can run in parallel because they cover independent scenarios.
- T023–T030 can run in parallel with T010–T016 when the shared fixtures exist.
- T020–T022 must remain sequential where they touch generated types, the page,
  and the router.

## Implementation Strategy

Deliver US-20 as the MVP slice: active-shift query, confirmed-order filtering,
deterministic ordering, item detail and restaurant page. Keep US-22 fully
planned in this task list and contract, but do not implement payment transition
operations until their integration owner and behavior are approved. After each
story, run its focused acceptance tests before moving to cross-cutting checks.

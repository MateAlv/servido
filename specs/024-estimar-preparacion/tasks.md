---

description: "Task list for estimated preparation times in advance orders"
---

# Tasks: Estimated Preparation Time

**Input**: Design documents from `/specs/024-estimar-preparacion/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: REQUIRED. Every US-40 acceptance scenario needs an automated test named after its US and scenario.

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Verify the existing dish, order-item snapshot and derived preparation-time foundations before changing behavior.

- [X] T001 [P] Inspect `backend/app/models/dish.py`, `backend/app/models/order_item.py`, `backend/app/services/orders.py` and `backend/app/services/restaurant_orders.py` against `specs/024-estimar-preparacion/data-model.md`; record any missing invariant or projection in the implementation changes.
- [X] T002 [P] Inspect `frontend/src/pages/AddDishPage.tsx`, `frontend/src/pages/EditDishPage.tsx`, `frontend/src/pages/OrderPage.tsx` and `frontend/src/pages/RestaurantOrdersPage.tsx` against `specs/024-estimar-preparacion/contracts/preparation-time-api.md`; identify user-facing gaps without adding a duplicate preparation-time field.
- [X] T003 Confirm the existing database constraints and migrations enforce positive dish preparation times and immutable order-item snapshots; add a migration only if the current schema does not satisfy `specs/024-estimar-preparacion/data-model.md`.

**Checkpoint**: Existing preparation-time behavior and any required persistence changes are understood and ready for the US-40 slice.

---

## Phase 2: US-40 — Registrar tiempo estimado de preparación 🎯

**Goal**: Allow restaurants to record and modify valid dish preparation times, calculate the slowest dish time for new orders, expose it to the diner, and preserve confirmed snapshots.

**Independent Test**: Edit a restaurant dish with a positive time, reject invalid values, create and confirm an order containing dishes with different times, change the menu afterward, and verify that new orders use the new values while the confirmed order remains unchanged.

### Tests for US-40 (write first; they must fail before implementation)

- [X] T004 [P] [US40] Add `test_us40_s1_registers_preparation_time` to `backend/tests/test_dish_management.py`, asserting a restaurant can save a positive preparation time and read it back from its dish.
- [X] T005 [P] [US40] Add `test_us40_s2_modifies_preparation_time` to `backend/tests/test_dish_management.py`, asserting a valid edit is used by a newly created order.
- [X] T006 [P] [US40] Add `test_us40_s3_rejects_invalid_preparation_time` to `backend/tests/test_dish_management.py`, covering zero, negative, non-integer and oversized values and preserving the previous valid value.
- [X] T007 [P] [US40] Add `test_us40_s4_uses_slowest_dish_time` to `backend/tests/test_order.py`, asserting a new order derives its total preparation time from the maximum item time and warns when an item has no time.
- [X] T008 [P] [US40] Add `test_us40_s5_preserves_confirmed_preparation_snapshot` to `backend/tests/test_order.py`, editing the source dishes after confirmation and asserting stored item times and the order total remain unchanged.
- [X] T009 [P] [US40] Add `US-40 S6 shows preparation estimate` to `frontend/src/pages/OrderPage.test.tsx`, asserting the diner sees the estimated minutes in Spanish when the order has one.

### Implementation for US-40

- [X] T010 [US40] Ensure `backend/app/schemas/dish.py` and `backend/app/api/dish.py` validate preparation times as integer values greater than zero when present, reject invalid values with Spanish messages, and preserve the existing nullable state when clearing is supported.
- [X] T011 [US40] Ensure `backend/app/models/dish.py` and the relevant migration in `backend/migrations/versions/` enforce the positive preparation-time invariant without changing existing confirmed order data.
- [X] T012 [US40] Ensure `backend/app/services/orders.py` calculates new order preparation time as the maximum non-null item snapshot time and keeps confirmed item snapshots immutable.
- [X] T013 [US40] Ensure `backend/app/api/order.py` and `backend/app/schemas/diner_order.py` expose the derived estimate and existing warning to the diner in Spanish-compatible response fields.
- [X] T014 [US40] Ensure `backend/app/services/restaurant_orders.py`, `backend/app/api/restaurant.py` and `backend/app/schemas/order.py` expose item preparation times, the derived preparation start and missing-time warning for restaurant orders.
- [X] T015 [US40] Update `frontend/src/pages/EditDishPage.tsx`, `frontend/src/pages/OrderPage.tsx` and `frontend/src/pages/RestaurantOrdersPage.tsx` only where needed to show validation, estimate and missing-time warning using existing design-system components and Spanish copy.
- [X] T016 [US40] Regenerate `frontend/src/api/openapi.json` and `frontend/src/api/schema.d.ts` with `make api-types` if any API schema changed, then update affected frontend tests to use generated types.

**Checkpoint**: US-40 scenarios pass end to end; valid estimates are editable, invalid values are rejected, new orders use the slowest dish, and confirmed snapshots are stable.

---

## Phase 3: Polish & Cross-Cutting Concerns

- [X] T017 [P] Run `make format` and review only files touched by US-40.
- [X] T018 [P] Run `make lint` and fix type, import, formatting and schema errors caused by US-40.
- [X] T019 Run the focused backend and frontend commands from `specs/024-estimar-preparacion/quickstart.md`.
- [X] T020 Run `make test` and verify all US-40 scenario tests use the required names and real PostgreSQL where applicable.
- [X] T021 Follow the manual scenario in `specs/024-estimar-preparacion/quickstart.md` and update `spec.md`, `plan.md` or this file only if implementation behavior diverges from the approved scope.

---

## Dependencies & Execution Order

1. **Foundational**: T001–T003 must complete before US-40 implementation.
2. **Tests first**: T004–T009 should be written before T010–T016; they may be prepared in parallel because backend and frontend tests touch different files.
3. **Backend implementation**: T010–T014 are sequential around validation, snapshot and projections.
4. **Frontend implementation**: T015 depends on the backend behavior; T016 runs after any API changes.
5. **Polish**: T017–T021 run after the feature implementation and generated contracts are complete.

### Parallel execution examples

- T001 and T002 can run in parallel because they inspect separate backend and frontend scopes.
- T004–T009 can be prepared in parallel, with backend tests separated by file.
- T017 and T018 can run in parallel only after implementation is complete; T019–T021 remain the final validation sequence.

## Implementation Strategy

- **MVP first**: verify and complete restaurant dish-time registration plus the new-order maximum-time calculation.
- **Snapshot safety**: preserve confirmed item values before adding presentation polish.
- **Scope guard**: do not add real-time kitchen tracking, delay notifications, payment behavior, cancellation behavior or a second preparation-time model.

## Notes

- Every task uses the required checklist format, a sequential ID, exact file paths and `[US40]` labels for story work.
- [P] appears only where tasks touch independent files or validation steps.
- Commit logical groups with the US in an English conventional commit message: `feat(US-40): ...`.

---

description: "Task list for US-55 implementation (Servido! project override)"
---

# Tasks: Ver promociones y aplicar descuento en el pedido

**Input**: Design documents from `/specs/031-ver-promociones/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/public-promotions.md](./contracts/public-promotions.md)

**Tests**: REQUIRED. Every US-55 acceptance scenario has an automated test named after its story
and scenario, using the existing real-PostgreSQL backend fixtures and Vitest frontend setup.

**Organization**: US-55 is the only user story in this spec. Its backend and frontend increments
are kept independently testable, while the API contract remains the source of truth for the UI.

## Phase 1: Setup

**Purpose**: Prepare the existing promotion/order surfaces without adding a model, migration,
dependency, route, or service outside the feature scope.

- [X] T001 Confirm the existing `Promotion`, `Order`, and `OrderDiscount` persistence and constraints in `backend/app/models/promotion.py` and `backend/app/models/order.py` remain the storage boundary for US-55; do not create a migration
- [X] T002 [P] Add US-55 promotion fixture helpers in `backend/tests/test_order.py` for active, fixed-minimum, and time-window promotions without changing shared fixture behavior for other specs
- [X] T003 [P] Identify and use the existing public restaurant and diner order test helpers in `backend/tests/test_public_restaurants.py` and `backend/tests/test_order.py` for the US-55 scenario tests

**Checkpoint**: Existing persistence and test setup are understood; implementation can proceed
without introducing new infrastructure.

---

## Phase 2: Foundational

**Purpose**: Establish the shared response and calculation shapes required by both the public
restaurant detail and the diner order flow.

- [X] T004 [US55] Add read-only public promotion and order discount summary schemas in `backend/app/schemas/public_restaurant.py` and `backend/app/schemas/diner_order.py`, preserving Decimal values, nullable `minimum_amount`, ISO weekday/date/time conditions, and the contract fields `subtotal`, `promotions`, `discount`, and `total`
- [X] T005 [US55] Extend the shared order summary path in `backend/app/services/orders.py` to resolve eligible promotions with `app.services.promotions.resolve` using the reservation arrival instant in `America/Argentina/Buenos_Aires`, current subtotal, restaurant stacking policy, and a zero/non-negative total
- [X] T006 [US55] Add backend contract tests for the public promotion projection and diner order summary shapes in `backend/tests/test_public_restaurants.py` and `backend/tests/test_order.py`, including Decimal serialization and empty promotion lists

**Checkpoint**: Shared schemas and authoritative promotion calculation are ready for both
surfaces; no frontend implementation should duplicate eligibility rules.

---

## Phase 3: US-55 — Ver promociones y aplicar descuento en el pedido 🎯

**Goal**: Let any visitor see active, non-expired promotions on a public restaurant detail and
let a diner see the applicable discount recalculated in their draft, payment, and confirmed order.

**Independent Test**: Seed one restaurant with an active percentage promotion, an eligible fixed
promotion, a fixed promotion below its minimum, a paused promotion, and an expired promotion.
Verify the public detail shows only active non-expired promotions with conditions, then build a
reservation order and verify eligibility changes when the subtotal or arrival time changes. Confirm
the order and verify the final payment amount and frozen discount snapshot remain consistent.

### Tests for US-55 (write first; they must fail before implementation)

- [X] T007 [P] [US55] Add `test_us55_s1_public_detail_shows_current_promotions` to `backend/tests/test_public_restaurants.py`, asserting active current/future promotions expose name, description, benefit, fixed minimum, dates, weekdays, and time conditions
- [X] T008 [P] [US55] Add `test_us55_s2_public_detail_hides_paused_and_expired_promotions` to `backend/tests/test_public_restaurants.py`, asserting paused and end-date-expired promotions are absent while the restaurant detail still loads normally
- [X] T009 [P] [US55] Add `test_us55_s3_order_summary_applies_eligible_promotion` to `backend/tests/test_order.py`, asserting an eligible reservation/order response contains the original subtotal, applied promotion snapshot, discount amount, discounted total, and the same amount used by payment
- [X] T010 [P] [US55] Add `test_us55_s4_order_summary_omits_ineligible_promotion` to `backend/tests/test_order.py`, covering both a reservation outside the promotion validity and a fixed promotion whose subtotal is below `minimum_amount`
- [X] T011 [P] [US55] Add `test_us55_s5_recalculates_promotion_for_cart_changes` to `backend/tests/test_order.py`, asserting cart reads/saves recalculate after dish subtotal and `arrival_at` changes and that confirmation freezes the resulting `OrderDiscount`
- [X] T012 [P] [US55] Add `US-55 S1 shows active promotions and conditions` to `frontend/src/pages/RestaurantDetailPage.test.tsx`, mocking the typed restaurant response and asserting the public promotion section renders the benefit, minimum, and validity conditions
- [X] T013 [P] [US55] Add `US-55 S3 shows subtotal promotion discount and total` to `frontend/src/pages/OrderPage.test.tsx`, asserting the receipt uses API subtotal, promotion, discount, and total values

### Backend implementation for US-55

- [X] T014 [US55] Extend `backend/app/api/public_restaurant.py` to load only promotions belonging to the bookable restaurant where `active` is true and `ends_on` is null or not earlier than the current Buenos Aires date, including programmed future promotions and excluding paused/expired rows
- [X] T015 [US55] Extend `backend/app/schemas/public_restaurant.py` and the `PublicRestaurantDetail` response to expose the public promotion projection from `specs/031-ver-promociones/contracts/public-promotions.md` without management fields such as `request_id`
- [X] T016 [US55] Update `backend/app/api/order.py` and `backend/app/services/orders.py` so cart previews and confirmed order responses expose `subtotal`, applied promotion names/amounts, `discount`, and `total`; recalculate drafts against the selected arrival time and current promotion state, while reading confirmed values from the frozen order snapshot
- [X] T017 [US55] Update confirmation persistence in `backend/app/services/orders.py` to write the resolved `OrderDiscount` rows and `Order.subtotal`, `discount_amount`, and `total` atomically, retaining existing idempotency, payment, menu, reservation ownership, and non-negative total behavior

### Frontend implementation for US-55

- [X] T018 [US55] Extend `frontend/src/api/restaurants.ts` and existing typed order call sites to consume the generated public promotion and order-summary types without hand-written API types or client-side eligibility logic
- [X] T019 [US55] Render the public promotion section in `frontend/src/pages/RestaurantDetailPage.tsx` and `frontend/src/pages/RestaurantDetailPage.module.css`, showing Spanish benefit, description, minimum amount when fixed, and configured date/day/time conditions; omit the section when the API returns no promotions and preserve the 360px layout
- [X] T020 [US55] Extend `frontend/src/components/order/Receipt.tsx` and the order/payment summary in `frontend/src/pages/OrderPage.tsx` to show subtotal, applied promotion name, discount amount, and final total, using the backend total for payment selection and preserving accessible table/announcement behavior
- [X] T021 [US55] Regenerate `frontend/src/api/openapi.json` and `frontend/src/api/schema.d.ts` with `make api-types`, then update any affected typed client call sites without editing generated files by hand

**Checkpoint**: US-55 works end to end; all backend scenarios and the public-detail/order UI
tests pass, including the fixed minimum, local validity, recalculation, payment total, and frozen
confirmed discount requirements.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [X] T022 [P] Run focused backend validation with `cd backend && uv run pytest tests/test_public_restaurants.py tests/test_order.py -k us55` and fix only failures caused by US-55
- [X] T023 [P] Run focused frontend validation with `cd frontend && npx vitest run src/pages/RestaurantDetailPage.test.tsx src/pages/OrderPage.test.tsx` and fix only failures caused by US-55
- [ ] T024 Run `make format lint test` from the repository root and resolve formatting, typing, lint, or regression failures without expanding feature scope
- [X] T025 Review [plan.md](./plan.md), [data-model.md](./data-model.md), [contracts/public-promotions.md](./contracts/public-promotions.md), and this file against the implementation; update documentation only if the delivered behavior changed from US-55
- [X] T026 Follow [quickstart.md](./quickstart.md) manually with a restaurant containing active, programmed, paused, expired, and fixed-minimum promotions, recording the expected public-detail and order/payment outcomes

## Phase 5: Addendum — preview before confirmation

**Purpose**: Make the already-defined US-55 order breakdown visible and authoritative when the
diner enters «Revisar y confirmar», before selecting the payment method, without changing
promotion eligibility or confirmed-order behavior.

- [X] T027 [US55] Record the 2026-11-22 clarification in `specs/031-ver-promociones/spec.md` and update the test mapping in `specs/031-ver-promociones/plan.md`
- [X] T028 [US55] Expose a flush operation from `frontend/src/lib/useOrderCart.ts` and synchronize `frontend/src/pages/OrderPage.tsx` with `GET /api/reservations/{reservation_id}/order` when entering review and after saved draft changes
- [X] T029 [US55] Add `US-55 S3 shows the promotion in the review before confirmation` to `frontend/src/pages/OrderPage.test.tsx`, asserting the preview uses the backend subtotal, promotion, discount, and total

---

## Dependencies & Execution Order

```text
T001 ─┬─> T004 ─> T005 ─> T014 ─> T016 ─> T017
T002 ─┘       └─> T006
T003 ─────────────> T007–T013
T007–T013 ────────> T014–T021
T014–T021 ────────> T022–T026
```

- **Setup**: T001–T003 must complete before implementation; no database migration is needed.
- **Foundational**: T004–T006 define the shared API shapes and authoritative calculation.
- **US-55 tests**: T007–T013 can run in parallel because they touch separate test files/scenarios;
  they should be written before the corresponding implementation tasks.
- **Backend implementation**: T014–T017 depend on the foundational schemas/calculation and should
  be completed before contract regeneration.
- **Frontend implementation**: T018–T021 depend on the backend response shape; T019 and T020 can
  be implemented in parallel after T018, while T021 runs after API changes are complete.
- **Polish**: T022–T026 run only after the end-to-end story is implemented.

## Parallel Execution Examples

### US-55 test-first batch

```text
Workstream A: T007, T008 (backend public restaurant scenarios)
Workstream B: T009, T010, T011 (backend order scenarios)
Workstream C: T012 (public detail UI)
Workstream D: T013 (order UI)
```

### US-55 implementation batch

```text
Workstream A: T014, T015 (public promotion endpoint/projection)
Workstream B: T016, T017 (order calculation and confirmation snapshot)
After T018:
Workstream C: T019 (restaurant detail UI)
Workstream D: T020 (order receipt/payment UI)
```

## Implementation Strategy

1. **MVP first**: complete the public promotion projection and authoritative order summary for
   US-55, including S1–S5 backend tests.
2. **Incremental UI**: regenerate the OpenAPI contract, then add public-detail and order/payment
   presentation with the existing design system and Spanish copy.
3. **Verify and polish**: run focused tests, the full repository checks, and the quickstart path.

## Notes

- Every task uses the required `- [X] T###` or `- [ ] T###` checklist format and includes a repository file path.
- `[P]` appears only where tasks touch separate files or independent scenarios.
- No new model, migration, dependency, marketing notification, coupon code, promotion filter, or
  out-of-scope feature is included.

# Tasks: Pay a pre-ordered meal (US-60 cash, US-56 electronic)

**Input**: Design documents from `/specs/032-pagar-pedido/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: REQUIRED. The constitution (principle III) requires at least one automated test per acceptance scenario, named after its US and scenario.

**Organization**: US-60 first (21/11). US-56 was added on 23/11 in its own phase at the end.

**Scope note**: US-45 (spec 020-tiempo-pago) already stores `payment_method`, `payment_status` and `total`, and the endpoint to change the method. The backend tasks below add the US-60 tests (a regression lock on behavior that already exists, so they pass immediately) and the frontend tasks add the cash copy, which is the part US-60 actually misses. No migration and no `make api-types` run: the contract does not change.

## Phase 1: US-60 — Pay with cash 🎯

**Goal**: Choosing cash leaves the order pending and shows, to the diner and to the restaurant, the exact amount to pay at the restaurant.

**Independent Test**: Confirm a pre-order with «Efectivo», open the confirmed order and the restaurant's order detail, and check both show «Pendiente de pago» and the amount, never «Pagado».

### Tests for US-60

- [x] T001 [US60] Add `backend/tests/test_us60_cash_payment.py` with `test_us60_s1_cash_confirmation_stays_pending`, `test_us60_s2_cash_order_exposes_total_to_pay`, `test_us60_s3_cash_order_stays_pending_for_both_roles`, `test_us60_s4_pending_cash_order_switches_to_online`, `test_us60_edge_cash_payment_rejections` (empty order, cancelled reservation, finished reservation, another diner's order) and `test_us60_edge_paid_order_rejects_cash_change`
- [x] T002 [US60] Add `US-60 S2 shows the amount to pay in cash` and `US-60 S4 switches a pending cash order to electronic` to `frontend/src/pages/OrderPage.test.tsx` (they fail until T004 and T005)
- [x] T003 [P] [US60] Add `US-60 S3 shows «Abona en efectivo en el local» with the amount` and `US-60 edge keeps a cash order pending in the restaurant view` to `frontend/src/pages/RestaurantOrdersPage.test.tsx` (they fail until T006)

### Implementation for US-60

- [x] T004 [US60] In `frontend/src/pages/OrderPage.tsx`, show «Abonás $X en efectivo en el local.» in the review step (`draftControls`) when `cart.metadata.payment_method === 'cash'`, using `formatCents(totalCents)`
- [x] T005 [US60] In `frontend/src/pages/OrderPage.tsx`, show «Abonás $X en efectivo en el local.» in the confirmed step (`confirmedPayment`) when the order is `cash` and `pending`, using `formatPrice(page.order.total)`; keep «Pagado» and drop the note when `paid`
- [x] T006 [P] [US60] In `frontend/src/pages/RestaurantOrdersPage.tsx`, show «Abona en efectivo en el local: $X» in the order detail when `payment.method === 'cash'` and `payment.status === 'pending'`, and «Pagado electrónicamente» when `paid`
- [x] T007 [US60] Run `make format lint test` and fix any failure

### Wrap-up

- [x] T008 [US60] Record spec 032 / US-60 in `specs/README.md` (index row and the Sprint 6 note)
- [x] T009 [US60] Follow `quickstart.md` to try the three scenarios in the running app

**Checkpoint**: US-60 works end to end and its scenario tests pass.

---

## Dependencies & Execution Order

- **T001 → T002 → T003**: independent test files; T002 and T003 can be written in parallel once T001 exists.
- **T004 and T005** touch the same file (`OrderPage.tsx`), so they run in order; both depend on T002.
- **T006** depends on T003 and touches a different file, so it can run in parallel with T004/T005.
- **T007 → T008 → T009** close the story.

## Parallel Example

```text
# After T002 and T003:
Task T005: cash note in OrderPage confirmed step
Task T006: cash note in RestaurantOrdersPage detail
```

## Implementation Strategy

One story, one increment: write the tests, add the two cash notes, then run the full suite. The backend needs no code change, so the risk is limited to copy and tests.

## Notes

- [P] tasks touch different files and have no dependencies on each other.
- Commit after each task or logical group, with the US in the message: `feat(US-60): …`.

---

## Phase: US-56 — Electronic payment (added 2026-11-23)

### Tests first

- [x] T010 [US56] Add `backend/tests/mercadopago_fake.py` (a stand-in for Mercado Pago's API) and block real calls in `backend/tests/conftest.py`
- [x] T011 [US56] Add `backend/tests/test_us56_electronic_payment.py` with S1–S5 and the edge cases (in review, Mercado Pago down or off, refused data, card number refused, cancelled and foreign reservations, refunds on diner, restaurant and closure cancellations, error mapping)
- [x] T012 [P] [US56] Add the US-56 cases to `frontend/src/pages/OrderPage.test.tsx` (Mercado Pago's form mocked) and the completed refund to `CancelledReservationPage.test.tsx`

### Backend

- [x] T013 [US56] Add `Payment` (`backend/app/models/payment.py`) and the migration `payments_20261123` with `payments_one_live_per_order`
- [x] T014 [US56] Add the Mercado Pago settings to `backend/app/config.py`, `docker-compose.yml`, `infra/ec2/compose.yml` and `infra/ec2/deploy.sh`
- [x] T015 [US56] Add `backend/app/services/mercadopago.py` (charge, fetch, refund) and `backend/app/services/payments.py` (pay, settle a payment in review, receipt mail in `mail.py`)
- [x] T016 [US56] Add `GET /api/payments/config` and `POST /api/reservations/{id}/order/payments`, `OrderResponse.payment`, and settle in-review payments in `GET …/order` (`backend/app/api/order.py`, `schemas/diner_order.py`)
- [x] T017 [US56] Freeze paid orders in `backend/app/services/orders.py` (E6)
- [x] T018 [US56] Refund through Mercado Pago in `refunds.py`, and refund before cancelling in `reservations.py` (502 on failure) and `closures.py`; `refund_status = completed` in `api/reservation.py` (E7)
- [x] T019 [US56] `make api-types`

### Frontend

- [x] T020 [US56] Add `frontend/src/lib/mercadopago.ts` and `components/order/CardPaymentForm.tsx` (catalog entry in `/diseno` and `docs/design/README.md`)
- [x] T021 [US56] In `OrderPage.tsx`, add «Pagar $X», the payment modal with the bill and the deposit note, the receipt, the in-review note and the paid lock note
- [x] T022 [P] [US56] In `CancelledReservationPage.tsx`, show «Te devolvimos el pago» once the refund completed

### Wrap-up

- [x] T023 [US56] Write ADR 0010 and update `specs/README.md`, `AGENTS.md` and `infra/README.md`
- [x] T024 [US56] Run `make format lint test` and fix any failure
- [x] T025 [US56] Follow `quickstart.md` against Mercado Pago's test environment: rejected (`OTHE`), retry approved (`APRO`) with the receipt, and the refund on cancellation
- [x] T027 [US56] Show Mercado Pago's test cards in the payment dialog with test credentials only (`pages/order/TestCards.tsx`), and freeze the order (dishes, arrival, method) while a payment is in review (`orders.order_frozen_reason`)
- [x] T026 [US56] Redesign the payment screens after the design canvas: `pages/order/PaymentDialog.tsx` (bill ticket, processing, rejected, approved receipt, in review, unavailable and load failure), the order's payment block, `ConfirmationStamp` warn tone, `Receipt` as receipt, Mercado Pago's form in the theme's tokens, and the refund card with the amount in `CancelledReservationPage.tsx` (`refund_amount`)

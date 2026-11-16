---

description: "Task list for restaurant reservation cancellation and simulated refunds"
---

# Tasks: Restaurant Reservation Cancellation and Simulated Refund

**Input**: Design documents from `/specs/023-cancelar-reserva/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/restaurant-cancellation-api.md, quickstart.md

**Tests**: REQUIRED. Every acceptance scenario has an automated test named after US-38 and its scenario.

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Add the minimal persistence and adapter foundations required to distinguish paid orders, record refunds and persist diner notices.

- [X] T001 [P] Create `Refund` in `backend/app/models/refund.py` with a unique `order_id`, positive `amount`, `method` in `cash|online`, `status` in `completed|failed`, timestamps, and import it in `backend/app/models/__init__.py`.
- [X] T002 [P] Create `Notification` in `backend/app/models/notification.py` with foreign keys to `comensales` and `reservations`, `kind = restaurant_cancellation`, Spanish message, timestamps, and a unique `(reservation_id, kind)` constraint; import it in `backend/app/models/__init__.py`.
- [X] T003 Extend `backend/app/models/order.py` with `payment_status` (`pending|paid`, default `pending`), nullable `payment_method` (`cash|online`), nullable non-negative `paid_amount`, and nullable `paid_at`, enforcing the paid-field invariants in the database; extend `backend/app/models/reservation.py` with nullable unique `cancellation_request_id` and nullable `cancelled_by_restaurant_id`.
- [X] T004 Generate and review the Alembic migration with `make migration m="add restaurant cancellation refunds and notifications"` in `backend/migrations/versions/`, including the order payment fields and both new tables.
- [X] T005 [P] Add `RefundResponse` and `RestaurantCancellationResponse` request/response models in `backend/app/schemas/reservation.py`, plus notification response models in `backend/app/schemas/notification.py`.
- [X] T006 [P] Implement the deterministic simulated adapter in `backend/app/services/refunds.py`, allowing tests to force a failed refund without adding a provider dependency and updating one existing failed refund row on retry.
- [X] T007 [P] Add the Spanish cancellation email builder and sender helper in `backend/app/services/mail.py`, reusing the existing `Mail`, configured backends and memory outbox.

**Checkpoint**: Database models, migration, schemas, simulated refund adapter and email helper are ready.

---

## Phase 2: US-38 — Cancelar reserva y reembolsar al comensal 🎯

**Goal**: Allow a restaurant to cancel only its own future reservation with at least 45 minutes remaining, simulate a full refund for paid orders, notify the diner in-app and by email, and release the table without duplicate side effects.

**Independent Test**: As an authenticated restaurant, cancel a future paid reservation and verify the completed refund, reservation state, notification, email and availability; repeat the request, try the cutoff, unpaid/no-order, foreign and failed-refund cases.

### Tests for US-38 (write first; they must fail before implementation)

- [X] T008 [P] [US38] Add `test_us38_s1_refunds_paid_order_and_cancels_reservation` in `backend/tests/test_restaurant_cancellation.py` for a paid online order, full-amount simulated refund and `cancelled` reservation.
- [X] T009 [P] [US38] Add `US-38 S2 reports cancellation and refund success` in `frontend/src/pages/RestaurantReservationsPage.test.tsx`.
- [X] T010 [P] [US38] Add `test_us38_s3_notifies_diner_in_app_and_by_email` in `backend/tests/test_restaurant_cancellation.py`, asserting one persisted notification and one mail in the memory outbox.
- [X] T011 [P] [US38] Add `test_us38_s4_rejects_cancellation_inside_45_minutes` in `backend/tests/test_restaurant_cancellation.py`, asserting no reservation, refund or notification mutation.
- [X] T012 [P] [US38] Add `test_us38_s5_cancels_unpaid_reservation_without_refund` in `backend/tests/test_restaurant_cancellation.py` for pending payment and no order.
- [X] T013 [P] [US38] Add `test_us38_s6_failed_refund_preserves_reservation` in `backend/tests/test_restaurant_cancellation.py`, then verify a later successful retry can complete.
- [X] T014 [P] [US38] Add `test_us38_s7_releases_table_and_marks_order_cancelled` in `backend/tests/test_restaurant_cancellation.py` using the existing availability endpoint and derived order-cancellation semantics.
- [X] T015 [P] [US38] Add `test_us38_edge_repeated_request_does_not_duplicate_refund_or_notice` and `test_us38_edge_rejects_foreign_reservation` in `backend/tests/test_restaurant_cancellation.py`.
- [X] T016 [P] [US38] Add `does not report cancellation success on 401` in `frontend/src/api/restaurantReservations.test.ts`.

### Implementation for US-38

- [X] T017 [US38] Implement `cancel_restaurant_reservation` in `backend/app/services/restaurant_cancellations.py`: lock the reservation with `FOR UPDATE`, verify restaurant ownership, reject past or inside-45-minute reservations, handle already-cancelled state, invoke the simulated refund for paid orders, create one notification, set `status`/`cancelled_at`, and flush atomically.
- [X] T018 [US38] Add `POST /api/restaurante/reservas/{reservation_id}/cancelar` in `backend/app/api/restaurant.py`, mapping ownership, cutoff, already-cancelled and refund-failure errors to the contract's Spanish responses and committing only after a successful refund.
- [X] T019 [US38] Add `GET /api/notificaciones` in a new `backend/app/api/notification.py`, scoped to the authenticated diner, and mount it in `backend/app/api/__init__.py`.
- [X] T020 [US38] Add the notification service/query helper in `backend/app/services/notifications.py` and ensure email is sent after the cancellation transaction commits; mail failure must be logged without creating duplicate cancellation side effects.
- [X] T021 [US38] Update `backend/app/schemas/order.py` and `backend/app/api/restaurant.py` so restaurant order projections expose the stored payment state instead of the current hard-coded pending value.
- [X] T022 [US38] Add `cancelRestaurantReservation` to `frontend/src/api/restaurantReservations.ts`, generating one `request_id`, mapping 401/409/502 to Spanish UI errors and returning the typed cancellation response.
- [X] T023 [US38] Add the restaurant reservation cancellation action, pending state, success toast, retryable refund failure and cutoff/already-cancelled messages to `frontend/src/pages/RestaurantReservationsPage.tsx`, preserving the existing reservation list and role guard.
- [X] T024 [US38] Add responsive cancellation controls and status styles to `frontend/src/pages/RestaurantReservationsPage.module.css` using design tokens and accessible focus states.
- [X] T025 [US38] Regenerate `frontend/src/api/openapi.json` and `frontend/src/api/schema.d.ts` with `make api-types`, then update frontend tests to use generated request/response types.
- [X] T026 [US38] Add the diner notification read/query client and visible notification state only where the existing diner shell has a notification surface; otherwise keep the persisted API contract covered by backend tests without inventing a new navigation surface.

**Checkpoint**: US-38 works end to end; cancellation is private, cutoff-safe, idempotent, refund-aware, notified and availability-safe.

---

## Phase 3: Polish & Cross-Cutting Concerns

- [X] T027 [P] Run `make format` and review formatting changes only in files touched by this feature.
- [X] T028 [P] Run `make lint` and fix type, import, formatting and schema errors in feature files.
- [X] T029 Run `make test` and verify backend acceptance tests use real PostgreSQL and frontend tests cover all US-38 scenarios.
- [X] T030 Follow `specs/023-cancelar-reserva/quickstart.md` manually and update `spec.md`, `plan.md` or this file only if implementation behavior diverges from the approved scope.

---

## Dependencies & Execution Order

1. **Foundational**: T001–T007 must complete before US-38 implementation.
2. **Tests first**: T008–T016 should be written before T017–T026; test tasks can run in parallel because they touch separate test files or independent cases.
3. **Backend implementation**: T017–T021 are sequential around the transaction and API contract; T019–T020 can proceed after the notification model exists.
4. **Frontend implementation**: T022–T026 depends on the backend contract and generated types; T022–T024 can proceed in parallel before T025.
5. **Polish**: T027–T030 run after the feature implementation and generated contract are complete.

### Parallel execution examples

- T001–T003 and T005–T007 can run in parallel after the feature design is reviewed; T004 waits for the models.
- T008–T016 can be prepared in parallel.
- T019–T020 can run in parallel with T021 after T017's service contract is agreed.
- T022–T024 can run in parallel; T025 runs after API changes are complete.

## Phase 4: Clarification follow-up

- [X] T031 [US38] Add the `Confirmar cancelación` modal to `frontend/src/pages/RestaurantReservationsPage.tsx`, require explicit confirmation before calling the cancellation API, and cover the behavior in `frontend/src/pages/RestaurantReservationsPage.test.tsx` per the clarified requirement in `spec.md`.

## Implementation Strategy

- **MVP first**: complete the database foundation, service, endpoint and backend acceptance tests for paid and unpaid cancellation.
- **Visible flow**: add the restaurant action and generated contract, then validate success, failure and retry behavior on a phone-width layout.
- **Scope guard**: do not integrate a real payment provider, partial refunds, recurring notifications, queues, workers, restaurant cancellation reasons or the US-32 closure flow.

## Notes

- Every task uses the required checklist format with a sequential ID and exact file path.
- `[P]` marks only tasks that can touch different files or independent test sections without waiting on incomplete work.
- Commit logical groups with the US in the English conventional commit message: `feat(US-38): ...`.

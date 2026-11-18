# Tasks: 021 Ver pedido asociado y detalle de cancelación (comensal, US-47 y US-49)

Legend: [x] done (verify), [ ] to do. All PO questions are answered; decisions D1 to D8 in `research.md` are confirmed.

## Verification (do first)
- [x] T001 Order page `/reservas/:reservaId/pedido` and `GET /api/reservations/{id}/order` exist and are scoped to the diner.
- [x] T002 `has_order`, `has_cart`, `order_open` are returned per reservation.
- [x] T003 Open `OrderPage` with a confirmed order and no cart and record what it shows (read-only or build flow). Verified: it reuses the confirmed view, but exposes edit actions while the deadline is open. Result recorded in `research.md`; T018 needs a read-only mode, T017 remains unchanged.
- [x] T004 Run the existing diner tests (`test_diner_reservations.py`, `test_order.py`, `DinerReservationsPage.test.tsx`, `OrderPage.test.tsx`); record the result. Targeted backend and frontend runs passed, including the existing OrderPage suite.

## Backend: US-49 data
- [x] T005 New Alembic migration `add_reservation_cancelled_by`: nullable `cancelled_by` column with CHECK `IN ('diner','restaurant')` or NULL. Generated as `2026_11_18_0123-39c7c8c67f54_add_reservation_cancelled_by.py` and reviewed; migration 007 was not edited.
- [x] T006 Add `cancelled_by` to the `Reservation` model with the same CHECK. Import nothing new (the model already exists).
- [x] T007 Set `cancelled_by = 'diner'` in `services/reservations.py::cancel_reservation`.
- [x] T008 Set `cancelled_by = 'restaurant'` in `services/closures.py` where reservations are cancelled.
- [x] T009 Test `test_us49_s5_cancelled_by_diner` and `test_us49_closure_sets_cancelled_by_restaurant` in `tests/test_diner_reservations.py` and `tests/test_closures.py`. The closure test is named `test_us32_s4_confirmation_cancels_affected_reservations` and now asserts `cancelled_by == "restaurant"`.

## Backend: US-49 endpoints
- [x] T010 `GET /api/reservations/cancelled` (diner only, 401/403 like the other diner routes). Schema with date, time, restaurant, party size, table, `cancelled_by`, `cancelled_at`, `refund_status`.
- [x] T011 `GET /api/reservations/cancelled/{reservation_id}` (404 for foreign or active reservations).
- [x] T012 Refund summary: `refund_status = "pending"` only when the reservation has an order with `payment_status = 'paid'` (D6). Otherwise `null`. Wording confirmed by Q-021-3.
- [x] T013 Tests: `test_us49_s1_lists_only_own_cancelled_reservations`, `test_us49_s2_detail_shows_origin`, `test_us49_s3_no_refund_block_without_payment`, `test_us49_s4_foreign_reservation_is_404`, `test_us49_s5_cancelled_by_diner`.

## Backend: US-47 checks
- [x] T014 Test `test_us47_s1_has_order_flag_on_reservation`: a reservation with a confirmed order returns `has_order: true`.
- [x] T015 Test `test_us47_s3_foreign_order_is_404` (the order endpoint already scopes this; add the test that proves it).
- [x] T016 Test `test_us47_s4_reservation_without_order_says_so` (`has_order: false`, `order: null` on the order page).

## Frontend: US-47
- [x] T017 `DinerReservationsPage.tsx`: "Ver pedido" when `has_order`, "Sin pedido anticipado" plus "Armar pedido" (when `order_open`) otherwise. No navigation to an empty page (D2).
- [x] T018 Read-only mode for the order view for a confirmed order with no cart (D3). T003 found the confirmed view already reuses `OrderPage`, but edit actions remain available; hide “Modificar platos” and payment edits in read-only mode. Do not write a second order screen.
- [x] T019 UI tests `US-47 S1 shows the order link`, `US-47 S4 says a reservation has no order`, `US-47 S2 shows dishes and quantities read-only`.

## Frontend: US-49
- [x] T020 Typed client functions for `/api/reservations/cancelled` and `/api/reservations/cancelled/{id}` in `frontend/src/api/reservations.ts`.
- [x] T021 `CancelledReservationsPage.tsx` at `/reservas/canceladas`, with a link from `DinerReservationsPage`. Empty state text in Spanish.
- [x] T022 `CancelledReservationPage.tsx` at `/reservas/canceladas/:reservationId`: origin text ("Cancelada por vos", "Cancelada por el restaurante", "Cancelada"), date, refund block only when `refund_status` is set (label "Reembolso pendiente"). No reason field (D5).
- [x] T023 UI tests `US-49 S1 lists cancelled reservations`, `US-49 S2 shows who cancelled`, `US-49 S3 hides refund when there was no payment`.

## Contract and checks
- [x] T024 `make api-types`; commit `openapi.json` and `schema.d.ts`.
- [x] T025 `make migration` check: CI must pass with no model/migration divergence. The migration applied successfully; no existing migration was edited.
- [x] T026 `make format lint test`. Equivalent Docker commands were run: backend 538 tests passed, frontend 527 tests passed, backend and frontend lint/type/format checks passed.

## PO answers (confirmed 2026-11-17)
- Q-021-1: access from the reservations list buttons (D1).
- Q-021-2: no-order notice on the list (D2).
- Q-021-3: refund block only when paid, with "Reembolso pendiente" (D6).
- Q-021-4: origin only, no cancellation reason (D5); no "completada" state (D8).
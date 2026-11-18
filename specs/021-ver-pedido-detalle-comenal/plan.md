# Implementation plan: 021 Ver pedido asociado y detalle de cancelación (comensal, US-47 y US-49)

Source of truth: `specs/021-ver-pedido-detalle-comenal/spec.md`. Context and decisions: `research.md` in this folder.

## Status
- US-47: partially implemented. The order page exists and is reachable from the home card. Missing: entry point from the reservations list, the "sin pedido" notice on the list, and a read-only use of the order view (to confirm).
- US-49: not implemented.

## Scope
1. US-47: add the access and the "sin pedido" notice on the diner's reservations list, and make the existing order view work read-only for a confirmed order.
2. US-49: record who cancelled, expose the diner's cancelled reservations, and show a read-only cancellation detail (origin, date, refund block only when a payment exists).

Out of scope: cancelling or editing the order on its own, building or confirming an order (specs 014 and 015), payments and refunds (US-38, US-56), issuing receipts, a reservation detail page (US-23), a cancellation reason, a "completada" state.

## PO answers
Q-021-1 to Q-021-4 are confirmed (see `research.md`). Implement decisions D1 to D8 as written.

## Backend
- New migration adding `reservations.cancelled_by` (`'diner'` / `'restaurant'`, nullable, CHECK constraint). Do not edit migration 007.
- `cancel_reservation` sets `cancelled_by = 'diner'`. `closures.py` sets `cancelled_by = 'restaurant'`.
- New endpoint `GET /api/reservations/cancelled` (diner only): the diner's cancelled reservations, newest first, with date, time, restaurant, `cancelled_by`, `cancelled_at`, and a refund summary (`refund_status`: `null` or `pending`, only when the order was paid).
- New endpoint `GET /api/reservations/cancelled/{reservation_id}` returning the same fields for one reservation; 404 for foreign or active reservations.
- Reuse `orders.has_order` and the order data for the refund summary. Do not duplicate order mapping.
- Response schemas in `app/schemas/reservation.py` (or `diner_order.py` if that is where the order types live).

## Frontend
- `DinerReservationsPage.tsx`: each active card shows "Ver pedido" when `has_order`, "Sin pedido anticipado" otherwise, and "Armar pedido" when `order_open`. Add a link "Canceladas" to the cancellations list.
- New page `CancelledReservationsPage.tsx` (list) and `CancelledReservationPage.tsx` (detail), both under `/reservas/canceladas`. Routes in `router.tsx`.
- Detail shows: date and time, party size, table, "Cancelada por vos" or "Cancelada por el restaurante" (or "Cancelada" when `cancelled_by` is null), cancellation date, and the refund block only when `refund_status` is set. Spanish, Argentine voseo.
- Read-only order view: `OrderPage` gets a read-only mode for a confirmed order with no cart (D3), reached from "Ver pedido". Confirm first how it behaves today (see research.md).
- Typed client functions in `frontend/src/api/reservations.ts`. Regenerate `openapi.json` and `schema.d.ts` with `make api-types`.

## Constraints (from AGENTS.md)
- Build only what the spec asks for. No extra states, no reason field, no refund flow.
- Every acceptance scenario has a test named after it (`test_us47_sN_...`, `test_us49_sN_...`, frontend `US-47 S1 ...`).
- Diner sees only their own reservations (FR-005 in spec 021): foreign ids return 404.
- Spanish UI text, English code. No new dependencies.

## Validation
- Backend: US-47 S1 to S4 and US-49 S1 to S5 tests pass, including the foreign-reservation and "cancelled while viewing" cases.
- Frontend: list shows the three states; detail shows origin and the refund block only when applicable; read-only order view does not show the build actions.
- `make format lint test` passes.
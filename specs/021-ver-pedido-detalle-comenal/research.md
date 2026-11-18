# Research: 021 Ver pedido asociado y detalle de cancelación (comensal, US-47 y US-49)

## Current state in the repository (audit, 2026-11-17)

### US-47 (ver pedido asociado): partially implemented
- Order page `/reservas/:reservaId/pedido` (`frontend/src/router.tsx`, `frontend/src/pages/OrderPage.tsx`) is the build-and-confirm page. It is reachable from:
  - `frontend/src/pages/home/UpcomingReservations.tsx` ("Ver pedido", "Seguir armando", "Armar pedido"). This is the only read entry point, and it lives on the home page.
  - `frontend/src/pages/reservation/ConfirmedStep.tsx` ("Armar pedido").
- Backend `GET /api/reservations/{reservation_id}/order` returns the order, the cart and the menu. It already scopes to the diner (`orders.diner_reservation`) and returns 404 for foreign reservations.
- `reservation_response` already sends `has_order`, `has_cart`, `order_open`, `order_deadline` for each reservation.
- The spec asks for access "desde el detalle de la reserva". No diner reservation detail page exists. `frontend/src/pages/DinerReservationsPage.tsx` lists active reservations with a cancel action only. No per-reservation detail route exists.
- Gap: no visible "Ver pedido" or "Sin pedido anticipado" notice on the reservations list page.
- Gap: the spec's "aviso de reserva sin pedido" is not implemented on the list. When there is no order and ordering is closed, the home card shows nothing at all (`OrderState` returns null).
- Gap: `OrderPage` has no read-only mode. Opening it for a reservation with a confirmed order shows the build flow. The spec says the read-only view must reuse the existing component without duplicating logic. Confirm the exact behavior by opening the page with a confirmed order and no cart (not verified in this audit).
- No backend or frontend test is named after US-47 (the search for "US-47" returned nothing).

### T003 verification (2026-11-17)
- Opening `/reservas/:reservaId/pedido` for a confirmed order with no cart initializes `OrderEditor` in the existing confirmed view.
- The confirmed view shows dishes, quantities, totals and preparation information. It is already reuse of the existing component, not a separate screen.
- It is not strictly read-only while the reservation remains editable: it renders “Modificar platos” and, when enabled, “Modificar medio de pago”. Therefore T018 is not limited to linking; it needs a read-only mode at the existing view that hides those edit actions for the `Ver pedido` entry, while preserving the existing edit flow for callers that enter to modify it.
- T017 remains as written: the reservations list needs the `Ver pedido` / `Sin pedido anticipado` states.

### US-49 (detalle de cancelación): not implemented
- Backend `DELETE /api/reservations/{reservation_id}` (`cancel_diner_reservation`) sets `status = cancelled` and `cancelled_at`. Nothing records who cancelled.
- The restaurant-side cancellations (`services/closures.py`, when a closure cancels reservations) also set `status = cancelled` and `cancelled_at`. It is the same data, so the origin cannot be told apart.
- No `cancelled_by` field exists (model `app/models/reservation.py`, migration `007_reservation_cancellation.py` only adds `cancelled_at`).
- No refund model exists. Refunds belong to US-38 and US-56, built in Sprints 5 and 6 (spec 013 says so explicitly). Spec 013 also says the cancellation detail is US-49 (Sprint 6).
- No endpoint lists the diner's cancelled reservations. No route `/reservas/canceladas` (or similar) exists. The diner list only shows active reservations (`GET /api/reservations/active`).
- No test covers US-49.

### Spec inconsistencies to resolve before coding
- Spec 021 Key Entities mention the state "completada". The model only has `confirmed` and `cancelled` (CHECK constraint `status_known`). Past confirmed reservations are not "completed" in the data.
- The spec asks to show "el motivo" (reason) of a cancellation. No reason field exists and the spec never defines one.
- Refund status: the spec says to show "el estado del reembolso". Only a payment status exists on orders (`payment_status`: `pending` / `paid`). Refund flows are not built.

## Decisions (confirmed by PO, 2026-11-17)
- D1 (US-47 entry point): add a "Ver pedido" button or link on each card of `DinerReservationsPage`, pointing to `/reservas/:id/pedido` when `has_order` is true. Do not create a new detail page: that would invent product behavior (AGENTS.md rule 2). Confirmed by PO: access from the list, no new detail page.
- D2 (US-47 no-order notice): on the list card, show "Sin pedido anticipado" when `has_order` is false, plus "Armar pedido" when `order_open` is true. Do not navigate to an empty page. Confirmed by PO: the notice goes on the list.
- D3 (US-47 read-only): reuse the existing order response and the same `reservation_response` / `order_page` mapping. If `OrderPage` cannot render a confirmed order read-only without duplicating logic, add a `readOnly` prop to the existing view. Do not write a second order screen.
- D4 (US-49 origin): add a nullable `cancelled_by` column (`'diner'` or `'restaurant'`, with a CHECK constraint) through a new Alembic migration, never by editing migration 007. Set it in `cancel_reservation` (`'diner'`) and in `closures.py` (`'restaurant'`). Existing cancelled rows keep `NULL` and show "Cancelada" without an origin.
- D5 (US-49 reason): do not show a reason. Do not invent a field. Confirmed by PO.
- D6 (US-49 refund): show the refund block only when the cancelled reservation's order has `payment_status = 'paid'`. Show "Reembolso pendiente" in that case, because no refund flow exists yet. When there is no order or the order is unpaid, show only the confirmation and the origin (spec edge case "Cancelaciones sin pago previo"). Confirmed by PO.
- D7 (US-49 entry point): add a "Canceladas" tab or link on `/reservas` that opens a list of the diner's cancelled reservations (`GET /api/reservations/cancelled`), and a detail view for one of them at `/reservas/canceladas/:reservationId`. The diner sees only their own reservations.
- D8 (state "completada"): do not add a state. A past confirmed reservation is not shown in the cancellation history. Confirmed by PO.

## Alternatives rejected
- Building a full reservation detail page (US-23 territory, not in this spec).
- Adding a refund table or payment logic (US-38, US-56).
- Showing a fake reason or a fake refund status to satisfy the spec (would violate "no spec, no code" and mislead the diner).

## Privacy and safety
- All new endpoints use `require_diner` and filter by `diner_id` from the token. A foreign reservation returns 404 (same as spec 009/US-36 patterns).
- No new personal data is returned beyond what the diner already sees.

## Verification commands
- `make migration m="add reservation cancelled by"` then review the generated file (no edits to 007).
- `make api-types` after the endpoint is added.
- `make format lint test`.
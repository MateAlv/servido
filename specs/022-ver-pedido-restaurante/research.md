# Research: 022 Ver pedido asociado (restaurante, US-36)

## Current state in the repository (audit, 2026-11-17)

Implemented:
- Backend route `GET /api/restaurante/reservas/{reservation_id}/pedido` in `backend/app/api/restaurant.py`, returning `reservation_status` and `order` (or `null`).
- Projection in `backend/app/services/restaurant_orders.py::restaurant_reservation_order`: outer join with `Order.status == "confirmed"` and filter by `Reservation.restaurant_id`, so foreign reservations return 404 and unconfirmed orders are treated as missing (FR-005).
- Schemas `RestaurantReservationOrderResponse` / `RestaurantOrderResponse` in `backend/app/schemas/order.py`.
- Backend tests `backend/tests/test_us36_restaurant_reservation_order.py`: s1 to s5 and the session edge case.
- Frontend: order section inside `frontend/src/pages/RestaurantReservationDinerPage.tsx`, typed client in `frontend/src/api/restaurantReservations.ts`, `openapi.json` and `schema.d.ts` already contain the route.
- Frontend tests in `RestaurantReservationDinerPage.test.tsx`: US-36 S1, S2, S3.

Gaps or risks found:
1. Copy mismatch with FR-005: the page says "Esta reserva no tiene pedido anticipado." for an unconfirmed order. The spec requires the wording to say there is no *confirmed* pre-order ("no tiene pedido anticipado confirmado").
2. Both requests run in one `Promise.all`. If the order request fails, the diner contact data disappears too. The two sections should load and fail independently.
3. `key={item.dish_name}` can collide if two lines have the same name (dish names are not unique per order). Use the index or the order item id (the backend does not expose item ids yet, so index is acceptable here).
4. No frontend test covers the pending/unconfirmed state (plan.md asks for it). The backend covers it (s4); the UI test is missing.
5. `tasks.md` is entirely unchecked even though most of the code exists. Treat the checkboxes as stale and verify each item.
6. Backend s3 expects `order` to be non-null for a cancelled reservation, and the UI hides it behind the "cancelled" message. This matches the spec edge case (the cancelled order is not shown as a dish to prepare). Keep it, but confirm with PO (the spec leaves it open).
7. Open PO questions in the spec that do not block the work: total scope (only dishes × quantity × price at confirmation), payment method and arrival time (not required), dish changed or removed from menu (the order keeps its snapshot).

## Decisions
- D1: Keep the existing endpoint and page. Do not create a new detail page (the spec says "desde el detalle de la reserva", which is the existing page `/restaurante/reservas/:id/comensal`).
- D2: Fix the FR-005 copy to the spec wording. Do not change the cancelled behavior.
- D3: Split the two fetches so each section has its own loading and error state.
- D4: No new migrations. No new dependencies.

## Alternatives rejected
- Showing unconfirmed orders as "pending" (spec FR-005 forbids showing them as orders to prepare).
- A separate `/restaurante/pedidos/{id}` view for this story (already exists for the shift list, US-37; out of scope).

## Verification commands
- `make api-types` and check `git diff --stat` shows no unexpected change in `openapi.json` or `schema.d.ts`.
- `make format lint test`.
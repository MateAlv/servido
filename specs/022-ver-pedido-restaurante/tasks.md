# Tasks: 022 Ver pedido asociado (restaurante, US-36)

Legend: [x] already done in the repository (verify before relying on it), [ ] to do.

## Verification (do first)
- [x] T001 Backend endpoint `GET /api/restaurante/reservas/{reservation_id}/pedido` exists and is documented (`app/api/restaurant.py`).
- [x] T002 Backend projection filters by owner restaurant and confirmed orders (`app/services/restaurant_orders.py`).
- [x] T003 Backend tests for S1 to S5 and the session edge case exist (`tests/test_us36_restaurant_reservation_order.py`).
- [x] T004 Frontend section, typed client and US-36 S1 to S3 tests exist.
- [x] T005 Run the backend US-36 tests and the frontend test file; record the result. Backend US-36 tests passed; frontend restaurant reservation diner tests passed.

## Gaps to close
- [x] T006 Change the no-order copy in `RestaurantReservationDinerPage.tsx` to say there is no confirmed pre-order (FR-005). Spanish text: "Esta reserva no tiene pedido anticipado confirmado."
- [x] T007 Split the `Promise.all` into two independent loads with their own error message, so a failed order does not hide the diner contact (plan D3). Add a test where the order request fails and the contact still shows.
- [x] T008 Replace `key={item.dish_name}` with the array index (or a stable composite key) to avoid duplicate-key warnings.
- [x] T009 Add the UI test "US-36 S4 treats an unconfirmed order as missing": the mocked response has `order: null` with `reservation_status: confirmed`, and the page shows the no-confirmed-order message, not the order list.
- [x] T010 Add a backend test named `test_us36_edge_order_items_keep_the_confirmed_name_and_price` if there is no test that checks the snapshot (name and unit price from confirmation). Skip if an existing test already covers it.

## Contract and checks
- [x] T011 Run `make api-types`. If the diff is empty, the contract is fine; if not, commit the regenerated `openapi.json` and `schema.d.ts`.
- [x] T012 Run `make format lint test`. Backend and frontend lint/format/type checks passed; backend 538 tests and frontend 527 tests passed.

## Open questions (do not block T001 to T012)
- Q-022-1 (PO): show the total as the sum of dish prices at confirmation (current behavior) or add tips and discounts? Current behavior is kept.
- Q-022-2 (PO): show a cancelled reservation's order as cancelled (current behavior) or hide the section? Current behavior is kept.
# Research: View and Cancel Diner Reservation

## Decision: Reuse the existing reservation state and availability queries

- **Decision**: Store cancellation by changing `Reservation.status` to
  `cancelled` and setting `cancelled_at`; list active reservations with
  `status = 'confirmed'` and `starts_at > now`.
- **Rationale**: The model and migration already enforce the status/timestamp
  invariant, and `availability.taken_tables` already ignores non-confirmed
  reservations. This releases the table without a new table or background job.
- **Alternatives considered**: A separate `Cancellation` table would duplicate
  state and add no behavior required by US-23/US-25; deleting the reservation
  would lose the cancellation state and break the restaurant's existing view.

## Decision: Add a dedicated active-list endpoint and a DELETE transition

- **Decision**: Expose `GET /api/reservations/active` and
  `DELETE /api/reservations/{reservation_id}` for authenticated diners.
- **Rationale**: The current day and upcoming endpoints serve other flows and
  cannot express the requested all-active list plus detail. `DELETE` naturally
  represents the diner-requested cancellation while preserving the row.
- **Alternatives considered**: Reusing the day endpoint would require a
  special sentinel date; a `PUT` status endpoint would expose a broader state
  mutation than the spec asks for.

## Decision: Lock and revalidate on cancellation

- **Decision**: Load the reservation with `SELECT ... FOR UPDATE`, verify the
  diner owns it, verify it is confirmed and calculate the 45-minute cutoff from
  `availability.current_time()` in Buenos Aires before committing.
- **Rationale**: The deadline must be enforced at the moment of mutation, not
  only by the UI. The row lock makes double clicks/retries produce one
  transition; the second request reports that the reservation is already
  cancelled.
- **Alternatives considered**: A UI-only deadline is bypassable and races with
  another request; an idempotency key is unnecessary because the persisted
  state and transaction already provide the required behavior.

## Decision: Treat the associated order as cancelled through reservation state

- **Decision**: Do not add a new order status. An order for a cancelled
  reservation is cancelled by the reservation transition, matching the
  existing `Order` model documentation and the spec's Sprint 4 boundary.
- **Rationale**: US-25 requires the associated pre-order not to remain active,
  while the current order model only stores `confirmed`/`pending`. Adding a
  third status would be a broader order feature and conflict with later
  payment/refund scope.
- **Alternatives considered**: Adding `cancelled` to `Order.status` would
  require a migration and change restaurant/order behavior outside this spec.

## Decision: Use existing stack and Spanish UI

- **Decision**: React Router, TanStack Query, typed OpenAPI client, existing
  design-system components and Spanish (Argentina) messages; no dependencies.
- **Rationale**: These are repository-wide constraints and already cover loading,
  session expiry, confirmation dialogs and success/error toasts.
- **Alternatives considered**: No alternative library is justified for this
  two-screen interaction.

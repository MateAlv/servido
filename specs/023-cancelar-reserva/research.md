# Research: Restaurant Reservation Cancellation

## Decision: Reuse the existing reservation state and availability rules

**Rationale**: `Reservation.status = "cancelled"` and `cancelled_at` already exist,
and availability counts only confirmed reservations. Cancelling the reservation
therefore releases the table without adding an order status or a second availability
implementation.

**Alternatives considered**: Adding a separate cancellation table as the source of
truth was rejected because it could disagree with the existing reservation status.

## Decision: Use a row lock and one database transaction

**Rationale**: The reservation must be checked for restaurant ownership, current status
and the 45-minute cutoff immediately before mutation. A `FOR UPDATE` lock prevents
double cancellation and allows a unique refund record and notification to be created
atomically.

**Alternatives considered**: Checking in the router without a lock was rejected because
double clicks or two sessions could create duplicate refunds.

## Decision: Simulate the refund behind a narrow adapter

**Rationale**: The user selected a simulated refund while real electronic payment is
out of scope. The adapter receives the paid order and amount, returns a completed
refund or a deterministic failure for tests, and has no provider dependency.

**Alternatives considered**: Integrating Mercado Pago or SES payment APIs was rejected
because it exceeds US-38 and violates the repository's no-new-service rule.

## Decision: Persist an in-app notification and send email after commit

**Rationale**: The in-app record guarantees a durable notice even when an external mail
backend is unavailable. The existing `mail.py` backends are reused for the email.
Mail failure is logged and does not roll back a completed cancellation, matching the
repository's existing closure-notification behavior.

**Alternatives considered**: A queue or retry worker was rejected by the MVP
constraints. Sending mail before commit was rejected because a failed transaction
could notify a cancellation that did not happen.

## Decision: Store payment state minimally on the order

**Rationale**: Current restaurant order responses expose payment as a hard-coded pending
value. US-38 needs only `payment_status`, `payment_method` and the confirmed total to
decide whether a refund applies; it does not implement payment collection.

**Alternatives considered**: A complete payment domain was rejected as US-56 scope.

# Research: US-14 baseline, US-16 and US-18


## Decision: Reuse the existing reservation model and restaurant router

- **Decision**: Add a restaurant-only read endpoint to `app/api/restaurant.py` and query `Reservation`.
- **Rationale**: The repository already authenticates restaurant tokens through `restaurant_from_claims`, and `Reservation` contains all fields required by US-14.
- **Alternatives considered**: A new router or service layer would duplicate the existing ownership check without adding business rules.

## Decision: Filter by local Buenos Aires date and return local times

- **Decision**: Convert stored UTC timestamps to `America/Argentina/Buenos_Aires` and compare the requested date with the local start time.
- **Rationale**: This matches the reservation API convention and prevents date shifts around midnight.
- **Alternatives considered**: Filtering by UTC date would be incorrect for the product timezone.

## Decision: Manual refresh only

- **Decision**: Fetch on initial load and whenever the selected date changes.
- **Rationale**: The PO confirmed this interpretation of the unresolved clarification; polling or realtime transport is not required.
- **Alternatives considered**: Polling or websockets would add complexity outside the MVP.

## Decision: Group display by configured opening shift

- **Decision**: The frontend uses the existing opening-shift query to place each reservation in its matching turno.
- **Rationale**: Shifts are already the restaurant's source of truth and can be reused without changing the reservation schema.
- **Alternatives considered**: Persisting a shift identifier would require a migration and couple historical reservations to schedule edits.

## Decision: Extend Reservation with cancellation metadata

- **Decision**: Add nullable `cancelled_at` to `reservations`; require it for
  cancelled rows in the application transition and expose it in local Buenos
  Aires time.
- **Rationale**: US-18 needs the cancellation instant, while a separate
  cancellation table would add history and behavior outside the MVP.
- **Alternatives considered**: Deriving the instant from audit logs (none
  exist), or adding a cancellation history table.

## Decision: Use a minimal diner projection

- **Decision**: Add a restaurant-owned reservation detail endpoint that joins
  `Reservation` to `Diner` and returns only id, name and email.
- **Rationale**: These are the only contact fields currently stored and meet
  US-16 without exposing credentials or account metadata. A missing/foreign
  reservation returns `404`.
- **Alternatives considered**: Returning the full diner model, or adding a
  separate contact table.

## Decision: Treat cancellation as a read increment

- **Decision**: Add a restaurant-only cancellation listing with an optional
  local-date filter. The cancellation operation and its UI remain US-38.
- **Rationale**: US-18 explicitly permits pre-seeded cancelled reservations for
  Sprint 3, while availability already ignores rows whose status is not
  `confirmed`.
- **Alternatives considered**: Adding a restaurant cancellation command now,
  which would duplicate US-38 and expand scope.

## Decision: Keep order data optional

- **Decision**: Define an optional `preordered_order` response projection, but
  do not create an order model before US-17.
- **Rationale**: The API shape can indicate a cancelled associated order when
  that relationship exists, without inventing persistence or payment behavior.
- **Alternatives considered**: Implementing the complete order domain in this
  increment.

## Decision: Reuse the existing mail service at the cancellation transition

- **Decision**: The future/existing cancellation transition sets
  `cancelled_at` and calls `app.services.mail.send_mail` with restaurant
  details; the read endpoints do not send mail.
- **Rationale**: This satisfies FR-013 while keeping side effects at the state
  transition and preserving the existing SES/SMTP/memory backends.
- **Alternatives considered**: Sending mail while listing cancellations, which
  would duplicate notifications on every read.


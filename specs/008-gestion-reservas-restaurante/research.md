# Research: US-14

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

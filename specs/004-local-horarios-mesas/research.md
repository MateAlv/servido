# Research: Restaurant profile, opening hours and table capacity

## Decision: Reuse the accepted Nominatim geocoder

**Rationale:** ADR 0003 already selects OpenStreetMap Nominatim, requires an
identifying User-Agent, limits requests to one per second, and says to
geocode only when an address is saved. The profile flow therefore separates
address lookup from persistence: a successful lookup returns a preview, and
the save request persists the selected coordinates.

**Alternatives considered:** Google Maps was rejected because it requires a
billing account; geocoding on every restaurant read was rejected because it
violates the ADR and adds unnecessary external traffic.

## Decision: Validate weekly shifts as half-open local-time intervals

**Rationale:** A shift stores a weekday plus `hora_inicio` and `hora_fin`.
The service rejects `hora_fin <= hora_inicio` and detects overlap when
`next.start < current.end` after sorting by start time. This makes adjacent
shifts valid and keeps the rule deterministic. A shift crossing midnight is
rejected because US-8 defines consistency within a calendar day; the next
day must have its own shift.

**Alternatives considered:** Allowing a shift to cross midnight would make
weekday ownership and reservation-date checks ambiguous and is not required by
the spec.

## Decision: Put simple invariants in PostgreSQL and repeat request validation

**Rationale:** Positive capacities and quantities, nonblank profile values,
valid weekday values, and unique restaurant/shift identity are database
invariants. Pydantic and service validation provide Spanish 400 responses
before the database operation. This preserves correctness for direct writes
and concurrent requests.

**Alternatives considered:** Python-only validation was rejected because it
cannot protect against concurrent or non-API writes.

## Decision: Protect restaurant ownership through the existing token dependency

**Rationale:** Configuration endpoints use `TokenClaimsDep`, verify the
restaurant role, and scope all reads and writes to the restaurant ID from the
token. A diner receives 403 and an unknown restaurant receives 404, matching
repository conventions.

**Alternatives considered:** Accepting a restaurant ID from the request body
was rejected because it permits cross-account updates.

## Decision: Model availability as individual tables, grouped for storage

**Rationale:** A reservation for `N` people requires one available table with
capacity at least `N`. A group stores `quantity` equivalent tables, but the
algorithm must not sum capacities from several tables to satisfy one
reservation. Availability is therefore tracked per capacity group as a count
of free individual tables.

**Alternatives considered:** Treating all configured seats as one aggregate
capacity pool was rejected because it could incorrectly seat a party across
multiple tables and violate the physical-table requirement in US-10.

## Decision: Make table-inventory changes one database transaction

**Rationale:** The update locks the affected inventory and checks confirmed
reservations assigned to individual tables before changing availability. If
disabling a group would remove tables needed by already confirmed
reservations, it returns a conflict/warning without mutating the inventory.
The same transaction boundary is the place where the later
reservation-confirmation flow must lock one eligible table and consume one
free-table slot.

**Alternatives considered:** A preflight check followed by a separate update
was rejected because concurrent confirmations could assign the same physical
table twice or create the over-reservation edge case from the spec.

## Decision: Keep reservation creation out of this feature

**Rationale:** US-10 needs a conflict check against confirmed reservations,
but the repository has no reservation implementation yet and US-11/US-13 are
in spec 005. This plan defines the inventory-side boundary and conflict
response without introducing reservation endpoints or entities outside spec
004. The implementation must integrate with the reservation model when spec
005 is planned.

**Alternatives considered:** Adding a minimal reservation model now was
rejected as out-of-scope and would invent behavior not specified in 004.

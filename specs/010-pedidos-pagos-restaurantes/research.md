# Research: Restaurant Orders and Payment Status

## Existing repository patterns

**Decision**: Reuse `Reservation`, `OpeningShift`, `Dish`, the restaurant
ownership dependency, SQLAlchemy typed models, Pydantic response schemas and
the generated OpenAPI client.

**Rationale**: Reservations already store the restaurant, arrival interval and
confirmed/cancelled status. Opening shifts already use ISO weekdays and local
times. The project requires all protected restaurant endpoints to enforce
ownership through the existing authentication helpers.

**Alternatives considered**: A separate calendar or kitchen projection was
rejected because the MVP has one concurrent user and the source tables are
sufficient.

## Active shift calculation

**Decision**: Determine the current Buenos Aires local weekday and wall-clock
time, then select an active shift whose interval contains the current time.
If no shift contains it, return an empty active-shift result rather than
choosing the next or previous shift.

**Rationale**: This directly implements the US-20 definition of “turno actual”
and the empty-state edge case. Shifts do not cross midnight in the existing
model.

**Alternatives considered**: Selecting the nearest shift was rejected because
the spec requires no active shift outside opening hours or between shifts.

## Order confirmation and cancellation filtering

**Decision**: Query only orders with their own confirmed status and join the
reservation with `status = confirmed`, constrained to the authenticated
restaurant and active shift.

**Rationale**: Order confirmation and reservation confirmation are distinct
operations. Filtering both explicitly prevents unconfirmed orders and orders
whose reservations were cancelled from appearing.

**Alternatives considered**: Inferring order confirmation from reservation
status was rejected because the spec explicitly distinguishes them.

## Preparation start ordering

**Decision**: Calculate `prep_start_time` as arrival time minus the maximum
preparation time among the order's dishes. Missing preparation times count as
zero and the UI shows a warning that the preparation time is 0. Store or expose
the resulting value as a timezone-aware timestamp and sort by arrival time,
prep start time, and order ID as a deterministic final tie-breaker.

**Rationale**: Parallel dish preparation means the kitchen must start early
enough for the slowest dish. The final ID tie-breaker satisfies the edge case
requiring consistent ordering without inventing a product-facing criterion.

**Alternatives considered**: Summing preparation times was rejected because
dishes can be prepared in parallel. Rejecting orders with missing dish data was
rejected for the MVP; the warning makes the incomplete data visible.

## Payment display and deferred transitions

**Decision**: Model payment state as `paid` or `pending`, method as `cash` or
`online` when selected, and expose `No seleccionado` when absent. Payment
approval and cash-collection confirmation are documented integration boundaries
and are not implemented in the current US-20 slice.

**Rationale**: This preserves the complete US-22 design without adding a gateway,
webhook or speculative operation before the team defines its owner and
integration.

**Alternatives considered**: Adding a fake payment provider or an undocumented
admin endpoint was rejected by the constitution's backlog-bound and simple
infrastructure principles.

## Reservation timing invariant

**Decision**: Continue using 30-minute reservation starts and 90-minute
capacity occupancy. A reservation at 19:00 reduces the available capacity
through 20:30; valid starts include 19:00, 19:30 and 20:00 when within a shift.

**Rationale**: This is an existing domain rule confirmed by the team and must
remain consistent when orders are associated with reservations.

# Research: Estimated Preparation Time

## Decision: Reuse the dish preparation-time field

The restaurant already declares a preparation time as part of a dish and can edit
that dish. US-40 should extend and validate that existing flow rather than add a
second preparation-time concept.

**Rationale**: It keeps one source of truth for menu data, preserves the existing
Spanish restaurant menu experience, and avoids duplicate fields or screens.

**Alternatives considered**:

- Add a restaurant-level preparation-time catalog: rejected because the estimate
  belongs to each dish.
- Add a separate order-editing screen: rejected because confirmed order data must
  remain immutable and new orders already read menu values.

## Decision: Calculate a new order's total with the maximum item time

The total estimated preparation time is the maximum positive preparation time among
the dishes in the order. Missing times contribute zero and produce a warning.

**Rationale**: The existing order flow and restaurant order view already use this
definition to calculate `prep_start_time`; it models parallel kitchen preparation
and matches the product wording "tiempo total" without summing independent dishes.

**Alternatives considered**:

- Sum all dish times: rejected because it overestimates parallel preparation.
- Average the times: rejected because the slowest dish determines readiness.

## Decision: Snapshot preparation data when confirming the order

An order item stores the dish name, price and preparation time shown at confirmation.
Later menu edits affect only new carts and orders.

**Rationale**: Confirmed orders are historical commitments and must not change when
the restaurant edits its menu.

**Alternatives considered**:

- Recalculate confirmed orders from current dishes: rejected because it changes
  information already shown to the diner and can alter coordination after purchase.

## Decision: Keep validation at both request and database boundaries

The user-facing form rejects zero, negative, non-integer and out-of-range values;
the persistence model keeps the positive-value invariant as a database constraint.

**Rationale**: This produces immediate Spanish feedback while protecting data from
other write paths.

**Alternatives considered**:

- Client-only validation: rejected because it does not protect API writes.
- Accept zero as "unknown": rejected for new values because the backlog requires
  a number greater than zero; an omitted value remains the representation for
  a dish without an estimate.

## Decision: Do not add a real-time kitchen workflow

This feature only records, displays and snapshots estimated minutes. It does not
measure actual preparation, track progress or send delay alerts.

**Rationale**: Those behaviors are outside US-40 and would violate the MVP scope.

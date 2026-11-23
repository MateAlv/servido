# Research: Ver promociones y aplicar descuento

## Repository findings

### Decision: Reuse the promotion domain from spec 028

- `Promotion` already stores the discount type/value, minimum amount, date/day/time validity,
  active state, and stackability.
- `app.services.promotions.covers`, `discount_for`, and `resolve` already implement local-time
  validity, fixed minimums, percentage rounding, stacking, and the non-negative cap.
- `OrderDiscount` is already the confirmation-time snapshot, while `Order.subtotal`,
  `discount_amount`, and `total` are already constrained to remain consistent.

**Rationale**: This directly satisfies the assumptions and invariants of spec 031 without
duplicating promotion rules or adding a new persistence model.

**Alternatives considered**: Reimplementing eligibility in the public router or in React was
rejected because it could disagree with confirmation and would make the API response
non-authoritative.

### Decision: Calculate draft discounts from the reservation arrival time

The existing cart stores the selected arrival delay and the order page already derives the
arrival instant from the reservation plus that delay. The backend will pass that instant and the
cart subtotal to the shared promotion resolver whenever it builds a cart/order response and when
it confirms the order.

**Rationale**: FR-004 requires changes to dishes and arrival time to be reflected before
confirmation, and the spec explicitly requires Buenos Aires local time.

**Alternatives considered**: Evaluating against the HTTP request time was rejected because a
promotion can be valid for the reservation while not being valid at the time the diner edits the
cart.

### Decision: Expose one transparent summary shape for cart and confirmed order

The response will expose the subtotal, applied promotion names/details, discount amount, and
total for both draft and confirmed states. A draft's values are recalculated from current
promotions; a confirmed order's values and `OrderDiscount` rows are read from the frozen order
snapshot.

**Rationale**: The same summary can feed the receipt, payment selection, and final payment
amount, satisfying FR-003 and FR-005.

**Alternatives considered**: Returning only a final total was rejected because V2 requires the
promotion and amount discounted to be visible.

### Decision: Public detail returns active, non-expired, current or future promotions

The public restaurant endpoint filters by `active` and excludes promotions whose end date has
passed in the current Buenos Aires date. Future promotions are included, as required by the V1
edge-case decision; their configured date/day/time conditions remain visible.

**Rationale**: Paused and expired promotions must never be shown, while programmed, non-expired
promotions must be discoverable.

**Alternatives considered**: Returning only promotions currently applicable to today was rejected
because it would hide future programmed offers explicitly included by the spec.

## Clarifications and assumptions

No `[NEEDS CLARIFICATION]` markers are present in the feature spec. V1–V3 and the promotion
stacking policy from spec 028 are treated as the recorded decisions for this plan. No behavior
outside the MVP boundaries is included.

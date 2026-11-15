# Research: Arrival confirmation and payment preference

**Feature**: 020-tiempo-pago | **Date**: 2026-11-14 | **US**: US-43, US-45

## Evidence reviewed before design

- `backend/app/models/{reservation,order,order_item,cart}.py`: one confirmed order and one private cart per reservation; confirmed tables are `pedidos` / `pedido_items`. Order `status` is not payment status.
- `backend/app/services/orders.py`: reservation row locks for cart writes, confirmations and discard; full replacement, frozen menu snapshots, verified email, 45-minute cutoff, empty-order removal. Arrival currently equals reservation start.
- `backend/app/api/order.py`, `backend/app/schemas/diner_order.py`: cart and confirmation share an items-only request; confirmation returns a fresh OrderPageResponse. Neither stores arrival or method.
- `backend/app/services/restaurant_orders.py`, `backend/app/api/restaurant.py`, `backend/app/schemas/order.py`: restaurant independently calculates arrival from reservation start, filters the current shift by reservation start, sorts by arrival, and hardcodes payment pending / No seleccionado. There is no payment table or payment writer.
- `backend/app/api/reservation.py`, `backend/app/services/reservations.py`: booking times and table allocation must remain unchanged. Keep cancellation behavior; do not import old backlog timing into this feature.
- `backend/migrations/versions/2026_11_04_1116-e0e674653e2f_pre_order_and_cart.py`: existing cart and order extension; never edit it. Current inspected graph ends at `5061ebdc5acd`; verify head again before generating a new revision.
- `frontend/src/api/orders.ts`, `frontend/src/lib/useOrderCart.ts`, `frontend/src/pages/OrderPage.tsx`: typed API, 500 ms draft saves, single promise sequence for save/confirm/discard, items-only equality, local success banner. Read-only branch currently disables all editing at the dish cutoff.
- `frontend/src/lib/requestId.ts`, `frontend/src/api/session.ts`, `frontend/src/pages/RestaurantOrdersPage.tsx`, `frontend/src/components/order/Receipt.tsx`: reuse UUID helper, session redirect, separate payment status/method display and receipt arrival prop.
- `backend/tests/test_order.py`, `backend/tests/test_restaurant_orders.py`, `backend/tests/reservations.py`, `frontend/src/pages/OrderPage.test.tsx`, `frontend/src/lib/useOrderCart.test.ts`: existing regression and factory patterns.
- `specs/009-pedido-anticipado/{spec,plan,research,data-model}.md`, `docs/product/backlog.md`, `docs/design/README.md`, constitution and AGENTS.md.

## Decisions

### R1 — Extend the existing order aggregate

**Decision**: Keep the same page, router, services, cart tables and confirmed tables. Store an `arrival_delay` interval and nullable `payment_method` on both Cart and Order. Public APIs exchange timezone-aware `arrival_at` instants; derive persisted delay from the unchanged reservation start.

**Rationale**: The revised team agreement permits an interval between zero and 30 minutes exactly persists the selected arrival relative to the immutable booking start, with a simple database CHECK and no duplicated reservation timestamps or cross-table triggers. An interval preserves sub-minute precision without an invented time grid. Display/response arrival is start plus delay; all business timestamps remain aware and UTC at boundaries. Historical rows get zero delay, preserving P7 behavior.

**Alternatives considered**: changing reservation times (violates the spec), storing only in browser (violates P1), absolute arrival timestamp plus duplicated start or triggers (more machinery to enforce the same bound), integer minutes (adds rounding not agreed by the team).

### R2 — Separate preference from payment state

**Decision**: Add nullable-at-rest `payment_method` (`cash` / `online`) for incomplete drafts/legacy rows, requiring a choice on every new non-empty confirmation/reconfirmation, and non-null `payment_status` (`pending` / `paid`, default pending) to Order. The latter replaces the hardcoded read projection and is the minimal integration seam for future authoritative payment writers. US-45 has no endpoint that marks paid and never resets status on reconfirmation. Tests seed paid orders directly, not through a production payment route. Future cobro integration must update this state transactionally under the reservation lock.

**Rationale**: There is no authoritative payment persistence today. A constrained state column makes paid-state tests real Postgres tests and gives all readers one value without inventing a payment processor or ledger. It is not evidence that actual collection exists.

**Migration rationale**: legacy confirmed orders have no recorded method and must not receive a fabricated choice. Keep nullable storage for those rows and draft saves, but enforce choice in confirmation validation and an INSERT/UPDATE guard for new confirmed rows or a changed confirmed_at. P11 explicit removal stays available without selecting a payment method; it does not confirm an order.

**Alternatives considered**: infer paid from online (forbidden), hardcode pending (cannot enforce paid lock), build Payment ledger/manual settlement (US-56 scope), test-only production switch (forbidden complexity).

### R3 — Durable receipts for accepted confirmations

**Decision**: Require UUID `operation_id` with an immutable full confirmation snapshot. Store successful operations in `order_confirmations`, keyed by reservation and operation UUID, with canonical request digest and acceptance time. Keep receipts independently of Order so P11 deletion and recreation cannot resurrect old contents. Under the existing reservation lock, look up a receipt after auth/ownership and before mutable time/menu/payment checks. A matching accepted operation performs no writes and returns the current page; a different payload with the same key returns 409. Rejected operations leave no receipt. New deliberate confirmation gets a new UUID.

**Rationale**: Keeping only the last operation on Order cannot recognize earlier retries after a newer confirmation or deletion. Replacing the whole order with PUT is insufficient once later writes exist. No response cache, worker, expiry job or generic idempotency framework is needed.

**Alternatives considered**: regenerate UUID on retry (overwrites later changes), last UUID only (forgets older accepted operations), replay historical response (does not show current state), global idempotency service (unnecessary).

### R4 — Preserve P1 serialization, including the payment seam

**Decision**: All related writers lock Reservation first, then read Order/Cart with refreshed state. New accepted confirmations remain last-wins. The database INSERT/UPDATE payment guard enforces choice on new confirmed rows/reconfirmations (R2); its UPDATE branch also rejects changes of payment_method when OLD.payment_status is paid, backing up the service check without a new payment flow. A payment-only PUT touches only the confirmed method; it does not touch cart, items, arrival, confirmed_at or prep_start_time. Any joint confirmation that would change a paid order's method fails atomically. Future payment accreditation must use the same lock ordering. Cart snapshots remain private and last-save-wins; confirming one deliberately incorporates its method, even if it differs from an unpaid confirmed order's method.

**Rationale**: This follows the agreed full snapshot and existing P1, without automatic field merges or optimistic editing conflicts. Lock eligibility is checked with current server time after acquiring the lock. Retries are not new writes.

**Alternatives considered**: independent writes with pre-lock eligibility (races), overwrite only some unspecified draft fields (new semantics), add version-conflict UX (changes P1).

### R5 — Extend the existing frontend draft sequence

**Decision**: Expand the cart snapshot from lines to lines + arrival + method; preserve the existing single promise sequence. Compare all fields, including for discard, menu recovery and arrival-only reconfirmation. Keep a pending immutable operation snapshot and UUID across uncertain failures in account/reservation-scoped sessionStorage, cleared on authenticated accepted/replayed result, definitive semantic rejection of that operation, or explicit abandonment; 401, network failures and failed state reads do not clear it because they do not establish the original outcome. Store no token in that record. On return after authentication, fetch current page first and retain the unresolved operation separately. Recovery first cancels the autosave timer, invalidates queued but unstarted stale save/discard tasks, waits for in-flight requests, and disables pagehide flush of the stale snapshot. It does not hydrate the editor from the pending body. Retrying that operation bypasses draft-save/discard and resends its frozen body directly; it must not flush an old draft over later state. A deliberate new confirmation uses the normal save-then-confirm sequence and a new UUID. Clear pending records when switching accounts; do not erase one on automatic expiry for the same account.

**Rationale**: The existing queue prevents late autosaves recreating the deleted cart. The operation must survive a lost HTTP response and an authentication redirect. The pending record is transport recovery, never the authoritative cart.

**Alternatives considered**: a second metadata save sequence (races), regenerate body from current UI for retry (key/payload mismatch), local storage as cart source (violates P1).

### R6 — Reuse existing UI and both readers

**Decision**: Keep reservation start/end separate from arrival. Use TextField for arrival and labelled Chip choices with no automatic default; cash/online is mandatory before non-empty confirmation/reconfirmation, while an incomplete cart may remain unselected; SegmentedControl currently coerces missing selection to its first option. No new reusable component is required. Render the confirmed payment editor under an independent server eligibility flag in open and closed dish views. Restaurant projections share arrival/preparation helpers, retain their shift membership rule and existing HH:MM / No seleccionado compatibility, and expose actual stored method/status. Preserve restaurant prep_time_warning semantics rather than redesign US-20.

**Rationale**: Existing Receipt, statuses, error handling and restaurant page suffice. Diner no-time estimation remains hidden as agreed; existing restaurant warning remains a separate behavior.

**Alternatives considered**: new payment screen/route (unnecessary), unchanged SegmentedControl (violates no default), extend a generic control solely for this page (unnecessary).

## Clarification provenance and remaining dependencies

All 11 Q/A entries remain in spec.md; answers 1 and 6 are revised by the team on 14/11 to a 30-minute arrival window and required cash/online selection on non-empty confirmation/reconfirmation. These supersede the earlier 15-minute window and optional confirmation-time selection. Other answers remain unchanged. Validation status was updated on 2026-11-15: agreement 1 is validated; agreements 2, 6 and 10 are partially covered as detailed below; agreements 3, 4, 7, 8, 9 and 11 still require independent validation, and agreement 5 remains provisional pending review. No approval is inferred for additional clauses or from successful automated tests. No functional unknown prevents design. Formal review is a delivery gate, not a missing technical answer.

Actual payment accreditation and its end-to-end acceptance path remain external dependencies of US-56/60 and any cash collection story. This plan only stores/read-checks state. The team must coordinate the writer's transaction/lock protocol before those integrations ship. Existing paid-order dish-change/refund policy is not expanded by this feature; it does not introduce payment operations or a paid-order deletion flow.

## Implementation evidence — 2026-11-14

The user explicitly authorized implementing the recorded team agreements, including the revised answers 1 and 6. Their formal/provisional review labels remain unchanged. Existing spec 009 models, services, endpoints, schemas, frontend queue and tests were reused. Alembic baseline was `5061ebdc5acd`; the new revision is `459c8cb1f9cf`. Restaurant payment placeholders are now projections of confirmed stored values.

Docker PostgreSQL 17 and `servido_test` were verified. Test startup defaults to `servido_test` and refuses other database names. The unchanged Makefile starts Docker PostgreSQL and invokes pytest without creating a database; local `servido_test` must already exist, and the test session applies its migrations. CI provisions and explicitly selects the same database. A pre-existing WSL clock drift occasionally produced immediately invalid fixture JWTs; test login helpers reuse the existing test suite's one-minute-backdated auth clock pattern. Production JWT validation and system clocks remain unchanged. No packages or infrastructure services were added. See quickstart.md for verification evidence and human checks still outstanding.

## Validation scope — 2026-11-15

Validated scope: arrival from original reservation start through +30 minutes inclusive, future arrival, unchanged table/start/end; and explicit cash/online selection without a default before non-empty confirmation/reconfirmation, with rejection and feedback when missing. This records only the stated functional validation. No other agreement is approved by implication.

| Agreement | Status | Independent validation still required |
| --- | --- | --- |
| 1 | Validated | None for the stated arrival-window rule. |
| 2 | Partial | The 45-minute order cutoff remains the documented spec 009 rule, separate from validating that arrival leaves the original start unchanged. |
| 3 | Pending | Preparation maximum, quantity independence and missing-estimate fallback (009 P2). |
| 4 | Pending | First-empty rejection and explicit removal of an existing order (009 P11). |
| 5 | Provisional | Universal cash/online availability and the preference/collection integration boundary; selection being mandatory does not approve these additional clauses. |
| 6 | Partial | The selection prerequisite is validated; private draft storage, later changes and payment-state clauses remain governed by the independently pending agreements 5 and 7–9. |
| 7 | Pending | Private/confirmed persistence and independent method changes beyond dish cutoff. |
| 8 | Pending | Reservation-end, cancellation, existing-order and unpaid-state eligibility for method changes. |
| 9 | Pending | Authoritative paid status, freeze and future collection integration. |
| 10 | Partial | Arrival bounds and unchanged booking are covered; joint reconfirmation, draft privacy, menu revalidation and the 45-minute cutoff are not approved by that validation alone. |
| 11 | Pending | Accepted-operation retry semantics and preservation of subsequent changes. |

No behavior or technical design is changed by this status update. T001 remains incomplete because its independent agreement validations are still outstanding. PR review and approval remain separate and pending.

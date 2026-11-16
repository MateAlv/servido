# Implementation Plan: Arrival confirmation and payment preference

**Feature**: `specs/020-tiempo-pago` | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md) | **US**: US-43, US-45 | **Sprint**: 5

**Branch**: `020-tiempo-pago` | **Input**: Current specification and all 11 recorded clarification decisions, with team revisions to answers 1 and 6 on 14/11 (30-minute arrival window and mandatory method on confirmation).

## Summary

Extend the existing diner OrderPage, private Cart and confirmed Order rather than create another ordering flow. Persist arrival and payment preference separately in draft and confirmed snapshots, requiring an explicit method when confirming or reconfirming a non-empty order, keeping the reservation schedule and spec 009's 45-minute cutoff unchanged. Add a narrow confirmed-method update that remains available until reservation end while unpaid. Record accepted confirmation operations transactionally so retries return current state without overwriting newer confirmations, payment preferences or carts. No electronic payment processing, payment recording UI or new infrastructure is included.

## Technical Context

**Language/Version**: Python 3.12 · TypeScript.

**Primary Dependencies**: Existing FastAPI, SQLAlchemy 2, Alembic, Pydantic; React, Vite, React Router, TanStack Query, openapi-fetch; existing design system.

**Storage**: PostgreSQL 17, existing tables plus one accepted-operation receipt table. Standard-library hashlib/json/uuid; no new package.

**Testing**: pytest on real Postgres, Vitest + Testing Library, existing backend factories and frontend mocked typed API.

**Target Platform / Project Type**: Mobile-first web application, existing SPA and JSON API under `/api`.

**Performance Goals**: Spec SC-001 confirmation journey under 60 seconds for 90% of participants; validate with a timed human pass, without adding analytics infrastructure. Other correctness criteria use automated acceptance tests. No throughput/scaling target.

**Constraints**: Single Free-plan deployment, no workers/queues/caches/flags/new service, 360px layouts, accessible labelled inputs, Spanish UI and aware business time in Buenos Aires. Keep English identifiers and planning artifacts.

**Scale/Scope**: Extend two existing tables; add payment read-state column and one receipt table; extend cart/order requests and responses; add one method-only endpoint; adapt one diner page/hook and existing restaurant projections. No new frontend routes.

**New dependencies**: None.

**Open clarifications**: No unresolved functional blocker. The arrival-window rule and mandatory confirmation-time selection are validated only within the scope recorded in spec.md and research.md on 2026-11-15. Other clauses are not approved by implication; their independent/provisional review status remains. Payment accreditation is an explicit future integration dependency, with paid fixtures proving US-45 S5 until integration exists. The existing restaurant presentation remains outside new UI scope; its data must reflect confirmed metadata. Technical choices are resolved in [research.md](research.md).

## Constitution Check

*Pre-research and post-design gate: design satisfies I, III, IV and V; II is satisfied for this planning pass by explicit recorded team agreements, with formal approval still pending before delivery. This plan is not approval to bypass that review.*

| Principle | Gate | Result |
| --- | --- | --- |
| I. Backlog-bound scope | US-43/45 only; receipt persistence is needed by FR-007; payment state seam is needed by FR-014; no collection flow | Pass before/after |
| II. Spec before code | Eleven answers explicit and reviewable; arrival bounds and mandatory selection validated within the recorded scope; independent validations remain visible and pending | Implementation authorized; formal validation remains a delivery gate |
| III. Every scenario tested | All 12 numbered scenarios mapped below, plus accepted-decision edges; DB constraints enforce uniqueness/ranges/enums | Pass before/after |
| IV. Humans own AI output | Existing router/service/hook; one small receipt table, one endpoint; PR must disclose AI usage and human review | Pass before/after |
| V. Simple, cheap, conventional | No dependency/service/hosting change; migration and standard row lock transaction | Pass before/after |

## Phase 0: Existing implementation analysis and research

Completed before design; evidence, alternatives and decisions R1–R6 are in [research.md](research.md). Focused backend and frontend research confirmed:

- Existing spec 009 concurrency is serialized by Reservation row locks and last accepted snapshot wins.
- Arrival helpers and restaurant order projection currently diverge; both must consume confirmed arrival.
- Payment status/method in restaurant responses are placeholders, not persisted payment records.
- Existing frontend dirty checks consider items only; metadata-only edits would otherwise disappear.
- Existing SegmentedControl cannot represent no selection; reuse labelled Chip choices.
- Existing save sequence must survive the extension; replay must bypass any stale cart flush.

## Phase 1: Design

### Persistence and migration

See [data-model.md](data-model.md). Store `arrival_delay` as a bounded interval on carts/pedidos; the selected instant is the original reservation start plus this exact delay. This enforces the 0–30-minute invariant with a database CHECK without adding a rounding rule or changing booking data. Keep payment_method nullable on carts and legacy orders, require cash/online on new non-empty confirmations/reconfirmations, add payment_status on confirmed orders, and reservation-scoped operation receipts. Existing rows backfill to zero delay/null method/pending status. Generate and review a new Alembic migration at the actual head; never edit merged migrations.

### Confirmation transaction and retry identity

Split CartRequest from ConfirmationRequest. New confirmations require a UUID operation_id and complete immutable snapshot. Reuse existing Reservation FOR UPDATE lock; auth and ownership always precede receipt lookup. A recognized same-payload operation returns fresh current state without writing; differing payload with reused ID is 409. New non-empty operations require cash/online selection (400 if missing/null), follow existing cutoff/email/menu checks, validate arrival and paid-method invariants, write snapshot and receipt atomically, and delete Cart only on newly accepted confirmation. Receipt survives P11 removal, cancellation and recreation; no expiry worker or cached historical response.

### Payment-only mutation and integration

The new PUT method endpoint shares Reservation locking but has its own eligibility: confirmed order exists, reservation not cancelled, now < reservation end, payment not paid. No item/menu/email-verification dependency is added to changing only a preference; the confirmed order still originated through the existing verified-email check. It touches only payment_method, so it remains usable after the dish cutoff. Never set paid from cash/online selection. A joint confirmation that would change an already paid method is rejected atomically. A database INSERT/UPDATE payment guard enforces choice on newly confirmed/reconfirmed non-empty orders while allowing untouched legacy nulls and backing up the paid-method freeze; translate its violation to the same 409. Future payment writers must use the same lock and maintain authoritative payment_status; test paid state by seeding, not through a new endpoint.

### Frontend integration

Extend `useOrderCart` snapshot/equality/version/reset/queue handling to include arrival and method. Seed from private cart, else confirmed order, else original arrival + no method. Preserve P9 reconciliation and last-save behavior. Metadata-only edits and an arrival-only reconfirmation count as dirty; discard resets all private metadata. Use `newRequestId()` for each deliberate confirmation and freeze the entire submitted body. Keep account/reservation-scoped pending operation recovery through session expiry; 401, transport failures and failed GETs do not clear unresolved identity/body. Recovery cancels the autosave timer, invalidates queued unstarted stale writes, waits for in-flight writes and disables stale pagehide flush, without restoring the pending body into the editor; never store a token with the snapshot. After the authenticated accepted/replayed response (or definitive semantic rejection), clear recovery state and reset from a fresh server page. A direct retry reuses the exact body/ID and does not flush an old cart first. A successful replay replaces page state from server and cannot restore the original submitted values over it. A definitive rejected attempt permits a new deliberate operation after correction; unknown network outcome does not silently mint a new ID.

Render arrival input in the existing review/order flow and pass draft/confirmed arrival to Receipt and preparation hints. Keep reservation start/end and the deadline visible separately. Reuse TextField, Chip, Button, StatusPill and Modal; the payment control starts with neither choice selected and displays «Medio de pago no seleccionado» for an incomplete draft or legacy order. Require an explicit selection before non-empty confirmation/reconfirmation, show the agreed Spanish field error, and never silently choose cash. P11 removal remains available without selecting a method. Online helper text explains that selection does not perform payment. Separate confirmed method editing from private draft editing with explicit labels/actions: «Medio de pago del pedido confirmado» (read-only consultation; «Modificar medio de pago» opens a dedicated modal with local selection, «Guardar cambio» and «Cancelar») versus the private cart selection; offer the confirmed editor only when payment_method_editable permits it, including the dish read-only branch; show an explanation otherwise. Updating it leaves a private cart unchanged. Use existing mutation/query refresh patterns and error handling, not optimistic paid status. Refresh/disable at deadline/end boundaries; server remains authoritative.

A return visit derives confirmed state from server order data rather than a transient success toast (US-43 S7). Expired session redirects with existing volver behavior, then reloads current server state. Wrong role/owner and unverified confirmation keep existing errors. 360px and keyboard checks cover both open and closed-dish states.

### Restaurant integration

Update `restaurant_orders.order_data` to share selected-arrival/preparation logic; replace hardcoded method/status in `api/restaurant.py`. Keep current shift selection by original reservation time, sorted confirmed arrival, HH:MM formatting, missing-prep warning and existing No seleccionado sentinel. No new restaurant screen or collection action. Never read private cart metadata.

### Contract regeneration

Planned request/response fields, errors and examples are in [contracts/order-api.md](contracts/order-api.md). Implement schemas/router first, then `make api-types`; derive frontend types exclusively from generated schema.d.ts. New required fields are a coordinated API/frontend release; stale tabs must reload rather than use a non-idempotent compatibility bypass.

## Acceptance Scenario → Test Map

Tests below are implemented; execution evidence and remaining human checks are in quickstart.md. Backend new tests live in `backend/tests/test_order_timing_payment.py`; frontend extends `frontend/src/pages/OrderPage.test.tsx`. Each row has its own test, not one omnibus test.

| Scenario | Test | Layer |
| --- | --- | --- |
| US-43 S1 preview arrival and dishes | `US-43 S1 previews arrival and dishes before confirmation` | Frontend |
| US-43 S2 joint confirmation | `test_us43_s2_confirms_arrival_and_items_atomically` | Backend |
| US-43 S3 preparation coordination | `test_us43_s3_uses_confirmed_arrival_and_slowest_known_dish` | Backend |
| US-43 S4 changed arrival / arrival-only reconfirmation | `test_us43_s4_reconfirms_arrival_without_changing_dishes`; `US-43 S4 keeps draft arrival private until reconfirmed` | Both |
| US-43 S5 empty first confirmation vs removal | `test_us43_s5_rejects_first_empty_confirmation`; `test_us43_s5_removes_existing_order_without_changing_reservation`; `US-43 S5 asks before removing the confirmed order` | Both |
| US-43 S6 invalid arrival | `test_us43_s6_rejects_arrival_outside_window_or_not_future`; `US-43 S6 explains invalid arrival` | Both |
| US-43 S7 return to confirmed screen | `US-43 S7 shows confirmed state on a return visit` | Frontend |
| US-45 S1 available methods | `US-45 S1 offers cash and online without preselection` | Frontend |
| US-45 S2 choose method | `test_us45_s2_saves_private_preference_then_confirms_it`; `US-45 S2 selects a preference without marking paid`; `test_us45_s2_rejects_confirmation_without_method` / `US-45 S2 blocks confirmation until a method is selected` | Both |
| US-45 S3 restored associated method | `test_us45_s3_reads_confirmed_method_and_private_cart_separately`; `US-45 S3 restores the selected method` | Both |
| US-45 S4 replace unpaid preference | `test_us45_s4_changes_only_method_during_visit_before_end`; `US-45 S4 edits payment after dish editing closes` | Both |
| US-45 S5 paid lock | `test_us45_s5_paid_order_rejects_method_change`; `US-45 S5 explains why paid preference is locked` | Both |

### Decision and regression coverage

- `test_us43_edge_arrival_inclusive_start_and_plus_30`: accept start, the previously valid +15 minutes, and +30 minutes; reject earlier arrivals and +30 minutes plus the smallest supported precision; timezone-equivalent inputs, naive input rejection, no shift of start/end/table. Cover exact 45-minute boundary based on original start.
- `test_us43_edge_missing_times_uses_arrival_without_estimate`: no/partial estimates and quantities do not alter P2. Keep frozen confirmed snapshots and P9 changed name/price/time/unavailable dish behavior on arrival-only reconfirmation.
- `test_us43_edge_replay_preserves_newer_confirmation_and_payment`: replay A after B and payment-only change returns latest state, untouched confirmed_at/items/metadata/cart/receipt count.
- Replay after P11 removal/recreation, cancellation, menu change, cutoff and restart of app uses durable receipts; same key/different body is 409; equivalent payload ordering/timezones normalize identically. Unknown key after cutoff fails. Atomic rollback leaves neither mutation nor receipt.
- Two real Postgres sessions submit same operation and serialize; assert one receipt and one accepted mutation. Exercise ordering of distinct confirmations/method updates and paid-state writes with controlled transactions, not timing sleeps. Use isolated committed fixtures for multi-session checks; the standard rolled-back client fixture alone cannot demonstrate cross-connection visibility.
- Existing `test_order.py` acceptance suite remains intact semantically; update confirm/save helper payloads, not assertions that encode P1–P14. Keep `test_us51_s5_unverified_diner_cannot_order`.
- `test_us45_s2_rejects_confirmation_without_method` plus `test_us45_edge_required_method_without_default` and metadata-only draft save/discard (null allowed in the private cart, rejected for a new non-empty confirmation); pending stays pending after online. Method endpoint rejects no order, cancelled, exact end and paid; wrong role/other owner use current 403/404 behavior.
- `test_us45_edge_paid_lock_applies_to_joint_confirmation`: a new joint request cannot bypass the method lock; does not reset payment state. This does not define paid dish cancellation/refund processing.
- `test_us43_edge_restaurant_reads_confirmed_arrival_only` and `test_us45_edge_restaurant_reads_real_preference_and_status` in `test_order_timing_payment.py` and `test_restaurant_orders.py`, respectively: ensure drafts remain invisible, current shift filtering unchanged, existing legacy projection preserved.
- `useOrderCart.test.ts`: full-snapshot dirty detection, metadata-only save, discard, immutable operation retry, new deliberate key, no stale save/discard before accepted replay, no late cart recreation, pending recovery scoped by account/reservation. Tests start with US-43/US-45 edge labels.
- `OrderPage.test.tsx`: explicit private vs confirmed method editors, no default Chip choice, paid/end boundary UI, 401 then fresh GET, lost-response recovery, no stale replay overwrite. Existing US-17/19/21 frontend regressions remain.
- Migration checks on populated legacy fixtures, direct DB constraint violations for delay (including mixed calendar intervals)/method/status/duplicate receipt and paid-method freeze trigger, model/head consistency, and disposable downgrade/upgrade. Confirm API contract/type regeneration and frontend build.

## Project Structure

### Documentation (generated in this planning pass)

```text
specs/020-tiempo-pago/
├── spec.md                 # existing Spanish spec, 11 answers preserved
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/order-api.md
└── tasks.md                # subsequent speckit-tasks output
```

`tasks.md` is generated by the subsequent speckit-tasks phase; its unchecked tasks do not imply implementation has started.

### Source Code (planned changes only)

```text
backend/app/models/cart.py                         ~ private arrival/method
backend/app/models/order.py                        ~ confirmed arrival/method/payment state
backend/app/models/order_confirmation.py           + accepted-operation receipt
backend/app/models/__init__.py                     ~ register model
backend/app/schemas/diner_order.py                 ~ split requests and extend responses
backend/app/api/order.py                           ~ metadata, receipts, method-only endpoint
backend/app/services/orders.py                     ~ lock/validation/write/replay logic
backend/app/services/restaurant_orders.py          ~ shared timing and payment projection
backend/app/api/restaurant.py                      ~ replace payment placeholders
backend/migrations/versions/<new_revision>.py       + schema/backfill/constraints
backend/tests/test_order_timing_payment.py         + acceptance/edge tests
backend/tests/test_order.py                        ~ new payload metadata, preserve semantics
backend/tests/test_restaurant_orders.py            ~ integration coverage
backend/tests/reservations.py                      ~ factories
frontend/src/api/openapi.json                      ~ generated
frontend/src/api/schema.d.ts                       ~ generated
frontend/src/api/orders.ts                         ~ typed snapshots/retry/method calls
frontend/src/lib/useOrderCart.ts                    ~ full draft and pending operation
frontend/src/lib/useOrderCart.test.ts               ~ queue/recovery regressions
frontend/src/pages/OrderPage.tsx                    ~ arrival and independent payment controls
frontend/src/pages/OrderPage.module.css             ~ tokens/mobile layout
frontend/src/pages/OrderPage.test.tsx               ~ acceptance UI
frontend/src/pages/RestaurantOrdersPage.test.tsx    ~ confirmed metadata projection
```

**Structure Decision**: Reuse existing OrderPage/Receipt/requestId/session helpers and router registration. No generic idempotency module, new route or shared UI component is needed. If implementation extracts a reusable control, it must also update its index, DesignPage catalog and Spanish design guide; that extraction is not required by this plan.

## Dependencies, risks and validation

| Risk/dependency | Handling |
| --- | --- |
| Team/PO validations are still pending | Keep provenance; team must review plan and secure required formal validation before implementation/delivery. No technical answer is invented. |
| No actual payment writer exists | Minimal constrained read-state seam; fixtures prove lock. End-to-end accreditation remains dependent on later cobro integration. |
| Legacy restaurant arrival/payment placeholders | Update both projections; tests prove consistent confirmed state without changing shift membership. |
| Old tabs omit new mandatory fields | Coordinate migration/API/frontend rollout; return 400 and prompt reload, no unsafe legacy confirmation path. |
| Lost response and late autosave | Freeze operation snapshot, retain scoped recovery record, direct replay bypasses save/discard; backend receipt lookup precedes mutable checks. |
| Identity-map stale Order after waiting for lock | Read/refresh after lock; do not make eligibility decisions from pre-lock objects. |
| Future payment writer ignores lock | Document integration protocol and test serial ordering; it must be adopted by the actual writer. |
| Kitchen may start before dish cutoff | Existing known 009 risk retained; this feature does not change the agreed 45-minute rule. |
| Preparation datetime overflow from very large legacy prep values | Preserve request bounds and handle unrepresentable arithmetic as controlled validation/conflict rather than 500; add edge coverage, without inventing a smaller product limit. |

Validation guide is [quickstart.md](quickstart.md). At implementation completion run `make api-types` and required `make format lint test`, plus migration/contract checks already used by CI. Do not claim manual review, browser checks or CI success until performed.

## Complexity Tracking

No technical constitution violation. One receipt table is necessary to preserve all accepted-operation history across deletion and newer writes; a last-operation field cannot satisfy FR-007. One payment_status projection is required to enforce/test FR-014, not a speculative collection system. Formal validation remains the explicitly recorded governance gate above.

## Implementation reconciliation

The existing router/service/cart hook and order page were extended as designed. `api/session.ts` preserves same-account pending operations and clears other-account records, with dedicated tests. Real two-connection serialization tests and a disposable-schema migration round trip supplement acceptance tests. Backend test startup selects `servido_test` by default and rejects any other database name; CI explicitly configures `servido_test`. The unchanged Makefile starts Docker PostgreSQL and invokes pytest without creating a database. Local `servido_test` must already exist; the test session applies its migrations. The payment-only editor keeps the choice local until «Guardar cambio»; «Cancelar» preserves the confirmed method. It never reconfirms dishes or processes payment. A backend conflict refreshes confirmed eligibility without reconciling or discarding the private cart.

## Frontend UX follow-up

Manual review requested a two-stage presentation without business-rule changes. OrderPage now owns a local build/review/confirmed view state; the existing useOrderCart remains the sole draft persistence and operation-recovery mechanism. Build shows menu and editable quantities; review shows read-only lines plus arrival and required method. Returning between stages does not reset the hook. Confirmed consultation projects only the stored order and independent method mutation; editing dishes explicitly opens the private draft. Invalid arrival input remains local until it is within the server-provided inclusive window, with a labelled field error rather than a failed autosave. Existing CSS tokens/components provide section spacing and wrapping; no API/backend changes are required.

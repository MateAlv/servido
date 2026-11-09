# Research: US-34 Dish Management

**Date**: 2026-11-07. Research is based on repository source and the current feature spec; no external technology choice or dependency is introduced. All implementation assumptions are accepted as instructed.

## R1 — Removal and historical references

**Decision**: Add nullable UTC `deleted_at` to `Dish`; removal sets it and sets `disponible=false`. Keep the row and original descriptive values. Exclude removed rows from all owner/public/order menu selections and availability existence checks. Reject edits and availability changes after removal.

**Rationale**: `backend/app/models/order_item.py` has a non-null FK to `platos` with `ON DELETE RESTRICT`; snapshots already store name, price, quantity and preparation time. Soft deletion preserves both referential integrity and historical data without rewriting orders. `CartItem` also retains its FK and snapshot, so existing reconciliation can identify removed dishes by absence from the menu.

**Alternatives considered**: Physical deletion would require changing confirmed-order foreign keys; availability alone cannot distinguish reversible suspension from permanent removal. Neither is needed.

## R2 — Reusing names

**Decision**: Replace `uq_platos_restaurante_nombre` with a partial unique index on `(id_restaurante, nombre) WHERE deleted_at IS NULL`. Unavailable dishes still reserve their names; removed dishes do not. Keep existing case-sensitive name behavior and whitespace normalization.

**Rationale**: The spec explicitly permits recreating a removed name; ordinary uniqueness would prevent this even with soft deletion. Preserve US-12 duplicate behavior for all live dishes.

**Alternatives considered**: Renaming removed dishes would mutate retained data; application-only duplicate checks would lose the database invariant. A full name-history table is outside scope.

## R3 — Last-write-wins notice

**Decision**: Add integer `revision`, initially 1. Edit and availability requests supply `expected_revision`; compare to the current persisted revision and return `changed_since_open=true` on mismatch, while still saving the requested mutation. Display the notice after successful save, retaining it across navigation. Increment revision only on effective state changes. Use an atomic revision increment in the update so overlapping writes do not lose the counter; do not use SQLAlchemy optimistic-lock rejection or an edit-lock workflow. Filter updates by owner and `deleted_at IS NULL` so deletion cannot be reversed by a stale save.

**Rationale**: The spec chooses the last saved change and a notice, rather than conflict blocking. There is no current update timestamp/version in `Dish`. A revision counter is sufficient and avoids timestamp-resolution dependence or storing old field values. Detection covers changes committed before the save reads the row; it is not a promise of real-time detection of every overlapping transaction.

**Alternatives considered**: Rejecting stale writes with 409 contradicts last-write-wins; polling or edit locks add unnecessary machinery. Returning the current row after a stale save lets the UI retain the new revision.

## R4 — Fields, files and contracts

**Decision**: Retain existing US-12 list/create paths and payloads. Put new operations under `/api/restaurant/dishes/{dish_id}` with English fields; adapt to legacy stored names internally. Reuse the existing validation rules rather than introducing a second category/restriction catalog. Full edit uses multipart data and an explicit photo action (keep/replace/remove). Use the existing upload location, JPG/PNG and 5 MB limits.

**Rationale**: Existing creation (`backend/app/api/dish.py`) already handles multipart photos; existing model identifiers need not be renamed. New interfaces follow the repository's English naming policy. The current form/list use raw fetch and handwritten types; touched menu/edit work will use `src/api/client.ts`, generated types and TanStack Query as required by AGENTS.md.

**Alternatives considered**: Renaming the existing API breaks callers; a new object-storage service adds infrastructure; base64 JSON duplicates multipart support. Share small validator/upload helpers only where needed, not a generic CRUD framework.

## R5 — Existing order reconciliation

**Decision**: Retain US-17 snapshot confirmation and 409/reload/review. Apply the deletion predicate to both `services/menu.py` and `services/orders.py` (including `has_menu`). Reuse `frontend/src/lib/orderLines.ts::reconcile`, which removes unavailable dishes with an explanation and refreshes name, price and preparation time. Never confirm automatically after a 409.

**Rationale**: `check_against_menu` already compares these three historical values. Confirmed responses read copied `OrderItem` fields, not current dishes. Category/description/photo/restrictions are not order snapshot fields and do not require a new confirmation protocol.

**Alternatives considered**: Repricing silently or mutating confirmed items violates the spec. A new diner flow is unnecessary.

## R6 — Removing the last available dish

**Decision**: Keep US-17's existing rule that an empty menu closes ordering. Before returning the generic closed response for an otherwise in-time confirmed reservation, detect submitted items that vanished with the menu and return the existing menu-changed 409. On reload, compute changes against the fresh menu before the UI takes its closed branch, and show the same reconciliation notice there. Expose the saved cart for reconciliation on that response while the reservation is still within its edit window, even if its menu is empty; do not enable saving/confirmation with an empty menu. Preserve the confirmed order and ignore carts after the time cutoff or cancellation as before.

**Rationale**: Currently `order_open` depends on `has_menu`, `open_cart` hides the cart when false, and `OrderPage` resets lines before reconciling on the closed branch. Without these narrow changes the diner only sees a generic closed message, losing the explanation required by FR-008. Empty-menu closure remains the existing behavior, not a new workflow.

**Alternatives considered**: Allowing empty-menu order editing changes US-17 policy; hiding the change explanation fails the integration requirement. Do not erase persisted carts or confirmed orders as a side effect of restaurant edits.

## R7 — UI and verification

**Decision**: Extend the owner menu with edit navigation, availability action and an explicit removal Modal. Use existing design tokens/components and a dedicated edit page that loads current values. Invalidate affected owner/public queries after success and allow normal refetch/reload in other sessions; no subscriptions or background synchronization.

**Rationale**: `docs/design/README.md` already supplies all required primitives. Backend tests prove ownership, menu projections and snapshot stability; frontend tests prove confirmation and cancellation. SC-001 needs a timed human trial in addition to automated coverage.

**Alternatives considered**: New component libraries, optimistic removal before confirmation and live synchronization add scope without satisfying another acceptance scenario.

## Research Outcome

No unresolved technical clarification. Decisions R1–R7 implement the current specification and its adopted assumptions. The post-design constitution check is recorded in `plan.md`.

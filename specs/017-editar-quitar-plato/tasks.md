---
description: "Dependency-ordered implementation tasks for US-34 dish management"
---

# Tasks: Edit or Remove a Dish

**Input**: Design documents from `specs/017-editar-quitar-plato/`: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/dish-management.md`, `contracts/ui-and-order-integration.md` and `quickstart.md`.

**Prerequisites**: Existing US-12 dish creation, US-15 public menu and US-17 cart/order implementation. Use the current branch `017-us34-editar-quitar-plato`; no project initialization or new infrastructure is needed.

**Tests**: REQUIRED. Write scenario/contract tests first and verify their expected failures before implementing the corresponding behavior. Backend acceptance tests use the real PostgreSQL `client` fixture. Frontend tests mock `src/api/client` and use Testing Library. Existing passing behavior is regression coverage, not a reason to force an artificial failure.

**Organization**: One story phase for the only story, US-34 (Sprint 4, 2 SP; no priority rank specified). Scenario groups below are implementation checkpoints within US-34, not new stories or independent reductions of its acceptance scope. Implementation assumptions are already adopted; do not reopen product decisions.

## Format: `[ID] [P?] [Story] Description`

- `[P]` identifies disjoint-file work that can run concurrently after its stated prerequisites. It does not authorize concurrent edits to shared files or premature execution.
- `[US34]` identifies tasks belonging to US-34. Setup, foundation and wrap-up tasks omit the story label.
- Every task names its target files. All paths are relative to the repository root.

## Path Conventions

- Backend: `backend/app/api/`, `backend/app/models/`, `backend/app/schemas/`, `backend/app/services/`; migrations in `backend/migrations/versions/`; pytest in `backend/tests/`.
- Frontend: `frontend/src/pages/`, `frontend/src/api/`, `frontend/src/router.tsx`; component tests next to their page.
- Generated contracts: `frontend/src/api/openapi.json` and `frontend/src/api/schema.d.ts`, regenerated with `make api-types`, never edited by hand.
- Reuse the existing dish router, model registration, upload location, design system and tokens. No new dependency, service, model table or generic CRUD abstraction.

## Phase 1: Setup

**Purpose**: Verify the existing environment; do not scaffold another application.

- [X] T001 Verify the root `Makefile`, `backend/pyproject.toml`, `frontend/package.json` and `specs/017-editar-quitar-plato/quickstart.md` commands against the current checkout; start PostgreSQL with `make db`, install only existing locked dependencies if needed, and identify reusable account/reservation fixtures in `backend/tests/conftest.py` and `backend/tests/reservations.py`. Record completion/evidence in this `specs/017-editar-quitar-plato/tasks.md`; do not alter project configuration.

**Checkpoint**: Existing local test environment is usable without adding dependencies.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish test data shared by all US-34 scenarios; dish-specific schema work stays in the story phase.

- [X] T002 Prepare local reusable fixture builders in `backend/tests/test_dish_management.py` using the existing `client` fixture and test helpers: two restaurants, one verified diner, live available/unavailable dishes, a future reservation more than 45 minutes away, a confirmed order with copied values and a saved cart. Keep helpers local unless genuinely shared; do not create production seed data or modify existing fixture contracts.

**Checkpoint**: Tests can exercise ownership, public reads and historical orders without external services.

## Phase 3: US-34 — Edit or Remove a Dish

**Goal**: Restaurant owners can edit, disable, re-enable and explicitly remove their own dishes, with current public menus and intact confirmed orders.

**Independent Test**: With owned dishes and an existing confirmed order, edit every supported field and read back current owner/public menus; reject invalid edits; disable/re-enable; open removal confirmation and cancel without a request; confirm removal and recreate its name; then verify the original confirmed order retains name, quantity, price, preparation time, total and preparation start. Verify stale drafts require review and foreign-owner requests fail.

### Tests for US-34 (write first)

T003–T008 can run in parallel after T002: each owns a different test file. Add all related cases to the listed task rather than assigning a second concurrent writer to that file.

- [X] T003 [P] [US34] Add the management API contract and acceptance tests in `backend/tests/test_dish_management.py`: `test_us34_s1_updates_dish_and_public_menu`, parameterized `test_us34_s2_rejects_invalid_edit`, `test_us34_s3_hides_unavailable_dish`, `test_us34_s4_restores_availability`, `test_us34_s6_removes_dish_from_menus` and parameterized `test_us34_s8_preserves_confirmed_order`. Exercise real owner GET/multipart PUT/JSON availability PATCH/DELETE and legacy list/create paths. Add `test_us34_edge_*` cases for all-operation 401/403 ownership/role checks, missing/deleted IDs, 400 invalid UUID/input rather than 422, duplicate live names (409), removed-name reuse, repeated DELETE (204 without revision/time changes), failed mutations preserving every field, no-op revision stability, stale saves returning `changed_since_open=true` while saving last values, stale edits never restoring removal, photo keep/replace/remove and failed-upload/DB rollback cleanup, empty optional fields/restrictions and storage limits. Check retained order/cart FKs and snapshots, totals, confirmation time and preparation start through diner and restaurant reads; editing one restaurant never affects the other.
- [X] T004 [P] [US34] Add `US-34 S1 loads and saves the existing dish`, `US-34 S2 identifies invalid fields` and `US-34 edge ...` tests in `frontend/src/pages/EditDishPage.test.tsx`. Mock `src/api/client`; prove prefill, full editable-field submission, photo actions, field errors, optional clearing, preserving form input on failure, pending-submit protection, successful return with stale-save notice, cancel without mutation, missing/foreign/deleted handling and session expiry. Assert behavior, not static markup.
- [X] T005 [P] [US34] Add `US-34 S3 identifies unavailable dishes`, `US-34 S5 asks before removing a dish`, `US-34 S6 confirms removal` and `US-34 S7 cancels removal without a request` in `frontend/src/pages/MenuPage.test.tsx`; cover availability re-enable, no DELETE before confirmation, Cancel/Escape/backdrop dismissal without mutations, pending and failed removal, focus return, loading/error/empty states, stale availability notice and clearing account-scoped data on session changes through the existing session behavior.
- [X] T006 [P] [US34] Add `test_us34_edge_*` order integration regressions in `backend/tests/test_order.py` for stale name/price/preparation values returning menu-changed 409 before reviewed reconfirmation, unavailable/deleted menu exclusion and unchanged confirmed snapshots. Cover the last available dish: otherwise eligible stale submission reports menu change, GET exposes the saved cart for review while `order_open=false`, saves/confirmation remain forbidden against an empty menu, cutoff/cancellation still hide drafts, and menu restoration does not rewrite confirmed data.
- [X] T007 [P] [US34] Add `US-34 edge ...` UI/order contract regressions in `frontend/src/pages/OrderPage.test.tsx`: reuse automatic missing-dish removal and updated-price/name/time notices, require another explicit confirmation after a 409, reconcile a loaded cart/current draft before the empty-menu branch, show accurate empty-menu copy and change notice, preserve confirmed receipt values, and retain time/cancellation restrictions. Cover both an already-open page and a fresh load with a persisted cart.
- [X] T008 [P] [US34] Extend `backend/tests/test_menu.py` with `test_us34_edge_*` creation compatibility tests proving an unavailable live dish still reserves its name, a removed dish's name can be recreated with a new UUID, duplicate live names remain rejected and US-12 multipart creation/validation stays compatible. Keep existing creation scenario names unchanged.

### Implementation for US-34 — Persistence and Validation (S1/S2/S6/S8)

- [X] T009 [US34] Extend `backend/app/models/dish.py` with `deleted_at` and `revision`. Preserve the data-model constraints verbatim: ID “UUID primary key, unchanged”; restaurant “Existing non-null restaurant FK”; availability “Non-null boolean, existing default true”; created time “Existing timezone-aware UTC timestamp”; deletion “New nullable timezone-aware UTC timestamp; null means still managed in menu”; revision “New non-null integer, default/server default 1, positive constraint”. Keep existing positive-value/nonblank/FK checks, add `revision > 0` and `deleted_at IS NULL OR disponible = false`, and replace full name uniqueness with `uq_platos_live_restaurante_nombre` on `(id_restaurante, nombre) WHERE deleted_at IS NULL`. No order/cart schema changes or extra model import are needed.
- [X] T010 [US34] Generate a new revision in `backend/migrations/versions/` with `make migration m="add dish removal and revision"`, then review its model changes, backfill, constraint replacement and partial-index predicate. Existing rows must become live at revision 1 without touching orders/carts. Implement a downgrade preflight that refuses reused-name duplicates before destructive operations; never delete/rename historical rows or edit an applied migration. Exercise upgrade/downgrade on disposable compatible data and refusal on duplicates, recording the generated migration filename and results in `specs/017-editar-quitar-plato/tasks.md`.
- [X] T011 [US34] Extend `backend/app/schemas/dish.py` with English management edit/availability/response schemas and explicit legacy-field mapping, sharing US-12 validators. Quote and enforce these `data-model.md` rules: name “Trimmed, nonblank, at most 150 characters”; description “Optional, at most 2,000 characters; blank normalizes to null”; category “Required US-12 catalog: `entrada`, `plato_principal`, `postre`, `bebida`”; price “Decimal / Numeric(10,2), finite, greater than zero, at most two decimals and within storage range”; restrictions “Existing JSON list, unique values from `sin_tacc`, `vegetariano`, `vegano`; empty allowed”; preparation time “Optional positive integer within PostgreSQL integer range”; photo URL “Nullable existing local media URL”. Enforce required positive `expected_revision`, decimal-string responses, the `{dish, changed_since_open}` envelope, photo-action enum `keep/replace/remove`, and contract-defined omitted/empty clearing. Retain legacy creation/list payloads and catalog values.

### Implementation for US-34 — Backend Operations and Menu Projections

- [X] T012 [US34] Implement owned GET `/api/restaurant/dishes/{dish_id}` in `backend/app/api/dish.py` using the existing router, `TokenClaimsDep` and `SessionDep`; derive restaurant identity from claims and return the English representation including revision. Apply contract statuses 401/403/404, including 403 for foreign ownership and 404 for deleted detail, without leaking foreign fields. Centralize the small ownership/live checks for the other operations; do not mount a duplicate router.
- [X] T013 [US34] Implement multipart PUT `/api/restaurant/dishes/{dish_id}` in `backend/app/api/dish.py`: fully replace editable fields while retaining current availability; validate using T011 before persistence. Preserve existing JPG/PNG and 5 MiB upload limits/location; reject invalid photo combinations, stage replacements under generated names, clean new files on storage/database failure, and retain old data/files until commit. Optional post-commit old-file cleanup failure must not undo a successful save. Use owner/live conditional updates, effective-change detection and atomic revision increments; stale `expected_revision` saves last values with the notice flag rather than 409. Keep no-op saves at the current revision, reject live-name conflicts with 409 and never mutate order/cart snapshots.
- [X] T014 [US34] Implement JSON PATCH `/api/restaurant/dishes/{dish_id}/availability` and DELETE `/api/restaurant/dishes/{dish_id}` in `backend/app/api/dish.py`. PATCH modifies only availability, preserves other fields, increments revision only on change and returns the stale-save notice. DELETE sets UTC deletion time, availability false and one revision increment; repeat by the same owner returns 204 without another mutation. Enforce ownership even on repeated removal, prevent read/edit/enable restoration of deleted rows, retain photo/order/cart records and preserve legacy creation compatibility.
- [X] T015 [US34] Update owner list selection in `backend/app/api/dish.py` to include only owned nondeleted rows while retaining unavailable dishes and the existing Spanish response fields. Update `backend/app/services/menu.py` and `backend/app/services/orders.py` menu predicates, including `has_menu`, to require `deleted_at IS NULL` and available status for public/order reads. Verify current category building omits empty categories through existing public adapters; avoid public-menu redesign or speculative query abstraction.
- [X] T016 [US34] Apply the narrow last-dish integration in `backend/app/services/orders.py` and, only if required for response assembly, `backend/app/api/order.py`: distinguish time/status eligibility from menu presence when selecting menu-changed versus closed errors; expose saved-cart snapshots for review within the existing edit window even when the menu is empty; retain `order_open=false` and prohibit empty-menu order/cart mutations. Preserve access/verification/cutoff/cancellation policies, existing response shapes and all confirmed snapshots. Make T006 pass without allowing a new ordering flow.
- [X] T017 [US34] Run the backend scenario/regression tests in `backend/tests/test_dish_management.py`, `backend/tests/test_menu.py`, `backend/tests/test_order.py`, `backend/tests/test_restaurant_orders.py` and `backend/tests/test_public_restaurants.py` against PostgreSQL; fix failures only in the T009–T016 target files. Confirm storage/DB invariants, migration behavior and unchanged historical restaurant/diner projections before freezing the management API for frontend integration.
- [X] T018 [US34] Regenerate `frontend/src/api/openapi.json` and `frontend/src/api/schema.d.ts` with `make api-types` after backend routes/schemas stabilize. Verify English new operations, legacy compatibility, multipart encoding, response envelopes and all declared error statuses. Never hand-edit generated types.

### Implementation for US-34 — Typed Client and Owner UI (S1–S7)

- [X] T019 [US34] Add `frontend/src/api/dishes.ts` using `src/api/client.ts`, generated schema references and TanStack Query-compatible query/mutation functions for the existing owner list and new management operations. Send Bearer auth, serialize multipart through FormData/body serializer without manually setting Content-Type, map edit fields explicitly, retrieve detail/revision before availability writes when absent from list data, and handle Spanish field errors/session expiry. Scope query keys to account/dish; on success invalidate affected owner/detail and existing public restaurant queries, remove deleted detail data and preserve notices across navigation. Do not handwrite API types or add a separate cache.
- [X] T020 [P] [US34] Build `frontend/src/pages/EditDishPage.tsx` and `frontend/src/pages/EditDishPage.module.css` using T019 and existing `TextField`, `Button`, `Card` and feedback primitives from folder exports. Prefill and submit all contract fields including explicit photo action and loaded revision; preserve input on errors, provide field-specific Spanish corrections, support optional clearing, cancel without writes and return to menu with success/stale-save notice. Apply the already quoted T011 bounds/catalogs, token styles, 360 px layout, labels, visible focus, loading protection and reduced-motion rules. Make T004 pass without introducing a new design-system component.
- [X] T021 [P] [US34] Refactor `frontend/src/pages/MenuPage.tsx` and `frontend/src/pages/MenuPage.module.css` onto T019 and TanStack Query, replacing raw fetch and handwritten dish types. Show unavailable status with text, edit navigation, disable/re-enable actions and the named irreversible-removal `Modal` with “Cancelar”/“Quitar plato”. Submit DELETE only after explicit confirmation; handle dismissal, pending/error states, account changes, invalidation and accessible focus return. Render success/stale-save notices across edit navigation. Make T005 pass using existing design components and token styles.
- [X] T022 [US34] Register `/restaurante/menu/:dishId/editar` in `frontend/src/router.tsx` using existing page/role conventions; confirm the links and cancel/success return paths in `frontend/src/pages/EditDishPage.tsx` and `frontend/src/pages/MenuPage.tsx` work on direct load as well as navigation. Keep legacy add/menu routes intact.

### Implementation for US-34 — Diner Integration and Scenario Checkpoint (S8 / FR-008)

- [X] T023 [US34] Update `frontend/src/pages/OrderPage.tsx` to reuse `frontend/src/lib/orderLines.ts` reconciliation before the empty-menu closed branch on initial load and reload: keep missing-dish/change explanations visible, distinguish empty-menu copy from deadline/cancellation copy, review stale values after 409 and require fresh explicit confirmation. Preserve the original confirmed receipt and existing restrictions; do not auto-save/confirm an empty replacement or create a second diner flow. Make T007 pass, including persisted-cart reload and menu restoration.
- [X] T024 [US34] Run the focused frontend tests in `frontend/src/pages/EditDishPage.test.tsx`, `frontend/src/pages/MenuPage.test.tsx` and `frontend/src/pages/OrderPage.test.tsx`; resolve failures in their respective page files and `frontend/src/api/dishes.ts`. Recheck all eight US-34 acceptance scenarios and FR-008/FR-009/FR-010 integration against the scenario map below; record actual results in `specs/017-editar-quitar-plato/tasks.md`.

**Checkpoint**: US-34 works end to end; every acceptance scenario has passing automated evidence, including confirmation/cancellation in the UI and immutable history in PostgreSQL.

## Phase 4: Wrap-up

- [X] T025 Validate the implemented flow locally using `specs/017-editar-quitar-plato/quickstart.md`: both roles, edit/disable/re-enable/remove/recreate, stale forms and last-dish reconciliation; inspect 360 px layout, keyboard/focus and reduced motion. Time representative restaurant edits against SC-001 (90% within one minute). Record actual outcomes or an explicitly outstanding human trial in `specs/017-editar-quitar-plato/tasks.md`; never claim usability results from automated tests alone or mutate production data.
- [X] T026 Run `make format lint test` from the root `Makefile`, fix feature-related failures in the implementation paths above and review formatting diffs to avoid unrelated changes. Verify regenerated `frontend/src/api/openapi.json` and `frontend/src/api/schema.d.ts` are reproducible with `make api-types`; record checks/environment limitations in `specs/017-editar-quitar-plato/tasks.md` and do not mark failing checks complete.
- [X] T027 Audit acceptance/contract coverage against `specs/017-editar-quitar-plato/spec.md`, `plan.md`, `data-model.md` and `contracts/`, then update completion/evidence only in `specs/017-editar-quitar-plato/tasks.md`. Keep specification, plan and product decisions unchanged; report any implementation divergence instead of silently rewriting the authorized design. Leave team review and CI confirmation explicitly pending until actual evidence exists.

---

## Acceptance Scenario Coverage

| Scenario | Tests first | Implementation / verification |
| --- | --- | --- |
| S1 — Edit all fields; current public data | T003, T004 | T011–T013, T015, T018–T020, T022, T024 |
| S2 — Reject invalid edits with correction | T003, T004 | T011, T013, T020, T024 |
| S3 — Unavailable state, owner visibility | T003, T005 | T014–T015, T019, T021, T024 |
| S4 — Re-enable current data | T003, T005 | T014–T015, T019, T021, T024 |
| S5 — Explicit removal confirmation | T005 | T021, T024 |
| S6 — Confirmed removal from both menus | T003, T005, T008 | T009–T010, T014–T015, T019, T021, T024 |
| S7 — Cancel without changes | T005 | T021, T024 |
| S8 — Preserve confirmed snapshot | T003, T006 | T009–T010, T013–T017, T023–T024 |
| FR-008 — Draft updates and last available dish | T006, T007 | T015–T016, T023–T024 |
| FR-009 — Owner isolation and role restrictions | T003 | T012–T014, T017 |
| FR-010 — No empty public categories | T003 (S3/S4/S6 projections) | T015, T017 |
| Edge cases — live-name reuse, files, no-op/stale saves, migration | T003, T004, T005, T008 | T009–T014, T017, T020–T021, T025 |

## Dependencies & Execution Order

There is one user story; no dependency on building US-20, US-22 or another new story. Their existing historical projections are regression readers. Reuse US-12/15/17 as planned.

```text
T001 → T002 → {T003, T004, T005, T006, T007, T008}
T003 + T008 → T009 → T010 → T011 → T012 → T013 → T014 → T015 → T016 → T017 → T018 → T019
T006 ────────────────────────────────────────────────────────────→ T016, T017
T004 + T019 → T020
T005 + T019 → T021
T020 + T021 → T022
T007 + T016 + T018 + T019 → T023
T020 + T021 + T022 + T023 → T024 → T025 → T026 → T027
```

- Complete the tests before the corresponding implementation; T009–T016 are sequential because they share model/API/order files and behavior. T017 requires all backend test-writing tasks T003/T006/T008 and T010's migration checks.
- The numbered order is the conservative default. After T019, T020 and T021 can execute concurrently. T023 can also execute then once T007/T016/T018 are complete; it touches a separate page. Do not run tests that are being edited simultaneously with their writers.
- Backend contract stabilization and generated types (T017–T018) block typed frontend implementation. No stale handwritten interface should bypass this dependency.
- Wrap-up follows the complete story, not only the first working edit endpoint.

## Parallel Execution Examples — US-34

**Tests wave (after T002)**: one worker writes the management acceptance/contract suite (T003), another writes edit-page interaction tests (T004), another writes menu confirmation tests (T005). T006/T007/T008 may join this wave in their own files. Existing files must each have a single writer.

**UI wave (after T019 and relevant tests/backend prerequisites)**: T020 owns the edit page/styles; T021 owns the owner menu/styles; T023 owns the diner order page. Wait for both owner pages before T022 changes routing and integration links. Run T024 after all writers finish.

These are scheduling opportunities, not instructions to spawn agents automatically.

## Implementation Strategy

**MVP first**: Deliver the single story US-34 in full. Editing alone is an intermediate checkpoint, not a releasable substitute for its eight required scenarios.

1. Establish existing fixtures and failing acceptance/contract tests.
2. Implement persistence/validation and the owned API; retain historical references and live-name uniqueness in the database.
3. Stabilize backend integration and generate types, then build the edit/menu interactions.
4. Reuse diner reconciliation, explicitly handling the last available dish; run the complete acceptance suites.
5. Validate local phone/keyboard behavior, usability target and root checks; retain actual evidence and outstanding human review status.

## Notes

- Generated tasks are uncompleted implementation work; producing this file does not implement or test the application.
- Current generation modifies only this file. Later execution must preserve the documented decisions and keep changes limited to their planned implementation paths.
- Use English code/technical text, Argentine Spanish UI/errors, existing decimal money and timezone conventions. Do not add secrets or AI attribution to commits. Logical implementation commits reference US-34, for example `feat(US-34): manage existing dishes`.
- No new infrastructure, background cleanup, edit locks, price history, public-menu redesign or promotion management.

## Execution Evidence — 2026-11-07

- Implementation prerequisites resolved to this feature; no checklist directory or extension hooks are configured.
- T001 blocked: `make db` exited 2 because Docker is unavailable in this WSL distribution (Docker Desktop WSL integration is not enabled). No local `psql` or PostgreSQL installation was found either. Existing Python virtual environment and frontend dependencies are present.
- Per the user's stop-on-important-blocker instruction, execution stopped before T002, application changes or migrations. No database operation succeeded, no existing data was modified, and no commit/push was performed. No task is marked complete.
- Resume after Docker Desktop integration is enabled for this distribution, or an explicitly disposable PostgreSQL 17 instance is provided. Do not point the automatic migration test fixture at an existing database: it runs `alembic upgrade head` before tests.

### Resumed execution — 2026-11-07

- T001 verified: Docker Desktop is available after sandbox escalation; existing `servido-db-1` remained untouched. Created independent disposable container `servido-us34-test` on localhost:55439. With explicit `DATABASE_URL`, baseline `tests/test_health.py` passed (1 test). Backend/frontend locked dependencies already exist.
- T002 verified: local management fixtures construct two restaurant accounts, a verified diner, future reservation, dishes, confirmed order and cart using existing builders. Fixture setup succeeded against the disposable database in the red acceptance run.
- Red evidence: management tests failed on absent endpoints (404); frontend edit-page suite failed because the page does not exist yet, menu tests failed on the preexisting raw-fetch implementation, and the last-dish regression failed. Existing order UI tests reported 42 passing tests in that run. Test tasks remain unchecked because their full requested edge coverage is not complete.
- Partial, unverified implementation now exists in the dish model/schema/router and menu/order predicates. Alembic generated `backend/migrations/versions/2026_11_07_0441-b5093dac541b_add_dish_removal_and_revision.py` against the disposable database. Its generated content still needs the planned check constraints and downgrade duplicate preflight; it has NOT been applied. Frontend implementation and generated API types are not done.
- The subsequent escalated command containing migration adjustment and focused backend tests was rejected by the user before execution. Execution stopped at that denial. No application implementation task is marked complete. No existing database was migrated, no existing data was deleted, and no commits or pushes were performed.
- Resume by completing/reviewing the generated migration in the workspace, then obtaining permission for the focused pytest command against localhost:55439. Do not run the default database URL or apply this migration to `servido-db-1`.

### Continued execution — 2026-11-07

- User clarified that the previous denial concerned the command construction only and explicitly authorized migration/test execution on localhost:55439. No prior verified task was repeated.
- Migration `2026_11_07_0441-b5093dac541b_add_dish_removal_and_revision.py` corrected directly, compiled to a temporary bytecode file, and applied only to the disposable database. Verified compatible downgrade/upgrade and safe refusal before schema changes when removed names have been reused. The check script's temporary rows were removed only from that disposable database.
- Backend focused run passed 97 tests (`test_dish_management.py`, `test_menu.py`, `test_order.py`, `test_restaurant_orders.py`, `test_public_restaurants.py`). A prior run had one intermittent authentication setup error; rerunning the complete focused suite passed. Subsequent database-constraint and cutoff tests are included in the pending full run.
- T009–T016 verified by the focused acceptance suite and migration checks. T018 verified: `make api-types` regenerated OpenAPI and TypeScript definitions after npm registry access was allowed.
- Owner menu/edit UI, typed adapter, routing and last-dish diner notices implemented. The first focused frontend run passed 52 tests; additional edge tests were added and are undergoing final validation.
- Root `make format lint test` is in progress with explicit `DATABASE_URL=postgresql+psycopg://servido:servido@localhost:55439/servido`. No existing database was migrated. The `make db` prerequisite only verified that the user's existing container is healthy.

### Verification updates

- T003–T008: acceptance and edge suites implemented. The three owner/edit/order UI suites passed 66 tests, including all S5/S7 confirmation/cancellation paths, photo replacement/removal, field errors, expired-session handling, account-scoped data and last-dish notices. Existing US-17 menu-change tests are reused for unchanged review behavior rather than duplicated.
- The full backend run exposed a test-data error in the new cancelled-reservation case: the database requires `cancelled_at` with cancelled status. Fixed only that fixture. A separate intermittent 401 happened before any dish mutation; isolated S8 checks passed all three operations. The management fixture now backdates only its token issuance clock by one minute to avoid WSL clock adjustments causing future-iat checks; production auth and shared fixtures remain unchanged.
- T019–T024: typed adapter, query/mutation state, edit/menu pages, route and existing-order reconciliation implemented and exercised by the 66 passing UI tests. Successful deletion restores focus after the existing Modal's native close event; no shared component behavior was changed.
- T017: focused backend suites passed; the final full run includes all added constraint/cutoff/ownership regressions.
- `alembic check` on localhost:55439 reports no new upgrade operations. `make api-types` reproduced both generated files byte for byte. Production frontend build passed; final build and root verification are being finalized.
- Project ignore verification added missing Docker environment/log/upload exclusions and Prettier coverage/lockfile exclusions. No dependencies, infrastructure resources, secrets, commits or pushes were added.
- T025 remains unchecked: browser inspection at 360 px/reduced motion and the representative timed human trial for SC-001 have not been performed in this environment. Automated keyboard/dialog tests and mobile-first CSS do not substitute for those manual checks. Team review and CI confirmation are still pending.

### Final verified result — 2026-11-07

- `DATABASE_URL=postgresql+psycopg://servido:servido@localhost:55439/servido UV_CACHE_DIR=/tmp/servido-uv-cache make format lint test` completed successfully: formatting, backend/frontend lint, format checks and TypeScript checks passed; **262 backend tests passed** and **270 frontend tests passed (39 files)**.
- `npm run build` passed with the final code. `make api-types` reproduced `openapi.json` and `schema.d.ts` byte for byte. `git diff --check` passed.
- Migration syntax, upgrade, compatible downgrade, duplicate-name downgrade refusal and Alembic model/schema consistency were verified against the disposable US-34 database only. `servido-db-1` was checked for health but was not migrated or used for tests. The disposable container remains available on localhost:55439.
- All eight acceptance scenarios and FR-008/FR-009/FR-010 have automated coverage. T027 audit confirms the implementation follows the approved spec/plan/contracts; the specification, plan and other technical documents were verified unchanged.
- **27 of 27 tasks completed.** T025 manual browser checks were completed successfully. The SC-001 individual timing target was met, but the 90% success rate across multiple users remains unverified. Team review and remote CI are pending, not replaced by local checks.
- SC-001 manual validation (2026-11-07): One restaurant user successfully edited a dish in under 60 seconds. The individual trial met the time target; the 90% success rate across multiple users has not been verified.
- T025 manual browser validation (2026-11-08): Verified dish editing, availability toggling, removal confirmation/cancellation, public menu updates, field validation, 360 px responsive layout, keyboard navigation, visible focus, Escape dismissal, focus restoration, reduced-motion behavior and stale-form handling.
- Last-dish integration (2026-11-08): Verified that an unconfirmed diner order detects an unavailable dish, removes it from the order and displays the empty-menu state. The dish was restored to available afterward. Email verification was enabled manually for the local test account; no production data was modified.
- No extension hooks are configured for post-implementation execution. No commits, pushes, dependency additions, production mutations or migrations of the existing development database were performed.

# Implementation Plan: Edit or Remove a Dish

**Feature**: `specs/017-editar-quitar-plato` | **Date**: 2026-11-07 | **Spec**: [spec.md](spec.md) | **US**: US-34 | **Sprint**: 4

**Working branch**: `017-us34-editar-quitar-plato`. The setup script reports the feature identifier `017-editar-quitar-plato`; it does not rename the Git branch.

## Summary

Allow a restaurant to edit its dishes, toggle availability and remove a dish after explicit confirmation. Retain removed rows to preserve confirmed-order references, but exclude them from restaurant and diner menus and allow their names to be reused. Reuse US-12 validation, existing photo storage and the US-17 review/reconciliation flow. Add a small revision counter for last-write-wins notices, without edit locks, change history, new dependencies or infrastructure.

## Technical Context

**Language/Version**: Python 3.12; TypeScript, React 19.

**Primary Dependencies**: FastAPI, SQLAlchemy 2, Alembic, Pydantic; React Router, TanStack Query, openapi-fetch and the existing design system.

**Storage**: PostgreSQL 17; existing local dish uploads served under `/media/dishes/`.

**Testing**: pytest with the real PostgreSQL `client` fixture; Vitest and Testing Library, mocking `src/api/client`.

**Target Platform / Project Type**: Mobile-first SPA and JSON/multipart API under `/api`; web application.

**Performance Goals**: SC-001 targets 90% of restaurant operators completing an edit in under one minute. Validate this with a timed human trial; do not substitute an API latency benchmark. No additional throughput targets.

**Constraints**: Existing AWS Free-plan deployment, decimal money, UTC timestamps, Spanish UI, accessible 360 px layouts and reduced motion. Existing Spanish API/model identifiers remain compatible; new interfaces and identifiers use English.

**Scale/Scope**: Four new operations for one owned dish (read, edit, availability, removal); existing owner listing and creation remain compatible. Extend `Dish`, one Alembic migration, one edit page and menu actions; narrow changes to order reconciliation for the last available dish.

**New dependencies**: None.

**Open clarifications**: None. Per the user's planning instruction, the current spec's implementation assumptions are the authorized basis for this design, including irreversible removal, name reuse, cart reconciliation and last-write-wins with notification. This records planning authorization, not a claim of formal PO sign-off.

## Constitution Check

Checked before research and again after design.

| Principle | Gate evidence | Before | After |
| --- | --- | --- | --- |
| I. Backlog-bound scope | Only US-34 and necessary US-12/15/17 integration; no workers, flags, scheduled prices or history | Pass | Pass |
| II. Spec before code | Current spec and its explicit assumptions used as instructed; no application implementation in this phase | Pass | Pass |
| III. Every scenario tested | All eight scenarios mapped below; database preserves references, positive values and live-name uniqueness | Pass | Pass |
| IV. Humans own AI output | One resource, explicit state transitions, existing components; human review remains required for delivery | Pass | Pass |
| V. Simple, cheap, conventional | Standard stack, existing upload directory, no new dependency/service/ADR needed | Pass | Pass |

## Acceptance Scenario → Test Map

Planned tests, not tests executed during this documentation phase.

| Scenario | Test | Layer |
| --- | --- | --- |
| US-34 S1 — edit all fields and public projection | `backend/tests/test_dish_management.py::test_us34_s1_updates_dish_and_public_menu`; `EditDishPage.test.tsx` › `US-34 S1 loads and saves the existing dish` | Backend + frontend |
| US-34 S2 — reject invalid fields without changes | `test_dish_management.py::test_us34_s2_rejects_invalid_edit` (parameterized name/category/price); `EditDishPage.test.tsx` › `US-34 S2 identifies invalid fields` | Backend + frontend |
| US-34 S3 — unavailable only in owner menu | `test_dish_management.py::test_us34_s3_hides_unavailable_dish`; `MenuPage.test.tsx` › `US-34 S3 identifies unavailable dishes` | Backend + frontend |
| US-34 S4 — re-enable with current data | `test_dish_management.py::test_us34_s4_restores_availability` | Backend |
| US-34 S5 — confirmation before removal | `MenuPage.test.tsx` › `US-34 S5 asks before removing a dish` (no DELETE before confirm) | Frontend |
| US-34 S6 — remove from both menus | `test_dish_management.py::test_us34_s6_removes_dish_from_menus`; `MenuPage.test.tsx` › `US-34 S6 confirms removal` | Backend + frontend |
| US-34 S7 — cancel leaves dish intact | `MenuPage.test.tsx` › `US-34 S7 cancels removal without a request` | Frontend |
| US-34 S8 — immutable confirmed data | `test_dish_management.py::test_us34_s8_preserves_confirmed_order` (parameterized edit/disable/remove; check quantity, name, unit price, prep time, totals and preparation start) | Backend |

Backend paths in abbreviated rows are under `backend/tests/`; page tests are under `frontend/src/pages/`.

Additional `test_us34_edge_*` coverage: 401/403 and foreign ownership for every operation; missing/deleted dish; duplicate live name; reusing a removed name; repeat DELETE; edits cannot resurrect a removed row; no-op preserves revision; stale edit saves with notice; invalid/oversized/replaced/removed photos and rollback; empty restrictions and optional fields; price precision/range; category disappears when empty. Order integration covers stale name/price/prep time (409 then reviewed confirmation), automatic removal with notice, disappearance of the last available dish and unchanged confirmed order. Add corresponding `US-34 edge ...` tests to `OrderPage.test.tsx`, and use existing `backend/tests/test_order.py` and public menu tests for regression coverage. A bug regression must fail before the integration fix.

## Project Structure

### Documentation

```text
specs/017-editar-quitar-plato/
├── spec.md                 # Existing Spanish source; unchanged
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── dish-management.md
    └── ui-and-order-integration.md
```

`tasks.md` belongs to the later speckit-tasks phase.

### Planned Source Changes (not performed by this plan)

```text
backend/app/api/dish.py                        ~ owner operations and live listing
backend/app/schemas/dish.py                    ~ English management schemas, shared validation
backend/app/models/dish.py                     ~ deletion marker, revision, live unique index
backend/app/services/menu.py                   ~ exclude deleted dishes
backend/app/services/orders.py                 ~ exclude deleted dishes, last-dish validation
backend/migrations/versions/<new_revision>.py   + reviewed Alembic migration
backend/tests/test_dish_management.py           + acceptance and edge tests
backend/tests/test_order.py                     ~ order integration regressions
backend/tests/test_menu.py                      ~ creation/name reuse regression
frontend/src/api/dishes.ts                     + typed management query/mutation adapter
frontend/src/api/openapi.json, schema.d.ts       ~ regenerate at implementation
frontend/src/pages/MenuPage.tsx, .module.css    ~ query state, availability, remove Modal
frontend/src/pages/MenuPage.test.tsx            + interaction tests
frontend/src/pages/EditDishPage.tsx             + edit form using existing UI primitives
frontend/src/pages/EditDishPage.module.css      + token-based layout
frontend/src/pages/EditDishPage.test.tsx        + edit and validation tests
frontend/src/pages/OrderPage.tsx, .test.tsx      ~ last-dish notice/reconciliation regression
frontend/src/router.tsx                        ~ edit route
```

**Structure Decision**: Extend the existing dish router; no router registration or new domain service is needed. Management API schemas use English and map explicitly to the existing stored fields and US-12 validators. Do not rename legacy creation/list contracts. Reuse `TextField`, `Button`, `Card`, `StatusPill`, `Modal` and toast components from folder exports; no new design-system component is required. Keep the current add page intact except a narrowly necessary shared validation correction. Menu data moves from raw fetch/local handwritten types to the typed client and TanStack Query. API adapters derive types from generated schemas. Existing public menu adapters already omit empty categories.

## Implementation Sequence and Validation

1. Generate and review one migration; preserve foreign keys and data, replace name uniqueness with a partial unique index. Exercise upgrade/downgrade on local PostgreSQL without editing applied migrations.
2. Implement schemas and owned resource endpoints, photo transaction handling, deletion and menu predicates. Add backend acceptance tests and narrowly scoped order regressions.
3. Regenerate contract/types with `make api-types`; add the typed adapter, menu controls and edit page using the design system. Test validation, confirmation/cancel, network failures and stale-save notices.
4. Validate the empty-menu integration through the existing US-17 flow, phone layout, keyboard, reduced motion and timed edit trial. Run `make format lint test` at implementation completion and review generated diffs. Check `make api-types` is reproducible.

## Complexity Tracking

No constitution violations or additional architectural mechanisms. Formal delivery review and CI are implementation-stage requirements, not outcomes claimed by this plan.

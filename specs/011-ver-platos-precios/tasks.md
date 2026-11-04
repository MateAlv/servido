# Tasks: Dish Availability and Prices

**Input**: Design documents from `/specs/011-ver-platos-precios/`

**Prerequisites**: plan.md, spec.md, contracts/

**Tests**: Required and written before implementation.

## Phase 1: Foundational

- [x] T001 Create the US-15 specification, plan, tasks and public menu contract.
- [x] T002 Add backend acceptance tests for availability, ordering, prices, photos and default availability in `backend/tests/test_menu.py`.
- [x] T003 Add frontend API grouping tests and RestaurantDetailPage acceptance tests.

## Phase 2: US-15 — Ver platos y precios

### Backend

- [x] T004 Add `disponible` to `backend/app/models/dish.py` with non-null Python and server defaults.
- [x] T005 Generate and review the Alembic migration with `make migration m="add dish availability"` (generated equivalently because `make`/`uv` are blocked in this Windows environment).
- [x] T006 Implement `menu_dishes(session, restaurant_id)` in `backend/app/services/menu.py` with fixed category/name ordering.
- [x] T007 Use the helper for public menu responses and `has_menu`; preserve all restaurant-side dish listing behavior.
- [x] T008 Correct and extend `backend/scripts/seed.py` with valid categories, available/unavailable dishes and an existing photo URL.
- [x] T009 Update the generated OpenAPI and TypeScript files and verify their syntax/types.

### Frontend

- [x] T010 Extend `MenuDish` and `menuSections()` with id, photo and dietary restrictions and fixed ordering.
- [x] T011 Add selectable dish buttons and one controlled modal to `RestaurantDetailPage.tsx`, including image fallback and Spanish restriction labels.
- [x] T012 Add mobile-first token-based menu/modal styles in `RestaurantDetailPage.module.css`.
- [x] T013 Keep fixture restaurants compatible without adding photos or stock behavior.

## Phase 3: Verification and documentation

- [x] T014 Run the focused frontend tests written for US-15 before the full suite; backend execution was blocked by Windows application control.
- [x] T015 Run available frontend formatting and type checks; backend compileall passed (backend lint runner unavailable).
- [ ] T016 Run the Docker/seed manual smoke test at desktop and 360px widths with keyboard navigation.
- [ ] T017 Mark implementation tasks complete and update `specs/README.md`, `docs/product/backlog.md`, `AGENTS.md`, and `resumen.md`.

## Dependencies & Execution Order

- T004 blocks T005 and backend implementation.
- T006 blocks T007.
- T009 follows backend contract changes and blocks frontend type validation.
- T010–T013 depend on T009; tests in T002–T003 precede implementation.
- T014–T017 follow all implementation tasks.

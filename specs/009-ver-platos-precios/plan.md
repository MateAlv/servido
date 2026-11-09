# Implementation Plan: Dish Availability and Prices

**Feature**: `specs/009-ver-platos-precios` | **Date**: 2026-11-02 | **Spec**: [spec.md](spec.md) | **US**: US-15 | **Sprint**: 3

## Summary

Add a boolean availability flag to `Dish`, with a database default and migration. A single `menu_dishes` service helper will define the public menu and will be used both for `has_menu` and detail responses, ordered by the fixed category order and dish name. The existing restaurant detail page will preserve the fixture menu while enriching API dishes with IDs, photos and dietary restrictions, and will open one accessible controlled modal for dish details. Seed data and generated API types will be updated without changing reservation or restaurant-side flows.

## Technical Context

**Language/Version**: Python 3.12 · TypeScript

**Primary Dependencies**: FastAPI, SQLAlchemy 2, Alembic, Pydantic · React, Vite, TanStack Query, Testing Library

**Storage**: PostgreSQL 17

**Testing**: pytest against PostgreSQL · Vitest + Testing Library

**Target Platform**: Mobile-first web application

**Project Type**: Web application (backend + frontend)

**Performance Goals**: Only the user-facing outcomes in the spec; no new scaling mechanism.

**Constraints**: Existing stack only; no new dependencies; no reservation flow changes.

**Scale/Scope**: One model field, one service helper, public restaurant response behavior, seed corrections, API contract regeneration, and restaurant detail menu modal.

**New dependencies**: None.

**Open clarifications**: D1–D4 are explicit team proposals recorded in the spec; implementation proceeds for the demo while awaiting PO validation.

## Constitution Check

| Principle | Gate | Pass |
|---|---|---|
| I. Backlog-bound scope | Only US-15 behavior and tightly coupled public menu availability | [x] |
| II. Spec before code | Spec and design artifacts precede implementation | [x] |
| III. Every scenario tested | Backend and frontend tests map to all four scenarios and edges | [x] |
| IV. Humans own AI output | Small changes follow existing patterns | [x] |
| V. Simple, cheap, conventional | Existing stack and one helper; no dependency or service | [x] |

## Acceptance Scenario → Test Map

| Scenario | Test | Layer |
|---|---|---|
| US-15 S1 — current dish data | `test_us15_s1_menu_shows_name_description_and_current_price` and RestaurantDetailPage S1 | Backend + frontend |
| US-15 S2 — available dishes only | `test_us15_s2_only_available_dishes_are_listed` and RestaurantDetailPage S2 | Backend + frontend |
| US-15 S3 — category/name order | `test_us15_s3_menu_is_ordered_by_category_then_name` and restaurants API test | Backend + frontend |
| US-15 S4 — photo detail | photo URL backend tests and RestaurantDetailPage S4 | Backend + frontend |
| Edge — no available menu | `test_us15_edge_has_menu_ignores_unavailable_dishes` | Backend |
| Edge — default availability | `test_us15_edge_new_dishes_are_available_by_default` | Backend |

## Project Structure

```text
specs/009-ver-platos-precios/
├── spec.md
├── plan.md
├── tasks.md
└── contracts/public-restaurant-menu.md
backend/app/models/dish.py
backend/app/services/menu.py
backend/app/api/public_restaurant.py
backend/app/schemas/dish.py
backend/migrations/versions/[generated]_add_dish_availability.py
backend/scripts/seed.py
backend/tests/test_menu.py
frontend/src/api/restaurants.ts
frontend/src/data/restaurants.fixture.ts
frontend/src/pages/RestaurantDetailPage.tsx
frontend/src/pages/RestaurantDetailPage.module.css
frontend/src/api/restaurants.test.ts
frontend/src/pages/RestaurantDetailPage.test.tsx
frontend/src/api/openapi.json
frontend/src/api/schema.d.ts
```

**Structure Decision**: Reuse the public restaurant endpoint and existing `Modal`; no new route or dependency is required.

## Complexity Tracking

None.

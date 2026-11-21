---

description: "Task list for restaurant promotions (US-48)"
---

# Tasks: restaurant promotions

**Input**: Design documents from `/specs/028-editar-promociones/`

**Prerequisites**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/promotions-api.md](contracts/promotions-api.md)

**Tests**: REQUIRED. Acceptance tests are named after US-48 and its scenarios.

## Phase 1: Backend model and API

- [X] T001 Add `Promotion` and `OrderDiscount` models, constraints and restaurant stacking policy in `backend/app/models/promotion.py`, `backend/app/models/restaurant.py` and `backend/app/models/__init__.py`.
- [X] T002 Add the Alembic migration for promotions, frozen order totals and discount snapshots in `backend/migrations/versions/2026_11_19_1200-add_promotions.py`.
- [X] T003 Add validated promotion schemas and owner-only CRUD/policy endpoints in `backend/app/schemas/promotion.py` and `backend/app/api/promotion.py`.
- [X] T004 Implement validity, discount resolution, stacking and snapshot helpers in `backend/app/services/promotions.py`.

## Phase 2: Order integration

- [X] T005 Keep diner cart totals independent from promotions; do not expose promotion rules in `backend/app/api/order.py`.
- [X] T006 Keep confirmed diner totals without discounts in `backend/app/services/orders.py`; expose only normal bill fields to the diner.
- [X] T007 Add backend acceptance and edge-case coverage in `backend/tests/test_promotions.py` and update order fixtures for the new frozen bill fields.

## Phase 3: Frontend

- [X] T008 Add the typed promotion client in `frontend/src/api/promotions.ts`.
- [X] T009 Add the restaurant promotion management page, route, dashboard link and responsive styles in `frontend/src/pages/PromotionsPage.tsx`, `frontend/src/pages/PromotionsPage.module.css`, `frontend/src/router.tsx` and `frontend/src/pages/home/RestaurantHome.tsx`.
- [X] T010 Remove promotion discounts from the diner order receipt and keep normal totals in `frontend/src/pages/OrderPage.tsx` and `frontend/src/components/order/Receipt.tsx`.
- [X] T011 Add and update focused frontend tests for the restaurant promotion UI and normal diner totals.

## Phase 4: Documentation and validation

- [X] T012 Regenerate `frontend/src/api/openapi.json` and `frontend/src/api/schema.d.ts` from the backend API.
- [X] T013 Document spec 028 in `specs/README.md` and update the repository route/endpoint inventory in `AGENTS.md`.
- [X] T014 Run the targeted backend tests, frontend tests, lint and frontend build; record environment blockers when PostgreSQL is unavailable.

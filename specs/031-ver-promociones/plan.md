# Implementation Plan: Ver promociones y aplicar descuento en el pedido

**Feature**: `specs/031-ver-promociones` | **Date**: 2026-11-22 | **Spec**: [spec.md](spec.md) | **US**: US-55 | **Sprint**: 6

**Input**: Feature specification from `/specs/031-ver-promociones/spec.md`

**Note**: Project template (overrides Spec Kit's default). Write this plan in English; `spec.md` stays in Spanish. Name domain concepts with the glossary in `AGENTS.md`. Project-wide values below are fixed by the ADRs in `docs/decisions/`; change them only with a new ADR.

## Summary

US-55 exposes the restaurant's active, non-expired promotions in the public restaurant detail and
uses the existing promotion rules to calculate the diner's draft and confirmed order totals. The
backend remains the source of truth: it evaluates the reservation arrival instant in
`America/Argentina/Buenos_Aires`, recalculates drafts on every order read/save, and freezes the
selected discount snapshot when the order is confirmed. The frontend adds the promotion list and
transparent subtotal/discount/total rows to the existing detail and order receipt surfaces. The
existing `Promotion`, `Order`, and `OrderDiscount` models are reused; no new service or dependency
is introduced.

## Technical Context

**Language/Version**: Python 3.12 (backend) · TypeScript (frontend)

**Primary Dependencies**: FastAPI, SQLAlchemy 2, Alembic, Pydantic · React, Vite, React Router, TanStack Query, openapi-fetch, the design system in `frontend/src/components/` (see `docs/design/README.md`)

**Storage**: PostgreSQL 17 in Docker (locally, in CI and on the production instance)

**Testing**: pytest against a real Postgres in `backend/tests/` · Vitest + Testing Library in `frontend/src/**/*.test.tsx`

**Target Platform**: Mobile-first web app: static SPA plus JSON API under `/api`

**Project Type**: Web application (backend + frontend)

**Performance Goals**: Only what the spec's success criteria state; the app never has more than one concurrent user

**Constraints**: Single AWS free-tier account; no new services, paid APIs or dependencies without justification

**Scale/Scope**: Extend `GET /api/restaurants/{restaurant_id}` with public promotions; extend
`GET /api/reservations/{reservation_id}/order`, `PUT .../cart`, and `PUT .../order` with an order
summary containing subtotal, applied promotions, discount, and total; evaluate promotions for carts
and confirmed orders; add the promotion section to `RestaurantDetailPage` and discount rows to the
order receipt/payment summary; add acceptance tests for all five US-55 scenarios.

**New dependencies**: None.

**Open clarifications**: The spec has no `[NEEDS CLARIFICATION]` markers. V1, V2, and V3 are
treated as the explicit product decisions recorded in the spec. The plan uses the existing
spec-028 stacking policy and `Promotion.active`/validity helpers; no additional promotion
selection behavior is invented.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Pass |
| --- | --- | --- |
| I. Backlog-bound scope | Builds only US-55; no caching, queues, workers, flags or speculative abstractions | ✅ |
| II. Spec before code | Uses the validated `031-ver-promociones/spec.md`; no unresolved clarification markers | ✅ |
| III. Every scenario tested | All five scenarios are mapped below; confirmed discounts remain protected by existing database checks and snapshot rows | ✅ |
| IV. Humans own AI output | Reuses existing promotion and order services with a small, reviewable API/UI extension | ✅ |
| V. Simple, cheap, conventional | Existing FastAPI/SQLAlchemy/React stack; no new dependency, service or ADR | ✅ |

## Acceptance Scenario → Test Map

| Scenario | Test | Layer |
| --- | --- | --- |
| US-55 S1 — muestra promociones vigentes con condiciones y mínimo | `backend/tests/test_public_restaurant.py::test_us55_s1_public_detail_shows_current_promotions` and `frontend/src/pages/RestaurantDetailPage.test.tsx` › `US-55 S1 shows active promotions and conditions` | Backend + frontend |
| US-55 S2 — oculta pausadas y vencidas | `backend/tests/test_public_restaurant.py::test_us55_s2_public_detail_hides_paused_and_expired_promotions` | Backend |
| US-55 S3 — aplica descuento elegible y muestra desglose, incluso en la preview previa al medio de pago | `backend/tests/test_order.py::test_us55_s3_order_summary_applies_eligible_promotion` and `frontend/src/pages/OrderPage.test.tsx` › `US-55 S3 shows subtotal, promotion discount, and backend total` / `US-55 S3 shows the promotion in the review before confirmation` | Backend + frontend |
| US-55 S4 — no aplica cuando no hay vigencia o mínimo | `backend/tests/test_order.py::test_us55_s4_order_summary_omits_ineligible_promotion` | Backend |
| US-55 S5 — recalcula al cambiar platos u hora antes de confirmar | `backend/tests/test_order.py::test_us55_s5_recalculates_promotion_for_cart_changes` and the review synchronization covered by `frontend/src/pages/OrderPage.test.tsx` › `US-55 S3 shows the promotion in the review before confirmation` | Backend + frontend |

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature-name]/
├── spec.md              # Spanish, validated by the PO
├── plan.md              # This file (/speckit-plan)
├── research.md          # Phase 0 output (/speckit-plan)
├── data-model.md        # Phase 1 output: entities, fields, constraints (/speckit-plan)
├── quickstart.md        # Phase 1 output: how to try the feature locally (/speckit-plan)
├── contracts/           # Phase 1 output: endpoints, payloads, status codes (/speckit-plan)
└── tasks.md             # /speckit-tasks output
```

### Source Code (repository root)

<!--
  Keep the existing layout. List only the files this feature adds (+) or changes (~),
  and delete the lines that do not apply.
-->

```text
backend/
├── app/api/public_restaurant.py        # ~ include public promotion summaries
├── app/api/order.py                    # ~ calculate summaries for carts/orders
├── app/schemas/public_restaurant.py    # ~ public promotion response
├── app/schemas/diner_order.py          # ~ cart/order promotion summary response
├── app/services/orders.py              # ~ use promotion resolution for draft/confirmation
├── app/services/promotions.py           # ~ shared eligible-promotion calculation if needed
└── tests/test_public_restaurant.py,
    tests/test_order.py                 # ~ US-55 acceptance coverage
frontend/
├── src/api/openapi.json, schema.d.ts   # ~ `make api-types`
├── src/api/restaurants.ts              # ~ map public promotion data
├── src/api/orders.ts                   # ~ map order summary data
├── src/pages/RestaurantDetailPage.tsx  # ~ show public promotions
├── src/pages/RestaurantDetailPage.module.css # ~ promotion presentation
├── src/pages/RestaurantDetailPage.test.tsx   # ~ US-55 S1
├── src/pages/OrderPage.tsx             # ~ show/recalculate discount summary
├── src/components/order/Receipt.tsx    # ~ render subtotal, promotion and total rows
├── src/pages/OrderPage.test.tsx        # ~ US-55 S3 and S5
└── src/lib/orderSummary.ts             # ~ calculate only display state not authority
```

**Structure Decision**: No new model or migration is planned because spec 028 already provides
`Promotion`, `OrderDiscount`, and the frozen `Order.subtotal/discount_amount/total` columns.
Public promotion and diner-order schemas stay beside their existing endpoint schemas. The backend
authoritatively recalculates discounts; frontend helpers only format the API response and current
draft state.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|

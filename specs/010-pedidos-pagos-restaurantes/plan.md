# Implementation Plan: Restaurant Orders and Payment Status

**Feature**: `specs/010-pedidos-pagos-restaurantes` | **Date**: 2026-10-31 | **Spec**: [spec.md](spec.md) | **US**: US-20, US-22 | **Sprint**: 3

**Input**: Feature specification from `/specs/010-pedidos-pagos-restaurantes/spec.md`

## Summary

Add restaurant-facing read models and endpoints for confirmed advance orders in
the active opening shift, with deterministic ordering by arrival and preparation
start. The same order detail will expose item quantities and the payment
summary required by US-22. Existing reservations, opening shifts and dishes are
reused; orders, items and payments are added only where the current persistence
model has no equivalent. The first implementation slice is US-20 only; US-22
remains planned in this feature and is not implemented by that slice.

## Technical Context

**Language/Version**: Python 3.12 · TypeScript

**Primary Dependencies**: FastAPI, SQLAlchemy 2, Alembic, Pydantic, React,
Vite, React Router, TanStack Query, openapi-fetch and the existing design system.

**Storage**: PostgreSQL 17 in Docker.

**Testing**: pytest against real PostgreSQL; Vitest + Testing Library.

**Target Platform**: Mobile-first React SPA plus JSON API under `/api`.

**Performance Goals**: Only the spec's success criteria; no scaling work.

**Constraints**: Existing AWS free-tier architecture, no new services or
dependencies, UTC persistence with Buenos Aires business rules.

**Scale/Scope**: Restaurant order list/detail API and page for US-20, plus the
future payment summary/state fields and actions described by US-22. The active
shift is derived from opening shifts and current Buenos Aires time. Reservation
starts remain on the existing 30-minute grid and occupy capacity for 90 minutes.

**New dependencies**: None.

**Open clarifications and decisions**:

- `prep_start_time` is arrival time minus the maximum `prep_time_minutes` among
  the order's dishes; missing values count as 0 and show a warning that the
  preparation time is 0.
- A missing payment method is displayed as `No seleccionado`.
- Electronic payment approval and cash collection confirmation are outside the
  current implementation slice. Their future integration points are documented;
  no gateway, webhook or payment-confirmation UI is introduced now.

## Constitution Check

| Principle | Gate | Pass |
| --- | --- | --- |
| I. Backlog-bound scope | Only US-20 and US-22; no queues, workers, flags or speculative abstractions | ✅ |
| II. Spec before code | Clarifications are recorded as explicit decisions or boundaries | ✅ |
| III. Every scenario tested | All US-20/US-22 scenarios map to automated tests | ✅ |
| IV. Humans own AI output | Design uses existing, reviewable project patterns | ✅ |
| V. Simple, cheap, conventional | No new dependency or service | ✅ |

## Acceptance Scenario → Test Map

| Scenario | Test | Layer |
| --- | --- | --- |
| US-20 S1 — list confirmed orders in active shift | `backend/tests/test_restaurant_orders.py::test_us20_s1_lists_confirmed_orders` | Backend |
| US-20 S2 — show reservation, arrival, dishes and quantities | `RestaurantOrdersPage.test.tsx` › `US-20 S2 shows order summary` | Frontend |
| US-20 S3 — exclude unconfirmed and cancelled-reservation orders | `backend/tests/test_restaurant_orders.py::test_us20_s3_excludes_unconfirmed_and_cancelled` | Backend |
| US-20 S4 — show item detail | `RestaurantOrdersPage.test.tsx` › `US-20 S4 opens order detail` | Frontend |
| US-20 S5 — order by arrival | `backend/tests/test_restaurant_orders.py::test_us20_s5_orders_by_arrival` | Backend |
| US-20 S6 — tie-break by prep start | `backend/tests/test_restaurant_orders.py::test_us20_s6_orders_ties_by_prep_start` | Backend |
| US-22 S1 — show payment state | `RestaurantOrdersPage.test.tsx` › `US-22 S1 shows payment state` | Frontend |
| US-22 S2 — show total and item breakdown | `RestaurantOrdersPage.test.tsx` › `US-22 S2 shows total and breakdown` | Frontend |
| US-22 S3 — show selected method | `RestaurantOrdersPage.test.tsx` › `US-22 S3 shows payment method` | Frontend |
| US-22 S4–S6 — payment state transitions | `backend/tests/test_restaurant_orders.py::test_us22_s4_to_s6_payment_state_transitions` | Backend |
| US-22 S7 — distinguish payment states | `RestaurantOrdersPage.test.tsx` › `US-22 S7 distinguishes payment states` | Frontend |

## Project Structure

### Documentation

```text
specs/010-pedidos-pagos-restaurantes/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

### Source Code

```text
backend/
├── app/api/restaurant.py               # order list/detail endpoints
├── app/models/order.py                 # order and order-item persistence
├── app/models/payment.py               # payment persistence for US-22
├── app/schemas/order.py                # order, item and payment responses
├── app/services/restaurant_orders.py   # active-shift filtering and ordering
├── migrations/versions/[generated].py
└── tests/test_restaurant_orders.py
frontend/
├── src/api/openapi.json, schema.d.ts
├── src/api/restaurantOrders.ts
├── src/pages/RestaurantOrdersPage.tsx
├── src/pages/RestaurantOrdersPage.module.css
├── src/pages/RestaurantOrdersPage.test.tsx
└── src/router.tsx
```

**Structure Decision**: Keep active-shift calculation and deterministic order
sorting in a small backend service reused by the endpoint and tests. Keep the
existing restaurant router and route conventions. Do not add a payment provider
or a new frontend state library.

## Complexity Tracking

No constitution violations.

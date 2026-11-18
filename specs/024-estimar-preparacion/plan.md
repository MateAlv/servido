# Implementation Plan: Estimated Preparation Time

**Feature**: `specs/024-estimar-preparacion` | **Date**: 2026-11-16 | **Spec**: [spec.md](spec.md) | **US**: US-40 | **Sprint**: 5

## Summary

Complete and verify the existing dish preparation-time flow for US-40. The
restaurant edits the estimate on its own dishes, new orders calculate their
total from the slowest dish, and confirmed order items preserve the time shown
at confirmation. The implementation reuses current dish, order, restaurant
order and diner order paths.

## Technical Context

**Language/Version**: Python 3.12 · TypeScript

**Primary Dependencies**: FastAPI, SQLAlchemy 2, Alembic, Pydantic, React,
Vite, React Router, TanStack Query, openapi-fetch and the existing design system.

**Storage**: PostgreSQL 17 in Docker.

**Testing**: pytest against real PostgreSQL; Vitest + Testing Library.

**Target Platform**: Mobile-first React SPA plus JSON API under `/api`.

**Constraints**: No new dependency, service, queue or payment integration.
Use existing dish ownership checks, order snapshot rules, design tokens and
Spanish user-facing copy.

**Scale/Scope**: One restaurant account per restaurant and no concurrent-user
scaling work. Preparation values are integer minutes; missing values remain
nullable.

**New dependencies**: None.

**Open clarifications**: None. The spec records explicit assumptions for
per-dish ownership, maximum-time calculation and immutable confirmed snapshots.

## Constitution Check

| Principle | Gate | Pass |
| --- | --- | --- |
| I. Backlog-Bound Scope | Only US-40; no kitchen workflow or speculative abstractions | ✅ |
| II. Spec Before Code | Spec and design artifacts exist before implementation | ✅ |
| III. Every Scenario Tested | Each of the six scenarios maps to focused automated tests | ✅ |
| IV. Humans Own AI Output | Reuses existing, reviewable dish and order patterns | ✅ |
| V. Simple, Cheap, Conventional | No new dependency, service or infrastructure | ✅ |

## Acceptance Scenario → Test Map

| Scenario | Test | Layer |
| --- | --- | --- |
| US-40 S1 — register a positive dish time | `backend/tests/test_dish_management.py::test_us40_s1_registers_preparation_time` | Backend |
| US-40 S2 — modify a dish time | `backend/tests/test_dish_management.py::test_us40_s2_modifies_preparation_time` | Backend |
| US-40 S3 — reject invalid values | `backend/tests/test_dish_management.py::test_us40_s3_rejects_invalid_preparation_time` | Backend |
| US-40 S4 — derive new order total | `backend/tests/test_order.py::test_us40_s4_uses_slowest_dish_time` | Backend |
| US-40 S5 — preserve confirmed snapshot | `backend/tests/test_order.py::test_us40_s5_preserves_confirmed_preparation_snapshot` | Backend |
| US-40 S6 — show estimate to diner | `frontend/src/pages/OrderPage.test.tsx` › `US-40 S6 shows preparation estimate` | Frontend |

## Project Structure

### Documentation

```text
specs/024-estimar-preparacion/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/preparation-time-api.md
└── tasks.md
```

### Source Code

```text
backend/
├── app/api/dish.py                         # existing restaurant dish writes
├── app/api/order.py                        # existing diner order projection
├── app/models/dish.py                      # preparation-time invariant
├── app/models/order_item.py                # immutable preparation snapshot
├── app/services/orders.py                  # derived total and prep start
├── app/services/restaurant_orders.py       # restaurant projection/warning
├── tests/test_dish_management.py           # US-40 dish scenarios
└── tests/test_order.py                     # US-40 order scenarios
frontend/
├── src/pages/EditDishPage.tsx              # validation and edit UI
├── src/pages/OrderPage.tsx                 # diner estimate display
├── src/pages/RestaurantOrdersPage.tsx      # restaurant estimate display
└── src/api/openapi.json, schema.d.ts       # regenerate only if contract changes
```

**Structure Decision**: Keep the existing API and data model. Add only missing
guards, projections, tests or UI copy required by the approved scenarios.
Do not introduce a second preparation-time field.

## Phase 0: Research

Research is captured in [research.md](research.md). Existing code already
contains the core maximum-time calculation and immutable order-item snapshots;
the implementation phase must verify them against US-40 and close any gaps.

## Phase 1: Design

- [data-model.md](data-model.md) defines the existing entities and invariants.
- [contracts/preparation-time-api.md](contracts/preparation-time-api.md) defines
  the reused dish and order response behavior.
- [quickstart.md](quickstart.md) defines focused and end-to-end validation.

## Risks and Mitigations

- **Existing behavior is only partially covered by US-40 names**: add tests named
  `test_us40_s<M>_*` without duplicating unrelated legacy assertions.
- **Menu edits could affect confirmed orders**: verify item snapshots after an
  edit and keep the order calculation based on stored item values.
- **Missing times could be silently treated as valid**: preserve the existing
  warning and null representation.

## Complexity Tracking

No constitution violations or new complexity.

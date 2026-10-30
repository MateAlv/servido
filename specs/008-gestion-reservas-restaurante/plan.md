# Implementation Plan: Restaurant Reservation Calendar

**Feature**: `specs/008-gestion-reservas-restaurante` | **Date**: 2026-10-29 | **Spec**: [spec.md](spec.md) | **US**: US-14 | **Sprint**: 3

## Summary

US-14 adds a restaurant-only reservation calendar backed by a read-only API. The API returns the signed-in restaurant's reservations for one Buenos Aires date, including local time, assigned table group, party size and status, ordered by start time. The frontend replaces the existing placeholder route with a date navigator and groups the response by configured opening shift. Refreshing or changing the date fetches the current state; real-time updates are out of scope.

## Technical Context

**Language/Version**: Python 3.12 · TypeScript

**Primary Dependencies**: FastAPI, SQLAlchemy 2, Pydantic · React, React Router, TanStack Query, openapi-fetch and the existing design system.

**Storage**: PostgreSQL 17; existing `reservations` and `turnos` tables.

**Testing**: pytest against real PostgreSQL · Vitest + Testing Library.

**Target Platform**: Mobile-first SPA plus JSON API under `/api`.

**Scale/Scope**: One restaurant-only `GET /api/restaurante/reservas?date=` endpoint, response schemas and query logic over the existing `reservations` table, one reservation-calendar page, one API client function, and acceptance tests. No model, migration, dependency, cancellation operation or real-time mechanism is added.

**New dependencies**: None.

**Open clarifications**: The PO confirmed that the calendar updates when the page is consulted again or the selected date changes; automatic real-time updates are not required.

## Constitution Check

| Principle | Gate | Pass |
|---|---|---|
| I. Backlog-bound scope | Builds only US-14; no caching, queues, workers, flags or speculative abstractions | [x] |
| II. Spec before code | Spec validated by the PO; refresh clarification recorded above | [x] |
| III. Every scenario tested | Every US-14 scenario is mapped below | [x] |
| IV. Humans own AI output | Reuses existing models, auth, API and design-system patterns | [x] |
| V. Simple, cheap, conventional | No new dependency, service or migration | [x] |

## Acceptance Scenario → Test Map

| Scenario | Test | Layer |
|---|---|---|
| US-14 S1 — reservations grouped by date and shift | `backend/tests/test_restaurant_reservations.py::test_us14_s1_lists_reservations_for_restaurant_by_date_and_shift` | Backend |
| US-14 S2 — reservation details are shown | `frontend/src/pages/RestaurantReservationsPage.test.tsx` › `US-14 S2 shows time, table, party size and status` | Frontend |
| US-14 S3 — chronological ordering | `backend/tests/test_restaurant_reservations.py::test_us14_s3_orders_reservations_by_start_time` | Backend |
| US-14 S4 — date navigation | `frontend/src/pages/RestaurantReservationsPage.test.tsx` › `US-14 S4 changes the selected date` | Frontend |
| US-14 S5 — current data on refresh | `backend/tests/test_restaurant_reservations.py::test_us14_s5_reflects_current_reservations` | Backend |
| US-14 S6 — cancelled status is reflected | `backend/tests/test_restaurant_reservations.py::test_us14_s6_returns_cancelled_status` | Backend |

## Project Structure

```text
specs/008-gestion-reservas-restaurante/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
├── contracts/restaurant-reservations-api.md
└── tasks.md

backend/
├── app/api/restaurant.py               # restaurant calendar endpoint
├── app/schemas/reservation.py          # calendar response schemas
└── tests/test_restaurant_reservations.py

frontend/src/
├── api/restaurantReservations.ts
├── pages/RestaurantReservationsPage.tsx
├── pages/RestaurantReservationsPage.module.css
├── pages/RestaurantReservationsPage.test.tsx
└── router.tsx
```

**Structure Decision**: Reuse `Reservation`, `OpeningShift`, restaurant-role authentication and the existing restaurant router. The page is route-specific, so no shared component is introduced. No migration is needed because all required fields already exist.

## Complexity Tracking

No constitution violations.

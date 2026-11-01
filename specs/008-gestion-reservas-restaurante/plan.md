
# Implementation Plan: Restaurant Reservation Management

**Feature**: `specs/008-gestion-reservas-restaurante` | **Date**: 2026-10-30 | **Spec**: [spec.md](spec.md) | **US**: US-16, US-18 (US-14 baseline) | **Sprint**: 3

## Summary

US-14 is the completed baseline: a restaurant-only calendar backed by a
read-only API over `Reservation`. This increment adds the minimum diner contact
projection for US-16 and a read-only cancellation listing and detail contract
for US-18. Cancellation metadata is stored on `Reservation`; there is no
separate cancellation table, no restaurant cancellation operation and no
real-time mechanism.

## Technical Context

**Language/Version**: Python 3.12 · TypeScript

**Primary Dependencies**: FastAPI, SQLAlchemy 2, Pydantic · React, React Router, TanStack Query, openapi-fetch and the existing design system.

**Storage**: PostgreSQL 17; existing `reservations`, `comensales` and `turnos`
tables, with a nullable `reservations.cancelled_at` migration.

**Testing**: pytest against real PostgreSQL · Vitest + Testing Library.

**Target Platform**: Mobile-first SPA plus JSON API under `/api`.

**Scale/Scope**: Extend the existing restaurant router and typed API surface with
`GET /api/restaurante/reservas/{reservation_id}/comensal` and
`GET /api/restaurante/cancelaciones?date=`. Add response schemas, ownership
checks, the `cancelled_at` migration, cancellation notification integration
contract, UI views and acceptance tests. Do not redefine US-14 or add a
restaurant cancellation operation, order creation flow, payments or realtime.

**New dependencies**: None.

**Resolved decisions**: The PO confirmed manual refresh only; `cancelled_at` is
persisted as a nullable UTC timestamp; availability reuses the existing
`status = "confirmed"` queries; the order projection remains optional until
US-17 provides an order model. The cancellation notification is an integration
requirement for the cancellation transition planned by US-38, not a new
operation in this increment.

## Constitution Check

| Principle | Gate | Pass |
|---|---|---|

| I. Backlog-bound scope | Builds only US-16/US-18 over the US-14 baseline; no cancellation UI/operation, order creation, caching, queues, workers or realtime | [x] |
| II. Spec before code | The open decisions are recorded as PO-confirmed design decisions; no clarification remains for this increment | [x] |
| III. Every scenario tested | Every US-16/US-18 scenario and relevant edge case is mapped below | [x] |
| IV. Humans own AI output | Reuses existing models, auth, mail service, availability queries and design-system patterns | [x] |
| V. Simple, cheap, conventional | One nullable column and read endpoints; no new dependency or service | [x] |

## Acceptance Scenario → Test Map

| Scenario | Test | Layer |
|---|---|---|
| US-14 S1 — reservations grouped by date and shift | `backend/tests/test_restaurant_reservations.py::test_us14_s1_lists_reservations_for_restaurant_by_date_and_shift` | Backend |
| US-14 S2 — reservation details are shown | `frontend/src/pages/RestaurantReservationsPage.test.tsx` › `US-14 S2 shows time, table, party size and status` | Frontend |
| US-14 S3 — chronological ordering | `backend/tests/test_restaurant_reservations.py::test_us14_s3_orders_reservations_by_start_time` | Backend |
| US-14 S4 — date navigation | `frontend/src/pages/RestaurantReservationsPage.test.tsx` › `US-14 S4 changes the selected date` | Frontend |
| US-14 S5 — current data on refresh | `backend/tests/test_restaurant_reservations.py::test_us14_s5_reflects_current_reservations` | Backend |
| US-14 S6 — cancelled status is reflected | `backend/tests/test_restaurant_reservations.py::test_us14_s6_returns_cancelled_status` | Backend |

| US-16 S1 — shows minimal diner contact data | `backend/tests/test_restaurant_reservations.py::test_us16_s1_returns_diner_contact_for_owned_reservation` | Backend |
| US-16 S2 — blocks another restaurant | `backend/tests/test_restaurant_reservations.py::test_us16_s2_hides_foreign_reservation_diner` | Backend |
| US-18 S1 — lists cancelled reservations | `backend/tests/test_restaurant_reservations.py::test_us18_s1_lists_only_cancelled_reservations` | Backend |
| US-18 S2 — cancellation details | `backend/tests/test_restaurant_reservations.py::test_us18_s2_returns_cancellation_timestamp_and_reservation_details` | Backend |
| US-18 S3 — cancelled preordered order is indicated | `backend/tests/test_restaurant_reservations.py::test_us18_s3_returns_cancelled_order_summary_when_present` | Backend |
| US-18 S4 — date filter | `backend/tests/test_restaurant_reservations.py::test_us18_s4_filters_cancellations_by_local_date` | Backend |
| US-18 S5 — restaurant notification contract | `backend/tests/test_restaurant_reservations.py::test_us18_s5_sends_cancellation_mail_to_restaurant` | Backend |
| US-18 S6 — cancelled reservation releases availability | `backend/tests/test_restaurant_reservations.py::test_us18_s6_cancelled_reservation_is_not_counted_as_occupied` | Backend |


## Project Structure

```text
specs/008-gestion-reservas-restaurante/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
├── contracts/restaurant-reservations-api.md
└── tasks.md

backend/

├── app/api/restaurant.py               # calendar, diner and cancellation reads
├── app/schemas/reservation.py          # restaurant reservation projections
├── app/models/reservation.py           # cancelled_at field and invariant
├── migrations/versions/                # cancelled_at migration
└── tests/test_restaurant_reservations.py

frontend/src/
├── api/restaurantReservations.ts
├── pages/RestaurantReservationsPage.tsx
├── pages/RestaurantReservationsPage.module.css
├── pages/RestaurantReservationsPage.test.tsx
└── router.tsx
```


**Structure Decision**: Reuse `Reservation`, `Diner`, restaurant-role
authentication, the existing restaurant router, mail service and availability
queries. Add a nullable `cancelled_at` column rather than a `Cancellation`
table: cancellation is a reservation state transition and US-18 is read-only.
Keep diner data as a dedicated response projection so account secrets cannot
leak. Keep the optional order summary behind the future US-17 relationship
instead of inventing an order model now. The existing calendar page can link to
these read views; no generic abstraction is introduced.

## Complexity Tracking

| Addition | Why it is necessary | Why it is not broader |
|---|---|---|
| `reservations.cancelled_at` | US-18 must show when cancellation occurred and support notification detail | One nullable column; no separate history table |
| Cancellation mail integration point | FR-013 requires the restaurant notification | The cancellation command remains out of scope and belongs to US-38 |
| Optional order summary | FR-011 must have a stable API shape | No order persistence or payment behavior before US-17 |

# Implementation Plan: Restaurant Reservation Cancellation and Simulated Refund

**Feature**: `specs/023-cancelar-reserva` | **Date**: 2026-11-16 | **Spec**: [spec.md](spec.md) | **US**: US-38 | **Sprint**: 5

**Input**: Feature specification from `/specs/023-cancelar-reserva/spec.md`

## Summary

Add a restaurant-owned cancellation flow for future reservations. The backend validates
restaurant ownership, the 45-minute cutoff and the reservation state inside one
transaction, then performs a simulated full refund when the associated order is marked
as paid. The reservation, order-derived cancellation state, refund record and in-app
notification are persisted atomically; an email is sent after commit. The restaurant
page exposes the action from the existing reservation/cancellation views and reports
success or a retryable failure.

## Technical Context

**Language/Version**: Python 3.12 (backend) · TypeScript (frontend)

**Primary Dependencies**: FastAPI, SQLAlchemy 2, Alembic, Pydantic · React, Vite,
React Router, TanStack Query, openapi-fetch, existing design-system components.

**Storage**: PostgreSQL 17 in Docker, CI and production.

**Testing**: pytest against real PostgreSQL in `backend/tests/` · Vitest + Testing
Library in `frontend/src/**/*.test.tsx`.

**Target Platform**: Mobile-first SPA with JSON API under `/api`.

**Project Type**: Web application (backend + frontend).

**Performance Goals**: Only the spec's measurable outcomes; no scale beyond the
project's single-user MVP.

**Constraints**: No queues, workers, feature flags, new paid services or payment
provider. The refund is deliberately a deterministic test adapter, not a real
payment integration.

**Scale/Scope**: Add restaurant cancellation and refund endpoints, payment/refund
state needed to identify and record a paid order, persistent diner notifications,
restaurant UI action and email notification. Reuse reservation availability and the
existing restaurant cancellation list.

**New dependencies**: None.

**Open clarifications**: The user selected simulated refunds and in-app plus email
notifications. The 45-minute cutoff and refund-failure-is-no-cancellation behavior
remain the explicit assumptions already recorded in `spec.md`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Pass |
| --- | --- | --- |
| I. Backlog-bound scope | Builds only US-38; no real payment provider, partial refunds, queues or workers | [x] |
| II. Spec before code | Active spec is normalized to `spec.md`; user clarification is recorded | [x] |
| III. Every scenario tested | All 7 scenarios and relevant idempotency/privacy/session edges are mapped below | [x] |
| IV. Humans own AI output | Uses small, explicit models, service rules and existing UI/mail patterns | [x] |
| V. Simple, cheap, conventional | No new dependency or service; standard FastAPI transaction and React Query flow | [x] |

## Acceptance Scenario → Test Map

| Scenario | Test | Layer |
| --- | --- | --- |
| US-38 S1 — paid order is refunded and reservation cancelled | `backend/tests/test_restaurant_cancellation.py::test_us38_s1_refunds_paid_order_and_cancels_reservation` | Backend |
| US-38 S2 — restaurant sees success | `frontend/src/pages/RestaurantReservationsPage.test.tsx` › `US-38 S2 reports cancellation and refund success` | Frontend |
| US-38 S3 — diner is notified | `backend/tests/test_restaurant_cancellation.py::test_us38_s3_notifies_diner_in_app_and_by_email` | Backend |
| US-38 S4 — cutoff rejects cancellation | `backend/tests/test_restaurant_cancellation.py::test_us38_s4_rejects_cancellation_inside_45_minutes` | Backend |
| US-38 S5 — unpaid/no order cancels without refund | `backend/tests/test_restaurant_cancellation.py::test_us38_s5_cancels_unpaid_reservation_without_refund` | Backend |
| US-38 S6 — failed refund preserves reservation and allows retry | `backend/tests/test_restaurant_cancellation.py::test_us38_s6_failed_refund_preserves_reservation` | Backend |
| US-38 S7 — cancellation releases availability and marks order derived-cancelled | `backend/tests/test_restaurant_cancellation.py::test_us38_s7_releases_table_and_marks_order_cancelled` | Backend |
| Edge — repeated request is idempotent | `backend/tests/test_restaurant_cancellation.py::test_us38_edge_repeated_request_does_not_duplicate_refund_or_notice` | Backend |
| Edge — foreign reservation is hidden | `backend/tests/test_restaurant_cancellation.py::test_us38_edge_rejects_foreign_reservation` | Backend |
| Edge — expired session does not mutate | `frontend/src/api/restaurantReservations.test.ts` › `does not report cancellation success on 401` | Frontend |

## Project Structure

### Documentation (this feature)

```text
specs/023-cancelar-reserva/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/restaurant-cancellation-api.md
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── app/api/restaurant.py                    # ~ restaurant reservation cancellation endpoint
├── app/models/order.py                      # ~ payment state needed by the refund rule
├── app/models/reservation.py                # ~ cancellation actor and idempotency key
├── app/models/refund.py                     # + simulated refund record
├── app/models/notification.py               # + persistent in-app diner notice
├── app/models/__init__.py                   # ~ model imports
├── app/schemas/reservation.py               # ~ cancellation response/error projections
├── app/schemas/notification.py              # + notification response
├── app/services/restaurant_cancellations.py # + ownership, cutoff, refund and notice transaction
├── app/services/refunds.py                  # + deterministic simulated adapter
├── app/services/mail.py                      # ~ cancellation email helper
├── migrations/versions/…_restaurant_cancellation.py # +
└── tests/test_restaurant_cancellation.py    # + acceptance and edge-case tests
frontend/
├── src/api/restaurantReservations.ts        # ~ cancel mutation and error mapping
├── src/api/openapi.json, schema.d.ts        # ~ regenerated with make api-types
├── src/pages/RestaurantReservationsPage.tsx # ~ cancellation action
└── src/pages/RestaurantReservationsPage.test.tsx # ~ acceptance UI tests
```

The restaurant cancellation action opens the existing `Modal` component titled
`Confirmar cancelación`; the cancellation request is sent only after the restaurant
explicitly confirms.

**Structure Decision**: Keep the HTTP adapter in `restaurant.py`, but put the
transactional rule in a service because it must lock the reservation, verify ownership,
apply the cutoff, call the simulated refund exactly once and create the notification
before commit. `Refund` and `Notification` are explicit records because idempotency and
the required audit trail cannot be inferred reliably from reservation status alone.
No background delivery mechanism is introduced; email is sent after commit using the
existing mail backend.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Add refund/payment state before real US-56 | US-38 must distinguish paid orders and record a refund while using a simulated adapter | Treating every order as paid would violate US-38 S5 and make retry/idempotency untestable |

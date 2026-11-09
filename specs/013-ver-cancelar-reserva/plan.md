# Implementation Plan: View and Cancel Diner Reservation

**Feature**: `specs/013-ver-cancelar-reserva` | **Date**: 2026-11-07 | **Spec**: [spec.md](spec.md) | **US**: US-23, US-25 | **Sprint**: 4

**Input**: Feature specification from `/specs/013-ver-cancelar-reserva/spec.md`

**Note**: Project template (overrides Spec Kit's default). Write this plan in English; `spec.md` stays in Spanish. Name domain concepts with the glossary in `AGENTS.md`. Project-wide values below are fixed by the ADRs in `docs/decisions/`; change them only with a new ADR.

## Summary

Add a diner-facing reservations section that lists only confirmed future reservations in
chronological order and opens the existing reservation projection as its detail. Add a
diner-owned cancellation operation that asks for explicit confirmation in the UI and
performs a transactional, timezone-aware state transition from `confirmed` to
`cancelled`. Reuse the existing `cancelled_at` column, order association, availability
queries and design-system components; no payment, refund, reservation editing or
cancelled-reservation detail is included.

## Technical Context

**Language/Version**: Python 3.12 (backend) · TypeScript (frontend)

**Primary Dependencies**: FastAPI, SQLAlchemy 2, Alembic, Pydantic · React, Vite, React Router, TanStack Query, openapi-fetch, the design system in `frontend/src/components/` (see `docs/design/README.md`)

**Storage**: PostgreSQL 17 in Docker (locally, in CI and on the production instance)

**Testing**: pytest against a real Postgres in `backend/tests/` · Vitest + Testing Library in `frontend/src/**/*.test.tsx`

**Target Platform**: Mobile-first web app: static SPA plus JSON API under `/api`

**Project Type**: Web application (backend + frontend)

**Performance Goals**: Only what the spec's success criteria state; the app never has more than one concurrent user

**Constraints**: Single AWS free-tier account; no new services, paid APIs or dependencies without justification

**Scale/Scope**: Add `GET /api/reservations/active` and
`DELETE /api/reservations/{reservation_id}` for the signed-in diner, response schemas
for active reservations and cancellation errors, a diner reservations page and route,
and acceptance tests. The cancellation service locks the diner's reservation,
rechecks ownership/status/deadline using `America/Argentina/Buenos_Aires`, sets
`status` and `cancelled_at` once, and commits the same transaction that makes the
reservation disappear from availability. An associated order is considered cancelled
through its reservation state, matching the existing order model contract.

**New dependencies**: None.

**Open clarifications**: None. The spec explicitly defers refunds to later sprints;
this plan does not add payment behavior. The existing domain rule that an order is
cancelled when its reservation is cancelled is reused, and no separate order status
transition is invented.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Pass |
| --- | --- | --- |
| I. Backlog-bound scope | Builds only US-23/US-25; no payment, refund, editing, restaurant cancellation, caching, queues, workers or flags | [x] |
| II. Spec before code | The requested feature spec has no `[NEEDS CLARIFICATION]` markers; deferred refunds remain out of scope | [x] |
| III. Every scenario tested | All 11 acceptance scenarios and relevant cancellation edge cases are mapped below; existing database constraints preserve reservation invariants | [x] |
| IV. Humans own AI output | Reuses existing reservation, order, auth, availability and design-system patterns | [x] |
| V. Simple, cheap, conventional | No new dependency, service or migration; standard FastAPI transaction and React Query flow | [x] |

## Acceptance Scenario → Test Map

| Scenario | Test | Layer |
| --- | --- | --- |
| US-23 S1 — lists a future confirmed reservation | `backend/tests/test_diner_reservations.py::test_us23_s1_lists_active_reservation` | Backend |
| US-23 S2 — shows restaurant, date, time, table and party size | `frontend/src/pages/DinerReservationsPage.test.tsx` › `US-23 S2 shows reservation detail` | Frontend |
| US-23 S3 — orders reservations nearest first | `backend/tests/test_diner_reservations.py::test_us23_s3_orders_active_reservations` | Backend |
| US-23 S4 — reports no active reservations | `frontend/src/pages/DinerReservationsPage.test.tsx` › `US-23 S4 reports no active reservations` | Frontend |
| US-23 S5 — excludes a cancelled reservation | `backend/tests/test_diner_reservations.py::test_us23_s5_excludes_cancelled_reservation` | Backend |
| US-25 S1 — asks for cancellation confirmation | `frontend/src/pages/DinerReservationsPage.test.tsx` › `US-25 S1 asks before cancelling` | Frontend |
| US-25 S2 — dismissal keeps reservation active | `frontend/src/pages/DinerReservationsPage.test.tsx` › `US-25 S2 keeps reservation after dismissal` | Frontend |
| US-25 S3 — confirmation cancels reservation | `backend/tests/test_diner_reservations.py::test_us25_s3_cancels_owned_reservation` | Backend |
| US-25 S4 — reports successful cancellation | `frontend/src/pages/DinerReservationsPage.test.tsx` › `US-25 S4 reports successful cancellation` | Frontend |
| US-25 S5 — rejects cancellation inside 45 minutes | `backend/tests/test_diner_reservations.py::test_us25_s5_rejects_cancellation_inside_deadline` | Backend |
| US-25 S6 — associated order is cancelled with reservation | `backend/tests/test_diner_reservations.py::test_us25_s6_cancels_associated_order_with_reservation` | Backend |
| US-25 S6 — cancelled table is available again | `backend/tests/test_diner_reservations.py::test_us25_s6_releases_table_availability` | Backend |
| Edge — repeated cancellation is idempotent | `backend/tests/test_diner_reservations.py::test_us25_edge_repeated_cancellation_is_idempotent` | Backend |
| Edge — another diner's reservation is hidden | `backend/tests/test_diner_reservations.py::test_us25_edge_rejects_foreign_reservation` | Backend |
| Edge — already cancelled reservation reports its state | `backend/tests/test_diner_reservations.py::test_us25_edge_reports_already_cancelled` | Backend |
| Edge — expired session leaves reservation unchanged | `frontend/src/api/reservations.test.ts` › `does not report cancellation success on 401` | Frontend |

## Project Structure

### Documentation (this feature)

```text
specs/013-ver-cancelar-reserva/
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
├── app/api/reservation.py              # ~ active list and cancellation endpoints
├── app/schemas/reservation.py          # ~ diner list/cancellation response shapes
├── app/services/reservations.py        # + ownership, deadline and cancellation transition
└── tests/test_diner_reservations.py    # + acceptance and edge-case tests
frontend/
├── src/api/openapi.json, schema.d.ts   # ~ `make api-types`
├── src/api/reservations.ts             # ~ active list and cancellation client methods
├── src/pages/DinerReservationsPage.tsx # + with module CSS and acceptance tests
└── src/router.tsx                      # ~ `/reservas`
```

**Structure Decision**: Extend the existing reservation API and client rather than
creating a second reservation resource. Put the state transition in a small service
because it needs a row lock, deadline calculation, status handling and order
association while the router remains an HTTP adapter. The page uses existing
`Card`, `Modal`, `Button`, `StatusPill`, toast, session and React Query patterns.
No migration is planned because `status`, `cancelled_at`, the reservation
exclusion constraint and the order relationship already exist.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|

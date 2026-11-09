# Implementation Plan: Bloquear Horarios No Disponibles

**Feature**: `specs/016-bloqueo-horarios` | **Date**: 2026-11-08 | **Spec**: [spec.md](spec.md) | **US**: US-32 | **Sprint**: 4

**Input**: Feature specification from `/specs/016-bloqueo-horarios/spec.md`

## Summary

US-32 lets a restaurant close a whole date or a time range without touching its weekly shifts. A new `Closure` entity stores the local date and an optional local time range; the existing availability rules read it, so blocked starts disappear from the diner flow and cannot be confirmed. Creating a closure first answers with the confirmed reservations it would cancel; only a second request that acknowledges that list applies it, cancelling the reservations, freeing their tables, discarding their carts, treating their orders as cancelled (spec 009, P12) and mailing each affected diner. The restaurant can list current closures and delete them; deleting never restores cancelled reservations.

## Technical Context

**Language/Version**: Python 3.12 (backend) · TypeScript (frontend)

**Primary Dependencies**: FastAPI, SQLAlchemy 2, Alembic, Pydantic · React, Vite, React Router, TanStack Query, openapi-fetch, the design system in `frontend/src/components/` (see `docs/design/README.md`)

**Storage**: PostgreSQL 17 in Docker (locally, in CI and on the production instance)

**Testing**: pytest against a real Postgres in `backend/tests/` · Vitest + Testing Library in `frontend/src/**/*.test.tsx`

**Target Platform**: Mobile-first web app: static SPA plus JSON API under `/api`

**Project Type**: Web application (backend + frontend)

**Performance Goals**: Only what the spec's success criteria state; the app never has more than one concurrent user

**Constraints**: Single AWS free-tier account; no new services, paid APIs or dependencies; dates and times are evaluated in `America/Argentina/Buenos_Aires`

**Scale/Scope**: One table (`closures`), one model, one service, one router with three endpoints, one restaurant page and one route; changes to the existing availability service and restaurant dashboard. No new dependency.

**New dependencies**: None.

**Open clarifications**: The spec has no `[NEEDS CLARIFICATION]` markers, but four team proposals are still pending PO validation. This plan records them as explicit, reviewable assumptions (details in [research.md](research.md)):

- **FR-007 — diner notification**: implemented as a mail with restaurant, date and time. A failed send is logged and never undoes the closure.
- **Partially past range**: a range for today whose start is earlier than the current Buenos Aires time is rejected; a whole-day closure for today is allowed.
- **Reservations crossing the range border**: a reservation is affected when its block overlaps the closure, even if it starts before or ends after the range.
- **Reservation created between warning and confirmation**: the confirmation carries the acknowledged reservation ids; if the current list differs, the API answers with a fresh warning instead of applying.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Pass |
| --- | --- | --- |
| I. Backlog-bound scope | Builds only US-32; no recurring closures, refunds (US-38/US-56) or individual restaurant cancellations; no queues, workers or speculative abstractions | [x] |
| II. Spec before code | Spec exists; every open team proposal is recorded as an explicit assumption and listed for PO validation in `specs/README.md` | [x] |
| III. Every scenario tested | Every acceptance scenario of US-32 appears in the test map below; the closure table enforces its own invariants | [x] |
| IV. Humans own AI output | Reuses the existing reservation, availability, mail, auth and design-system patterns; the new service is small and follows the shape of `services/orders.py` | [x] |
| V. Simple, cheap, conventional | One table, three endpoints and one page; no new dependency or service | [x] |

## Acceptance Scenario → Test Map

| Scenario | Test | Layer |
| --- | --- | --- |
| US-32 S1 — a whole-day closure hides every slot | `backend/tests/test_closures.py::test_us32_s1_whole_day_closure_hides_every_slot` | Backend |
| US-32 S2 — a time range hides the overlapping slots | `backend/tests/test_closures.py::test_us32_s2_time_range_closure_hides_overlapping_slots` | Backend |
| US-32 S3 — the affected reservations are listed before applying | `backend/tests/test_closures.py::test_us32_s3_warns_about_affected_reservations` · `frontend/src/pages/RestaurantClosuresPage.test.tsx` › `US-32 S3 shows the affected reservations before applying` | Backend + Frontend |
| US-32 S4 — confirming applies the closure and cancels those reservations | `backend/tests/test_closures.py::test_us32_s4_confirmation_cancels_affected_reservations` · `frontend/src/pages/RestaurantClosuresPage.test.tsx` › `US-32 S4 applies the closure after confirming` | Backend + Frontend |
| US-32 S5 — desisting creates nothing and keeps the reservations | `backend/tests/test_closures.py::test_us32_s5_declining_keeps_reservations_and_creates_nothing` · `frontend/src/pages/RestaurantClosuresPage.test.tsx` › `US-32 S5 desisting keeps the reservations` | Backend + Frontend |
| US-32 S6 — invalid ranges and past dates are rejected | `backend/tests/test_closures.py::test_us32_s6_rejects_invalid_ranges_and_past_dates` · `frontend/src/pages/RestaurantClosuresPage.test.tsx` › `US-32 S6 rejects an end before the start` | Backend + Frontend |
| US-32 S7 — the restaurant sees current closures and removes one | `backend/tests/test_closures.py::test_us32_s7_lists_and_deletes_restaurant_closures` · `frontend/src/pages/RestaurantClosuresPage.test.tsx` › `US-32 S7 lists current closures and removes one` | Backend + Frontend |
| US-32 S8 — removing a closure offers the shifts again | `backend/tests/test_closures.py::test_us32_s8_deleting_a_closure_restores_availability` | Backend |

Edge cases covered by dedicated tests in `backend/tests/test_closures.py`:

| Edge case | Test |
| --- | --- |
| Overlapping closures block their union | `test_us32_edge_overlapping_closures_block_the_union` |
| A reservation crossing the range border is affected | `test_us32_edge_reservation_crossing_the_range_is_affected` |
| A new reservation between warning and confirmation re-warns | `test_us32_edge_new_reservation_between_warning_and_confirmation_rewarns` |
| A repeated request applies once | `test_us32_edge_repeated_request_applies_once` |
| A restaurant only sees and removes its own closures | `test_us32_edge_restaurant_only_sees_and_removes_its_closures` |
| A closure outside the shifts is saved with no affected reservations | `test_us32_edge_closure_outside_shifts_is_saved_without_affected_reservations` |
| Cancelling a reservation releases its table and its order counts as cancelled | `test_us32_edge_cancelled_reservation_releases_table_and_order` |
| A diner cannot confirm a start inside a closure | `test_us32_edge_blocked_start_cannot_be_confirmed` |
| A mail failure does not undo the closure | `test_us32_edge_mail_failure_does_not_undo_the_closure` |
| A partially past range for today is rejected but the whole day is allowed | `test_us32_edge_partial_range_started_today_is_rejected` |
| Changing the shifts keeps the closures | `test_us32_edge_changing_shifts_keeps_closures` |

## Project Structure

### Documentation (this feature)

```text
specs/016-bloqueo-horarios/
├── spec.md              # Spanish, validated by the PO
├── plan.md              # This file (/speckit-plan)
├── research.md          # Phase 0 output (/speckit-plan)
├── data-model.md        # Phase 1 output: entity, constraints, rules (/speckit-plan)
├── quickstart.md        # Phase 1 output: how to try the feature locally (/speckit-plan)
├── contracts/           # Phase 1 output: endpoints, payloads, status codes (/speckit-plan)
│   └── closures-api.md
└── tasks.md             # /speckit-tasks output
```

### Source Code (repository root)

```text
backend/
├── app/api/closure.py                  # + restaurant closure router
├── app/api/__init__.py                 # ~ mount the router under /api
├── app/models/closure.py               # + Closure model
├── app/models/__init__.py              # ~ import the model for Alembic
├── app/schemas/closure.py              # + request, response and warning models
├── app/services/closures.py            # + validation, warning, cancellation, listing, mail
├── app/services/availability.py        # ~ read closures in day/slot/confirmation rules
├── migrations/versions/[generated].py  # + `make migration m="add closures"`
└── tests/test_closures.py              # + US-32 acceptance and edge tests

frontend/
├── src/api/closures.ts                 # + typed calls and the warning error
├── src/api/openapi.json, schema.d.ts   # ~ `make api-types`
├── src/pages/RestaurantClosuresPage.tsx        # + block form, warning modal, list
├── src/pages/RestaurantClosuresPage.module.css # + page styles
├── src/pages/RestaurantClosuresPage.test.tsx   # + UI acceptance tests
├── src/pages/home/RestaurantHome.tsx   # ~ dashboard card linking to the page
└── src/router.tsx                      # ~ /restaurante/bloqueos
```

**Structure Decision**: The feature follows the existing restaurant-configuration layout. `Closure` is its own model and table because a closure is not a shift and not a reservation state. The availability rules stay in `services/availability.py` (the single source of "when can a table be booked"), while creation, warning, cancellation and mail live in `services/closures.py`. The restaurant route segment is Spanish (`/api/restaurante/bloqueos`), consistent with `/restaurante/horarios`, `/restaurante/mesas` and `/restaurante/cancelaciones`; model, service, schema and payload names stay in English per the glossary.

## Complexity Tracking

No constitution violations. The design reuses the existing reservation status transition, availability queries, mail service and 409-with-details pattern already used by the table inventory (US-10 S3). No additional table, worker, queue or dependency is introduced.

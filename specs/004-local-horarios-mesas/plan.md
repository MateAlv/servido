# Implementation Plan: Restaurant profile, opening hours and table capacity

**Branch**: `004-local-horarios-mesas` | **Date**: 2026-10-24 | **Spec**: [spec.md](spec.md) | **US**: US-6, US-8, US-10 | **Sprint**: 2

**Input**: Feature specification from `/specs/004-local-horarios-mesas/spec.md`

## Summary

Extend the authenticated restaurant account with its public profile, optional
profile photo, verified address coordinates, weekly opening shifts, and grouped
table inventory. Use the existing FastAPI/PostgreSQL API and React SPA. Validate
shift intervals and table quantities at the API/database boundary, persist the
photo URL and geocoded coordinates returned by Nominatim, and expose grouped
table capacity in a transaction-safe service that can reject reducing group
quantity needed by confirmed reservations.

The plan covers only US-6, US-8 and US-10. Reservation creation, menu
management, and other backlog stories remain out of scope. The existing
restaurant discovery/map response is extended only to expose the persisted
`foto_url` required by US-6; discovery behavior itself is not redesigned.

## Technical Context

**Language/Version**: Python 3.12 · TypeScript

**Primary Dependencies**: FastAPI, SQLAlchemy 2, Alembic, Pydantic, pytest,
PostgreSQL 17 · React, React Router, TanStack Query, typed OpenAPI client,
Leaflet/OpenStreetMap, Vitest and Testing Library

**Storage**: PostgreSQL 17 in Docker; extend `restaurantes` and add tables for
opening shifts and grouped table inventory through Alembic migrations

**Testing**: pytest against real PostgreSQL for API, database constraints and
transaction behavior, with a reservation conflict-check stub/mock for US-10;
Vitest + Testing Library for UI-only form, photo URL preview, map-photo and
geocoding-preview scenarios

**Target Platform**: Mobile-first React SPA plus JSON API under `/api`

**Project Type**: Web application (backend + frontend)

**Performance Goals**: Only the spec success criteria; one geocoding request
when an address is saved, never on restaurant page views

**Constraints**: Invalid input returns 400; unauthenticated requests return
401; non-restaurant accounts return 403; missing restaurants return 404;
conflicts with confirmed reservations return 409 or an explicit warning flow;
coordinates are timezone-independent decimals; weekly shifts use local
restaurant time; no secrets or new external paid services

**Scale/Scope**: One restaurant account per restaurant and the sprint-2
configuration flows for US-6, US-8 and US-10. No scaling, queues, workers,
caching, reservation creation, or order functionality.

**Open clarifications**: None are marked in the feature spec. The existing
ADR 0003 resolves the geocoder choice: Nominatim with an identifying
User-Agent, at most one request per second, and geocoding only on save.
Confirmed-reservation conflict handling is represented by the replaceable
reservation conflict-check stub in
`contracts/restaurant-configuration-api.md`; it reports group capacity and
consumed quantity, never a physical table identifier. Reservation creation
belongs to the later reservation feature.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Pass |
| --- | --- | --- |
| I. Backlog-bound scope | Implements only US-6, US-8 and US-10; no speculative reservation or menu feature | Yes |
| II. Spec before code | Uses the validated 004 spec and ADR 0003 for the geocoder; no unresolved clarification affects the design | Yes |
| III. Every scenario tested | Maps all 11 acceptance scenarios and the capacity concurrency edge case to automated tests | Yes |
| IV. Humans own AI output | Uses the existing conventional API, models, migrations and design system | Yes |
| V. Simple, cheap, conventional | Reuses FastAPI/PostgreSQL/React and the already accepted Nominatim integration; adds no dependency or paid service | Yes |

## Acceptance Scenario → Test Map

| Scenario | Planned test | Layer |
| --- | --- | --- |
| US-6 S1 — profile information, including its photo URL, is persisted and queryable | `backend/tests/test_restaurant_profile.py::test_us6_s1_profile_information_is_saved_and_available`; `frontend/src/pages/RestaurantProfilePage.test.tsx` › `US-6 S1 saves and previews foto_url`; map component test for `US-6 S1 displays foto_url` | Backend + frontend |
| US-6 S2 — missing `nombre` returns 400 | `backend/tests/test_restaurant_profile.py::test_us6_s2_name_is_required` | Backend |
| US-6 S3 — valid address is geocoded and previewed before save | `frontend/src/pages/RestaurantProfilePage.test.tsx` › `US-6 S3 previews the geocoded location before saving`, plus geocoder client contract test | Frontend + contract |
| US-6 S4 — unlocatable address is reported and not saved | `backend/tests/test_restaurant_profile.py::test_us6_s4_unresolved_address_is_rejected_without_saving` | Backend |
| US-8 S1 — one or more shifts are saved for a weekday | `backend/tests/test_opening_hours.py::test_us8_s1_opening_shifts_are_saved` | Backend |
| US-8 S2 — overlaps and reversed intervals are rejected | `backend/tests/test_opening_hours.py::test_us8_s2_invalid_shift_intervals_are_rejected` and `test_us8_edge_shifts_crossing_midnight_follow_validation_rule` | Backend |
| US-8 S3 — inactive weekday offers no reservation hours | `backend/tests/test_opening_hours.py::test_us8_s3_inactive_weekday_has_no_opening_shifts` | Backend |
| US-10 S1 — an available quantity slot in a group is eligible only when its capacity is at least the party size | `backend/tests/test_table_inventory.py::test_us10_s1_available_table_with_sufficient_capacity_is_selectable` | Backend |
| US-10 S2 — unavailable groups are excluded from group-quantity availability | `backend/tests/test_table_inventory.py::test_us10_s2_unavailable_table_groups_are_excluded` | Backend |
| US-10 S3 — reducing group quantity needed by confirmed reservations warns before mutation | `backend/tests/test_table_inventory.py::test_us10_s3_reducing_group_quantity_returns_conflict_without_mutation` using the reservation conflict stub | Backend |
| Edge — table updates and reservation confirmation do not consume the same group quantity twice | `backend/tests/test_table_inventory.py::test_us10_edge_table_update_is_transaction_safe` using the reservation conflict stub | Backend/database |

## Project Structure

### Documentation (this feature)

```text
specs/004-local-horarios-mesas/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
   ├── restaurant-configuration-api.md
   └── geocoding.md
```

### Source Code (repository root)

```text
backend/
├── app/api/restaurant.py                 # authenticated profile, shifts and tables endpoints
├── app/api/geocoding.py                 # Nominatim adapter boundary, if kept as API service
├── app/models/restaurant.py              # profile fields and coordinates
├── app/models/opening_shift.py           # weekly shifts
├── app/models/table_inventory.py         # grouped table capacity
├── app/models/__init__.py                # import new models for Alembic
├── app/schemas/restaurant.py             # request/response schemas
├── app/schemas/opening_hours.py          # shift schemas
├── app/schemas/table_inventory.py        # table group schemas
├── app/services/geocoding.py             # Nominatim request and result validation
├── app/services/opening_hours.py         # overlap and interval validation
├── app/services/table_inventory.py       # group-quantity selection and conflict transaction
├── migrations/versions/003_restaurant_configuration.py
└── tests/
   ├── test_restaurant_profile.py
   ├── test_opening_hours.py
   └── test_table_inventory.py             # uses reservation conflict-check stub
frontend/
├── src/pages/RestaurantProfilePage.tsx  # US-6 configuration flow
├── src/pages/OpeningHoursPage.tsx       # US-8 configuration flow
├── src/pages/TableInventoryPage.tsx      # US-10 configuration flow
├── src/api/openapi.json, schema.d.ts     # regenerated from the API
└── src/pages/*.test.tsx                  # UI-only scenarios
```

**Structure Decision**: Keep the existing single FastAPI backend and React
frontend. Add focused resource modules and services rather than a generic
configuration framework. The existing restaurant registration route remains
the account-creation surface; these flows update the authenticated restaurant
configuration after registration.

## Complexity Tracking

No constitution violations. No additional complexity justification is needed.

## Phase 0 — Research

See [research.md](research.md) for the decisions on geocoding, time intervals,
PostgreSQL constraints, authenticated ownership, and transaction handling.

## Phase 1 — Design

See [data-model.md](data-model.md) for entities and invariants,
[contracts/restaurant-configuration-api.md](contracts/restaurant-configuration-api.md)
for HTTP contracts, [contracts/geocoding.md](contracts/geocoding.md) for the
Nominatim boundary, and [quickstart.md](quickstart.md) for validation commands.

## Post-design Constitution Check

| Principle | Result |
| --- | --- |
| I. Backlog-bound scope | Pass: all artifacts are limited to US-6, US-8 and US-10. |
| II. Spec before code | Pass: design decisions trace to `spec.md` or ADR 0003; no open clarification remains. |
| III. Every scenario tested | Pass: every acceptance scenario and the concurrency edge case has a named automated test. |
| IV. Humans own AI output | Pass: the design uses small, inspectable modules and explicit contracts. |
| V. Simple, cheap, conventional | Pass: no new dependency, service, worker, cache, or infrastructure resource is proposed. |

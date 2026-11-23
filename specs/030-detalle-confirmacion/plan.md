# Implementation Plan: Reservation Confirmation Details

**Feature**: `specs/030-detalle-confirmacion` | **Date**: 2026-11-22 | **Spec**: [spec.md](spec.md) | **US**: US-54 | **Sprint**: 6

**Input**: Feature specification from `/specs/030-detalle-confirmacion/spec.md`

**Note**: Project template (overrides Spec Kit's default). Write this plan in English; `spec.md` stays in Spanish. Name domain concepts with the glossary in `AGENTS.md`. Project-wide values below are fixed by the ADRs in `docs/decisions/`; change them only with a new ADR.

## Summary

Extend the existing diner reservation confirmation projection with the restaurant address and
the reservation identifier needed by the confirmation receipt. After a successful reservation
commit, send one confirmation email containing the required local-time details; email failures
are logged without rolling back the confirmed reservation or hiding its on-screen receipt. Reuse
the existing `request_id` idempotency behavior, active-reservation endpoint, mail backends and
design-system confirmation screens. Update the reservation and active-list acceptance coverage
so failed confirmations send no mail and successful confirmations appear immediately as
confirmed.

## Technical Context

**Language/Version**: Python 3.12 (backend) · TypeScript (frontend)

**Primary Dependencies**: FastAPI, SQLAlchemy 2, Alembic, Pydantic · React, Vite, React Router, TanStack Query, openapi-fetch, the design system in `frontend/src/components/` (see `docs/design/README.md`)

**Storage**: PostgreSQL 17 in Docker (locally, in CI and on the production instance)

**Testing**: pytest against a real Postgres in `backend/tests/` · Vitest + Testing Library in `frontend/src/**/*.test.tsx`

**Target Platform**: Mobile-first web app: static SPA plus JSON API under `/api`

**Project Type**: Web application (backend + frontend)

**Performance Goals**: Only what the spec's success criteria state; the app never has more than one concurrent user

**Constraints**: Single AWS free-tier account; no new services, paid APIs or dependencies without justification

**Scale/Scope**: Extend `POST /api/reservations` and the shared reservation projection with the
restaurant address and confirmation identifier; add the confirmation email builder and post-commit
send path; update the confirmation receipt and active reservations UI; regenerate the OpenAPI
contract and TypeScript types; add US-54 backend and frontend acceptance tests. Existing
`GET /api/reservations/active` remains the source for the immediately confirmed reservation in
«Mis reservas». No push, SMS, WhatsApp, calendar file, reservation editing or new notification
channel is included.

**New dependencies**: None.

**Open clarifications**: None. The spec proposes email plus the immediate on-screen receipt and
explicitly defines the required receipt fields and Buenos Aires timezone. A transient mail error
is treated as non-fatal after the reservation transaction commits, as required by the edge case.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Pass |
| --- | --- | --- |
| I. Backlog-bound scope | Builds only US-54; no push/SMS/WhatsApp/calendar, editing, queues, workers, caching or speculative abstractions | [x] |
| II. Spec before code | `spec.md` defines US-54, its scenarios, requirements and proposed decisions; no open clarification affects this plan | [x] |
| III. Every scenario tested | All four acceptance scenarios and the listed idempotency/mail-failure edges are mapped below; existing reservation constraints remain in force | [x] |
| IV. Humans own AI output | Reuses the existing reservation projection, `request_id`, mail service, confirmation step and active-reservation query | [x] |
| V. Simple, cheap, conventional | No new dependency, service or infrastructure; standard post-commit mail handling and generated API types | [x] |

## Acceptance Scenario → Test Map

| Scenario | Test | Layer |
| --- | --- | --- |
| US-54 S1 — successful confirmation emits the required email details | `backend/tests/test_reservation.py::test_us54_s1_confirmation_sends_email_details` | Backend |
| US-54 S2 — confirmation screen shows the complete receipt | `frontend/src/pages/ReservationPage.test.tsx` › `US-54 S2 shows the complete confirmation receipt` | Frontend |
| US-54 S3 — confirmed reservation appears in active reservations | `backend/tests/test_reservation.py::test_us54_s3_confirmed_reservation_is_active` and `frontend/src/pages/DinerReservationsPage.test.tsx` › `US-54 S3 shows confirmed reservation details` | Backend + frontend |
| US-54 S4 — rejected confirmation creates no confirmed reservation and sends no email | `backend/tests/test_reservation.py::test_us54_s4_rejected_confirmation_sends_no_email` | Backend |
| Edge — repeated confirmation sends one email and creates one reservation | `backend/tests/test_reservation.py::test_us54_edge_duplicate_confirmation_is_idempotent` | Backend |
| Edge — mail failure leaves the confirmed reservation and receipt available | `backend/tests/test_reservation.py::test_us54_edge_mail_failure_keeps_reservation_confirmed` | Backend |
| Edge — confirmation details use Buenos Aires local date and time | `backend/tests/test_reservation.py::test_us54_edge_email_uses_buenos_aires_time` | Backend |

## Project Structure

### Documentation (this feature)

```text
specs/030-detalle-confirmacion/
├── spec.md              # Spanish, validated by the PO
├── plan.md              # This file (/speckit-plan)
├── research.md          # Phase 0 output (/speckit-plan)
├── data-model.md        # Phase 1 output: entities, fields, constraints (/speckit-plan)
├── quickstart.md        # Phase 1 output: how to try the feature locally (/speckit-plan)
├── contracts/
│   └── reservations-confirmation-api.md # Phase 1 API/UI contract
└── tasks.md             # /speckit-tasks output
```

### Source Code (repository root)

```text
backend/
├── app/api/reservation.py              # ~ confirmation mail after successful commit
├── app/schemas/reservation.py          # ~ address in reservation projection
├── app/services/mail.py                # ~ confirmation email builder
└── tests/test_reservation.py           # ~ US-54 acceptance and edge tests
frontend/
├── src/api/openapi.json, schema.d.ts   # ~ `make api-types`
├── src/api/reservations.ts             # ~ typed confirmation projection remains compatible
├── src/pages/reservation/ConfirmedStep.tsx # ~ complete receipt fields
├── src/pages/ReservationPage.test.tsx  # ~ confirmation receipt acceptance test
└── src/pages/DinerReservationsPage.test.tsx # ~ active confirmed details acceptance test
```

**Structure Decision**: Extend the existing reservation resource and mail service. No new
reservation model or migration is needed: the reservation already stores the unique `request_id`,
assigned table group, UTC timestamps and confirmed status; the restaurant already stores
`direccion`; and the existing mail outbox supports deterministic acceptance tests. The router
commits before sending mail so delivery errors cannot undo a valid booking.

## Complexity Tracking

No constitution violations.

## Validation

US-54 validation is complete. The six focused backend tests and 49 focused frontend tests
pass. Manual verification with `make up-local` confirmed the complete on-screen receipt,
immediate appearance as «Confirmada» in «Mis reservas», and one console email containing all
confirmation details in Buenos Aires local time. The two timeouts observed while running the
complete Vitest suite are pre-existing and unrelated to US-54.

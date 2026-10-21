# Implementation Plan: Diner account access

**Feature**: `specs/001-acceso-comensal` | **Date**: 2026-10-19 | **Spec**: [spec.md](spec.md) | **US**: US-1, US-3 | **Sprint**: 1

**Input**: Feature specification from `/specs/001-acceso-comensal/spec.md`

## Summary

Implement diner registration and login for US-1 and US-3. Add SQLAlchemy 2
models for the requested `comensales` and `restaurantes` tables, using
`scripts/sql/servido.sql` as a constrained schema reference while applying
repository conventions: UUID identifiers, UTC-aware timestamps, named
constraints, and Argon2 password hashes. Expose only the diner authentication
API; restaurant behavior remains out of scope.

## Technical Context

**Language/Version**: Python 3.12 (backend) · TypeScript (frontend)

**Primary Dependencies**: FastAPI, SQLAlchemy 2, Alembic, Pydantic,
`argon2-cffi`, `PyJWT` · React, Vite, React Router, TanStack Query, openapi-fetch,
the existing design system

**Storage**: PostgreSQL 17 in Docker; this feature adds only `comensales` and
`restaurantes`

**Testing**: pytest against real PostgreSQL in `backend/tests/` · Vitest +
Testing Library for UI-only scenarios

**Target Platform**: Mobile-first web app: static SPA plus JSON API under `/api`

**Project Type**: Web application (backend + frontend)

**Performance Goals**: Only the spec's success criteria; no new throughput or
scaling target

**Constraints**: 400 for invalid input, 401 for generic credential failure,
409 for duplicate email; no plaintext password in storage, logs, responses, or
visible password fields; login returns a one-hour HS256 JWT in JSON, using a
secret from an environment variable and no cookies

**Scale/Scope**: US-1 registration and US-3 login for diners; schema-only
restaurant table; no email verification, recovery, Google login, rate limiting,
restaurant auth, reservations, or orders

**New dependencies**: Add `argon2-cffi` with `uv add argon2-cffi` for mandatory
non-reversible Argon2 password hashing and add `PyJWT` with `uv add PyJWT` for
the required HS256 JWT. These are focused local libraries, not external
identity providers or services.

**Open clarifications**: None affecting this feature. The spec records the
team's decisions on password policy, email-as-username, duplicate emails, and
independent diner/restaurant accounts.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Pass |
| --- | --- | --- |
| I. Backlog-bound scope | Builds only US-1/US-3; no caching, queues, workers, flags or speculative abstractions | Yes |
| II. Spec before code | Uses the validated `001-acceso-comensal` spec; no unresolved clarification affects the plan | Yes |
| III. Every scenario tested | Maps every acceptance scenario to automated tests; uniqueness and format constraints are database-backed | Yes |
| IV. Humans own AI output | Small conventional model/API/migration design is reviewable by the team | Yes |
| V. Simple, cheap, conventional | Uses the existing FastAPI/PostgreSQL/React stack and adds only the justified `argon2-cffi` library | Yes |

## Acceptance Scenario → Test Map

| Scenario | Test | Layer |
| --- | --- | --- |
| US-1 S1 — required registration fields are identified | `frontend/src/pages/RegisterPage.test.tsx` › `US-1 S1 identifies required fields` | Frontend |
| US-1 S2 — missing required fields are rejected | `backend/tests/test_auth.py::test_us1_s2_rejects_missing_fields` | Backend |
| US-1 S3 — invalid email/password preserves input and explains correction, including exactly 7 and 129 characters | `backend/tests/test_auth.py::test_us1_s3_rejects_invalid_registration` and `frontend/src/pages/RegisterPage.test.tsx` › `US-1 S3 preserves entered email` | Backend + frontend |
| US-1 S4 — valid registration creates one account | `backend/tests/test_auth.py::test_us1_s4_creates_diner_account_once` | Backend |
| US-3 S1 — login requests credentials | `frontend/src/pages/LoginPage.test.tsx` › `US-3 S1 requests credentials` | Frontend |
| US-3 S2 — malformed credentials are rejected before login | `backend/tests/test_auth.py::test_us3_s2_rejects_invalid_credentials` | Backend |
| US-3 S3 — valid credentials grant access through a one-hour HS256 JWT in JSON | `backend/tests/test_auth.py::test_us3_s3_logs_in_diner_statelessly` | Backend |
| US-3 S4 — wrong credentials use one generic message | `backend/tests/test_auth.py::test_us3_s4_uses_generic_credential_error` | Backend |
| US-3 S5 — password is hidden while typing | `frontend/src/pages/LoginPage.test.tsx` › `US-3 S5 hides password while typing` | Frontend |
| Edge — duplicate email does not create a second account | `backend/tests/test_auth.py::test_us1_edge_rejects_duplicate_email` | Backend |
| Edge — normalization handles case and surrounding spaces | `backend/tests/test_auth.py::test_us1_edge_normalizes_email` | Backend |
| Edge — double submission is unique | `backend/tests/test_auth.py::test_us1_edge_prevents_duplicate_submission` | Backend |
| Edge — special and maximum-length passwords are supported | `backend/tests/test_auth.py::test_us1_edge_accepts_supported_password` | Backend |

## Project Structure

### Documentation (this feature)

```text
specs/001-acceso-comensal/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/auth-api.md
```

### Source Code (repository root)

```text
backend/
├── app/api/auth.py                  # + diner registration/login routes
├── app/models/diner.py             # + Diner model
├── app/models/restaurant.py        # + schema-only Restaurant model
├── app/models/__init__.py          # ~ import both models for Alembic
├── app/schemas/auth.py             # + request/response schemas
├── app/services/auth.py            # + password and credential rules
├── migrations/versions/[generated].py # + reviewed Alembic migration
└── tests/test_auth.py              # + acceptance and edge-case tests
frontend/
├── src/api/openapi.json, schema.d.ts # ~ `make api-types`
├── src/pages/RegisterPage.tsx        # + registration form
├── src/pages/LoginPage.tsx            # + login form
├── src/router.tsx                     # ~ auth routes
└── src/pages/{Register,Login}Page.test.tsx # + UI-only acceptance tests
```

**Structure Decision**: Keep the existing backend/frontend monorepo. Models and
the migration remain in `backend`; API schemas/routes and authentication rules
follow the existing backend directories; forms and auth state use the existing
frontend structure. The restaurant model has no route or behavior in this
feature.

## Complexity Tracking

No constitution violations.

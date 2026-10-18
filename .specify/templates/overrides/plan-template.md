# Implementation Plan: [FEATURE]

**Feature**: `specs/[###-feature-name]` | **Date**: [DATE] | **Spec**: [spec.md](spec.md) | **US**: US-[N], US-[M] | **Sprint**: [N]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: Project template (overrides Spec Kit's default). Write this plan in English; `spec.md` stays in Spanish. Name domain concepts with the glossary in `AGENTS.md`. Project-wide values below are fixed by the ADRs in `docs/decisions/`; change them only with a new ADR.

## Summary

[Primary requirement and technical approach, in three to five sentences.]

## Technical Context

**Language/Version**: Python 3.12 (backend) · TypeScript (frontend)

**Primary Dependencies**: FastAPI, SQLAlchemy 2, Alembic, Pydantic · React, Vite, React Router, TanStack Query, openapi-fetch, the design system in `frontend/src/components/` (see `docs/design/README.md`)

**Storage**: PostgreSQL 17 (Amazon RDS in production, Docker locally and in CI)

**Testing**: pytest against a real Postgres in `backend/tests/` · Vitest + Testing Library in `frontend/src/**/*.test.tsx`

**Target Platform**: Mobile-first web app: static SPA plus JSON API under `/api`

**Project Type**: Web application (backend + frontend)

**Performance Goals**: Only what the spec's success criteria state; the app never has more than one concurrent user

**Constraints**: Single AWS free-tier account; no new services, paid APIs or dependencies without justification

**Scale/Scope**: [Endpoints, models and screens this feature adds]

**New dependencies**: [None | package — why the existing stack is not enough]

**Open clarifications**: [Each [NEEDS CLARIFICATION] in the spec and how this plan handles it: PO answer, or the explicit assumption taken]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Pass |
| --- | --- | --- |
| I. Backlog-bound scope | Builds only the spec's US; no caching, queues, workers, flags or speculative abstractions | [ ] |
| II. Spec before code | Spec validated by the PO; every open clarification answered or recorded as an explicit assumption | [ ] |
| III. Every scenario tested | Every acceptance scenario appears in the test map below; critical invariants enforced by database constraints | [ ] |
| IV. Humans own AI output | Design is small enough for a teammate to review and explain | [ ] |
| V. Simple, cheap, conventional | Uses only the standard stack; any new dependency or service is justified (ADR if architectural) | [ ] |

## Acceptance Scenario → Test Map

| Scenario | Test | Layer |
| --- | --- | --- |
| US-[N] S1 — [short description] | `backend/tests/test_[feature].py::test_us[N]_s1_[behavior]` | Backend |
| US-[N] S2 — [short description] | `frontend/src/pages/[Page].test.tsx` › `US-[N] S2 [behavior]` | Frontend |

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature-name]/
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
├── app/api/[resource].py               # + router; ~ app/api/__init__.py to mount it
├── app/models/[entity].py              # + model; ~ app/models/__init__.py to import it
├── app/schemas/[resource].py           # + request and response models
├── app/services/[name].py              # + only if business rules outgrow the router
├── migrations/versions/[generated].py  # + `make migration m="..."`
└── tests/test_[feature].py             # + acceptance tests
frontend/
├── src/api/openapi.json, schema.d.ts   # ~ `make api-types`
├── src/pages/[Page].tsx                # + with [Page].module.css and [Page].test.tsx
├── src/components/[Component].tsx      # + only if shared by several pages
└── src/router.tsx                      # ~ new routes
```

**Structure Decision**: [Confirm the files above and justify anything outside this layout.]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|

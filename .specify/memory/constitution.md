# Servido! Constitution

## Core Principles

### I. Backlog-Bound Scope

Servido! is a course MVP: build exactly what the backlog and its specs require, nothing more. It will never serve more than one concurrent user, so plans MUST NOT introduce scaling, caching, queues, background workers, microservices, feature flags or speculative abstractions. When two designs satisfy the acceptance scenarios, choose the simpler one. The product boundaries in `docs/product/README.md` (what Servido! is not and does not do) are binding.

### II. Spec Before Code

No implementation without a spec in `specs/` that the Product Owner has validated. Every task, commit and pull request traces to a spec and to US numbers. Open `[NEEDS CLARIFICATION]` items that affect the work MUST be resolved with the PO or recorded as an explicit, reviewable assumption; agents MUST NOT invent product behavior. When behavior changes, the spec changes first.

### III. Every Acceptance Scenario Is Tested (NON-NEGOTIABLE)

Each acceptance scenario of a spec has at least one automated test named after its US and scenario (`test_us<N>_s<M>_…`). Backend tests run against a real PostgreSQL database. Critical invariants (no double booking of a table and time slot, unique accounts, paid orders cannot be charged twice) are enforced by database constraints and covered by tests. CI MUST be green before merging.

### IV. Humans Own AI Output

The course workflow is: specify → orchestrate AI → validate → govern. AI agents generate most of the code, but a team member MUST understand, review and be able to defend every change. Code that nobody on the team can explain is not done. Each pull request records how AI was used (tool, model, key prompts, human changes), because the course evaluates that evidence every sprint.

### V. Simple, Cheap, Conventional

One FastAPI backend, one PostgreSQL database and one static React frontend, hosted on a single AWS free-tier account. Prefer the framework's standard way of doing things over custom infrastructure. New dependencies, external services or paid APIs need a written justification in the plan, and an ADR in `docs/decisions/` if they change the architecture.

## Technical Constraints

- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2, Alembic, PostgreSQL 17 (Amazon RDS in production), uv, ruff, pytest.
- **Frontend**: React, TypeScript and Vite (single-page app), React Router, TanStack Query, a typed client generated from the backend OpenAPI document, CSS Modules with the design tokens, Leaflet with OpenStreetMap.
- **API**: JSON under `/api`; 400 for invalid input, 401, 403, 404, 409 as described in `AGENTS.md`.
- **Language**: code and technical documents in English; everything user-facing and every `spec.md` in Spanish (Argentina). Domain names follow the glossary in `AGENTS.md`.
- **Data**: money as decimals, timezone-aware datetimes stored in UTC with business rules in `America/Argentina/Buenos_Aires`, passwords hashed with Argon2, no secrets in the repository.
- **UI**: mobile first and accessible.

## Development Workflow

- Per feature: spec → clarify (when needed) → plan → tasks → implement → converge, with Spec Kit.
- One short-lived branch per US, merged into `main` through a pull request with green CI and review by another team member.
- Conventional commits in English referencing the US (`feat(US-5): …`).
- Sprints last one week (Thursday to Wednesday) and end with a demo for the PO; work is planned to fit the sprint.

## Governance

This constitution overrides other practices. Amendments are proposed in a pull request that explains the reason, are approved by the team, and bump the version (MAJOR for removed or redefined principles, MINOR for new principles or sections, PATCH for wording). `AGENTS.md` holds the day-to-day guidance and MUST stay consistent with this document. Plans that violate a principle MUST justify it in their Complexity Tracking section or be simplified.

**Version**: 1.0.0 | **Ratified**: 2026-10-18 | **Last Amended**: 2026-10-18

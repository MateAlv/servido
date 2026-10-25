# AGENTS.md

Instructions for every AI coding agent working in this repository (Claude Code, Codex, Copilot, Antigravity, Gemini, Cursor and others). Humans: start with [README.md](README.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## What Servido! is

A web app for restaurant reservations with pre-ordered food. A diner books a table and picks dishes before leaving; the restaurant times the preparation so the food is ready on arrival. Two roles: **diner** (*comensal*) and **restaurant** (*restaurante*, one account per restaurant).

It is the group project (Grupo 3) for *Gestión del Desarrollo de Sistemas Informáticos* at FIUBA, 2C 2026: six students, six one-week Scrum sprints (Thursday to Wednesday), Spec-Driven Development, and most code written with AI agents. Final delivery: **2026-11-25**.

Before working on anything, know where the context lives:

| Need | Read |
| --- | --- |
| What to build for a feature | `specs/NNN-*/spec.md` and the US in [docs/product/backlog.md](docs/product/backlog.md) |
| Non-negotiable project principles | [.specify/memory/constitution.md](.specify/memory/constitution.md) |
| Product vision, personas, roles, glossary | [docs/product/README.md](docs/product/README.md) |
| Sprint plan, risks that constrain the code | [docs/product/plan.md](docs/product/plan.md) |
| Course rules (grading, AI policy, sprint deliverables) | [docs/catedra/](docs/catedra/) |
| Why the stack is what it is | [docs/decisions/](docs/decisions/) |
| How the platform fits together (diagrams) and how it is hosted | [docs/architecture/](docs/architecture/) and [infra/README.md](infra/README.md) |
| Visual identity, motion rules and the component catalog | [docs/design/README.md](docs/design/README.md), and `/diseno` in the running app |

## Ground rules

1. **Build only what the spec asks for.** This is a course MVP that will never have two concurrent users. No scaling, caching, queues, background workers, feature flags, generic frameworks or abstractions "for later". If a simpler solution satisfies the acceptance scenarios, use it.
2. **No spec, no code.** Every change traces to a spec in `specs/` and to US numbers. If the spec is ambiguous, contradicts the backlog, or has an open `[NEEDS CLARIFICATION]` that affects your task, stop and ask. Do not invent product behavior. Enabler work that serves many US (tooling, infrastructure, the design system) traces to an ADR or to `docs/design/` instead.
3. **Every acceptance scenario has an automated test**, named so it traces back to the spec (see [Tests](#tests)).
4. **A human must understand everything you produce.** Course rule: the team cannot deliver code it cannot explain. Keep changes small, prefer obvious code over clever code, and explain non-obvious choices in the PR.
5. **Cheap and simple infrastructure.** One AWS account on the Free plan, defined only in `infra/terraform` ([ADR 0008](docs/decisions/0008-aws-free-plan-hosting.md)). Every resource must be Free-plan eligible (see [infra/README.md](infra/README.md#free-plan-rules)); never enable AWS Organizations, Control Tower or IAM Identity Center. Do not add services, paid APIs or new dependencies without a reason in the PR (and an ADR if it changes the architecture).
6. **Never commit secrets** (`.env` files, keys, tokens). Configuration comes from environment variables.

## Language policy

- **English**: code, identifiers, comments, commit messages, PRs, `plan.md` / `tasks.md` / data models / contracts, ADRs.
- **Spanish (Argentina, with voseo: "Ingresá", "Reservá")**: everything a user sees (UI text, error messages shown in the UI, emails), `spec.md` files, `docs/product/`, `docs/catedra/`, `docs/design/` and `docs/architecture/`.

### Domain glossary

Use these English names in code. Add a row when a new domain concept appears. Exception (team decision, 21/10): the access API from specs 001 and 003 keeps its Spanish names (`/api/comensales`, `/api/restaurantes`, `nombre`, `id_comensal`…); do not rename it, and do not copy that style into new code.

| Spanish (specs, UI) | English (code) | Notes |
| --- | --- | --- |
| Comensal | `Diner` | Role `diner` |
| Restaurante / Responsable del restaurante | `Restaurant` | Role `restaurant`; one account is one restaurant |
| Cuenta | `Account` | |
| Reserva | `Reservation` | Holds a table; may or may not have an order |
| Pedido (anticipado) | `Order` | Dishes ordered for one reservation |
| Plato | `Dish` | |
| Categoría del plato | `DishCategory` | Entradas, principales, postres, bebidas… |
| Menú | `Menu` | |
| Turno | `Shift` | Opening period on a weekday, e.g. 12:00–15:00 |
| Horarios de atención | `OpeningHours` | The shifts of each weekday |
| Bloqueo de horario | `Closure` | Blocked date or time range |
| Mesa | `Table` | Stored as groups: capacity × count |
| Tipo de mesa (adentro, afuera, terraza) | `SeatingArea` | |
| Capacidad | `capacity` | |
| Concurrencia (bajo / medio / alto) | `OccupancyLevel` (`low` / `medium` / `high`) | |
| Rango de precios ($ – $$$$) | `PriceTier` | Derived from `averageSpendPerPerson` |
| Gasto promedio por persona | `averageSpendPerPerson` | Fixture field until the restaurants API exists |
| Restricción alimenticia (sin TACC, vegetariano…) | `DietaryRestriction` (`gluten_free`, `vegetarian`…) | Always shown as declared by the restaurant (risk 5) |
| Tiempo estimado de preparación | `prep_time_minutes` | |
| Hora de llegada | `arrival_time` | |
| Hora sugerida de inicio de preparación | `prep_start_time` | Arrival time minus prep time |
| Seña | `deposit` | |
| Medio de pago (efectivo / electrónico) | `PaymentMethod` (`cash` / `online`) | |
| Estado de pago (pagado / pendiente) | `PaymentStatus` (`paid` / `pending`) | |
| Reembolso | `Refund` | |
| Cancelación | `Cancellation` | |
| Reseña / review | `Review` | |
| Calificación / rating | `rating` | |
| Promoción | `Promotion` | |
| Términos y condiciones | `terms` | |
| CUIT | `cuit` | Argentine tax ID, 11 digits |

## Repository map

```text
backend/            FastAPI app (Python 3.12, uv)
  app/main.py       App factory: routers, error handlers
  app/api/          One router module per resource, mounted under /api in app/api/__init__.py
  app/api/deps.py   Shared dependencies, e.g. TokenClaimsDep (reads the Bearer token)
  app/models/       SQLAlchemy models; import each one in app/models/__init__.py
  app/schemas/      Pydantic request/response models
  app/services/     Business rules that outgrow a router (auth.py: passwords, JWT)
  app/config.py     Settings from environment variables, with development defaults
  app/db.py         Engine, session and the SessionDep dependency
  migrations/       Alembic migrations
  tests/            pytest; conftest.py gives a TestClient on a real Postgres, rolled back per test
frontend/           React + TypeScript SPA (Vite)
  src/api/          openapi.json (contract), schema.d.ts (generated types), client.ts,
                    session.ts (token in sessionStorage, current account), errors.ts
  src/pages/        One component per route; routes in src/router.tsx, shell in src/AppLayout.tsx;
                    pages/home/ holds the home page variants per role (not routes)
  src/components/   Design system, imported from each folder's index.ts:
                    brand/ (logo, splash, spinner) · ui/ (buttons, fields, modal, toasts…)
                    layout/ (header, footer) · access/ (login form, redirects, roles)
                    order/ · reservation/ · restaurant/ (animated domain pieces, map,
                    list, price filter) · dev/ (API status badge)
  src/lib/          Small helpers: cx (class names), cssVars, reduced-motion detection,
                    geo (distances), occupancy, useGeolocation
  src/data/         Temporary fixtures while the backend endpoint does not exist yet
                    (restaurants.fixture.ts feeds the map, list and detail)
  src/styles/       tokens.css (design tokens) and global.css
  src/test/         Test setup, polyfills and renderWithProviders
specs/              Spec Kit features: NNN-name/spec.md, plan.md, tasks.md…
docs/               catedra/, product/, decisions/, design/, architecture/ (diagrams),
                    sprints/ (scope, metrics, demo and retro of each sprint)
infra/terraform/    AWS infrastructure (Terraform): CloudFront, one EC2 instance, backups, deploy role, budget
infra/ec2/          What runs on the instance: compose.yml (db, api, web) and deploy.sh
scripts/            export_backlog.py (backlog snapshot from the team workbook);
                    sql/ (schema, seed data and views designed for the database)
.specify/           Spec Kit templates, scripts and constitution
```

## Commands

Run from the repository root. `make` wraps everything; the raw commands are in the [Makefile](Makefile).

| Task | Command |
| --- | --- |
| Run everything in Docker (web on :5173, API on :8000, Postgres on :55432) | `make up` |
| Start only Postgres (to run backend or frontend natively) | `make db` |
| Backend dev server | `cd backend && uv run uvicorn app.main:app --reload` |
| Frontend dev server | `cd frontend && npm run dev` |
| All tests | `make test` |
| Lint, format check, type check | `make lint` |
| Auto-format | `make format` |
| Apply migrations | `make migrate` |
| New migration after changing models | `make migration m="add reservations"` |
| Regenerate API contract and TS types after any API change | `make api-types` |

Run `make format lint test` before considering a task done.

## Backend conventions

- **Routes** live under `/api`. One module per resource in `app/api/`, included in `app/api/__init__.py`. Use `SessionDep` from `app.db` for database access.
- **Models**: SQLAlchemy 2 typed style (`Mapped[...]`, `mapped_column`). UUID primary keys. Import every model in `app/models/__init__.py` so Alembic sees it.
- **Schema changes only through Alembic** (`make migration`, then review the generated file). Never edit a migration that is already on `main`. CI fails if models and migrations diverge.
- **Invariants live in the database too**: uniqueness (email, CUIT), no double booking of a table and time slot (risk 2), positive prices, and so on, as constraints, not only Python checks.
- **HTTP status codes**: 201 created · 400 invalid input (a global handler converts validation errors; do not return 422) · 401 not authenticated or wrong credentials · 403 wrong role or not the owner · 404 not found · 409 duplicate or conflict.
- **Error messages** that the UI shows are in Spanish. Login failures use one generic message that does not reveal which field was wrong.
- **Money** is `Decimal` / `Numeric(10, 2)`, never float. **Datetimes** are timezone-aware, stored in UTC; business rules (shifts, "30 minutes before") use `America/Argentina/Buenos_Aires`.
- **Passwords** are hashed with Argon2 and never logged or returned.
- **Auth**: email and password are built in-house (spec 001); Google is only an optional way in for diners. Login returns a stateless JWT (HS256, 1 hour) signed with `JWT_SECRET` (SSM in production); the frontend keeps it in `sessionStorage` and sends it as a Bearer token. Protected routes use `TokenClaimsDep` from `app/api/deps.py`; `GET /api/me` returns the current account. Endpoints exclusive to one role answer 403 to the other role (US-4 S3, pending until such endpoints exist). Diners can also sign in with Google (spec 007, US-52): the browser gets an ID token from Google Identity Services and `POST /api/auth/comensal/google` checks it in `app/services/google.py` before opening the usual session. They can also create their account with Google (US-58): `POST /api/comensales/google` creates a verified diner from the same token, with no usable password. Restaurant sign-in with Google (US-28) comes later. A diner registered with email and password gets a verification mail (US-51); `email_verificado` in `/me` says whether it was confirmed. Mail goes through `app/services/mail.py` (`MAIL_BACKEND`: `ses` in production, or `smtp` through the team Gmail while SES is in the sandbox; `console` locally, `memory` in tests).

## Frontend conventions

- Server state through **TanStack Query** and the typed client in `src/api/client.ts`. Never hand-write API types: after a backend change run `make api-types` and commit `openapi.json` and `schema.d.ts` (CI checks both).
- **Routing** with React Router; one page component per route in `src/pages/`.
- **Build screens from the design system.** Check the catalog (`/diseno` in the running app, and [docs/design/README.md](docs/design/README.md)) before writing UI; reuse or extend a component instead of styling a one-off. New components go in the matching `src/components/` folder, its `index.ts`, the `/diseno` page and the design guide.
- **Styling** with CSS Modules and the variables in `src/styles/tokens.css`. No hard-coded colors, durations or easings, and no CSS framework.
- **Animations** are CSS keyframes with the motion tokens, no animation library ([ADR 0007](docs/decisions/0007-css-animations.md)). Every animation must work with reduced motion (see the rules in the design guide); entrance animations set `data-entrance`.
- **Mobile first**: personas book from their phones. Layouts must work at 360 px wide.
- **Accessible**: labelled inputs, visible focus, buttons for actions, links for navigation.
- **Maps**: Leaflet + OpenStreetMap ([ADR 0003](docs/decisions/0003-maps-leaflet-openstreetmap.md)).

## Spec-driven workflow

Spec Kit 1.2.1 is installed for several agents. The steps are the same; the invocation differs:

| Agent | Invocation |
| --- | --- |
| Claude Code, GitHub Copilot, Antigravity | `/speckit-plan` |
| Codex | `$speckit-plan` |
| Gemini CLI | `/speckit.plan` |

Spec Kit generates `spec.md`, `plan.md` and `tasks.md` from the project templates in `.specify/templates/overrides/` (the team's Spanish spec format, this stack and these paths), not from its generic defaults.

Per feature:

1. **Spec** (`spec.md`, Spanish). New feature: `/speckit-specify` with the US numbers from the backlog. Existing spec: point Spec Kit at it by writing `.specify/feature.json` with `{"feature_directory": "specs/NNN-name"}` (local file, not committed). The PO validates the spec before planning.
2. **Clarify** (`/speckit-clarify`) when there are `[NEEDS CLARIFICATION]` markers. Answers come from the PO, not from the agent; record them in the spec and in [specs/README.md](specs/README.md).
3. **Plan** (`/speckit-plan`): `plan.md`, `research.md`, `data-model.md`, `contracts/`, in English. Must pass the constitution check and map every acceptance scenario to a test.
4. **Tasks** (`/speckit-tasks`). Tests are always requested in this project, even though Spec Kit treats them as optional by default. Optionally run `/speckit-analyze` to check consistency.
5. **Implement** (`/speckit-implement`), then `/speckit-converge` until it reports converged.

Commit spec, plan and tasks together with the code. Their history is the evidence the course asks for in every sprint defense.

## Tests

- **Backend acceptance tests** go in `backend/tests/test_<feature>.py`, one test per acceptance scenario, named `test_us<N>_s<M>_<behavior>`, where `N` is the US number and `M` the scenario number in the spec. Edge cases: `test_us<N>_edge_<behavior>`. Use the `client` fixture (real Postgres, rolled back after each test).
- **Frontend acceptance tests** cover scenarios that only the UI can prove (for example, the password is hidden while typing). They are Vitest + Testing Library tests next to the component (`Page.test.tsx`), with names that start with the US and scenario: `it('US-3 S5 hides the password while typing')`. Mock `src/api/client`.
- Other frontend tests are only for components with real logic; do not test markup for its own sake.
- A bug fix comes with a test that fails without the fix.

## Git and pull requests

- Branch per US from `main`: `<spec-number>-us<N>-<short-name>`, for example `002-us5-map`.
- Conventional commits in English with the US: `feat(US-5): show restaurants on the map`, `fix(US-7): keep the price filter after opening a detail`, `docs(specs): clarify password rules in 001`.
- One US per PR when possible. Fill every section of the PR template, including **AI usage**: tool and model, the key prompts, and what the human changed after reviewing.
- **No AI attribution.** Never add a `Co-Authored-By` trailer naming an AI tool or bot, a "Generated with …" footer, or an AI as commit author, even if your tool does it by default. The commit author is the team member. AI use is disclosed only in the PR's **AI usage** section. Human co-authors are fine. Claude Code is already configured for this in `.claude/settings.json`, and CI rejects pull requests that break the rule.

## Definition of Done

- All acceptance scenarios of the US pass as automated tests, and CI is green.
- Spec, plan and tasks reflect what was built; the API contract and types are regenerated.
- Another team member reviewed and understood the change.
- UI text is in Spanish and the screens work on a phone.

## Where things stand

- Which sprint we are in and what it must demo: [docs/product/plan.md](docs/product/plan.md).
- Which specs exist and how far each one got: [specs/README.md](specs/README.md).
- Open questions for the PO: [specs/README.md](specs/README.md#pendientes-de-aclarar-con-la-po). Do not resolve them yourself.
- What each sprint delivered: [docs/sprints/](docs/sprints/).
- Built so far (Sprint 1: US 1, 2, 3, 4, 5, 7, 9, 33). Sprint 2 adds US-52, US-51 and US-58 (spec 007). Routes: `/`, `/ingresar`, `/registrarme`, `/suma-tu-local`, `/mapa`, `/restaurantes/:id`, `/verificar-email`, `/privacidad`, `/terminos`, `/diseno`. Endpoints: `POST /api/comensales`, `POST /api/comensales/google`, `POST /api/restaurantes`, `POST /api/auth/comensal`, `POST /api/auth/comensal/google`, `POST /api/auth/restaurante`, `POST /api/comensales/verificacion`, `POST /api/comensales/verificacion/reenvio`, `GET /api/me`, `GET /api/health`. Restaurants, the map and the detail still read `src/data/restaurants.fixture.ts`.
- Hosting is defined in [ADR 0008](docs/decisions/0008-aws-free-plan-hosting.md) and `infra/`. Production is live at <https://servido.discordia.fyi>; merges to `main` deploy automatically. `main` is protected: PR, one approval and green CI. Terraform changes (for example a new secret) are applied by hand before merging the code that needs them.

# Servido!

**Reservá. Pedí. Disfrutá.** Reservations with pre-ordered food: the diner books a table and chooses dishes before leaving, and the restaurant times the preparation so the food is ready on arrival.

Group project (Grupo 3) for *Gestión del Desarrollo de Sistemas Informáticos*, FIUBA, 2C 2026, built with Spec-Driven Development and AI coding agents.

Live at <https://d2hzxi2oo4z9in.cloudfront.net> (AWS, deployed on every merge to `main`). Sprint 1 delivered sign-up and login for diners and restaurants, the restaurant map with the price filter, the list and the restaurant detail; see [docs/sprints/](docs/sprints/).

## Quick start

Requirements: Docker, [uv](https://docs.astral.sh/uv/), Node.js 22 and `make`.

```bash
make up        # Postgres, API and web app in Docker
```

- Web app: http://localhost:5173
- API docs: http://localhost:8000/api/docs

To run the backend or frontend outside Docker, start only the database with `make db` and see [CONTRIBUTING.md](CONTRIBUTING.md).

## Repository

| Path | Contents |
| --- | --- |
| [backend/](backend/) | FastAPI + SQLAlchemy + Alembic (Python 3.12) |
| [frontend/](frontend/) | React + TypeScript single-page app (Vite) |
| [specs/](specs/) | Feature specs (Spec Kit) |
| [docs/](docs/) | Course rules, product context, architecture decisions, design, sprint records |
| [docs/architecture/](docs/architecture/) | Diagrams: how the platform and the repository work |
| [infra/](infra/) | AWS infrastructure (Terraform) and the deploy runbook |
| [scripts/](scripts/) | Backlog export from the team workbook, and SQL designs for the database |
| [AGENTS.md](AGENTS.md) | Instructions for AI coding agents, and the best summary of the project's conventions |

## Team

Mateo, Santiago, Ezequiel, Lourdes, Ignacio and Matías.

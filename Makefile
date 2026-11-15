.PHONY: up up-local down reset-db db logs test test-backend test-frontend lint format migrate migration seed api-types

up: ## Run db, backend and frontend in Docker (http://localhost:5173)
	docker compose up --build

up-local: ## Like up, plus demo data and sign-up without mail verification (compose.local.yml)
	docker compose -f docker-compose.yml -f compose.local.yml up --build

down:
	docker compose down

reset-db: ## Delete the local database and volumes, e.g. when it has a migration from another branch
	docker compose down -v

db: ## Run only Postgres, for running backend/frontend natively
	docker compose up -d --wait db

logs:
	docker compose logs -f

test: test-backend test-frontend

test-backend: db
	cd backend && uv run pytest

test-frontend:
	cd frontend && npx vitest run

lint:
	cd backend && uv run ruff check . && uv run ruff format --check .
	cd frontend && npm run lint && npm run format:check && npm run typecheck

format:
	cd backend && uv run ruff check --fix . && uv run ruff format .
	cd frontend && npm run format

migrate: db
	cd backend && uv run alembic upgrade head

seed: migrate
	cd backend && uv run python -m scripts.seed

migration: db ## Usage: make migration m="add restaurants table"
	cd backend && uv run alembic revision --autogenerate -m "$(m)"

api-types: ## Regenerate the OpenAPI contract and the frontend TS types
	cd backend && uv run python -c "import json; from app.main import app; print(json.dumps(app.openapi(), indent=2))" > ../frontend/src/api/openapi.json
	cd frontend && npm run gen:api

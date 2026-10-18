.PHONY: up down db logs test test-backend test-frontend lint format migrate migration api-types

up: ## Run db, backend and frontend in Docker (http://localhost:5173)
	docker compose up --build

down:
	docker compose down

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

migration: db ## Usage: make migration m="add restaurants table"
	cd backend && uv run alembic revision --autogenerate -m "$(m)"

api-types: ## Regenerate the OpenAPI contract and the frontend TS types
	cd backend && uv run python -c "import json; from app.main import app; print(json.dumps(app.openapi(), indent=2))" > ../frontend/src/api/openapi.json
	cd frontend && npm run gen:api

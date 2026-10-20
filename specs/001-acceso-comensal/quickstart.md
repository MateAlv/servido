# Quickstart: diner account access

## Prerequisites

- Docker and Docker Compose.
- Python 3.12 and `uv`.
- Repository dependencies installed through `uv`, including `argon2-cffi` and
  `PyJWT`.
- `JWT_SECRET` configured in the backend environment with at least 32 bytes;
  `backend/.env.example` contains the expected variable name.

## Apply the database migration

From the repository root:

```bash
make db
make migrate
```

Expected result: Alembic reaches `head` and PostgreSQL contains only the
feature's new `comensales` and `restaurantes` tables from this migration.

## Run focused backend tests

```bash
cd backend
uv run pytest tests/test_auth.py
```

The tests must cover the US-1 and US-3 acceptance scenarios, including required
field validation, rejection of exactly 7 and 129 characters, the 8–128
character password policy with a letter and a number, duplicate email
protection, successful registration and stateless login with a one-hour HS256
JWT, generic credential failures, and hidden password input where the UI is
responsible for that behavior.

## Validate the migration independently

```bash
cd backend
uv run alembic upgrade head
uv run alembic downgrade base
uv run alembic upgrade head
```

Expected result: upgrade and downgrade complete without errors, and the final
database is at the latest revision.

## Full project checks

```bash
make format
make lint
make test
```

The generated API OpenAPI document and frontend types must be regenerated with
`make api-types` after the backend routes are implemented.

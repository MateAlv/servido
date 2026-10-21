# Research: Diner account access

## Decision: Use SQLAlchemy 2 typed models and one reviewed Alembic revision

- Define `Diner` and `Restaurant` in `backend/app/models/` with `Mapped[...]` and
  `mapped_column`.
- Import both models from `backend/app/models/__init__.py` so Alembic sees them
  through `Base.metadata`.
- Create one reversible migration under `backend/migrations/versions/` for the
  two tables and review the generated SQL before applying it.

**Rationale:** This follows the existing backend structure and the repository
workflow (`make migration` followed by `make migrate`) without introducing a
new persistence abstraction.

**Alternatives considered:** Defining tables directly in the migration would
leave the SQLAlchemy metadata incomplete. A separate migration for each table
would add history without a dependency or behavioral benefit.

## Decision: Rename `usuarios` to `comensales` and use UUID identifiers

The physical tables will be `comensales` and `restaurantes`. Their primary keys
will be UUIDs, named `id_comensal` and `id_restaurante`, respectively.

**Rationale:** `comensales` matches the product glossary and avoids carrying the
blueprint's generic `usuarios` name into future foreign keys. UUID primary keys
are an explicit backend convention and must take precedence over the SQL
blueprint's legacy `BIGINT GENERATED ALWAYS AS IDENTITY` choice.

**Alternatives considered:** Keeping `usuarios` would conflict with the
project's domain language. Keeping BIGINT would conflict with the repository's
SQLAlchemy model convention and the restaurant account spec.

## Decision: Keep only scope-required diner columns

`comensales` stores the unique normalized email, the Argon2 password hash, and
the UTC creation timestamp. The blueprint's `nombre`, `apellido`, and
`telefono` are omitted because US-1 explicitly captures only email and
password.

`restaurantes` is created because the request explicitly asks for that table,
using only the blueprint's account and profile columns: name, CUIT, email,
password hash, address, neighborhood, and food type. No restaurant registration
or login behavior is planned in this feature.

**Rationale:** This satisfies the requested database boundary without
implementing fields or behavior that belong to later restaurant work.

**Alternatives considered:** Copying every blueprint column would anticipate
features outside spec 001. Adding `telefono` or `auth_provider` would require
scope from the restaurant-account spec and is therefore deferred.

**Later change (21/10):** revision `002_restaurant_names` added a nullable
`comensales.nombre` (registration now asks for the name) and, for spec 003, a
required `restaurantes.telefono`. `auth_provider` was never added. See
`data-model.md`.

## Decision: Enforce storage invariants in PostgreSQL and behavioral validation in the API

- Add unique constraints for diner email, restaurant email, and restaurant CUIT.
- Add database checks for email shape, CUIT's 11 digits, and nonblank required
  restaurant text fields.
- Normalize email by trimming and lowercasing before persistence and lookup.
- Validate password length, the required letter and number, and email equality
  in the application; persist only an Argon2 hash.

**Rationale:** Database constraints are the race-safe protection for uniqueness,
while password policy requires application logic and must not be encoded in the
schema or expose plaintext credentials.

**Alternatives considered:** Application-only uniqueness checks are vulnerable
to duplicate submissions. Storing plaintext or reversible credentials violates
the spec and project security constraints.

## Decision: Use stateless JWT authentication

Successful login does not create a database session. The server returns a
successful JSON response containing a JWT. The JWT is signed with HS256, uses a
secret supplied through an environment variable, and expires one hour after
issuance. Cookies are not used and no session row is persisted.

**Rationale:** This is the explicit product decision and keeps the initial
schema limited to the two requested account tables while making the access
mechanism and security parameters deterministic.

## Decision: Expose two diner-only API contracts

Plan the following JSON endpoints:

- `POST /api/comensales` for registration, returning `201` without a password.
- `POST /api/auth/comensal` for login, returning `200` with authenticated
  account data and a session representation.

Invalid input returns `400`, duplicate diner email returns `409`, and all
credential failures return the same `401` message. Successful login returns a
one-hour HS256 JWT in JSON. Restaurant behavior is not included.

**Rationale:** These contracts map directly to US-1 and US-3 while keeping
authentication behavior explicit and testable.

**Alternatives considered:** A generic multi-role auth endpoint would introduce
role behavior outside this spec. Returning a password hash would violate the
security requirements.

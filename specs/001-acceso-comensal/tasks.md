---

description: "Task list for diner registration and stateless login"
---

# Tasks: Diner account access

**Input**: Design documents from `/specs/001-acceso-comensal/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md,
contracts/auth-api.md, quickstart.md

**Tests**: REQUIRED. Each acceptance scenario must have an automated test named
after its US and scenario, as required by the constitution.

**Organization**: User stories follow the order in `spec.md`: US-1 registration
then US-3 login. Shared schema and migration work is foundational.

## Phase 1: Setup

**Purpose**: Add the one explicitly approved cryptographic dependency and
prepare the feature's backend/frontend paths without introducing other
services or dependencies.

- [X] T001 Run `cd backend && uv add argon2-cffi PyJWT` to add only the approved Argon2 and JWT libraries to `backend/pyproject.toml` and `backend/uv.lock`
- [X] T002 [P] Create `backend/app/schemas/` and `backend/app/services/` modules with package initializers if they do not already exist, preserving the existing backend import conventions
- [X] T003 [P] Inspect the existing frontend router and design-system exports in `frontend/src/router.tsx`, `frontend/src/components/`, and `docs/design/README.md` before selecting form components for this feature

**Checkpoint**: The approved dependency and existing project structure are
ready for implementation.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the database entities and shared authentication primitives
needed by both registration and login.

- [X] T004 [P] Define the SQLAlchemy 2 `Diner` model for table `comensales` in `backend/app/models/diner.py` with UUID `id_comensal`, unique normalized `email` (`VARCHAR(255)`), `password_hash` (`VARCHAR(255)`), and UTC-aware `fecha_registro`
- [X] T005 [P] Define the schema-only SQLAlchemy 2 `Restaurant` model for table `restaurantes` in `backend/app/models/restaurant.py` with UUID `id_restaurante`, `nombre` (`VARCHAR(150)`), `cuit` (`CHAR(11)`), `email` (`VARCHAR(255)`), `password_hash` (`VARCHAR(255)`), `direccion` (`VARCHAR(200)`), `barrio` (`VARCHAR(60)`), and `tipo_comida` (`VARCHAR(60)`); include unique email/CUIT and nonblank/email/CUIT constraints from `data-model.md`
- [X] T006 Import `Diner` and `Restaurant` from `backend/app/models/__init__.py` so Alembic includes both tables in `Base.metadata`
- [X] T007 Create and review the reversible Alembic revision in `backend/migrations/versions/` using `make migration m="add diner and restaurant account tables"`; create only `comensales` and `restaurantes`, and drop `restaurantes` before `comensales` in `downgrade()`
- [X] T008 [P] Add shared email normalization, password policy, Argon2 hashing, Argon2 verification, and HS256 JWT helpers in `backend/app/services/auth.py`; enforce 8–128 characters, reject exactly 7 and 129 characters, require at least one letter and one number, reject passwords equal to normalized email, sign with an environment-provided secret, and set one-hour expiration
- [X] T009 [P] Add database/session fixtures needed by `backend/tests/test_auth.py`, keeping the existing real-PostgreSQL rollback behavior in `backend/tests/conftest.py`

**Checkpoint**: Both tables migrate cleanly and shared authentication rules are
available without creating a session table.

---

## Phase 3: US-1 — Register diner account 🎯

**Goal**: A diner can submit a valid email and password, receive a created
account, and receive actionable validation or duplicate-email errors without
plaintext credentials.

**Independent Test**: Exercise the registration form/API with empty fields,
invalid email, passwords outside 8–128 characters, passwords missing a letter
or number, password equal to the email, valid Unicode/spaces, duplicate email,
and duplicate submission. Only one valid `comensales` row is created.

### Tests for US-1 (write first; they must fail before implementation)

- [X] T010 [P] [US1] Add `test_us1_s1_identifies_required_fields` to `frontend/src/pages/AuthPages.test.tsx` to specify required email/password labeling and password-policy guidance before submission
- [X] T011 [P] [US1] Add `test_us1_s2_rejects_missing_fields` to `backend/tests/test_auth.py` to specify HTTP 400 field validation without account creation
- [X] T012 [P] [US1] Add `test_us1_s3_rejects_invalid_registration` to `backend/tests/test_auth.py` for malformed email, passwords of exactly 7 and exactly 129 characters, required letter/number, email-equal password, and field-specific errors
- [X] T013 [P] [US1] Add `test_us1_s3_preserves_entered_email` to `frontend/src/pages/AuthPages.test.tsx` to specify that form errors do not refresh the page or discard entered non-sensitive data
- [X] T014 [P] [US1] Add `test_us1_s4_creates_diner_account_once` to `backend/tests/test_auth.py` to specify HTTP 201, normalized email, Argon2-only storage, absent password/hash in response, and one database row
- [X] T015 [P] [US1] Add `test_us1_edge_rejects_duplicate_email` and `test_us1_edge_prevents_duplicate_submission` to `backend/tests/test_auth.py` for HTTP 409 and database uniqueness
- [X] T016 [P] [US1] Add `test_us1_edge_normalizes_email` and `test_us1_edge_accepts_supported_password` to `backend/tests/test_auth.py` for case/space normalization, Unicode, spaces, the 8-character lower boundary, and the 128-character upper boundary; T012 must separately assert rejection at exactly 7 and exactly 129 characters

### Implementation for US-1

- [X] T017 [US1] Add registration request/response schemas with email and password validation in `backend/app/schemas/auth.py`; never serialize `password` or `password_hash`
- [X] T018 [US1] Implement `POST /api/comensales` in `backend/app/api/auth.py`, normalize email, hash with Argon2, handle database uniqueness as HTTP 409, return HTTP 201, and mount the router in `backend/app/api/__init__.py`
- [X] T019 [US1] Build `frontend/src/pages/RegisterPage.tsx` and shared `frontend/src/pages/AuthPage.module.css` with Spanish validation text, required labels, visible password requirements, no page refresh on errors, accessible focus, design tokens, and 360px layout
- [X] T020 [US1] Add the registration route in `frontend/src/router.tsx` and connect the form to the typed client without hand-written API types
- [X] T021 [US1] Regenerate `frontend/src/api/openapi.json` and `frontend/src/api/schema.d.ts` with `make api-types` after the backend registration contract exists

**Checkpoint**: US-1 registration is independently testable and creates at most
one valid diner account.

---

## Phase 4: US-3 — Log in diner 🎯

**Goal**: A diner can authenticate with email/password and receive a
stateless successful response or JWT/cookie, while all invalid credential
failures remain generic.

**Independent Test**: Exercise login with missing/malformed credentials,
unknown email, wrong password, and correct credentials; verify equal generic
failure messages, successful stateless authentication, no session row, and a
masked password field.

### Tests for US-3 (write first; they must fail before implementation)

- [X] T022 [P] [US3] Add `test_us3_s1_requests_credentials` to `frontend/src/pages/AuthPages.test.tsx` to specify labeled email and password inputs
- [X] T023 [P] [US3] Add `test_us3_s2_rejects_invalid_credentials` to `backend/tests/test_auth.py` to specify HTTP 400 and no authentication attempt for missing/malformed fields
- [X] T024 [P] [US3] Add `test_us3_s3_logs_in_diner_statelessly` to `backend/tests/test_auth.py` to specify HTTP 200, diner identity, JSON `access_token`, `token_type` bearer, HS256 algorithm, one-hour expiration, environment-provided secret, and no session-table write
- [X] T025 [P] [US3] Add `test_us3_s4_uses_generic_credential_error` to `backend/tests/test_auth.py` to compare the identical HTTP 401 message for unknown email and wrong password
- [X] T026 [P] [US3] Add `test_us3_s5_hides_password_while_typing` to `frontend/src/pages/AuthPages.test.tsx` to specify a password input that does not expose plaintext

### Implementation for US-3

- [ ] T027 [US3] Extend `backend/app/schemas/auth.py` with login request and safe authenticated-response schemas
- [X] T028 [US3] Implement stateless `POST /api/auth/comensal` in `backend/app/api/auth.py` using normalized email and Argon2 verification; return a JSON JWT signed with HS256, an environment-provided secret, and one-hour expiration on success, and identical Spanish HTTP 401 `"Credenciales inválidas"` for unknown email and wrong password without exposing hashes
- [X] T029 [US3] Build `frontend/src/pages/LoginPage.tsx` and shared `frontend/src/pages/AuthPage.module.css` with Spanish errors, accessible labels, `type="password"`, no refresh on validation errors, design tokens, and 360px layout
- [X] T030 [US3] Add the login route and stateless auth response handling in `frontend/src/router.tsx` and the existing client/auth state location, without adding a session table
- [X] T031 [US3] Regenerate `frontend/src/api/openapi.json` and `frontend/src/api/schema.d.ts` with `make api-types` after the login contract exists

**Checkpoint**: US-3 is independently testable and authenticates diners
without persisted sessions or inconsistent credential errors.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T032 Run `make format` and `make lint` from the repository root, fixing only feature-related failures in touched files
- [X] T033 Run the backend suite and complete frontend Vitest suite in the Node 22 project container, confirming every US-1/US-3 acceptance scenario has a passing automated test
- [X] T034 Run `make db`, `make migrate`, and the upgrade/downgrade/upgrade commands documented in `specs/001-acceso-comensal/quickstart.md`
- [X] T035 Review `specs/001-acceso-comensal/spec.md`, `plan.md`, `data-model.md`, `research.md`, `quickstart.md`, and `contracts/auth-api.md` against the implementation; update those exact files only if an approved behavior diverged
- [X] T036 Review `specs/001-acceso-comensal/data-model.md` and confirm the future spec-003 boundary remains `op.add_column()` with nullable `telefono` and `auth_provider`, without recreation or rename

## Dependencies & Execution Order

- **Phase 1** blocks Phase 2.
- **Phase 2** blocks both user stories.
- **US-1** can be implemented and tested independently after Phase 2.
- **US-3** depends on the shared model and auth helpers from Phase 2 and on a
  registered diner fixture/account from US-1 tests, but it does not depend on
  the registration UI.
- Within each story: write tests first, then implement schemas/services/routes,
  then UI and generated contracts.
- **Phase 5** follows both user stories.

### Parallel execution examples

**After Phase 1**

- T004 and T005 can run in parallel because they define separate model files.
- T008 and T009 can run in parallel because they touch separate service/test
  fixture concerns.

**US-1**

- T010–T016 can be written in parallel because they target separate test
  concerns/files, before implementation.
- After tests, T017, T019, and the initial router inspection for T020 can
  proceed in parallel; T018 depends on T017 and T008.

**US-3**

- T022–T026 can be written in parallel.
- After tests, T027, T029, and route wiring preparation can proceed in
  parallel; T028 depends on T027 and T008.

## Implementation Strategy

1. Complete the dependency and schema foundation.
2. Deliver US-1 registration as the MVP increment, including database
   migration, backend tests, frontend form, and generated API types.
3. Deliver US-3 stateless login on the same account model.
4. Run migration, format, lint, and full test validation before handoff.

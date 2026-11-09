# Tasks: Recovering a diner account

**Input**: Design documents from `/specs/013-recuperar-cuenta-comensal/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/account-recovery-api.md

**Tests**: REQUIRED. Every acceptance scenario and edge case has a test named after its US and scenario (plan, test map).

**Organization**: one phase for the data, one for the backend, one for the frontend and one for the documentation. The pages can be built in parallel with the backend once the contract is fixed.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Foundational

- [X] T001 Add `password_resets` and `password_reset_requests` in backend/app/models/password_reset.py, and export them in backend/app/models/__init__.py (data-model.md)
- [X] T002 Add `has_password` and `password_changed_at` to backend/app/models/diner.py
- [X] T003 `make migration m="password recovery"`, reviewed by hand: the new columns, the two tables, the index and the `ON DELETE CASCADE` (data-model.md)

**Checkpoint**: `make migrate` runs on an empty database.

---

## Phase 2: US-31 — Recuperar cuenta (backend) 🎯

**Goal**: a diner asks for a link by email, opens it, sets a new password and signs in with it.

**Independent Test**: quickstart, "The happy path".

### Tests for US-31

- [X] T004 [P] [US31] `test_us31_s1_…`, `test_us31_s2_…`, `test_us31_s3_…`, `test_us31_s4_…`, `test_us31_s5_…`, `test_us31_s6_…`, `test_us31_s7_…` and `test_us31_s8_…` in backend/tests/test_account_recovery.py
- [X] T005 [P] [US31] `test_us31_edge_a_new_request_voids_the_previous_link`, `…_google_account_is_told_to_use_google`, `…_unverified_diner_can_recover`, `…_sixth_request_in_half_an_hour_is_limited`, `…_mail_failure_is_reported`, `…_invalid_email_is_reported` and `…_password_change_closes_open_sessions`

### Implementation for US-31

- [X] T006 [US31] backend/app/services/password_recovery.py: the hashed token, the 15-minute link, the state of a link, the rate limit and both mails (research R1–R3, R6, R9)
- [X] T007 [US31] backend/app/schemas/auth.py: `RecoveryRequest`, `RecoveryLinkRequest` and `PasswordResetRequest`
- [X] T008 [US31] backend/app/api/account_recovery.py with `POST /api/comensales/recuperacion`, `POST /api/comensales/recuperacion/validacion` and `PUT /api/comensales/recuperacion`; mounted in backend/app/api/__init__.py (contract)
- [X] T009 [US31] The `pwd` claim in `create_access_token` and `password_session_version` (backend/app/services/auth.py); `session_is_current` checked in backend/app/api/deps.py, backend/app/api/account.py and backend/app/api/email_verification.py (research R5)
- [X] T010 [US31] `has_password = false` for an account created with Google (backend/app/api/auth.py, research R4)
- [X] T011 [US31] `make api-types`

**Checkpoint**: US-31 S1–S8 and the edges pass; the flow can be demoed with `curl` or the API docs.

---

## Phase 3: US-31 — Recuperar cuenta (frontend)

**Goal**: the login offers the recovery, and the two pages work at 360 px with the keyboard only.

### Tests for US-31

- [X] T012 [P] [US31] `US-31 S1`, `US-31 edge a double click asks for one mail` and `US-31 edge reports a mail that could not be sent` in frontend/src/pages/RecoverAccountPage.test.tsx
- [X] T013 [P] [US31] `US-31 S3` (twice), `US-31 S4`, `US-31 S6`, `US-31 S7`, the confirmation check and the missing token in frontend/src/pages/ResetPasswordPage.test.tsx
- [X] T014 [P] [US31] `US-31 S1 offers the recovery to diners` in frontend/src/pages/LoginPage.test.tsx

### Implementation for US-31

- [X] T015 [US31] frontend/src/api/passwordRecovery.ts: the three calls, with the API's Spanish messages
- [X] T016 [US31] frontend/src/pages/RecoverAccountPage.tsx at `/recuperar` (frontend/src/router.tsx)
- [X] T017 [US31] frontend/src/pages/ResetPasswordPage.tsx at `/restablecer`, which checks the token before showing the form
- [X] T018 [US31] «¿Olvidaste tu contraseña?» on the diner side of frontend/src/pages/LoginPage.tsx
- [X] T019 [US31] Add the two pages to the access section of docs/design/README.md

**Checkpoint**: both pages pass the quickstart at 360 px.

---

## Phase 4: Documentation

- [X] T020 Update AGENTS.md (the two routes and the three endpoints) and specs/README.md (the 013 row and the team's decisions)
- [ ] T021 `make format lint test`, then the quickstart with a real mail in production

## Dependencies & Execution Order

- **Phase 1** blocks Phase 2.
- **Phase 2** fixes the contract that Phase 3 uses; T011 comes before T015.
- Tests are written before their implementation and fail first.
- **Phase 4** needs everything else.

## Notes

- No dependency, no AWS resource and no environment variable is added: the mail already works (spec 019).
- The three team proposals of the spec (same message, closing sessions, rate limit) wait for the PO; if the PO changes them, `research.md` records what changed.

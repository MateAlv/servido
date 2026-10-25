# Tasks: Google sign-in and email verification

**Input**: Design documents from `/specs/007-cuenta-comensal-google-verificacion/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/accounts-api.md

**Tests**: REQUIRED. Every acceptance scenario has a test named after its US and scenario (plan, test map). US-51 S5 is tested by US-17, which adds orders.

**Organization**: one phase per user story, US-52 first. US-52 S5 needs the verification state, so it's in the US-51 phase.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Foundational

- [X] T001 Add the settings `google_client_id` (default: the public client ID), `mail_backend` (`console`), `mail_from` and `app_base_url` to backend/app/config.py and backend/.env.example
- [X] T002 Add the dependencies `pyjwt[crypto]` and `boto3` with `uv add` in backend/
- [X] T003 [P] Write ADR docs/decisions/0009-google-sign-in-and-ses-mail.md and list it in docs/decisions/README.md

**Checkpoint**: settings and dependencies ready.

---

## Phase 2: US-52 — Ingresar con Google 🎯

**Goal**: a diner whose email matches their Google account signs in with one click.

**Independent Test**: quickstart, section US-52.

### Tests for US-52

- [X] T004 [P] [US52] Test fixtures in backend/tests/conftest.py: a local RSA key, a helper that signs Google-like ID tokens, and a patch of the Google key lookup
- [X] T005 [P] [US52] `test_us52_s2_google_account_with_a_diner_signs_in` in backend/tests/test_google_sign_in.py
- [X] T006 [P] [US52] `test_us52_s3_google_account_without_a_diner_is_not_found` in backend/tests/test_google_sign_in.py
- [X] T007 [P] [US52] `test_us52_s4_invalid_google_token_is_rejected` (bad signature, another audience, another issuer, expired, unverified email) in backend/tests/test_google_sign_in.py
- [X] T008 [P] [US52] `test_us52_edge_restaurant_email_does_not_sign_in` in backend/tests/test_google_sign_in.py
- [X] T009 [P] [US52] `US-52 S1`, `US-52 S3` and `US-52 S4` in frontend/src/pages/LoginPage.test.tsx (Google script mocked)

### Implementation for US-52

- [X] T010 [US52] `verify_google_id_token` in backend/app/services/google.py (PyJWKClient; checks the signature, `aud`, `iss`, `exp` and `email_verified`)
- [X] T011 [US52] `GoogleCredential` schema in backend/app/schemas/auth.py and `POST /api/auth/comensal/google` in backend/app/api/auth.py (200 / 401 / 404, contract)
- [X] T012 [US52] `make api-types`
- [X] T013 [US52] frontend/src/lib/google.ts: the client ID and a loader for `https://accounts.google.com/gsi/client`
- [X] T014 [US52] frontend/src/components/access/GoogleSignInButton.tsx (renders Google's button, posts the credential, signs in or shows the error) and its export in index.ts
- [X] T015 [US52] Show the button on the diner side of frontend/src/pages/LoginPage.tsx, with a link to `/registrarme` when there is no account
- [X] T016 [US52] Add the button to the design guide (the `/diseno` catalog doesn't show the access components)

**Checkpoint**: US-52 S1–S4 pass; it can be demoed.

---

## Phase 3: US-51 — Recibir mail de verificación

**Goal**: a newly registered diner verifies their email with a link. Signing in with Google also verifies.

**Independent Test**: quickstart, section US-51.

### Tests for US-51 (and US-52 S5)

- [X] T017 [P] [US51] Memory mail outbox fixture in backend/tests/conftest.py
- [X] T018 [P] [US51] `test_us51_s1_…`, `test_us51_s2_…`, `test_us51_s3_…`, `test_us51_s4_…`, `test_us51_s6_…`, `test_us51_s7_…`, `test_us51_edge_used_link_reports_already_verified` and `test_us51_edge_mail_failure_still_creates_the_account` in backend/tests/test_email_verification.py
- [X] T019 [P] [US52] `test_us52_s5_google_sign_in_verifies_the_account` in backend/tests/test_google_sign_in.py
- [X] T020 [P] [US51] `US-51 S3` and `US-51 S4` in frontend/src/pages/VerifyEmailPage.test.tsx. `US-51 S7` in frontend/src/components/access/UnverifiedNotice.test.tsx. `US-51 S1` in frontend/src/pages/AuthPages.test.tsx

### Implementation for US-51

- [X] T021 [US51] `email_verified_at` in backend/app/models/diner.py and the `EmailVerification` model in backend/app/models/email_verification.py (data model)
- [X] T022 [US51] `make migration m="email verification"`, with the backfill that marks existing diners as verified, reviewed by hand
- [X] T023 [US51] backend/app/services/mail.py: `send_mail` with the `console`, `memory` and `ses` backends
- [X] T024 [US51] backend/app/services/email_verification.py: create or replace the link (hashed token, 24 h), verify a token, the verification mail in Spanish (text and HTML)
- [X] T025 [US51] Registration sends the mail (backend/app/api/auth.py). Add backend/app/api/email_verification.py with `POST /comensales/verificacion` and `/verificacion/reenvio`, mounted in backend/app/api/__init__.py
- [X] T026 [US51] `email_verificado` in `DinerResponse` and `AccountResponse` (schemas, backend/app/api/account.py)
- [X] T027 [US52] Google sign-in marks the diner as verified (backend/app/api/auth.py)
- [X] T028 [US51] `make api-types`
- [X] T029 [US51] frontend/src/pages/VerifyEmailPage.tsx at `/verificar-email` (frontend/src/router.tsx)
- [X] T030 [US51] frontend/src/components/access/UnverifiedNotice.tsx with "Reenviar mail de verificación", shown in frontend/src/pages/home/DinerHome.tsx
- [X] T031 [US51] "Revisá tu mail" after registering, in frontend/src/pages/RegisterPage.tsx

**Checkpoint**: US-51 S1–S4, S6, S7 and US-52 S5 pass.

---

## Phase 4: Production

- [X] T032 `MAIL_BACKEND=ses` and `APP_BASE_URL=https://servido.discordia.fyi` for the api service in infra/ec2/compose.yml
- [ ] T033 Apply infra/terraform/mail.tf, add the DKIM CNAMEs in Cloudflare and request SES production access (quickstart; done by Mateo)
- [X] T034 Document SES in infra/README.md (table of pieces, "Accounts outside AWS", day-to-day)
- [X] T035 Update AGENTS.md (auth with Google; new endpoints and route) and specs/README.md (007 implemented)
- [X] T037 `smtp` mail backend (team Gmail) as the fallback while SES has no production access, switched on by the SSM parameter `smtp-password` in infra/ec2/deploy.sh
- [ ] T036 `make format lint test`, then check the quickstart in production

## Dependencies & Execution Order

- **Phase 1** blocks everything.
- **US-52 (Phase 2)** doesn't need US-51.
- **US-51 (Phase 3)** needs T021–T022 before T024–T027.
- **Phase 4** needs both stories. T033 can start any time: it's waiting for AWS.
- Tests of each phase are written before its implementation and fail first.

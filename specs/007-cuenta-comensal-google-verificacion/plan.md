# Implementation Plan: Google sign-in and email verification

**Feature**: `specs/007-cuenta-comensal-google-verificacion` | **Date**: 2026-10-24 | **Spec**: [spec.md](spec.md) | **US**: US-52, US-51 | **Sprint**: 2

**Input**: Feature specification from `/specs/007-cuenta-comensal-google-verificacion/spec.md`

## Summary

**US-52** adds a "Sign in with Google" button to the diner login.
- The button gives the page a Google ID token, which the API verifies (signature, audience, issuer, expiry, verified email).
- The API then signs in the diner whose email matches, with the same session token as the password login.
- If no diner has that email, the API answers 404. If the token is invalid, it answers 401.

**US-51** sends a verification link by mail when a diner registers.
- The mail goes out through Amazon SES, from `no-reply@servido.discordia.fyi`.
- The link opens a page that verifies the email. A signed-in diner who isn't verified sees a notice with a resend button.
- Signing in with Google also verifies the account.

Everything runs inside the request: no queues or workers. US-52 is built first. Its scenario S5 lands with US-51, because S5 needs the verification state.

## Technical Context

**Language/Version**: Python 3.12 (backend) · TypeScript (frontend)

**Primary Dependencies**: FastAPI, SQLAlchemy 2, Alembic, Pydantic · React, Vite, React Router, TanStack Query, openapi-fetch, the design system in `frontend/src/components/` (see `docs/design/README.md`)

**Storage**: PostgreSQL 17 in Docker (locally, in CI and on the production instance)

**Testing**: pytest against a real Postgres in `backend/tests/` · Vitest + Testing Library in `frontend/src/**/*.test.tsx`

**Target Platform**: Mobile-first web app: static SPA plus JSON API under `/api`

**Project Type**: Web application (backend + frontend)

**Performance Goals**: Only the spec's success criteria (SC-001 sign-in under 15 s, SC-003 mail within 2 min)

**Constraints**: Single AWS free-plan account; the client secret is never used; no long-lived AWS keys

**Scale/Scope**:
- Endpoints: 3 new (`POST /api/auth/comensal/google`, `POST /api/comensales/verificacion`, `POST /api/comensales/verificacion/reenvio`), and 2 changed (`POST /api/comensales` sends the mail; `GET /api/me` adds `email_verificado`).
- Data: 1 new column and 1 new table.
- UI: 1 new page (`/verificar-email`), the Google button on the login, and the unverified notice.
- Infrastructure: 1 SES identity and 1 IAM policy.

**New dependencies**:
- `pyjwt[crypto]` adds `cryptography`, which Google's RS256 signatures need. PyJWT itself is already used for our tokens. See research R2.
- `boto3`, to send mail through SES with the instance role, without stored keys. See research R6.
- Frontend: none. The Google button script loads from `accounts.google.com` at runtime and isn't an npm package.

**Open clarifications**: none in the spec.
- The two questions were answered by the team on 24/10 (resend; Google verifies the account) and are pending PO validation.
- Assumptions taken: link valid 24 h; existing accounts count as verified.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Pass |
| --- | --- | --- |
| I. Backlog-bound scope | Builds only US-52 and US-51. No caching beyond the in-memory Google keys PyJWT already handles. No queues: the mail is sent in the request. | [x] |
| II. Spec before code | Spec 007 has no open clarifications. The PO has not validated it yet (the 24/10 decisions are flagged). **On 24/10 the PM (Mateo) accepted coding US-52 and US-51 before that validation; anything the PO changes is adjusted afterwards.** | [x] (risk accepted) |
| III. Every scenario tested | Every scenario is in the map below. US-51 S5 is tested by US-17, which adds orders. One active link per diner is a unique constraint. | [x] |
| IV. Humans own AI output | Three small endpoints, one table, one page. Each piece fits in a short review. | [x] |
| V. Simple, cheap, conventional | Two justified dependencies. SES is a new AWS service, so it gets ADR 0009, which also records Google as an identity provider for sign-in. Both are free at this volume. | [x] |

**Post-design re-check**: unchanged. Gate II passes on the PM's accepted risk until the PO validates spec 007.

## Acceptance Scenario → Test Map

| Scenario | Test | Layer |
| --- | --- | --- |
| US-52 S1 — the diner login offers "Ingresar con Google" | `frontend/src/pages/LoginPage.test.tsx` › `US-52 S1 offers Google sign-in to diners` | Frontend |
| US-52 S2 — valid Google token with an existing diner signs in | `backend/tests/test_google_sign_in.py::test_us52_s2_google_account_with_a_diner_signs_in` | Backend |
| US-52 S3 — no diner with that email: says so, no access, offers to create it | `backend/tests/test_google_sign_in.py::test_us52_s3_google_account_without_a_diner_is_not_found` · `LoginPage.test.tsx` › `US-52 S3 offers to create an account when there is none` and `US-52 S3 creates the account with the same Google account` | Both |
| US-52 S4 — invalid token: no access, notice shown | `backend/tests/test_google_sign_in.py::test_us52_s4_invalid_google_token_is_rejected` (bad signature, audience, issuer, expired, unverified email) · `LoginPage.test.tsx` › `US-52 S4 shows that Google sign-in failed` | Both |
| US-52 S5 — Google sign-in verifies an unverified diner | `backend/tests/test_google_sign_in.py::test_us52_s5_google_sign_in_verifies_the_account` | Backend |
| US-58 S1 — the diner sign-up offers "Registrarse con Google" | `frontend/src/pages/AuthPages.test.tsx` › `US-58 S1 offers Google sign-up to diners` | Frontend |
| US-58 S2 — creates a verified account from Google and signs it in | `backend/tests/test_google_sign_up.py::test_us58_s2_google_account_creates_a_verified_diner` · `AuthPages.test.tsx` › `US-58 S2 signs in the new account` | Both |
| US-58 S3 — asks for the name when Google gives none | `test_google_sign_up.py::test_us58_s3_missing_name_is_asked_for` · `AuthPages.test.tsx` › `US-58 S3 asks for the name Google did not give` | Both |
| US-58 S4 — invalid token: no account | `test_google_sign_up.py::test_us58_s4_invalid_google_token_creates_nothing` | Backend |
| US-58 S5 — an existing email: no second account, offers to sign in | `test_google_sign_up.py::test_us58_s5_existing_email_is_not_registered_again` · `AuthPages.test.tsx` › `US-58 S5 offers to sign in when the account exists` | Both |
| Edge — an account created with Google has no password | `test_google_sign_up.py::test_us58_edge_google_account_has_no_password` | Backend |
| US-51 S1 — registering sends the mail | `backend/tests/test_email_verification.py::test_us51_s1_registration_sends_a_verification_mail` · `RegisterPage` toast check in `AuthPages.test.tsx` › `US-51 S1 asks to check the mail after registering` | Both |
| US-51 S2 — the mail contains a verification link | `test_email_verification.py::test_us51_s2_mail_contains_the_verification_link` | Backend |
| US-51 S3 — a valid link verifies the account | `test_email_verification.py::test_us51_s3_valid_link_verifies_the_account` · `VerifyEmailPage.test.tsx` › `US-51 S3 confirms the verification` | Both |
| US-51 S4 — an invalid or expired link does not verify | `test_email_verification.py::test_us51_s4_invalid_or_expired_link_is_rejected` · `VerifyEmailPage.test.tsx` › `US-51 S4 says the link is not valid` | Both |
| US-51 S5 — no orders until verified | Deferred to US-17 (orders): `test_us51_s5_unverified_diner_cannot_order` lands with the orders spec | Backend |
| US-51 S6 — no second account for an unverified email | `test_email_verification.py::test_us51_s6_unverified_email_cannot_register_again` | Backend |
| US-51 S7 — resend sends a new link and voids the old one | `test_email_verification.py::test_us51_s7_resend_replaces_the_previous_link` · `UnverifiedNotice.test.tsx` › `US-51 S7 resends the verification mail` | Both |
| Edge — a used link reports "ya verificado" | `test_email_verification.py::test_us51_edge_used_link_reports_already_verified` | Backend |
| Edge — a restaurant with that email does not sign in as a diner | `test_google_sign_in.py::test_us52_edge_restaurant_email_does_not_sign_in` | Backend |
| Edge — a failed send still creates the account | `test_email_verification.py::test_us51_edge_mail_failure_still_creates_the_account` | Backend |

Google's keys are never fetched in tests. The tests sign ID tokens with a local RSA key and replace the key lookup. The mail backend in tests is `memory`.

## Project Structure

### Documentation (this feature)

```text
specs/007-cuenta-comensal-google-verificacion/
├── spec.md              # Spanish, pending PO validation
├── plan.md              # This file
├── research.md          # Decisions R1–R10
├── data-model.md        # email_verified_at and email_verifications
├── quickstart.md        # Local and production checks
├── contracts/accounts-api.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
backend/
├── app/api/auth.py                      # ~ POST /auth/comensal/google and /comensales/google; registration sends the mail
├── app/api/email_verification.py        # + POST /comensales/verificacion and /verificacion/reenvio; ~ app/api/__init__.py
├── app/api/account.py                   # ~ email_verificado in /me
├── app/models/diner.py                  # ~ email_verified_at
├── app/models/email_verification.py     # + EmailVerification; ~ app/models/__init__.py
├── app/schemas/auth.py                  # ~ GoogleCredential, email_verificado in DinerResponse and AccountResponse
├── app/services/google.py               # + verify_google_id_token (PyJWKClient, the claim checks)
├── app/services/email_verification.py   # + create or replace the link, verify a token
├── app/services/mail.py                 # + send_mail with the console / memory / ses backends
├── app/config.py                        # ~ google_client_id, mail_backend, mail_from, app_base_url
├── migrations/versions/[generated].py   # + email_verified_at (backfilled) and email_verifications
├── tests/conftest.py                    # ~ memory mail outbox, Google key fixture
├── tests/test_google_sign_in.py         # +
└── tests/test_email_verification.py     # +
frontend/
├── src/api/openapi.json, schema.d.ts    # ~ `make api-types`
├── src/lib/google.ts                    # + client ID and the loader for the Google script
├── src/components/access/GoogleButton.tsx        # + renders Google's button and hands back the credential
├── src/components/access/GoogleSignInButton.tsx  # + signs in; offers to create the account (US-58)
├── src/components/access/GoogleSignUpButton.tsx  # + creates the account (US-58)
├── src/components/access/useGoogleSignUp.ts      # + posts the credential; GoogleSignUpFeedback.tsx asks for a missing name
├── src/components/access/UnverifiedNotice.tsx    # + notice with "Reenviar mail de verificación"
├── src/pages/LoginPage.tsx              # ~ Google button for diners, + LoginPage.test.tsx
├── src/pages/RegisterPage.tsx           # ~ "revisá tu mail" after registering; Google sign-up
├── src/pages/VerifyEmailPage.tsx        # + /verificar-email, with its test
├── src/pages/home/DinerHome.tsx         # ~ shows UnverifiedNotice
└── src/router.tsx                       # ~ /verificar-email
infra/terraform/
├── mail.tf                              # + aws_sesv2_email_identity (Easy DKIM) and the instance's ses:SendEmail policy
└── outputs.tf                           # ~ ses_dkim_records
infra/ec2/compose.yml                    # ~ MAIL_BACKEND=ses, APP_BASE_URL for the api service
docs/decisions/0009-google-sign-in-and-ses-mail.md  # +
```

**Structure Decision**: The standard layout. The Google button and the notice go in `components/access/` because more than one page uses them. Services hold the token checks and the mail backends so the routers stay thin.

## Complexity Tracking

No violations to justify.

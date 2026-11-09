# Implementation Plan: Recovering a diner account

**Feature**: `specs/013-recuperar-cuenta-comensal` | **Date**: 2026-11-09 | **Spec**: [spec.md](spec.md) | **US**: US-31 | **Sprint**: 4

**Input**: Feature specification from `/specs/013-recuperar-cuenta-comensal/spec.md`

## Summary

US-31 lets a diner who forgot their password get back into their account with a mailed link.

- `POST /api/comensales/recuperacion` takes an email address and always answers the same, whether or not the address has an account. Only when it does, it mails a link.
- The link carries a one-time token that expires 15 minutes after it was sent. Opening it checks the token and then sets a new password.
- The new password follows the same rules as registration. The old one stops working, and the sessions opened before the change are closed.
- Accounts created with Google have no password: their mail tells them to sign in with Google instead of offering a link.
- Requests are limited to 5 per email every 30 minutes, and the response doesn't say whether the address is registered.

Everything happens inside the request: no queues, no workers, no scheduled cleanup. Mail goes through the same `app/services/mail.py` as US-51.

## Technical Context

**Language/Version**: Python 3.12 (backend) · TypeScript (frontend)

**Primary Dependencies**: FastAPI, SQLAlchemy 2, Alembic, Pydantic · React, Vite, React Router, TanStack Query, openapi-fetch, the design system in `frontend/src/components/` (see `docs/design/README.md`)

**Storage**: PostgreSQL 17 in Docker (locally, in CI and on the production instance)

**Testing**: pytest against a real Postgres in `backend/tests/` · Vitest + Testing Library in `frontend/src/**/*.test.tsx`

**Target Platform**: Mobile-first web app: static SPA plus JSON API under `/api`

**Project Type**: Web application (backend + frontend)

**Performance Goals**: Only the spec's success criteria (SC-001 recovery under 3 minutes, SC-002 no reusable or late link)

**Constraints**: Single AWS free-plan account; no new dependency and no new AWS service (mail already works through SES/SMTP, spec 019); no secrets in the repository

**Scale/Scope**:
- Endpoints: 3 new (`POST /api/comensales/recuperacion`, `POST /api/comensales/recuperacion/validacion`, `PUT /api/comensales/recuperacion`).
- Data: 2 new columns on `comensales` and 2 new tables.
- UI: 2 new pages (`/recuperar` and `/restablecer`), one link on `/ingresar`.
- Mail: 2 new messages (link for a password account, "use Google" for a Google account).

**New dependencies**: none.

**Open clarifications**: none in the spec. The three team proposals (same message for unknown emails, closing sessions, rate limit) are in `spec.md` and `specs/README.md` and wait for the PO.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Pass |
| --- | --- | --- |
| I. Backlog-bound scope | Builds only US-31. No caching, queues or workers: the mail is sent in the request, the rate limit is a table of recent requests, and the expired links are only checked when used. | [x] |
| II. Spec before code | Spec 013 has no open clarifications. The PO has not validated the three team proposals yet; **the team implements them for the Sprint 4 defence and adjusts whatever the PO changes.** | [x] (risk accepted) |
| III. Every scenario tested | Every scenario and edge case is in the map below, backend and frontend. One active link per diner and the rate-limit count are covered by tests, not only by constraints. | [x] |
| IV. Humans own AI output | Three small endpoints, two small pages, two tables that copy `email_verifications` (spec 019). Each piece fits in a short review. | [x] |
| V. Simple, cheap, conventional | No dependency, no new AWS service, no new secret. The link token and the mail reuse what US-51 already built. | [x] |

**Post-design re-check**: unchanged. Gate II passes on the accepted risk until the PO validates the team's proposals.

## Acceptance Scenario → Test Map

| Scenario | Test | Layer |
| --- | --- | --- |
| US-31 S1 — asking to recover with a registered email says a mail will arrive | `backend/tests/test_account_recovery.py::test_us31_s1_request_with_a_registered_email_is_accepted` · `RecoverAccountPage.test.tsx` › `US-31 S1 says that a mail will arrive if the account exists` | Both |
| US-31 S2 — an existing account gets a mail with a link | `test_account_recovery.py::test_us31_s2_mail_contains_the_recovery_link` | Backend |
| US-31 S3 — opening the link allows setting a new password | `test_account_recovery.py::test_us31_s3_valid_link_sets_a_new_password` · `ResetPasswordPage.test.tsx` › `US-31 S3 shows the form for a valid link` and `US-31 S3 changes the password and invites to sign in` | Both |
| US-31 S4 — a password that breaks the rules is reported and not saved | `test_account_recovery.py::test_us31_s4_weak_password_is_reported_and_not_saved` · `ResetPasswordPage.test.tsx` › `US-31 S4 reports every password rule the API rejected` | Both |
| US-31 S5 — sign-in works with the new password | `test_account_recovery.py::test_us31_s5_sign_in_uses_the_new_password` | Backend |
| US-31 S6 — a used link is refused and a new one can be asked for | `test_account_recovery.py::test_us31_s6_used_link_is_refused` · `ResetPasswordPage.test.tsx` › `US-31 S6 says the link no longer works and offers a new one` | Both |
| US-31 S7 — a link older than 15 minutes is refused | `test_account_recovery.py::test_us31_s7_expired_link_is_refused` · `ResetPasswordPage.test.tsx` › (same test as S6, checking the message) | Both |
| US-31 S8 — an unknown email gets the same message and no mail | `test_account_recovery.py::test_us31_s8_unknown_email_gets_the_same_message` | Backend |
| Edge — a new request voids the previous link | `test_us31_edge_a_new_request_voids_the_previous_link` | Backend |
| Edge — a Google account is told to sign in with Google | `test_us31_edge_google_account_is_told_to_use_google` | Backend |
| Edge — an unverified email can still recover | `test_us31_edge_unverified_diner_can_recover` | Backend |
| Edge — 5 requests per 30 minutes, then 429 for known and unknown emails | `test_us31_edge_sixth_request_in_half_an_hour_is_limited` | Backend |
| Edge — a send failure is reported and can be retried | `test_us31_edge_mail_failure_is_reported` | Backend |
| Edge — an invalid email format is rejected | `test_us31_edge_invalid_email_is_reported` | Backend |
| Edge — the password change closes the open sessions | `test_us31_edge_password_change_closes_open_sessions` | Backend |
| Edge — a double click sends one mail | `RecoverAccountPage.test.tsx` › `US-31 edge a double click asks for one mail` | Frontend |
| Edge — the login offers the recovery to diners only | `LoginPage.test.tsx` › `US-31 S1 offers the recovery to diners` | Frontend |

The mail backend in tests is `memory` (spec 019), so the tests read the link from the outbox.

## Project Structure

### Documentation (this feature)

```text
specs/013-recuperar-cuenta-comensal/
├── spec.md              # Spanish, pending PO validation of the team proposals
├── plan.md              # This file
├── research.md          # Decisions R1–R10
├── data-model.md        # has_password, password_changed_at, password_resets, password_reset_requests
├── quickstart.md        # Local checks
├── contracts/account-recovery-api.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
backend/
├── app/api/account_recovery.py          # + the three endpoints; ~ app/api/__init__.py
├── app/api/deps.py                      # ~ require_diner rejects tokens issued before a password change
├── app/api/account.py                   # ~ /me rejects those tokens too
├── app/api/auth.py                      # ~ Google sign-up stores has_password = false
├── app/api/email_verification.py        # ~ resend rejects those tokens too
├── app/models/diner.py                  # ~ has_password, password_changed_at
├── app/models/password_reset.py         # + PasswordReset, PasswordResetRequest; ~ app/models/__init__.py
├── app/schemas/auth.py                  # ~ RecoveryRequest, RecoveryLinkRequest, PasswordResetRequest
├── app/services/password_recovery.py    # + link issue/check, rate limit, mails
├── migrations/versions/[generated].py   # + the two columns and the two tables
└── tests/test_account_recovery.py       # +
frontend/
├── src/api/openapi.json, schema.d.ts    # ~ `make api-types`
├── src/api/passwordRecovery.ts          # + the three calls
├── src/pages/RecoverAccountPage.tsx     # + /recuperar, with its test
├── src/pages/ResetPasswordPage.tsx      # + /restablecer, with its test
├── src/pages/LoginPage.tsx              # ~ "¿Olvidaste tu contraseña?" for diners
└── src/router.tsx                       # ~ the two routes
docs/design/README.md                    # ~ the recovery pages in the access section
```

**Structure Decision**: The standard layout. The service holds the token, the rate limit and the mails so the router stays thin, like `email_verification.py`. The two pages are separate because one is opened from the login and the other from the mail, and a diner who opens a link by hand must not land on the form that asks for their email again.

## Complexity Tracking

No violations to justify.

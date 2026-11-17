# Implementation Plan: Restaurant account verification and recovery

**Feature**: `specs/026-validacion-recuperacion-restaurante` | **Date**: 2026-11-12 | **Spec**: [spec.md](spec.md) | **US**: US-44, US-46 | **Sprint**: 5

**Input**: Feature specification from `/specs/026-validacion-recuperacion-restaurante/spec.md`

## Summary

**US-44** makes a newly registered restaurant verify its email before diners can see it.
- `POST /api/restaurantes` sends a verification link by mail, like `POST /api/comensales`
  (spec 019).
- The link opens `/restaurante/verificar-email`, which marks the account as verified.
- Until then the restaurant is hidden from the diners' map, list, detail and booking
  (FR-005), but the Responsable can sign in, configure the restaurant and resend the mail
  from the dashboard.
- A restaurant created with Google is verified from the start: Google already proved the
  address (same rule as US-58 for diners).

**US-46** lets the Responsable recover the account with a mailed link, the way a diner
does (spec 013, US-31).
- `POST /api/restaurantes/recuperacion` always answers the same, whether or not the email
  has an account, and mails a link only when it does.
- The link lives 15 minutes, works once and is replaced by every new request. The form of
  `/restaurante/restablecer` sets a new password with the same rules as registration, and
  the sessions opened before the change are closed.
- A restaurant that hasn't verified its email gets the verification link instead of the
  recovery one (FR-009); one created with Google is told to sign in with Google.

The behaviour is the same as the diner's, and so is the UI: the same two pages and the same
verification page, opened for the `restaurant` role. Everything happens inside the request:
no queues, no workers. Mail goes through `app/services/mail.py`, already used by specs 013
and 019.

## Technical Context

**Language/Version**: Python 3.12 (backend) · TypeScript (frontend)

**Primary Dependencies**: FastAPI, SQLAlchemy 2, Alembic, Pydantic · React, Vite, React Router, TanStack Query, openapi-fetch, the design system in `frontend/src/components/` (see `docs/design/README.md`)

**Storage**: PostgreSQL 17 in Docker (locally, in CI and on the production instance)

**Testing**: pytest against a real Postgres in `backend/tests/` · Vitest + Testing Library in `frontend/src/**/*.test.tsx`

**Target Platform**: Mobile-first web app: static SPA plus JSON API under `/api`

**Project Type**: Web application (backend + frontend)

**Performance Goals**: Only the spec's success criteria (SC-001 mail under 1 minute, SC-003 every refused link offers a new one, SC-006 recovery under 5 minutes)

**Constraints**: Single AWS free-plan account; no new dependency, AWS service or secret (mail already works through SES/SMTP, spec 019); no secrets in the repository

**Scale/Scope**:
- Endpoints: 5 new (`POST /api/restaurantes/verificacion`, `POST /api/restaurantes/verificacion/reenvio`, and the three of `/api/restaurantes/recuperacion`), and 3 changed (`POST /api/restaurantes` sends the mail, `POST /api/restaurantes/google` marks the account verified, `GET /api/me` reports it).
- Data: 3 new columns on `restaurantes` and 2 new tables; the rate-limit table of spec 013 is reused.
- UI: 3 new routes (`/restaurante/verificar-email`, `/restaurante/recuperar`, `/restaurante/restablecer`) that reuse the three diner pages with a role, a notice in the restaurant dashboard and the recovery link on the restaurant side of `/ingresar`.
- Mail: 2 new messages (verification and recovery) plus the "use Google" variant of spec 013.

**New dependencies**: none.

**Open clarifications**: none in the spec. The proposals written in `spec.md` (24 h and 15 min links, 60 seconds between requests, neutral message, closing sessions, dashboard notice) are recorded in `specs/README.md` and wait for the PO.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Pass |
| --- | --- | --- |
| I. Backlog-bound scope | Builds only US-44 and US-46. No caching, queues or workers: the mail is sent in the request, the limits are counted in the table spec 013 already has, and expired links are only checked when used. | [x] |
| II. Spec before code | Spec 026 has no open clarifications. The PO has not validated the proposals it contains; **the team implements them for the Sprint 5 defence and adjusts whatever the PO changes.** | [x] (risk accepted) |
| III. Every scenario tested | Every scenario and edge case is in the map below, backend and frontend. One active link per account, the limits and the hidden restaurant are covered by tests, not only by constraints. | [x] |
| IV. Humans own AI output | Two small routers, two small services that mirror the diner's, one migration and three pages reused with a role. Each piece fits in a short review. | [x] |
| V. Simple, cheap, conventional | No dependency, no new AWS service, no new secret. The token, the mail, the pages and the rate limit reuse what specs 013 and 019 built. | [x] |

**Post-design re-check**: unchanged. Gate II passes on the accepted risk until the PO validates the team's proposals.

## Acceptance Scenario → Test Map

| Scenario | Test | Layer |
| --- | --- | --- |
| US-44 S1 — completing the registration sends the verification mail | `backend/tests/test_restaurant_verification.py::test_us44_s1_registration_sends_a_verification_mail` · `frontend/src/pages/AuthPages.test.tsx` › `US-44 S1 asks the restaurant to check the verification mail` | Both |
| US-44 S2 — a valid link verifies the account and says so | `test_restaurant_verification.py::test_us44_s2_valid_link_verifies_the_account` · `VerifyEmailPage.test.tsx` › `US-44 S2 verifies the restaurant with the link of its mail` | Both |
| US-44 S3 — an invalid or expired link is reported and a new one can be asked for | `test_restaurant_verification.py::test_us44_s3_invalid_or_expired_link_is_rejected` · `VerifyEmailPage.test.tsx` › `US-44 S3 says the restaurant link is not valid` | Both |
| US-44 S4 — asking for a new link mails it and voids the old one | `test_restaurant_verification.py::test_us44_s4_resend_replaces_the_previous_link` · `UnverifiedNotice.test.tsx` › `US-44 S4 resends the verification mail of the restaurant` | Both |
| US-44 S5 — an unverified restaurant is not visible to diners | `test_restaurant_verification.py::test_us44_s5_unverified_restaurant_is_hidden` | Backend |
| US-44 S6 — a verified restaurant is visible again | `test_restaurant_verification.py::test_us44_s6_verified_restaurant_is_visible` | Backend |
| Edge — a restaurant created with Google starts verified | `test_restaurant_verification.py::test_us44_edge_google_restaurant_starts_verified` | Backend |
| Edge — a used link reports "ya estaba verificado" | `test_restaurant_verification.py::test_us44_edge_used_link_reports_already_verified` | Backend |
| Edge — the link never signs in | `test_restaurant_verification.py::test_us44_edge_the_link_does_not_sign_in` | Backend |
| Edge — a failed send still creates the account and can be retried | `test_restaurant_verification.py::test_us44_edge_mail_failure_still_creates_the_account` | Backend |
| Edge — only the signed-in restaurant resends | `test_restaurant_verification.py::test_us44_edge_resend_is_only_for_unverified_restaurants` | Backend |
| Edge — the dashboard asks to verify the email | `HomePage.test.tsx` › `US-44 S3 tells an unverified restaurant that it is still hidden` | Frontend |
| US-46 S1 — asking for the recovery is accepted | `backend/tests/test_restaurant_recovery.py::test_us46_s1_request_with_a_registered_email_is_accepted` · `RecoverAccountPage.test.tsx` › `US-46 S1 asks for the recovery of a restaurant account` · `LoginPage.test.tsx` › `US-46 S1 offers the recovery to restaurants` | Both |
| US-46 S2 — an existing account gets a mail with instructions | `test_restaurant_recovery.py::test_us46_s2_mail_contains_the_recovery_instructions` | Backend |
| US-46 S3 — an unknown email gets the same message and no mail | `test_restaurant_recovery.py::test_us46_s3_unknown_email_gets_the_same_message_and_no_mail` | Backend |
| US-46 S4 — a valid link sets a new password | `test_restaurant_recovery.py::test_us46_s4_valid_link_sets_a_new_password` · `ResetPasswordPage.test.tsx` › `US-46 S4 sets a new password for the restaurant account` | Both |
| US-46 S5 — a weak password is reported and not saved | `test_restaurant_recovery.py::test_us46_s5_weak_password_is_reported_and_not_saved` · `ResetPasswordPage.test.tsx` › `US-46 S5 reports the restaurant password rules the API rejected` | Both |
| US-46 S6 — the old password stops working | `test_restaurant_recovery.py::test_us46_s6_the_previous_password_stops_working` | Backend |
| US-46 S7 — the new password signs in | `test_restaurant_recovery.py::test_us46_s7_sign_in_uses_the_new_password` · `ResetPasswordPage.test.tsx` › `US-46 S7 invites the restaurant to sign in with the new password` | Both |
| Edge — a used or expired link is refused and a new one can be asked for | `test_restaurant_recovery.py::test_us46_edge_used_link_is_refused_and_a_new_one_can_be_asked_for` and `…_expired_link_is_refused_and_a_new_one_can_be_asked_for` | Backend |
| Edge — a new request voids the previous link | `test_us46_edge_a_new_request_voids_the_previous_link` | Backend |
| Edge — an unverified account gets the verification link | `test_us46_edge_unverified_account_gets_a_verification_link` | Backend |
| Edge — a Google account is told to sign in with Google | `test_us46_edge_google_account_is_told_to_use_google` | Backend |
| Edge — at least 60 seconds between requests | `test_us46_edge_a_second_request_within_a_minute_is_refused` | Backend |
| Edge — 5 requests per 30 minutes | `test_us46_edge_sixth_request_in_half_an_hour_is_limited` | Backend |
| Edge — a send failure keeps the neutral answer | `test_us46_edge_mail_failure_keeps_the_neutral_answer` | Backend |
| Edge — an invalid email format is rejected | `test_us46_edge_invalid_email_is_reported` | Backend |
| Edge — an invalid link is reported | `test_us46_edge_invalid_link_is_reported` | Backend |
| Edge — the email is matched without case | `test_us46_edge_the_email_is_matched_without_case` | Backend |
| Edge — the link does not sign in | `test_us46_edge_the_link_does_not_sign_in` | Backend |
| Edge — the password change closes the open sessions | `test_us46_edge_password_change_closes_open_sessions` | Backend |
| Edge — the password is never returned | `test_us46_edge_the_password_is_never_returned` | Backend |

The mail backend in tests is `memory` (spec 019), so the tests read the link from the outbox. The 60-second interval is skipped by moving the rows of `password_reset_requests` back in time, like the expiry test of spec 013 does with `password_resets`.

## Project Structure

### Documentation (this feature)

```text
specs/026-validacion-recuperacion-restaurante/
├── spec.md              # Spanish, pending PO validation of the team proposals
├── plan.md              # This file
├── research.md          # Decisions R1–R12
├── data-model.md        # 3 columns on restaurantes, 2 tables, the shared rate limit
├── quickstart.md        # Local checks
├── contracts/restaurant-access-api.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
backend/
├── app/api/restaurant.py                     # ~ registration sends the mail; Google marks verified; restaurant_from_claims checks the password's generation
├── app/api/restaurant_verification.py        # + POST /restaurantes/verificacion and /verificacion/reenvio
├── app/api/restaurant_recovery.py            # + the three endpoints of /restaurantes/recuperacion
├── app/api/__init__.py                       # ~ mount the two routers
├── app/api/account.py                        # ~ email_verificado and the session check for restaurants
├── app/api/deps.py                           # ~ session_is_current for any account
├── app/api/dish.py                           # ~ the dish endpoints use restaurant_from_claims
├── app/api/auth.py                           # ~ restaurant_session passes password_changed_at
├── app/models/restaurant.py                  # ~ email_verified_at, has_password, password_changed_at
├── app/models/restaurant_access.py           # + RestaurantEmailVerification, RestaurantPasswordReset
├── app/models/__init__.py                    # ~ export the two models
├── app/schemas/restaurant.py                 # ~ email_verificado in RestaurantResponse
├── app/services/availability.py              # ~ bookable_condition requires a verified account
├── app/services/restaurant_verification.py   # + link, verification and mail
├── app/services/restaurant_recovery.py       # + link, limits, states and mail
├── app/services/password_recovery.py         # ~ reusable helpers (shared, unchanged behaviour)
├── app/services/email_verification.py        # ~ reusable link state (shared, unchanged behaviour)
├── migrations/versions/[generated].py        # + the three columns (with a backfill) and the two tables
├── scripts/seed.py                           # ~ the demo restaurant starts verified
└── tests/test_restaurant_verification.py     # +
    tests/test_restaurant_recovery.py         # +
frontend/
├── src/api/openapi.json, schema.d.ts         # ~ `make api-types`
├── src/api/session.ts                        # ~ restaurantAccount with email_verificado
├── src/api/passwordRecovery.ts               # ~ the three calls with a role
├── src/pages/RecoverAccountPage.tsx          # ~ role: diner or restaurant
├── src/pages/ResetPasswordPage.tsx           # ~ role: diner or restaurant
├── src/pages/VerifyEmailPage.tsx             # ~ role: diner or restaurant
├── src/pages/RestaurantRegisterPage.tsx      # ~ asks to check the mail after registering
├── src/pages/LoginPage.tsx                   # ~ the recovery link for both roles
├── src/pages/home/RestaurantHome.tsx         # ~ the unverified notice and the account status
├── src/components/access/UnverifiedNotice.tsx# ~ resend for both roles
└── src/router.tsx                            # ~ the three routes
docs/design/README.md                         # ~ the three pages in the access section
```

**Structure Decision**: The standard layout. The two services mirror `email_verification.py`
and `password_recovery.py`, reusing the token helpers, the link state and the rate-limit
count of the diner, so the same criteria give the same code paths. The three pages take a
`role` instead of being copied: the layout, the styles and the double-click guard are the
same, and only the texts, the endpoints and the return link change.

## Complexity Tracking

No violations to justify.

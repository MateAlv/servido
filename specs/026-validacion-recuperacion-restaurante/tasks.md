# Tasks: Restaurant account verification and recovery

**Input**: Design documents from `/specs/026-validacion-recuperacion-restaurante/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/restaurant-access-api.md

**Tests**: REQUIRED. Every acceptance scenario and edge case has a test named after its US and
scenario (plan, test map).

**Organization**: one phase for the data, one for US-44, one for US-46, one for the frontend
and one for the documentation. The frontend can start once the contract is fixed.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Foundational

- [x] T001 Add `email_verified_at`, `has_password` and `password_changed_at` to backend/app/models/restaurant.py (data-model.md)
- [x] T002 Add `RestaurantEmailVerification` and `RestaurantPasswordReset` in backend/app/models/restaurant_access.py and export them in backend/app/models/__init__.py
- [x] T003 `make migration m="restaurant verification and recovery"`, reviewed by hand: the three columns, the backfill that verifies existing restaurants, the two tables and their constraints (data-model.md)

**Checkpoint**: `make migrate` runs on an empty database.

---

## Phase 2: US-44 — Validación de cuenta (backend) 🎯

**Goal**: registering sends a verification mail, opening the link verifies the account, and
until then diners can't see the restaurant.

**Independent Test**: quickstart, section US-44.

### Tests for US-44

- [x] T004 [P] [US44] `test_us44_s1_…`, `test_us44_s2_…`, `test_us44_s3_…`, `test_us44_s4_…`, `test_us44_s5_…` and `test_us44_s6_…` in backend/tests/test_restaurant_verification.py
- [x] T005 [P] [US44] `test_us44_edge_google_restaurant_starts_verified`, `…_used_link_reports_already_verified`, `…_the_link_does_not_sign_in`, `…_mail_failure_still_creates_the_account` and `…_resend_is_only_for_unverified_restaurants`

### Implementation for US-44

- [x] T006 [US44] backend/app/services/restaurant_verification.py: the hashed token, the 24-hour link, the verification state and the mail (research R2)
- [x] T007 [US44] backend/app/api/restaurant_verification.py with `POST /api/restaurantes/verificacion` and `/verificacion/reenvio`, mounted in backend/app/api/__init__.py (contract)
- [x] T008 [US44] `POST /api/restaurantes` sends the mail, `POST /api/restaurantes/google` marks the account verified and `AUTO_VERIFY_EMAILS` covers the local mode (backend/app/api/restaurant.py, research R6 and R8)
- [x] T009 [US44] `email_verificado` in `RestaurantResponse`; the real value in `GET /api/me` for a restaurant (backend/app/schemas/restaurant.py, backend/app/api/account.py)
- [x] T010 [US44] `bookable_condition()` requires `email_verified_at` (backend/app/services/availability.py, research R6)
- [x] T011 [US44] The demo restaurant of backend/scripts/seed.py starts verified

**Checkpoint**: US-44 S1–S6 and the edges pass.

---

## Phase 3: US-46 — Recuperar cuenta (backend) 🎯

**Goal**: the Responsable asks for a link, sets a new password with it and signs in with it.

**Independent Test**: quickstart, section US-46.

### Tests for US-46

- [x] T012 [P] [US46] `test_us46_s1_…`, `test_us46_s2_…`, `test_us46_s3_…`, `test_us46_s4_…`, `test_us46_s5_…` and `test_us46_s7_…` in backend/tests/test_restaurant_recovery.py
- [x] T013 [P] [US46] `test_us46_edge_unknown_email_gets_the_same_message`, `…_a_new_request_voids_the_previous_link`, `…_unverified_account_gets_the_verification_link`, `…_google_account_is_told_to_use_google`, `…_requests_are_limited`, `…_mail_failure_keeps_the_neutral_answer`, `…_invalid_email_is_reported`, `…_password_change_closes_open_sessions` and `…_the_password_is_never_returned`

### Implementation for US-46

- [x] T014 [US46] backend/app/services/restaurant_recovery.py: the link, its state, the neutral request, the 60-second interval and the 5-per-30-minutes limit, and both mails (research R2–R5)
- [x] T015 [US46] backend/app/api/restaurant_recovery.py with the three endpoints of `/api/restaurantes/recuperacion`, mounted in backend/app/api/__init__.py (contract)
- [x] T016 [US46] The `pwd` claim for restaurant tokens: `restaurant_session` (backend/app/api/auth.py), `session_is_current` for any account (backend/app/api/deps.py), checked in `restaurant_from_claims` (backend/app/api/restaurant.py), in the dish endpoints (backend/app/api/dish.py) and in `/api/me` (research R7)
- [x] T017 [US46] `make api-types`

**Checkpoint**: US-46 S1–S7 and the edges pass.

---

## Phase 4: Frontend

**Goal**: the three pages for restaurants, the dashboard notice and the recovery link on the
restaurant side of the login, at 360 px and with the keyboard.

### Tests

- [x] T018 [P] [US46] `US-46 S1`, `US-46 S7` in frontend/src/pages/RecoverAccountPage.test.tsx and frontend/src/pages/ResetPasswordPage.test.tsx; `US-46 S1 offers the recovery to restaurants` in frontend/src/pages/LoginPage.test.tsx
- [x] T019 [P] [US44] `US-44 S2` and `US-44 S3` in frontend/src/pages/VerifyEmailPage.test.tsx; `US-44 S4` in frontend/src/components/access/UnverifiedNotice.test.tsx; `US-44 S1` in frontend/src/pages/AuthPages.test.tsx; `US-44 S3` in frontend/src/pages/HomePage.test.tsx

### Implementation

- [x] T020 [US46] frontend/src/api/passwordRecovery.ts: the three calls for either role
- [x] T021 [US46] `role` in frontend/src/pages/RecoverAccountPage.tsx and frontend/src/pages/ResetPasswordPage.tsx, and the routes `/restaurante/recuperar` and `/restaurante/restablecer` (frontend/src/router.tsx)
- [x] T022 [US44] `role` in frontend/src/pages/VerifyEmailPage.tsx and the route `/restaurante/verificar-email`; `UnverifiedNotice` resends for either role (frontend/src/components/access/UnverifiedNotice.tsx)
- [x] T023 [US44] The notice and the account status in the restaurant dashboard (frontend/src/pages/home/RestaurantHome.tsx); `email_verificado` in `restaurantAccount` (frontend/src/api/session.ts)
- [x] T024 [US44] The recovery link for restaurants on /ingresar (frontend/src/pages/LoginPage.tsx) and "revisá tu mail" after the restaurant registration (frontend/src/pages/RestaurantRegisterPage.tsx)
- [x] T025 [US44] Add the three pages to the access section of docs/design/README.md

**Checkpoint**: both pages pass the quickstart at 360 px.

---

## Phase 5: Documentation

- [x] T026 Update AGENTS.md (the routes, the endpoints and what verification means for a restaurant) and specs/README.md (the 026 row, the team's proposals and the PO's pending items)

## Dependencies & Execution Order

- **Phase 1** blocks Phases 2 and 3.
- **Phase 3** reuses the helpers of spec 013 and the generated types of T017; T017 comes before T020.
- Tests are written before their implementation and fail first.
- **Phase 5** needs everything else.

## Notes

- No dependency, no AWS resource and no environment variable is added: the mail already works
  (spec 019).
- The proposals of the spec (24 h and 15 min links, 60 seconds between requests, neutral
  message, closing sessions, dashboard notice) wait for the PO; if the PO changes them,
  `research.md` records what changed.

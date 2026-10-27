# Tasks: Restaurant account with Google (spec 003, US-2 S5–S6 and US-28)

**Input**: [plan.md](plan.md). US-2 and US-4 were built in Sprint 1, before this file; it lists only the work added on 25/10.

## Phase 1: Tests

- [X] T001 [P] [US2] [US28] backend/tests/test_restaurant_google.py: US-2 S5, S6 and edge; US-28 S2, S3, S4 and edge
- [X] T002 [P] [US28] `US-28 S1`, `S2`, `S3` in frontend/src/pages/LoginPage.test.tsx
- [X] T003 [P] [US2] `US-2 S5` (twice) and `US-2 S6` in frontend/src/pages/AuthPages.test.tsx

## Phase 2: Backend

- [X] T004 [US2] `RestaurantDetails` and `RestaurantGoogleRegistration` in backend/app/schemas/restaurant.py
- [X] T005 [US2] `save_restaurant()` and `POST /api/restaurantes/google` in backend/app/api/restaurant.py
- [X] T006 [US28] `restaurant_session()` and `POST /api/auth/restaurante/google` in backend/app/api/auth.py
- [X] T007 `make api-types`

## Phase 3: Frontend

- [X] T008 [US28] GoogleSignInButton takes the role; LoginPage shows it for both roles
- [X] T009 [US2] RestaurantRegisterPage: "Registrarse con Google", the form without email and password, and the credential from the login
- [X] T010 Docs: AGENTS.md, docs/design/README.md, specs/README.md

## Phase 4: Production

- [ ] T011 Check in production: register a restaurant with Google, sign out, sign in with Google

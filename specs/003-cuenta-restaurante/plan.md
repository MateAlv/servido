# Implementation Plan: Restaurant account with Google (spec 003, US-2 S5–S6 and US-28)

**Spec**: [spec.md](spec.md) · **Added**: 2026-10-25

US-2 and US-4 were built in Sprint 1 before this plan existed. This plan covers what was added on 25/10: the last US-2 criterion (sign up with Google instead of an email) and US-28 (restaurant sign-in with Google), moved up from Sprint 4.

## Summary

- **US-28:** the restaurant side of `/ingresar` shows the same Google button as diners. The API checks the Google ID token exactly like US-52 (spec 007) and opens the restaurant session when a restaurant has that email.
- **US-2 S5:** `/suma-tu-local` offers "Registrarse con Google". After the Google account is picked, the form hides the email, password and confirmation fields and asks only for name, CUIT and phone. The API takes the email from the token, creates the restaurant and signs it in.
- **US-28 S3 → US-2 S5:** a Google sign-in that finds no restaurant offers "Registrar el restaurante con Google", which opens `/suma-tu-local` with the same credential, so the person doesn't pick their Google account again.

## Technical Context

Same stack and pieces as spec 007: Google Identity Services in the browser, `verify_google_id_token` in the API. No new dependency, table or migration.

- A restaurant created with Google stores the hash of a random secret that is thrown away, so it has no usable password, as diners created with Google (spec 007, research R10).
- The restaurant fields and their validators move to `RestaurantDetails`, shared by the password sign-up and the Google sign-up. The email and password rules stay in `RestaurantRegistrationRequest`.
- The frontend reads the email inside the token only to show "Vas a ingresar con tu cuenta de Google …". The API never trusts that: it checks the token itself.

## Constitution Check

| Principle | How | ✓ |
| --- | --- | --- |
| I. Backlog-bound scope | US-2 criterion 5 and US-28 from the backlog. Moving US-28 up was decided by the team on 25/10, pending PO validation. | [x] |
| III. Tests per scenario | Every new scenario has a test (map below). | [x] |
| V. Simple, cheap, conventional | Reuses spec 007's token check and button. No migration. | [x] |

## API contract

### `POST /api/auth/restaurante/google` (US-28)

Request `{ "credential": "<Google ID token>" }`.

| Status | When | Body |
| --- | --- | --- |
| 200 | Valid token, and a restaurant has its email | Same as `POST /api/auth/restaurante` |
| 401 | Invalid token (same checks as US-52) | `{ "detail": "No pudimos ingresar con Google. Probá de nuevo." }` |
| 404 | Valid token, no restaurant with that email | `{ "detail": "No existe una cuenta de restaurante asociada a ese email de Google." }` |

A diner with that email does not match: only restaurants are looked up.

### `POST /api/restaurantes/google` (US-2 S5, S6)

Request `{ "credential": "<Google ID token>", "nombre": "…", "cuit": "…", "telefono": "…" }`.

| Status | When | Body |
| --- | --- | --- |
| 201 | Valid token and details, email and CUIT free | Same as `POST /api/auth/restaurante`: the restaurant is created with the Google email and signed in |
| 400 | A detail is missing or invalid | Standard validation body, same messages as `POST /api/restaurantes` |
| 401 | Invalid token | `{ "detail": "No pudimos registrar el restaurante con Google. Probá de nuevo." }` |
| 409 | The Google email or the CUIT already has a restaurant | `{ "detail": "Ya existe una cuenta de restaurante asociada a ese email o CUIT." }` |

## Acceptance Scenario → Test Map

| Scenario | Test | Layer |
| --- | --- | --- |
| US-2 S5 — Google sign-up asks only for the restaurant details | `backend/tests/test_restaurant_google.py::test_us2_s5_google_sign_up_takes_the_email_from_google_and_signs_in`, `…_still_requires_the_restaurant_details`, `…_rejects_a_taken_email_or_cuit` · `frontend/src/pages/AuthPages.test.tsx` › `US-2 S5 asks only for the restaurant details after choosing Google`, `US-2 S5 keeps the Google account chosen on the login` | Both |
| US-2 S6 — Google fails: no account | `test_restaurant_google.py::test_us2_s6_invalid_google_token_creates_nothing` · `AuthPages.test.tsx` › `US-2 S6 asks to choose Google again when the sign-in is rejected` | Both |
| US-28 S1 — the restaurant login offers Google | `frontend/src/pages/LoginPage.test.tsx` › `US-28 S1 offers Google sign-in to restaurants` | Frontend |
| US-28 S2 — a restaurant with that email signs in | `test_restaurant_google.py::test_us28_s2_google_account_with_a_restaurant_signs_in` · `LoginPage.test.tsx` › `US-28 S2 signs the restaurant in with Google` | Both |
| US-28 S3 — no restaurant: says so and offers to register it | `test_restaurant_google.py::test_us28_s3_google_account_without_a_restaurant_is_not_found` · `LoginPage.test.tsx` › `US-28 S3 offers to register the restaurant with the same Google account` | Both |
| US-28 S4 — invalid token: no access | `test_restaurant_google.py::test_us28_s4_invalid_google_token_is_rejected` | Backend |
| Edge — a diner with that email doesn't sign in as a restaurant | `test_restaurant_google.py::test_us28_edge_diner_with_that_email_does_not_sign_in_as_restaurant` | Backend |
| Edge — a restaurant created with Google has no password | `test_restaurant_google.py::test_us2_edge_google_restaurant_has_no_password` | Backend |

## Project Structure

```text
backend/
├── app/api/auth.py               # ~ POST /auth/restaurante/google; restaurant_session()
├── app/api/restaurant.py         # ~ POST /restaurantes/google; save_restaurant() shared by both sign-ups
├── app/schemas/restaurant.py     # ~ RestaurantDetails, RestaurantGoogleRegistration
└── tests/test_restaurant_google.py
frontend/
├── src/api/session.ts                           # ~ restaurantAccount()
├── src/lib/google.ts                            # ~ googleEmail(), only for display
├── src/components/access/GoogleSignInButton.tsx # ~ takes the role; restaurant 404 opens /suma-tu-local
├── src/pages/LoginPage.tsx                      # ~ Google button for both roles
└── src/pages/RestaurantRegisterPage.tsx         # ~ "Registrarse con Google" and the form without login fields
```

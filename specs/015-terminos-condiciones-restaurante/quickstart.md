# Quickstart: Restaurant Terms Acceptance

1. Apply migrations with `make migrate`.
2. Run focused backend tests:

   ```text
   cd backend && uv run pytest tests/test_terms_acceptance.py tests/test_restaurant_access.py tests/test_restaurant_google.py
   ```

3. Run focused frontend tests:

   ```text
   cd frontend && npx vitest run src/pages/TermsAcceptance.test.tsx src/pages/AuthPages.test.tsx
   ```

4. Open `/suma-tu-local`, verify the unchecked checkbox, open `/terminos/restaurantes` in a new
   tab, and try email and Google registration before and after acceptance.

Expected outcomes: unaccepted registration makes no API call, accepted registrations store version
`1.0` and a UTC timestamp, and existing restaurant sign-in does not ask for acceptance.

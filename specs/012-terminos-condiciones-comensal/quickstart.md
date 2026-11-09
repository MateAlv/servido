# Quickstart: Diner Terms Acceptance

## Prerequisites

- Python 3.12 and the repository backend dependencies
- PostgreSQL running through the repository's Docker setup
- Node.js dependencies installed in `frontend/`

## Validation

1. Apply migrations with `make migrate`.
2. Run the focused backend tests:

   ```text
   cd backend && uv run pytest tests/test_terms_acceptance.py tests/test_auth.py tests/test_google_sign_up.py
   ```

3. Run the focused frontend tests:

   ```text
   cd frontend && npx vitest run src/pages/TermsAcceptance.test.tsx src/pages/AuthPages.test.tsx
   ```

4. Open `/registrarme`, verify the checkbox starts clear, open `/terminos` in a new tab, and
   submit once with and once without acceptance.

Expected outcomes: unaccepted registration makes no API call, accepted email and Google
registration create accounts, and existing email/Google sign-in does not display the checkbox.

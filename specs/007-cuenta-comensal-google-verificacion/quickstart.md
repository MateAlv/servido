# Quickstart: Google sign-in and email verification (spec 007)

How to check the feature end to end. Endpoints are in [contracts/accounts-api.md](contracts/accounts-api.md); tables in [data-model.md](data-model.md).

## Prerequisites

- `make up` (or `make db` plus the backend and frontend dev servers), then `make migrate`.
- A Google account that you can sign in with.
- Locally, mail is not sent: `MAIL_BACKEND=console` (the default) prints the verification link in the API log.

## US-52: sign in with Google (local)

1. Open http://localhost:5173/registrarme and create a diner with **the same email as your Google account**.
2. Sign out, open http://localhost:5173/ingresar, choose "Comensal" and press **Ingresar con Google**. Pick that Google account.
   - Expected: you land on the diner home, signed in (S2).
3. Sign out and repeat with a Google account that has no diner.
   - Expected: "No existe una cuenta de Servido! asociada a ese email de Google" and a link to create an account (S3).
4. Press the button and close the Google popup.
   - Expected: still on the login page, not signed in (S4).
5. Automated: `cd backend && uv run pytest tests/test_google_sign_in.py` and `cd frontend && npx vitest run src/pages/LoginPage.test.tsx`.

If the button shows an error right after the OAuth client was created, wait: Google says new origins take from 5 minutes to a few hours.

## US-51: verification mail (local)

1. Register a diner at http://localhost:5173/registrarme.
   - Expected: a notice to check your mail, and the API log prints `Verification link for …: http://localhost:5173/verificar-email?token=…` (S1, S2).
2. Open the link.
   - Expected: "¡Listo! Tu email quedó verificado." (S3). Open it again: "Tu email ya estaba verificado."
3. Change one character of the token and open it.
   - Expected: "No pudimos verificar tu email…" (S4).
4. Register another diner, sign in, and press **Reenviar mail de verificación** in the notice. Open the first link.
   - Expected: it no longer works; the new one does (S7).
5. Automated: `cd backend && uv run pytest tests/test_email_verification.py`.

## US-51 in production (one-time setup)

1. `terraform apply` creates the SES identity for `servido.discordia.fyi` and lets the instance send from it. `terraform output ses_dkim_records` prints three CNAMEs: add them in Cloudflare with **DNS only**.
2. When SES shows the domain as verified, request production access in the SES console (Account dashboard → Request production access): transactional mail, account verification, a few mails per day.
3. Until AWS approves it, SES only delivers to verified addresses: add the team's addresses under SES → Identities to test.
4. Register at https://servido.discordia.fyi/registrarme and check the inbox; the mail comes from `no-reply@servido.discordia.fyi`.

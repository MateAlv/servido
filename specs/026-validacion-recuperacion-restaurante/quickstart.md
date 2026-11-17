# Quickstart: restaurant account verification and recovery (spec 026)

How to check the feature end to end. Endpoints are in
[contracts/restaurant-access-api.md](contracts/restaurant-access-api.md); tables in
[data-model.md](data-model.md).

## Prerequisites

- `make up` (or `make db` plus the backend and frontend dev servers), then `make migrate`.
- Locally, mail is not sent: `MAIL_BACKEND=console` (the default) prints the link in the API log.
- A restaurant registered with email and password, and another one created with Google.
- No `terraform apply` and no new environment variable are needed: spec 019 already sends mail.

## US-44 — verification

1. Open http://localhost:5173/suma-tu-local and register a restaurant (accept the terms).
   - Expected: «Te enviamos un mail para verificar el email del restaurante.» and the API log
     prints the link `/restaurante/verificar-email?token=…` (S1).
2. Sign in with that account and open `/restaurante/perfil`; complete the address, a shift and
   a table group, and open `/mapa` in another browser without a session.
   - Expected: the restaurant is not on the map, the list or the detail; the dashboard shows
     the notice "Verificá el email de tu restaurante…" (S5).
3. Open the link.
   - Expected: «¡Listo! Tu email quedó verificado.» and that it can now receive reservations
     (S2). Reload the map: the restaurant is there (S6).
4. Open the same link again.
   - Expected: «Tu email ya estaba verificado.» (edge case).
5. Edit `restaurant_email_verifications.expires_at` to a past date
   (`UPDATE restaurant_email_verifications SET expires_at = now() - interval '1 minute';`) and
   open the link.
   - Expected: «No pudimos verificar tu email: el enlace no es válido o venció.» and, from the
     dashboard, «Reenviar mail de verificación» sends a new link that works (S3, S4). The old
     link stays dead.
6. Register a restaurant with Google.
   - Expected: it is verified from the start (`email_verificado: true`) and visible as soon as
     it is configured (edge case).

## US-46 — recovery

1. Open `/ingresar`, choose **Restaurante** and press **¿Olvidaste tu contraseña?**, or go to
   `/restaurante/recuperar`.
   - Expected: the page asks for the email (S1).
2. Enter the restaurant's email and press **Enviar instrucciones**.
   - Expected: the neutral message and, in the API log, the link
     `/restaurante/restablecer?token=…` (S1, S2).
3. Press again right away.
   - Expected: «Esperá un minuto antes de pedir otro link.» (edge case; research R3).
4. Open the link and type `abc`.
   - Expected: «La contraseña debe tener entre 8 y 128 caracteres.» and nothing is saved (S4).
5. Type a valid password twice and press **Cambiar contraseña**.
   - Expected: «¡Listo! Tu contraseña quedó actualizada…» and the link to `/ingresar` (S3).
6. Sign in with the new password, then with the old one.
   - Expected: the new one works, the old one answers «Credenciales inválidas» (S5, S6).
7. Open the link again, then ask for another one and expire it in the database
   (`UPDATE restaurant_password_resets SET expires_at = now() - interval '1 minute';`).
   - Expected: the used link says it was used and the expired one that it expired; in both
     cases «Pedí uno nuevo» leads to `/restaurante/recuperar` (S7).
8. Ask for a recovery with an email that has no account.
   - Expected: the same neutral message and no mail in the log (edge case).
9. Ask for a recovery with a restaurant whose email is not verified yet.
   - Expected: the mail is the verification one, with a 24-hour link and no recovery link
     (edge case, FR-009).
10. Ask for a recovery with a restaurant created with Google.
    - Expected: the mail says to sign in with Google and has no link.
11. Sign in in one browser, change the password from the mail in another, then reload the first.
    - Expected: it asks to sign in again, in the panel and in the menu (FR-012).
12. With `MAIL_BACKEND=smtp` and a wrong `SMTP_PASSWORD`, ask for a recovery.
    - Expected: the neutral message (the API logs the failure); asking again retries.

## Phone

All three pages work at 360 px, with the keyboard only: the dashboard notice, the recovery form
and the new-password form have visible focus and buttons that are real buttons.

## Automated

```bash
cd backend && uv run pytest tests/test_restaurant_verification.py tests/test_restaurant_recovery.py
cd frontend && npx vitest run src/pages/RecoverAccountPage.test.tsx src/pages/ResetPasswordPage.test.tsx \
  src/pages/VerifyEmailPage.test.tsx src/pages/LoginPage.test.tsx src/pages/HomePage.test.tsx \
  src/components/access/UnverifiedNotice.test.tsx src/pages/AuthPages.test.tsx
```

## In production

1. `make migrate` runs with the deploy (`infra/ec2/deploy.sh`); it verifies every existing
   restaurant, so none disappears from the map.
2. Register a restaurant with a real address and check the inbox; the mail comes from
   `no-reply@servido.discordia.fyi`.
3. Check that the demo restaurant of `scripts/seed.py` is still on the map.

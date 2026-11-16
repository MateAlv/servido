# Quickstart: recovering a diner account (spec 013)

How to check the feature end to end. Endpoints are in [contracts/account-recovery-api.md](contracts/account-recovery-api.md); tables in [data-model.md](data-model.md).

## Prerequisites

- `make up` (or `make db` plus the backend and frontend dev servers), then `make migrate`.
- Locally, mail is not sent: `MAIL_BACKEND=console` (the default) prints the recovery link in the API log.
- A diner created with email and password, and another one created with Google.

## The happy path

1. Open http://localhost:5173/ingresar, choose **Comensal** and press **¿Olvidaste tu contraseña?**.
   - Expected: `/recuperar` asks for the email (S1).
2. Enter the diner's email and press **Enviar instrucciones**.
   - Expected: «Si existe una cuenta asociada a ese email, te enviamos un correo con instrucciones.» and the API log prints `Recovery link for …: http://localhost:5173/restablecer?token=…` (S1, S2).
3. Open the link.
   - Expected: the form with the new password and its confirmation (S3).
4. Type `abc` and press **Cambiar contraseña**.
   - Expected: «La contraseña debe tener entre 8 y 128 caracteres.» and the password is not saved (S4).
5. Type a valid password twice and press again.
   - Expected: «¡Listo! Tu contraseña quedó actualizada…» and the link to `/ingresar` (S3, S5).
6. Sign in with the new password. Then try the old one.
   - Expected: the new one works, the old one answers «Credenciales inválidas» (S5).
7. Open the link again.
   - Expected: «Ese link ya se usó para cambiar la contraseña. Pedí uno nuevo.» (S6).
8. Ask for another link, then edit `password_resets.expires_at` to a past date in the database
   (`UPDATE password_resets SET expires_at = now() - interval '1 minute';`) and open it.
   - Expected: «Ese link venció. Pedí uno nuevo.» (S7).
9. Ask for a link with an email that has no account.
   - Expected: the same message as step 2 and no mail in the log (S8).

## The edges

- **New link, old link**: ask twice without using the first; the first link says it's no longer valid and the second works (FR-010).
- **Google account**: ask for a recovery with a Google account's email. The mail says to sign in with Google and has no link.
- **Unverified email**: a diner who never opened the verification mail gets the recovery mail at the same address and can change the password.
- **Open sessions**: sign in in one browser, change the password from the link in another, then reload the first one. It asks to sign in again (FR-011).
- **Rate limit**: press the button 6 times with the same email (no double clicks) in 30 minutes. The sixth answers «Pediste demasiados links. Esperá unos minutos y probá de nuevo.», also for an unknown email.
- **Mail failure**: with `MAIL_BACKEND=smtp` and a wrong `SMTP_PASSWORD`, the form says «No pudimos enviar el correo. Probá de nuevo.».
- **Phone**: both pages work at 360 px, with the keyboard only.

## Automated

```bash
cd backend && uv run pytest tests/test_account_recovery.py
cd frontend && npx vitest run src/pages/RecoverAccountPage.test.tsx src/pages/ResetPasswordPage.test.tsx src/pages/LoginPage.test.tsx
```

## In production

1. `terraform apply` is not needed: no new resource, secret or environment variable.
2. `make migrate` runs with the deploy (`infra/ec2/deploy.sh`).
3. Ask for a recovery with a real address and check the inbox; the mail comes from `no-reply@servido.discordia.fyi`.

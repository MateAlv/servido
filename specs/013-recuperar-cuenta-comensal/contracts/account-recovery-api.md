# API contract: recovering a diner account (spec 013)

Everything is under `/api` and in JSON. Messages are in Spanish because the UI shows them. Invalid bodies answer 400 with the project's usual validation body, like the rest of the API.

The three endpoints keep the Spanish names of the access API (`/api/comensales`, spec 001), next to `/api/comensales/verificacion`.

## `POST /api/comensales/recuperacion`

Asks for a recovery mail. No session is needed.

Request:

```json
{ "email": "martin@example.com" }
```

| Status | When | Body |
| --- | --- | --- |
| 202 | The request was accepted: a mail was sent, or there is no account and nothing happens | `{ "detail": "Si existe una cuenta asociada a ese email, te enviamos un correo con instrucciones." }` |
| 400 | The email doesn't have a valid format | Standard validation body, `Ingresá un email válido.` |
| 429 | 5 requests by that email in the last 30 minutes | `{ "detail": "Pediste demasiados links. Esperá unos minutos y probá de nuevo." }` |
| 502 | The mail service failed | `{ "detail": "No pudimos enviar el correo. Probá de nuevo." }` |

- The 202 body is the same whether the account exists or not (FR-003, SC-004), and so is the 429: the limit counts by email, registered or not.
- When there is an account with a password, the mail carries the link of the next section. With a Google account, it says to sign in with Google (edge case of the spec).
- Every new link voids the previous one of that account (FR-010).

## `POST /api/comensales/recuperacion/validacion`

Checks the token of the link before showing the form. It doesn't use it up and no session is needed.

Request:

```json
{ "token": "<token from the link>" }
```

| Status | When | Body |
| --- | --- | --- |
| 200 | The token matches an unused, unexpired link | `{ "detail": "El link es válido. Elegí tu nueva contraseña." }` |
| 400 | The token matches a link that was already used | `{ "detail": "Ese link ya se usó para cambiar la contraseña. Pedí uno nuevo." }` |
| 400 | The link expired | `{ "detail": "Ese link venció. Pedí uno nuevo." }` |
| 400 | No link matches the token | `{ "detail": "Ese link no es válido. Pedí uno nuevo." }` |

## `PUT /api/comensales/recuperacion`

Sets the new password with the token of the link. No session is needed: the token is the proof. It never signs in (S5 says the diner signs in afterwards).

Request:

```json
{ "token": "<token from the link>", "password": "NuevaClave123" }
```

| Status | When | Body |
| --- | --- | --- |
| 200 | The link can be used and the password follows the rules | `{ "detail": "¡Listo! Tu contraseña quedó actualizada. Ya podés ingresar." }` |
| 400 | The link was used, expired or is unknown | The same three messages as `validacion` |
| 400 | The password breaks a rule | `{ "detail": "<the same message as registration>" }`: `La contraseña debe tener entre 8 y 128 caracteres.` · `La contraseña debe contener al menos una letra.` · `La contraseña debe contener al menos un número.` · `La contraseña no puede ser igual al email.` |

- On success: `password_hash` is replaced (the old password stops working, SC-003), `password_changed_at` is set (open sessions are closed, FR-011), `used_at` is set (the link can't be used again, FR-007) and `has_password` is `true`.
- The password is never returned or logged.

## Mail sent

From `Servido! <no-reply@servido.discordia.fyi>`, subject «Recuperá tu cuenta de Servido!», in Spanish, with a plain-text and an HTML body.

| Account | Body |
| --- | --- |
| With a password | The diner's name, a button or link to `https://servido.discordia.fyi/restablecer?token=…`, and «El enlace vence en 15 minutos y se puede usar una sola vez. Si no lo pediste, ignorá este mail.» |
| Created with Google | The diner's name and «Tu cuenta se creó con Google, así que no tiene una contraseña de Servido!: para ingresar, usá “Ingresar con Google”». No link. |

The link points to `APP_BASE_URL` (`http://localhost:5173` locally), the same setting as the verification mail.

## Existing endpoints that change

- `GET /api/me` and every diner endpoint: a token issued before `comensales.password_changed_at` answers 401 `Tu sesión no es válida o venció. Volvé a ingresar.` The contract of the endpoints doesn't change.
- `POST /api/comensales/google` (US-58): stores `has_password = false` on the new account. The response is the same.

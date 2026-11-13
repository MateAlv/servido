# API contract: restaurant account verification and recovery (spec 026)

Everything is under `/api` and in JSON. Messages are in Spanish because the UI shows them.
Invalid bodies answer 400 with the project's usual validation body, like the rest of the API.

The endpoints keep the Spanish names of the access API (`/api/restaurantes`, spec
002-cuenta-restaurante), next to the diner's `/api/comensales/verificacion` and
`/api/comensales/recuperacion` (specs 019 and 013).

## `POST /api/restaurantes/verificacion`

Verifies the restaurant with the token of the mailed link. No session is needed: the token is
the proof.

Request:

```json
{ "token": "<token from the link>" }
```

| Status | When | Body |
| --- | --- | --- |
| 200 | The link verifies the account | `{ "detail": "¡Listo! Tu email quedó verificado." }` |
| 200 | The link was already used | `{ "detail": "Tu email ya estaba verificado." }` |
| 400 | The link is unknown or expired | `{ "detail": "No pudimos verificar tu email: el enlace no es válido o venció." }` |

- On success: `email_verified_at` is set and `used_at` marks the link. The restaurant becomes
  visible to diners (FR-002, FR-006).
- It never signs in and never returns the email.
- The previous link stops working when a new one is issued (FR-004).

## `POST /api/restaurantes/verificacion/reenvio`

Mails a new verification link to the signed-in restaurant. The previous link stops working.

| Status | When | Body |
| --- | --- | --- |
| 202 | The mail was sent | `{ "detail": "Te enviamos un nuevo mail de verificación." }` |
| 401 | No session, or issued before a password change | `{ "detail": "Tu sesión no es válida o venció. Volvé a ingresar." }` |
| 403 | The session is a diner | `{ "detail": "No tenés permiso." }` |
| 409 | The email is already verified | `{ "detail": "Tu email ya está verificado." }` |

A failed send is logged and the answer is still 202, like the diner's resend (spec 019): the
restaurant already exists and has other ways in.

## `POST /api/restaurantes/recuperacion`

Asks for a recovery mail. No session is needed.

Request:

```json
{ "email": "local@example.com" }
```

| Status | When | Body |
| --- | --- | --- |
| 202 | The request was accepted: a mail was sent, or there is no account | `{ "detail": "Si existe una cuenta asociada a ese email, te enviamos un correo con instrucciones." }` |
| 400 | The email doesn't have a valid format | Standard validation body, `Ingresá un email válido.` |
| 429 | Less than 60 seconds since the previous request of that email | `{ "detail": "Esperá un minuto antes de pedir otro link." }` |
| 429 | More than 5 requests by that email in 30 minutes | `{ "detail": "Pediste demasiados links. Esperá unos minutos y probá de nuevo." }` |

- The 202 body and the two 429s are the same whether the account exists or not (FR-009,
  SC-005), and so is the answer for an address that belongs to a diner only.
- **Verified account with a password**: the mail carries the link of the next section.
- **Unverified account**: the mail is the verification one, with a 24-hour link and no
  recovery link (FR-009, edge case of the spec).
- **Account created with Google**: the mail says to sign in with Google; no link.
- A send failure is logged and the answer is still 202 (edge case of the spec; research R5).
- Every new link voids the previous one of that account (FR-004, FR-013).

## `POST /api/restaurantes/recuperacion/validacion`

Checks the token of the link before showing the form. It doesn't use it up and no session is
needed.

Request:

```json
{ "token": "<token from the link>" }
```

| Status | When | Body |
| --- | --- | --- |
| 200 | The token matches an unused, unexpired link | `{ "detail": "El link es válido. Elegí tu nueva contraseña." }` |
| 400 | The link was already used | `{ "detail": "Ese link ya se usó para cambiar la contraseña. Pedí uno nuevo." }` |
| 400 | The link expired | `{ "detail": "Ese link venció. Pedí uno nuevo." }` |
| 400 | No link matches the token | `{ "detail": "Ese link no es válido. Pedí uno nuevo." }` |

## `PUT /api/restaurantes/recuperacion`

Sets the new password with the token of the link. No session is needed, and it never signs in.

Request:

```json
{ "token": "<token from the link>", "password": "NuevaClave123" }
```

| Status | When | Body |
| --- | --- | --- |
| 200 | The link can be used and the password follows the rules | `{ "detail": "¡Listo! Tu contraseña quedó actualizada. Ya podés ingresar." }` |
| 400 | The link was used, expired or is unknown | The same three messages as `validacion` |
| 400 | The password breaks a rule | `{ "detail": "<the same message as registration>" }`: `La contraseña debe tener entre 8 y 128 caracteres.` · `La contraseña debe contener al menos una letra.` · `La contraseña debe contener al menos un número.` · `La contraseña no puede ser igual al email.` |

- On success: `password_hash` is replaced (SC-004), `password_changed_at` is set (open sessions
  close, FR-012), `used_at` marks the link, and `has_password` is `true`.
- The password is never returned or logged.

## Mails sent

From `Servido! <no-reply@servido.discordia.fyi>`, in Spanish, with a plain-text and an HTML body.

| Mail | Subject | Body |
| --- | --- | --- |
| Verification | «Verificá el email de tu restaurante en Servido!» | The restaurant's name, a button to `https://servido.discordia.fyi/restaurante/verificar-email?token=…`, «El enlace vence en 24 horas» and what being verified enables. |
| Recovery, with a password | «Recuperá la cuenta de tu restaurante en Servido!» | The restaurant's name, a button to `https://servido.discordia.fyi/restaurante/restablecer?token=…`, «El enlace vence en 15 minutos y se puede usar una sola vez. Si no lo pediste, ignorá este mail: tu contraseña sigue igual.» |
| Recovery, created with Google | Same subject | The restaurant's name and «Tu cuenta se creó con Google, así que no tiene una contraseña de Servido!: para ingresar, usá “Ingresar con Google”». No link. |

The links point to `APP_BASE_URL` (`http://localhost:5173` locally), the same setting as the
diner's mails.

## Existing endpoints that change

- `POST /api/restaurantes` (US-2) sends the verification mail after creating the account and
  answers `email_verificado: false`, like `POST /api/comensales` (spec 019). With
  `AUTO_VERIFY_EMAILS=true` (local mode) the account is created verified and no mail is sent.
- `POST /api/restaurantes/google` (US-2 S5) creates the account verified, with
  `has_password = false`.
- `RestaurantResponse` adds `email_verificado` (boolean), in the registration, the login and
  the Google responses.
- `GET /api/me` reports the real `email_verificado` for a restaurant (before this spec every
  restaurant answered `true`).
- Every restaurant endpoint: a token issued before `restaurantes.password_changed_at` answers
  401 `Tu sesión no es válida o venció. Volvé a ingresar.` The endpoints that use the dishes'
  own check (`/api/restaurantes/me/platos…`) now use the same helper.
- `GET /api/restaurants` and `GET /api/restaurants/{id}` (and the availability endpoints) leave
  out a restaurant whose account isn't verified: it answers 404 for the detail, like a
  restaurant that stopped taking reservations. No field of the response changes.

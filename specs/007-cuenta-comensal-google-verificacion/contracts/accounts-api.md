# API contract: Google sign-in and email verification (spec 007)

Everything is under `/api` and in JSON. Error messages are in Spanish, because the UI shows them. Validation errors answer 400, like the rest of the API.

## US-52: `POST /api/auth/comensal/google`

Signs a diner in with the ID token that Google Identity Services gives the browser.

Request:

```json
{ "credential": "<Google ID token>" }
```

Responses:

| Status | When | Body |
| --- | --- | --- |
| 200 | Valid token, and a diner exists with the token's email | Same as `POST /api/auth/comensal`: `{ "comensal": {…}, "access_token": "…", "token_type": "bearer" }`. If the diner was unverified, they are now verified (FR-013). |
| 401 | Invalid token: bad signature, another audience or issuer, expired, or `email_verified` false | `{ "detail": "No pudimos ingresar con Google. Probá de nuevo." }` |
| 404 | Valid token, but no diner has that email | `{ "detail": "No existe una cuenta de Servido! asociada a ese email de Google." }` |
| 400 | `credential` missing or empty | Standard validation body |

- The session token is the same JWT as the password login (spec 001, FR-008a).
- A restaurant account with that email does not match: only diners are looked up.

## US-51: changes to existing endpoints

- `POST /api/comensales` (registration): unchanged contract. After creating the diner, it sends the verification mail (FR-005). A failure to send does not change the response.
- `GET /api/me`: `AccountResponse` gains `email_verificado: boolean`. It's always `true` for restaurants, because their verification is out of scope.
- `DinerResponse` (inside the login responses) gains `email_verificado: boolean`.

## US-51: `POST /api/comensales/verificacion`

Verifies an email with the token from the link `https://servido.discordia.fyi/verificar-email?token=…`. No session is needed: the token is the proof.

Request:

```json
{ "token": "<token from the link>" }
```

| Status | When | Body |
| --- | --- | --- |
| 200 | The token matches an unexpired link | `{ "detail": "¡Listo! Tu email quedó verificado." }` |
| 200 | The token matches a link that was already used | `{ "detail": "Tu email ya estaba verificado." }` |
| 400 | No link matches the token, or it expired | `{ "detail": "No pudimos verificar tu email: el enlace no es válido o venció." }` |

The response never includes account data and never signs in (FR-011).

## US-51: `POST /api/comensales/verificacion/reenvio`

Sends a new verification mail to the signed-in diner. The new link replaces the old one (FR-012).

- Requires a diner session (Bearer token).

| Status | When | Body |
| --- | --- | --- |
| 202 | Mail requested | `{ "detail": "Te enviamos un nuevo mail de verificación." }` |
| 401 | No session or an expired one | Standard session error |
| 403 | The session is a restaurant's | Wrong role (US-4 S3 pattern) |
| 409 | The diner is already verified | `{ "detail": "Tu email ya está verificado." }` |

## Mail sent (US-51)

- From `Servido! <no-reply@servido.discordia.fyi>`, subject "Verificá tu email en Servido!", in Spanish.
- A plain-text body and an HTML body, with the diner's name and a button or link to `/verificar-email?token=…`, valid for 24 hours.

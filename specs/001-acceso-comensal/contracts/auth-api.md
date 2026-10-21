# Diner authentication API contract

Base path: `/api`

## `POST /comensales`

Creates one diner account.

### Request

```json
{
  "nombre": "Ana",
  "email": "ana@example.com",
  "password": "una contraseña válida"
}
```

All three fields are required. The API trims `nombre` (1–60 characters, not
blank) and trims and lowercases the email before validation and persistence.

### Responses

- `201 Created`: returns `id`, `nombre`, normalized `email`, and
  `fecha_registro`; never returns the password or its hash.
- `400 Bad Request`: required field, email, or password policy violation. The
  body is `{"detail": [{"loc": [...], "msg": "...", ...}]}`; `loc` identifies
  the invalid field and `msg` is the Spanish message shown to the user.
- `409 Conflict`: a diner account already exists for the normalized email
  (`"Ya existe una cuenta asociada a ese email."`).

## `POST /auth/comensal`

Authenticates a diner with email and password.

### Request

```json
{
  "email": "ana@example.com",
  "password": "una contraseña válida"
}
```

### Responses

- `200 OK`: returns the diner plus a JWT:

  ```json
  {
    "comensal": {
      "id": "uuid",
      "nombre": "Ana",
      "email": "ana@example.com",
      "fecha_registro": "2026-10-21T12:00:00Z"
    },
    "access_token": "eyJ...",
    "token_type": "bearer"
  }
  ```

  `nombre` is `null` for accounts created before registration asked for it.
  The JWT claims are `sub` (the diner id), `email`, `rol` (`"diner"`), `iat`,
  and `exp`. The JWT is signed with HS256, uses a secret from the `JWT_SECRET`
  environment variable (at least 32 bytes), expires one hour after issuance,
  is returned only in JSON, and is not stored in a session table. Cookies are
  not used.
- `400 Bad Request`: missing or malformed credentials; no authentication
  attempt is made.
- `401 Unauthorized`: the same generic message for an unknown email and a
  wrong password (`"Credenciales inválidas"`). The response must not reveal
  which field failed.

The implementation must use the repository's Argon2 password hashing
convention. No password, hash, or secret is logged or returned.

Restaurant accounts log in through `POST /auth/restaurante` (spec 003), which
answers with `restaurante` instead of `comensal` and `rol` `"restaurant"` in
the token. A restaurant's credentials do not open a diner session.

## `GET /me`

Returns the account behind the token, for either role. The frontend calls it
to show who is signed in and to choose the home page.

### Request

Header `Authorization: Bearer <access_token>`.

### Responses

- `200 OK`:

  ```json
  {"rol": "diner", "id": "uuid", "nombre": "Ana", "email": "ana@example.com"}
  ```

  `rol` is `"diner"` or `"restaurant"`; `nombre` may be `null` for older
  diner accounts.
- `401 Unauthorized`: missing, malformed, expired, or altered token, or an
  account that no longer exists (`"Tu sesión no es válida o venció. Volvé a
  ingresar."`).

# Diner authentication API contract

Base path: `/api`

## `POST /comensales`

Creates one diner account.

### Request

```json
{
  "email": "ana@example.com",
  "password": "una contraseña válida"
}
```

The API trims and lowercases the email before validation and persistence.

### Responses

- `201 Created`: returns `id`, normalized `email`, and `fecha_registro`; never
  returns the password or its hash.
- `400 Bad Request`: required field, email, or password policy violation. The
  response identifies the invalid field without echoing the password.
- `409 Conflict`: a diner account already exists for the normalized email.

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

- `200 OK`: returns the diner `id` and `email` plus a JWT:

  ```json
  {
    "comensal": {"id": "uuid", "email": "ana@example.com"},
    "access_token": "eyJ...",
    "token_type": "bearer"
  }
  ```

  The JWT is signed with HS256, uses a secret from the `JWT_SECRET`
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

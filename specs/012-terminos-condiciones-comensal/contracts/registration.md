# Registration Contract: Diner Terms Acceptance

## `POST /api/comensales`

The existing diner registration body gains:

```json
{
  "nombre": "Comensal",
  "email": "comensal@example.com",
  "password": "Segura123",
  "terms_accepted": true
}
```

`terms_accepted` must be exactly `true`. Missing or false values return HTTP 400 with
`Primero aceptá los términos y condiciones.`. Successful 201 responses keep the existing
`DinerResponse` shape and do not expose the acceptance timestamp or password.

## `POST /api/comensales/google`

The existing Google sign-up body gains the same required boolean:

```json
{
  "credential": "<google-id-token>",
  "nombre": "Comensal",
  "terms_accepted": true
}
```

Google sign-in (`POST /api/auth/comensal/google`) is unchanged and does not receive terms
acceptance.

## Frontend legal routes

- `/terminos` renders the diner terms.
- The registration checkbox links to `/terminos` in a new tab with `rel="noopener"`.

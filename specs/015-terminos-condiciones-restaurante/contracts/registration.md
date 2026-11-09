# Registration Contract: Restaurant Terms Acceptance

## `POST /api/restaurantes`

The body adds `"terms_accepted": true` to the existing restaurant details and password fields.
Missing or false values return HTTP 400 with `Primero aceptá los términos y condiciones.`.

## `POST /api/restaurantes/google`

The body adds `"terms_accepted": true` to the existing Google credential and restaurant details.
The server stores version `1.0`; the client does not send a version.

## Frontend legal route

`/terminos/restaurantes` renders restaurant adhesion terms. The registration checkbox opens that
route with `target="_blank"` and `rel="noopener"`.

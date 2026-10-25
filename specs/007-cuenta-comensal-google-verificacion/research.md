# Research: Google sign-in and email verification (spec 007)

## R1. How the browser gets a Google identity

**Decision**: The Google Identity Services (GIS) "Sign in with Google" button, loaded from `https://accounts.google.com/gsi/client` on the login page, in popup mode. On success, GIS hands the page an ID token (a JWT signed by Google). The page posts it to our API.

**Rationale**: It needs no redirect URI, no client secret and no server-side OAuth flow. The OAuth client `Servido! web` (project `servido-512622`) only lists JavaScript origins, which matches this mode. It's the flow Google recommends for sign-in only (no access to Google APIs).

**Alternatives considered**: An authorization-code flow with a redirect URI and the client secret on the server. It adds a secret to manage and a callback route, and gains nothing, because we never call Google APIs. A third-party auth service (Auth0, Firebase Auth) contradicts the in-house auth of spec 001 and adds a service.

## R2. How the API verifies the ID token

**Decision**: Verify the ID token with PyJWT, which the backend already uses for its own tokens, with the `crypto` extra. `PyJWKClient` fetches Google's public keys from `https://www.googleapis.com/oauth2/v3/certs` and keeps them in memory. The token is accepted only if all of these hold:

- it is an RS256 signature from one of those keys;
- `aud` is our client ID;
- `iss` is `accounts.google.com` or `https://accounts.google.com`;
- `exp` is in the future;
- `email_verified` is true.

**Rationale**: This reuses a library the team already reads. The only addition is `cryptography`, which RS256 needs. All the checks are explicit in a few lines that a teammate can review.

**Alternatives considered**:
- `google-auth`: the official library, but it adds `google-auth`, `requests`, `cachetools` and `pyasn1` for one call.
- Google's `tokeninfo` endpoint: Google documents it for debugging, not production, and it costs a network round trip per sign-in.

## R3. Matching the Google account to a Servido! account

**Decision**: Look up the diner whose email equals the token's `email`, normalized like spec 001 (trimmed, lowercased). There's no stored link between accounts: the email is the link.

**Rationale**: This is the spec's assumption ("cuenta asociada" = same email), and `email_verified` guarantees that the person controls that address.

**Alternatives considered**: Storing Google's `sub` per diner. It only matters if a Google account changes its email, and it adds a column and a linking flow that US-52 doesn't ask for. If US-58 (create an account with Google) needs it later, it can add it then.

## R4. Where the client ID lives

**Decision**: `65379758997-psqucbqtjg6brottoh9bfctf9gnjag5g.apps.googleusercontent.com`:

- **Frontend:** a constant in `frontend/src/lib/google.ts`.
- **Backend:** the setting `google_client_id`, with that value as its default, overridable by the `GOOGLE_CLIENT_ID` environment variable.

**Rationale**: The client ID is public (it ships in the page). `.env` files are ignored by git and by the frontend Docker build, so a constant is the simplest way to make the same build work locally and in production. There's no new secret and no infrastructure change. The client secret is never used.

## R5. What "the authentication with Google doesn't complete" means (US-52 S4)

**Decision**: There are two cases:

1. **The user closes or cancels the Google popup.** GIS never calls back, so nothing is sent and nobody is signed in. The login page stays as it was. GIS itself reports the closed popup, so we add no message of our own.
2. **GIS returns a token our API rejects** (forged, expired, another audience, unverified email). The API answers 401 and the page shows "No pudimos ingresar con Google. Probá de nuevo."

**Rationale**: The scenario asks that the user "no accedo a ninguna cuenta" and sees an aviso. Case 2 is the one we control and test. Case 1 never reaches our code.

## R6. Sending the verification mail

**Decision**: Amazon SES (v2 API) through `boto3`, called synchronously right after the diner is committed. The sender is `Servido! <no-reply@servido.discordia.fyi>`. On the instance, the credentials come from the existing instance role, which gets `ses:SendEmail` on that identity only. A setting `mail_backend` chooses the implementation:

- `ses` in production;
- `smtp` in production while SES has no production access: the team Gmail with an app password;
- `console` locally, which logs the link;
- `memory` in tests, which keeps the messages so tests can read the link.

**Rationale**: There are no long-lived keys and no secret to store. The instance role already exists and SES is the sender chosen on 23/10. Sending inside the request is allowed by the constitution (no queues or workers), and the volume is a handful of mails a day. If the send fails, the error is logged and the account still exists (spec edge case "El correo no se puede enviar"). The diner can then use "Reenviar".

**Alternatives considered**:
- SES SMTP with `smtplib`: no dependency, but it needs SMTP credentials derived from an IAM user's long-lived key, stored as a new secret.
- Gmail SMTP: the fallback decided on 23/10 if AWS refuses SES production access. Built on 25/10 as the `smtp` backend, because AWS asked for more details before deciding. It needs an app password, which is a long-lived secret of the team's Google account.

**SES setup** (Terraform plus manual steps, see quickstart):
- **Terraform:** `aws_sesv2_email_identity` for `servido.discordia.fyi` with Easy DKIM, whose three CNAME records go in Cloudflare by hand like the ACM validation. Also an IAM policy on the instance role.
- **Manual:** production access (leaving the sandbox) is a one-time request in the SES console. Until AWS approves it, only verified recipient addresses get mail.

## R7. The verification token

**Decision**: 32 random bytes from `secrets.token_urlsafe`. Only its SHA-256 hash is stored, one row per diner (a unique constraint), with `expires_at = now + 24 h`. Resending overwrites that row, so earlier links stop working (FR-012). Verifying sets `used_at` on the row and `email_verified_at` on the diner. The used row stays, so opening the link again answers "ya estaba verificado" instead of an error. The link is `https://servido.discordia.fyi/verificar-email?token=…`, built from the setting `app_base_url` (`http://localhost:5173` locally).

**Rationale**: Storing a hash means a database leak can't verify accounts. The row-per-diner constraint is the "single active link" rule, enforced by the database. The link is opened in the SPA, which posts the token to the API: a plain GET on the API would let mail scanners that prefetch links verify the account.

**Alternatives considered**: A signed JWT as the token, with no table. It can't be invalidated when the diner resends, which FR-012 requires.

## R8. Accounts that existed before this feature

**Decision**: The migration that adds `email_verified_at` sets it to the migration time for every existing diner.

**Rationale**: The spec decides that those accounts count as verified, including the Sprint 1 demo accounts, whose `@servido.demo` addresses can't receive mail.

## R9. Order of the work

**Decision**:
1. **US-52 first:** endpoint, button and tests S1 to S4.
2. **US-51:** column, token, mail, verification page, resend, and the unverified notice.
3. **US-52 S5** ("Google verifies the account") lands with US-51, because it needs the verification state.
4. **US-51 S5** (no orders without verification) is enforced and tested by US-17, which creates orders. This feature exposes the state it needs.

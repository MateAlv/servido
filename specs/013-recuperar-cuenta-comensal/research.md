# Research: Recovering a diner account (spec 013)

The product decisions (same message for unknown emails, closing sessions, rate limit) are in `spec.md` and `specs/README.md`. These are the technical ones.

## R1. The token of the link

**Decision**: `secrets.token_urlsafe(32)`, the same generator as the verification mail (spec 019). The database stores only its SHA-256 hex digest, in `password_resets.token_hash`; the token itself lives only in the mail.

**Why**: Whoever reads the database can't use the links, and a leaked backup doesn't open accounts. It's the pattern a teammate already reviewed in `email_verification.py`.

**Rejected**: Storing the token as is (simpler, but a database read becomes an account takeover); a signed JWT as the link (no table, but then a link can't be voided when a new one is issued, and FR-010 asks for exactly that).

## R2. Expiry and single use

**Decision**: `expires_at = created_at + 15 minutes` is stored when the link is issued. `used_at` is set when the password changes. A token is valid while it matches a row that has `used_at IS NULL` and `expires_at` in the future.

**Why**: The timestamps are compared in UTC with `datetime.now(UTC)`, like the rest of the backend. Fifteen minutes is a duration, so the Argentina time zone only matters in the text the diner reads ("vence en 15 minutos"), not in the comparison.

**Rejected**: Counting from the token's hash with a TTL in a cache: the app has no cache and restarts on every deploy.

## R3. One active link per diner

**Decision**: `password_resets` has `UNIQUE (diner_id)`; a new request overwrites `token_hash`, `expires_at` and `used_at` on the same row, exactly like `email_verifications` (FR-010).

**Why**: "Only the last link works" becomes a column update instead of a search for the newest row. The unique constraint keeps it true even if two requests race.

**Rejected**: One row per request, with "the newest wins" in the query: more rows to reason about for the same behavior.

## R4. Knowing whether the account has a password

**Decision**: a new column `comensales.has_password`, `NOT NULL DEFAULT true`. `POST /api/comensales/google` (US-58) stores `false`; a successful recovery stores `true`. When the account has no password, the recovery mail doesn't include a link.

**Why**: The spec asks for a different mail for accounts created with Google, and today the only trace of that origin is a password hash of a random secret (`api/auth.py`, research R10 of spec 019), which can't be told apart from a real one. A boolean says it directly.

**Existing accounts**: the migration sets `true` for every row, so accounts created with Google before this feature count as password accounts and can get a link (and then set a password). It's a handful of demo accounts and it doesn't break anything: the mail is the same shape as any other recovery. Noted in `data-model.md`.

**Rejected**: making `password_hash` nullable — that changes the login of every account and adds a `None` branch to `verify_password`; a `google_subject` column — it would only say something for accounts created after spec 019 too, and US-52 doesn't store it.

## R5. Closing the sessions opened before the change (FR-011)

**Decision**: a new column `comensales.password_changed_at`, and a `pwd` claim in the diner's token that holds that moment in microseconds (`create_access_token` in `app/services/auth.py`). A token whose `pwd` differs from the account's current value is refused with the usual 401 «Tu sesión no es válida o venció». The check is made wherever the API loads the diner behind a token: `require_diner`, `GET /api/me` and the resend of the verification mail.

**Why**: The token already lives one hour and is stateless (spec 001), so all that is missing is a value that changes when the password does. Comparing the stored moment instead of the token's `iat` avoids the one-second precision of `iat`: a diner who resets the password and signs in right away must not be signed out again. Accounts whose password never changed send no claim, and tokens issued before this feature stay valid.

**Rejected**: a table of sessions or a token version counter — that's a session subsystem for an MVP that never has two users; shortening the token's life — it doesn't close a session, and the diner would be logged out of the browser they are using to recover, which is not what FR-011 asks.

**Known limit**: the token is still stateless, so the claim is only checked where the diner is loaded; endpoints that never read the account (none today for diners) couldn't tell.

## R6. Rate limit (FR-012)

**Decision**: a table `password_reset_requests` with one row per request (`email`, `requested_at`). Each request first deletes the rows of that email older than 30 minutes and then counts them; from the sixth, it answers 429 and sends nothing.

**Why**: It counts by email, exactly what the spec asks, and it works the same for addresses with and without an account, so the limit doesn't reveal which ones are registered (SC-004). The delete keeps the table small without a cleanup job, and the count is over one indexed email.

**Rejected**: a counter in memory — it is lost on every deploy and on a second instance; limiting by IP — the spec asks per email, and a shared network (a school, a café) would limit an entire group.

## R7. The endpoints and their status codes

**Decision**: three endpoints, keeping the Spanish style of the access API (`/api/comensales`, spec 001):

| Endpoint | Status | When |
| --- | --- | --- |
| `POST /api/comensales/recuperacion` | 202 | Mail requested, or no account: the same answer |
| | 400 | Email format invalid |
| | 429 | More than 5 requests by that email in 30 minutes |
| | 502 | The mail service failed |
| `POST /api/comensales/recuperacion/validacion` | 200 | The link can be used |
| | 400 | The link was used, expired or is unknown: the message says which |
| `PUT /api/comensales/recuperacion` | 200 | Password changed |
| | 400 | The link can't be used, or the password breaks a rule |

**Why**: 202 matches the resend of the verification mail: the API accepted the request, and whether a mail went out is not part of the answer. 429 and 502 are new in this API but they are the conventional codes for "too many requests" and "the upstream service failed"; the UI shows the Spanish `detail` of each.

**Rejected**: answering 200 with a message when nothing was sent — it's ambiguous with the success case; answering 404 for an unknown email — it breaks SC-004.

## R8. Password rules are checked in the service

**Decision**: `PUT /api/comensales/recuperacion` takes the password with only its size bounds in the schema, and the service calls `validate_password(password, diner.email)`, the same function as registration, answering 400 with its message.

**Why**: One of the rules compares the password with the account's email, which the request doesn't carry. Reusing the function keeps the rules and the wording identical (FR-005), so a diner sees the same message in both places.

## R9. The mail failure (edge case of the spec)

**Decision**: `request_recovery_mail` lets `MailError` out and the router answers 502 «No pudimos enviar el correo. Probá de nuevo.» The link issued before the failure stays; the retry issues a new one and voids it.

**Why**: The spec asks the diner to be told and to be able to retry. A send failure can only be seen when a mail was attempted, so in theory it says the account exists; in practice nobody can make SES fail on demand, and hiding it would leave a diner waiting for a mail that will never arrive.

**Rejected**: swallowing the error like the verification mail does — that's right at registration, where the account already exists and the diner has other ways in, but wrong here, where the mail is the only way.

## R10. The two pages and the double click

**Decision**: `/recuperar` asks for the email; `/restablecer?token=…` is the target of the link, checks the token when it opens and shows the form. The login shows «¿Olvidaste tu contraseña?» only for diners. The submit button is disabled while the request is in flight, which is what makes a double click send one mail.

**Why**: Two pages because a diner who opens a stale link must see that it no longer works and be offered a new one, not a form that asks for their email again. The check is a query, not an effect, for the same reason as `/verificar-email`: React runs effects twice in development.

**Rejected**: deduplicating requests in the API — the frontend already blocks the second click, and a time-based rule on the server would add a case a teammate has to remember. A second request voids the first link (FR-010), so at worst a double click leaves only the newest mail usable, which is the rule of the spec anyway.

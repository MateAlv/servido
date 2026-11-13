# Research: Restaurant account verification and recovery (spec 026)

The product decisions (24-hour verification link, 15-minute recovery link, 60 seconds between
requests, neutral message, closing sessions, dashboard notice) are in `spec.md` and
`specs/README.md`. These are the technical ones.

## R1. One table per role, not one shared table

**Decision**: two new tables, `restaurant_email_verifications` and
`restaurant_password_resets`, that copy `email_verifications` and `password_resets` (specs 019
and 013) with `restaurant_id` instead of `diner_id`. The rate-limit table
`password_reset_requests` is reused: it only stores the email, and every address gets the same
limit whether it has a diner, a restaurant, both or no account.

**Why**: a foreign key points to one table. A shared table would need `account_id` plus
`account_type` and a check constraint, so every query would filter by type, and the diner code
(reviewed and tested) would have to change for a feature about restaurants. Two small tables
keep each role's code obvious and leave specs 013 and 019 untouched.

**Rejected**: a polymorphic table (more checks, changes code that already works); one table per
role including the requests (it would count diner and restaurant requests separately for the
same address, and the limit wouldn't reveal anything only because it never did).

## R2. Tokens, expiry and single use

**Decision**: the same scheme as specs 013 and 019. `secrets.token_urlsafe(32)`; the database
keeps only its SHA-256 hex digest; the verification link lives 24 hours and the recovery link
15 minutes; `used_at` marks a used link and a new link overwrites the row (`token_hash`,
`expires_at`, `used_at`). Comparisons use `datetime.now(UTC)`, because both lifetimes are
durations; the Argentina time zone only matters in the text the Responsable reads.

**Why**: the code, the wording and the tests already exist in the diner's flow, and the spec
asks for the same criteria. Reusing the helpers (`hash_token`, `VerificationResult`,
`LinkState`, `link_state`, `count_request`) avoids a second set of rules.

**Rejected**: a signed JWT as the link (it can't be voided when a new one is issued, which
FR-004 asks for); storing the token in clear (a database read becomes an account takeover).

## R3. The 60 seconds between requests (edge case of the spec)

**Decision**: a recovery request for an email that already asked less than 60 seconds ago
answers 429 «Esperá un minuto antes de pedir otro link.» and sends nothing. The count is over
`password_reset_requests`, which also keeps the 5-per-30-minutes limit of spec 013. Both limits
apply to any email, registered or not, so neither reveals which addresses have an account.

**Why**: the spec's edge case asks for exactly that interval, and spec 013's table already has
the rows needed to measure it. The two limits are compatible: the interval stops a double
click, the count stops a script.

**Rejected**: counting only the 5-per-30-minutes limit (the spec asks for 60 seconds); a
cooldown in memory (lost on every deploy and useless with a second instance).

**Pending PO**: spec 013 has no interval for the diner. If the PO prefers one rule for both
roles, it is a two-line change in `restaurant_recovery.py` or in `password_recovery.py`.

## R4. What an unverified account receives (FR-009)

**Decision**: if the email has a restaurant whose account isn't verified, the recovery request
sends the **verification** mail (a new 24-hour link, which voids the previous one) and no
recovery link. The answer is the neutral 202 of any other request.

**Why**: sending instructions to reset the password of an address nobody proved would let
whoever typed it take the account over, which is exactly what US-44 prevents. The mail also
serves the real owner: opening it verifies the account, and asking again after that sends the
recovery link.

**Rejected**: refusing the request (it would say that the address has an unverified account);
sending both mails (two links, two subjects, more to explain and to test).

## R5. A send failure answers the neutral message (edge case of the spec)

**Decision**: `request_recovery_mail` catches `MailError`, logs it and lets the neutral 202
through. The link stays; asking again issues a new one.

**Why**: the spec's edge case says «en la recuperación ve el mismo mensaje neutro». This is
deliberately different from spec 013, where the API answers 502 so the diner knows the mail
didn't leave: for a restaurant the spec prefers not to distinguish anything from the request.

**Rejected**: the 502 of spec 013 (the spec of this feature overrides it for restaurants);
swallowing the error at registration as well, which already happens in `send_verification_mail`.

## R6. Hiding the restaurant from diners (FR-005)

**Decision**: `bookable_condition()` in `app/services/availability.py` adds
`Restaurant.email_verified_at IS NOT NULL`. The map, the list, the detail, the availability
endpoints and the creation of a reservation already use that condition, so they all agree.

**Why**: one condition instead of a filter in each router. A diner can't see the restaurant
nor book it, and the review of a restaurant that stops being bookable already answers 404.

**Existing rows**: the migration marks every restaurant as verified, because those accounts
were created before this feature (same rule as `email_verified_at` for diners, spec 019). The
seeded demo restaurant is also marked verified on every run of `scripts/seed.py`, and the local
mode (`AUTO_VERIFY_EMAILS=true`, `make up-local`) marks new restaurants verified, so the demo
doesn't need to open a mail.

**Rejected**: filtering only in `GET /api/restaurants` (a hidden restaurant would still be
bookable by its id); a flag in `restaurantes` that duplicates the timestamp.

## R7. Closing the sessions opened before the change (FR-012)

**Decision**: the restaurant token carries the `pwd` claim with the password's generation
(`password_changed_at` in microseconds), like the diner's. `session_is_current` accepts either
account and is checked wherever a restaurant token is loaded: `restaurant_from_claims` in
`app/api/restaurant.py` (used by closures and reviews), the dish endpoints (moved to the same
helper) and `GET /api/me`.

**Why**: a password that still opens an old token isn't invalidated. The claim is only added
when the password changed, so the tokens issued before this feature stay valid (their account
has no `password_changed_at`).

**Rejected**: a session table or a token version counter (a session subsystem for an MVP with
one restaurant per account); shortening the token's life (the session would close anyway).

**Known limit**: the claim is checked where the account is loaded; every restaurant endpoint
loads it today.

## R8. A restaurant created with Google

**Decision**: `POST /api/restaurantes/google` stores `email_verified_at = now()` and
`has_password = false`. Its recovery mail tells the Responsable to sign in with Google
instead of offering a link, and setting a new password with a link sets `has_password = true`.

**Why**: Google already proved the address, exactly the rule of US-58 and US-51 S5 for diners.
Hiding a Google restaurant until it opens a mail nobody sent would make US-2 S5 useless.
`has_password` exists because a random hash can't be told apart from a real one (research R4 of
spec 013).

**Rejected**: sending a verification mail to a verified address (the spec's edge case says the
account is already verified); a shared `has_password` with the diner (different tables).

## R9. The endpoints and their status codes

**Decision**: five endpoints with the Spanish style of the access API, mirroring the diner's:

| Endpoint | Status | When |
| --- | --- | --- |
| `POST /api/restaurantes/verificacion` | 200 | The link verifies the account, or says it was already verified |
| | 400 | The link is unknown or expired |
| `POST /api/restaurantes/verificacion/reenvio` | 202 | A new link was mailed |
| | 401 / 403 | No session or not a restaurant |
| | 409 | The email is already verified |
| `POST /api/restaurantes/recuperacion` | 202 | Accepted, or no account: the same answer |
| | 400 | Email format invalid |
| | 429 | Less than 60 seconds, or more than 5 requests in 30 minutes by that email |
| `POST /api/restaurantes/recuperacion/validacion` | 200 | The link can be used |
| | 400 | Used, expired or unknown: the message says which |
| `PUT /api/restaurantes/recuperacion` | 200 | Password changed |
| | 400 | The link can't be used, or the password breaks a rule |

**Why**: the same codes as spec 013 with the access path of the restaurant (`/api/restaurantes`,
spec 002-cuenta-restaurante), so the frontend calls one API shape for both roles.

**Rejected**: a generic `/api/recuperacion?rol=…` (the access API of spec 001 keeps one path per
role); answering 502 on a send failure (research R5).

## R10. The pages

**Decision**: three routes, `/restaurante/verificar-email`, `/restaurante/recuperar` and
`/restaurante/restablecer`, which render the diner pages with `role="restaurant"`. The texts,
the endpoints and the link back to the login change; the layout, the `Card`, the double-click
guard and the token check are shared. The dashboard shows `UnverifiedNotice`, which now resends
for either role, and `/ingresar` offers «¿Olvidaste tu contraseña?» to both.

**Why**: the spec asks for the same criteria, visually too. Copying the three pages would
duplicate the fragile parts (a query instead of an effect, the confirmation of the password)
and they would drift.

**Rejected**: one page with a role in the query string (a diner could open the restaurant
form and get a 400 with no explanation); duplicating the pages (two places to fix).

## R11. Password rules

**Decision**: `PUT /api/restaurantes/recuperacion` validates with `validate_password(password,
restaurant.email)`, the function registration uses, and answers 400 with its message.

**Why**: one rule compares the password with the email, which the request doesn't carry, and
the wording must be identical (FR-011, and the spec asks for the same criteria as spec 013).

## R12. Tests

**Decision**: two files, `test_restaurant_verification.py` (US-44) and
`test_restaurant_recovery.py` (US-46), on the same fixtures as the diner's: `client` on a real
Postgres rolled back per test and the `memory` outbox. The 60-second interval is skipped by
setting `password_reset_requests.requested_at` a minute and a second back, the way spec 013's
expiry test edits `password_resets.expires_at`.

**Why**: each acceptance scenario traces to a test with the US and the scenario in the name
(`AGENTS.md`, Tests). Moving the rows keeps the tests deterministic without patching the clock,
which other rules (`current_time`) already need.

**Rejected**: a free clock fixture (more moving parts for one interval); sleeping 60 seconds in
the tests (unacceptable in CI).

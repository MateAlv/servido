# Data Model: Restaurant account verification and recovery (spec 026)

Three columns on `restaurantes` and two new tables. Nothing is stored about the new password
except its hash (spec 001) and the moment it changed. The rate-limit table of spec 013 is
reused as it is.

## Restaurant (`restaurantes`, from spec 002-cuenta-restaurante): three new columns

| Column | Type | Rules |
| --- | --- | --- |
| `email_verified_at` | `timestamptz`, nullable | `NULL` while the email is not verified. Set when the Responsable opens a valid link, or when the restaurant is created with Google. Never cleared. |
| `has_password` | `boolean`, not null, default `true` | `false` for a restaurant created with Google, which has no usable password. A recovery through a link sets it to `true`. |
| `password_changed_at` | `timestamptz`, nullable | Moment of the last recovery. `NULL` while the password never changed. Tokens issued before it are refused: that's how the open sessions are closed (FR-012). |

- The account is verified when `email_verified_at IS NOT NULL`, and only then is the restaurant
  bookable (FR-005).
- **Migration**: add the three columns; set `email_verified_at = now()` for every existing row,
  because those accounts were created before this feature (same rule as spec 019 for diners);
  `has_password` gets `true` and `password_changed_at` stays `NULL`.
- **Naming**: English, like the columns of specs 019 and 013, even though the table and the
  access API keep the Spanish names of spec 002-cuenta-restaurante.

## RestaurantEmailVerification (`restaurant_email_verifications`): new table

The pending verification link of one restaurant.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `restaurant_id` | `uuid` | FK → `restaurantes.id_restaurante`, `ON DELETE CASCADE`, **unique**: at most one active link per restaurant |
| `token_hash` | `varchar(64)` | SHA-256 hex digest of the token sent by mail, **unique**. The token itself is never stored. |
| `expires_at` | `timestamptz` | Creation time + 24 hours |
| `used_at` | `timestamptz`, nullable | Set when the link verifies the account. The row is kept, so opening it again can say "ya estaba verificado". |
| `created_at` | `timestamptz` | Default `now()` |

## RestaurantPasswordReset (`restaurant_password_resets`): new table

The link that is currently valid to change one restaurant's password.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `restaurant_id` | `uuid` | FK → `restaurantes.id_restaurante`, `ON DELETE CASCADE`, **unique**: one link per restaurant |
| `token_hash` | `varchar(64)` | SHA-256 hex digest of the token sent by mail, **unique** |
| `expires_at` | `timestamptz` | Creation time + 15 minutes |
| `used_at` | `timestamptz`, nullable | Set when the password changes. Kept so the page can say the link was already used. |
| `created_at` | `timestamptz` | Default `now()` |

## PasswordResetRequest (`password_reset_requests`, from spec 013): unchanged, shared

One row per recovery request, only to count them per email. It has no foreign key, so it
already counts addresses without an account, and it now counts a restaurant's requests with
the diner's: the same address gets one limit and a diner's request closes the restaurant's
60-second window and vice versa. The limits apply to any address, so they reveal nothing
(SC-005).

- Less than 60 seconds since the last request of that email: 429.
- More than 5 requests by that email in 30 minutes: 429 (research R3, spec 013).
- Every request deletes the rows of that email older than 30 minutes before counting, so the
  table never grows and there is no cleanup job.

## State transitions

```text
registration with a password ──► Unverified (row in restaurant_email_verifications, 24 h)
Unverified ──resend or recovery request──► Unverified (same row, new token: the old link stops working)
Unverified ──valid, unexpired link──► Verified (email_verified_at and used_at set)
registration with Google ──► Verified (email_verified_at set at creation)
Verified ──same link again──► Verified (reported as "ya estaba verificado", nothing changes)

Verified recovery request ──► Link pending (row in restaurant_password_resets, 15 min)
Verified recovery request, Google account ──► "Use Google" mail, no link
Link pending ──new request (after 60 s)──► Link pending (same row, new token)
Link pending ──valid link, new password──► Used (used_at, password_hash, password_changed_at set)
Link pending ──15 minutes pass──► Expired (nothing is written: expiry is read from expires_at)
Used or Expired ──► the page offers a new link
```

## Invariants enforced by the database

- One active verification link per restaurant: `UNIQUE (restaurant_id)`.
- One recovery link per restaurant: `UNIQUE (restaurant_id)`.
- A token hash identifies one link: `UNIQUE (token_hash)`.
- The links don't outlive their account: `ON DELETE CASCADE`.
- The email stays unique, verified or not: the existing `UNIQUE (email)` on `restaurantes`.
- `has_password` is never null: `NOT NULL DEFAULT true`.
- The old password stops working (SC-004) because `password_hash` is replaced, not added to.

## Not stored

- The token in clear: only its SHA-256.
- The new password in clear or in history: there is no password history.
- The IP or the user agent of the request: the limits are per email, as the spec says.

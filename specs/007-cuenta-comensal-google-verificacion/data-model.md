# Data Model: Google sign-in and email verification (spec 007)

US-52 and US-58 add no data: an account created with Google is an ordinary diner, verified, whose password hash belongs to a random secret (research R10). US-51 adds one column to `comensales` and one table.

## Diner (`comensales`, from spec 001): one new column

| Column | Type | Rules |
| --- | --- | --- |
| `email_verified_at` | `timestamptz`, nullable | `NULL` while the email is not verified. It's set when the diner opens a valid link, or when they sign in with Google (FR-013). It's never cleared. |

- The account is verified when `email_verified_at IS NOT NULL`. US-17 (orders) reads this to block orders from unverified diners (FR-009).
- **Migration:** add the column, then set `email_verified_at = now()` for every existing row, because accounts created before this feature count as verified.
- **Naming:** the column is in English, following the glossary rule for new code, even though the table keeps the Spanish names of the access API.

## EmailVerification (`email_verifications`): new table

The pending verification link of one diner.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `diner_id` | `uuid` | FK → `comensales.id_comensal`, `ON DELETE CASCADE`, **unique**: at most one active link per diner |
| `token_hash` | `varchar(64)` | SHA-256 hex digest of the token sent by mail, **unique**. The token itself is never stored. |
| `expires_at` | `timestamptz` | Creation time + 24 h |
| `used_at` | `timestamptz`, nullable | Set when the link verifies the account. A used link is kept, so opening it again can say "ya verificada". |
| `created_at` | `timestamptz` | Default `now()` |

## State transitions

```text
registration ──► Unverified (row in email_verifications, expires in 24 h)
Unverified ──resend──► Unverified (same row, new token_hash and expires_at: the old link stops working)
Unverified ──valid, unexpired link──► Verified (email_verified_at and used_at set)
Unverified ──Google sign-in with that email──► Verified (email_verified_at set)
Unverified ──unknown or expired link──► Unverified (nothing changes)
Verified ──same link again──► Verified (the link is found with used_at set: reported as "ya verificada")
```

A token that matches no row, or an unused row whose `expires_at` has passed, is invalid. A resend replaces `token_hash`, `expires_at` and `used_at`, so the previous link no longer matches.

## Invariants enforced by the database

- One active link per diner: `UNIQUE (diner_id)`.
- A token hash identifies one link: `UNIQUE (token_hash)`.
- A link doesn't outlive its account: `ON DELETE CASCADE`.
- Email uniqueness, verified or not (FR-010): the existing `UNIQUE (email)` on `comensales`.

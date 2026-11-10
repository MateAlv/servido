# Data Model: Recovering a diner account (spec 013)

Two columns on `comensales` and two new tables. Nothing is stored about the new password except its hash (spec 001) and the moment it changed.

## Diner (`comensales`, from spec 001): two new columns

| Column | Type | Rules |
| --- | --- | --- |
| `has_password` | `boolean`, not null, default `true` | `false` for an account created with Google (US-58), which has no usable password. A recovery sets it back to `true` only if the account used a link, so Google accounts stay `false`. |
| `password_changed_at` | `timestamptz`, nullable | Moment of the last recovery. `NULL` while the password never changed. Tokens issued before it are refused: that's how the open sessions are closed (FR-011). |

**Migration**: add both columns. `has_password` gets `true` for every existing row, which includes accounts created with Google before this feature; they can ask for a link and then set a password, which is harmless. `password_changed_at` stays `NULL`.

**Naming**: English, like `email_verified_at` (spec 019), even though the table keeps the Spanish names of the access API.

## PasswordReset (`password_resets`): new table

The link that is currently valid for one diner.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `diner_id` | `uuid` | FK → `comensales.id_comensal`, `ON DELETE CASCADE`, **unique**: at most one link per diner |
| `token_hash` | `varchar(64)` | SHA-256 hex digest of the token sent by mail, **unique**. The token itself is never stored. |
| `expires_at` | `timestamptz` | Creation time + 15 minutes (FR-008) |
| `used_at` | `timestamptz`, nullable | Set when the password changes. A used row is kept so the page can say the link was already used (S6). |
| `created_at` | `timestamptz` | Default `now()` |

## PasswordResetRequest (`password_reset_requests`): new table

One row per recovery request, only to count requests per email (FR-012).

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `email` | `varchar(255)` | Normalized exactly like an account's email (trimmed, lowercased). No foreign key: addresses without an account are counted too, so the limit doesn't reveal which ones exist. |
| `requested_at` | `timestamptz` | Default `now()`, part of the index `(email, requested_at)` |

Each request deletes the rows of that email older than 30 minutes and then counts them. From the sixth, the answer is 429 (research R6).

## State transitions

```text
request ──► Link pending (row in password_resets, expires in 15 min; previous link voided)
Link pending ──new request──► Link pending (same row, new token_hash and expires_at: the old link stops working)
Link pending ──valid link, new password──► Used (used_at set, password_hash replaced, password_changed_at set)
Link pending ──15 minutes pass──► Expired (nothing is written: expiry is read from expires_at)
Expired ──► nothing changes: the page offers a new link
Used ──► nothing changes: the page offers a new link
```

A token that matches no row is invalid. An unused row whose `expires_at` has passed is expired. Both are refused with 400 and a different message for each case (S6, S7).

## Invariants enforced by the database

- One link per diner: `UNIQUE (diner_id)`.
- A token hash identifies one link: `UNIQUE (token_hash)`.
- A link doesn't outlive its account: `ON DELETE CASCADE`.
- `has_password` is never null: `NOT NULL DEFAULT true`.
- The old password stops working (SC-003) because `password_hash` is replaced, not added to.

## Not stored

- The token in clear: only its SHA-256.
- The new password in clear or in history: there is no password history (SC-003 only asks that the old one stops working).
- The IP or the user agent of the request: the limit is per email, as the spec says.

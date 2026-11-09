# Data Model: Diner Terms Acceptance

## Diner (`comensales`)

Existing account fields remain unchanged. The feature adds:

| Field | Type | Nullability | Rules |
| --- | --- | --- | --- |
| `terms_version` | `varchar(20)` | nullable | Set to the server constant `1.0` for new registrations |
| `terms_accepted_at` | `timestamptz` | nullable | Set to the current UTC time for new registrations |

Legacy accounts keep both fields `NULL`. A database check constraint requires both fields to be
null or both to have a value.

## Registration request

`POST /api/comensales` and `POST /api/comensales/google` receive
`terms_accepted: Literal[True]`. The client sends `true`; the server does not accept a version from
the client.

## Transaction behavior

The account and its terms acceptance are added before the existing registration commit. Duplicate
email, invalid Google credentials, and other registration failures leave no new account or
acceptance.

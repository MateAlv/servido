# Data Model: Restaurant Terms Acceptance

## Restaurant (`restaurantes`)

The feature adds:

| Field | Type | Nullability | Rules |
| --- | --- | --- | --- |
| `terms_version` | `varchar(20)` | nullable | Set to the server constant `1.0` for new registrations |
| `terms_accepted_at` | `timestamptz` | nullable | Set to the current UTC time for new registrations |

Both fields remain `NULL` for legacy accounts. A database check constraint requires both fields to
be null or both to have a value.

## Registration request

`POST /api/restaurantes` and `POST /api/restaurantes/google` require
`terms_accepted: Literal[True]`. The client does not supply the terms version.

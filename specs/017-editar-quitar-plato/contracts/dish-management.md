# Dish Management API Contract — US-34

Design contract for implementation; the running API does not yet expose these operations. All paths include `/api`. New operations use English identifiers; existing US-12 creation/list operations remain compatible. Authentication uses the current Bearer JWT.

## Owned resource and errors

Base resource: `/api/restaurant/dishes/{dish_id}` where `dish_id` is a UUID. Resolve the authenticated restaurant from claims, never from request data. Missing/expired credentials: 401. Diner role or foreign-owned dish: 403. Unknown ID: 404. A deleted dish is 404 for read/edit/availability and an idempotent success for its owner's repeated DELETE. Check ownership even for deleted records. Invalid inputs: 400; duplicate live name: 409. Return Spanish `detail` messages and field-specific validation information using the existing API error conventions; frontend maps known fields to labelled controls. Never emit 422.

Do not rename `/api/restaurantes/me/platos`: its existing GET returns only live dishes (available and unavailable), and its POST remains the creation entrypoint. Its response continues to use existing Spanish fields. Adding optional/defaulted management metadata must not break creation callers; the edit page obtains revision through the new detail operation.

## Management representation

`DishManagementResponse` contains:

| Field | JSON type / meaning |
| --- | --- |
| `id` | UUID string |
| `name` | string |
| `description` | string or null |
| `category` | existing US-12 catalog value |
| `price` | decimal string, e.g. `"7500.00"` |
| `photo_url` | string or null |
| `dietary_restrictions` | array of existing US-12 restriction values |
| `prep_time_minutes` | positive integer or null |
| `available` | boolean |
| `revision` | positive integer |

Map to the stored fields in `data-model.md`; do not handwrite frontend API types. Management write responses are `{ "dish": <DishManagementResponse>, "changed_since_open": false }`. A true flag means an intervening change was detected and the current request was saved successfully. Show: “El plato había cambiado desde que lo abriste. Guardamos tus cambios.”

## GET /api/restaurant/dishes/{dish_id}

200 with `DishManagementResponse`. Used on edit-page load and availability action preparation. Deleted rows are not returned. No side effects.

## PUT /api/restaurant/dishes/{dish_id}

Full editable-field replacement using `multipart/form-data`. Availability is managed separately and remains unchanged by this operation.

| Part | Requirement |
| --- | --- |
| `name` | Required, trimmed nonblank, max 150 characters |
| `category` | Required: `entrada`, `plato_principal`, `postre`, `bebida` |
| `price` | Required decimal text, finite, positive, max two decimals and Numeric(10,2) range |
| `description` | Optional; omitted/empty clears to null; max 2,000 characters |
| `dietary_restrictions` | Repeated form values; omission means empty list; existing catalog, deduplicated |
| `prep_time_minutes` | Optional positive integer; omitted/empty clears to null; PostgreSQL integer range |
| `photo_action` | Required enum `keep`, `replace`, `remove` |
| `photo` | Required only with `replace`; JPG/PNG, at most 5 MiB (existing limit) |
| `expected_revision` | Required positive integer from loaded detail |

`keep` retains the stored URL, `remove` clears it, `replace` requires a nonempty file. Reject ambiguous combinations (file with keep/remove or replace without file) with 400. Validate all parts before committing a mutation. An unchanged normalized payload is a successful no-op and does not increment revision; a new replacement file counts as a change.

Return 200 with the write envelope. A stale revision does not cause 409: apply submitted editable fields, preserving current availability, return the mismatch flag and resulting revision. Conditional updates must still exclude removed rows so stale forms cannot revive a deletion. Duplicate names produce 409 and leave every existing field unchanged.

Photo persistence uses the existing uploads directory and generated filenames. On validation, storage or database failure, leave the previous URL/data intact and clean up any newly staged file. Do not delete the old file before a successful commit. Replacement/removal may unlink its superseded local file after commit; failure to unlink must not revert the saved dish. Deleting a dish can retain its photo file; no background cleanup service is introduced. Preserve the existing creation endpoint's error cleanup behavior.

## PATCH /api/restaurant/dishes/{dish_id}/availability

JSON: `{ "available": false, "expected_revision": 1 }`.

200 with the write envelope. Only the availability flag changes; validate owner/live status and expected revision. Repeat of the same value is a successful no-op. Re-enabling a live dish shows its latest values; a deleted dish cannot be enabled. Return and display the same stale-save notice if another change was detected.

## DELETE /api/restaurant/dishes/{dish_id}

No body. 204 with no content. First call sets `deleted_at` to current UTC, sets availability false and increments revision. Repeat by the same owner returns 204 without updating deletion time or revision. No order/cart rows are deleted or rewritten. No restore operation exists.

The UI calls DELETE only after explicit confirmation. Cancelling or dismissing the dialog makes no mutation request. A server cannot prove that a human clicked a dialog; enforce this acceptance criterion through frontend tests rather than a decorative confirmation parameter.

## Contract generation and compatibility

Implement Pydantic schemas and route response/status declarations, then run `make api-types`. Commit both `frontend/src/api/openapi.json` and `schema.d.ts` with application implementation. Reuse typed `api` calls; for multipart use the client's supported body serializer/FormData boundary handling, without setting multipart Content-Type manually. Retain generated request/response schema references and map form values explicitly at the adapter boundary.

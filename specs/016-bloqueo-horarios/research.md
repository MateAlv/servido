# Research: Bloquear Horarios No Disponibles (US-32)

The spec fixes the product behavior. This document records the technical decisions that are not
obvious from the spec, the alternatives considered, and the assumptions left for the PO.

## R1 — Store the closure as a local date plus an optional local time range

**Decision**: `closures` stores `date` (`DATE`), `start_time` (`TIME`, nullable) and `end_time`
(`TIME`, nullable). Both times are `NULL` for a whole-day closure; both are present for a range.

**Why**: Shifts (`turnos`) are already weekday + local time, and every availability rule combines
a Buenos Aires date with a local time. Storing UTC timestamps would force a conversion on every
read and would make "the whole day" depend on the current timezone rules. The spec also talks
about "fecha" and "franja horaria", not instants.

**Alternatives rejected**:

- `starts_at`/`ends_at` timestamptz like reservations: more columns and conversions for a rule
  that is inherently local and date-based; a whole-day closure would need a magic `00:00–24:00`
  range.
- A boolean `all_day` plus times: redundant with the nullable pair and allows inconsistent rows.

The database still enforces the shape: either both times are `NULL` or both are present and
`end_time > start_time`.

## R2 — A slot or reservation is affected when its block overlaps the closure

**Decision**: Convert the closure to a half-open local interval `[start, end)`, where a whole day
is `[date 00:00, date+1 00:00)`. A reservation or candidate slot `[starts_at, ends_at)` is
affected when `starts_at < closure_end AND ends_at > closure_start`.

**Why**: The spec's edge case says a reservation that crosses the border is affected even if it
starts before or ends after the range. The same rule makes a slot unavailable when its 90 minutes
overlap the closure, which is what S2 asks. It also handles a whole-day closure uniformly.

**Consequence**: Blocking `13:00–14:00` also removes the `12:00` slot (it ends at `13:30`) and the
`13:30` slot (it starts before `14:00`). That is the intended "se superpone" behavior.

## R3 — One POST with an explicit confirmation, no separate preview endpoint

**Decision**: `POST /api/restaurante/bloqueos` creates the closure. If there are confirmed
reservations in the range and the request is not confirmed, the API answers `409` with the list
(date, time, party size). The page shows the list and sends the same payload again with
`confirmed: true` and `acknowledged_reservation_ids` set to the ids it showed. The server compares
that set with the current affected set:

- different set → `409` with the updated list (the edge case of a reservation created between
  the warning and the confirmation);
- same set → apply.

When the range has no affected reservations, the first request applies it directly.

**Why**: This reuses the established repository pattern for a warning with details (table
inventory, US-10 S3: `409` with `detail.reservations`). A separate preview endpoint would still
need the re-check at confirmation time, so it would add an endpoint without removing the race.
Sending the acknowledged ids is the simplest way to prove the restaurant saw the current list.

**Alternatives rejected**:

- `200` with `{created: false, reservations: [...]}`: the client would have to distinguish a
  successful no-op from a warning, and the repository already uses `409` for this.
- A two-step token stored on the server: more state for a course MVP that never has concurrent
  users.

## R4 — Idempotency with a client-generated `request_id`

**Decision**: The page generates one `request_id` per block attempt with `newRequestId()`. The
column is unique. A repeated request with the same id returns the existing closure (`200`) without
cancelling anything again.

**Why**: The spec explicitly requires "doble confirmación del bloqueo: se aplica una sola vez y
las reservas se cancelan una sola vez". This is the same mechanism spec 005 uses for reservations
(`request_id`), so it is already understood by the team. Overlapping closures with different ids
remain allowed (spec edge case).

**Note**: A new attempt (page reload, new form submission) gets a new id and may create an
overlapping closure; the spec allows overlaps, so this is not a conflict.

## R5 — Cancellation is a reservation state transition; orders are derived as cancelled

**Decision**: Applying a closure sets `status = 'cancelled'` and `cancelled_at = now` (UTC) on each
affected reservation and deletes its cart. The associated `Order` keeps its stored status; the
existing restaurant views already treat the order of a cancelled reservation as cancelled
(spec 008, US-18 S3; spec 009, P12). No `Order.status` value is added.

**Why**: Spec 009 (team decision P12, 30/10) already defines that "el pedido de una reserva
cancelada queda cancelado, sin borrarse" and the order status constraint only accepts
`confirmed`/`pending`. Changing that model would modify another spec and its tests for no new
user-visible behavior. Availability already counts only `confirmed` reservations, so changing the
status frees the table with no extra code.

**Consequence**: `GET /api/restaurante/cancelaciones` lists the reservations with
`preordered_order: {status: "cancelled"}` when they had an order, which is exactly US-18 S3.

## R6 — Mail to each affected diner, after the commit

**Decision**: After the closure transaction commits, the router calls
`closures.notify_cancelled_reservations(...)`, which sends one mail per affected diner through the
existing `app/services/mail.py`. The mail contains the restaurant name, the date and the
reservation time. A `MailError` is logged; it never rolls back the closure or the cancellations.

**Why**: FR-007 asks for the notice (team proposal pending PO validation). Sending after the
commit avoids mailing a cancellation that was rolled back, and matches the "best effort" handling
of the verification mail (`send_verification_mail` logs a failed send). Tests use the existing
`memory` backend and `mail_outbox` fixture.

**Alternative rejected**: sending inside the transaction. A mail is an external side effect that
cannot be undone; the transaction should commit first.

## R7 — Whole-day closure closes the day; a range disables the overlapping slots

**Decision**: In `GET /api/restaurants/{id}/availability`, a whole-day closure returns
`open: false` and no slots. A time range keeps `open: true` and marks only the overlapping slots
`available: false`. No new response field and no change to the diner page.

**Why**: The diner page already renders `open: false` as "Ese día el restaurante no atiende" and
disabled slots as "Ocupado". Both satisfy FR-002/SC-001 ("los horarios bloqueados no se muestran
como disponibles") without adding API surface. A partial closure still leaves the other slots
usable.

**Trade-off**: A partial closure that covers a whole shift shows the existing "no quedan horarios
con mesa libre" message instead of a specific "bloqueado" message. The spec does not require a
different message, and the MVP keeps the response unchanged.

## R8 — Listing shows today and future closures; deleting does not restore reservations

**Decision**: `GET /api/restaurante/bloqueos` returns the restaurant's closures with
`date >= today` (Buenos Aires), ordered by date and start time. `DELETE` removes one closure. It
does not change any reservation.

**Why**: S7 says "bloqueos vigentes". Past closures have no practical effect, and the spec forbids
creating them, so hiding them keeps the screen focused. FR-009 explicitly says deleting must not
restore cancelled reservations; availability is recomputed from the remaining closures, so the
slots return if no other closure covers them.

## R9 — Ownership and isolation

**Decision**: Every closure endpoint uses `restaurant_from_claims`. Queries filter by the
authenticated `restaurant_id`. A closure from another restaurant answers `404`, exactly like a
missing one, so the API never reveals that it exists. Diner tokens answer `403`.

**Why**: FR-010 and the spec's isolation edge case; matches the existing restaurant reservation
endpoints (spec 008, US-16).

## R10 — Validation of dates and ranges

**Decision**:

- `date < today` in Buenos Aires → `400` "No podés bloquear una fecha pasada."
- only one of `start_time`/`end_time` → `400` (the request must choose a whole day or a range).
- `end_time <= start_time` → `400` "La hora de fin debe ser posterior a la de inicio."
- `date == today` and a range whose `start_time < now.time()` → `400` "Esa franja ya comenzó.
  Elegí una hora posterior o bloqueá el día completo."
- `date == today` and a whole-day closure → allowed (it closes the rest of the day).
- `date > today` → allowed, with no extra horizon. The spec does not set one and a closure has no
  table reserved, so it cannot freeze inventory like a reservation (spec 005, D10).

**Why**: These are exactly FR-003 and the two edge cases about past dates and partially past
ranges. Times come from a `time` input, so a range starting at the current minute is accepted
(`start_time == now.time()` is not "already passed").

## R11 — No change to the diner UI

**Decision**: The reservation page needs no change. It already hides `open: false` days and
disables unavailable slots, and the confirmation already handles a `409` by refreshing the
selection.

**Why**: FR-002 is a server-side availability rule. Adding a "bloqueado" label would require a new
API field and a UI change that the spec does not ask for.

## Open assumptions for the PO

| Assumption | Where it comes from | What this plan does |
| --- | --- | --- |
| Mail to the diner whose reservation is cancelled | FR-007, marked as a team proposal | Sends it after the commit; a failure is logged |
| A range for today that already started is rejected; the whole day is allowed | Spec edge case, marked as a proposal | Implemented in `services/closures.py` |
| A reservation crossing the range border is affected | Spec edge case, marked as a proposal | Overlap rule R2 |
| A reservation created between the warning and the confirmation re-warns | Spec edge case, marked as a proposal | Acknowledged-id check R3 |
| Refunds for cancelled reservations | Out of scope until US-38/US-56 | Not implemented |
| Cancelling an individual reservation from the restaurant | Out of scope (US-38) | Not implemented |

These are also listed in `specs/README.md` under "Pendientes de aclarar con la PO".

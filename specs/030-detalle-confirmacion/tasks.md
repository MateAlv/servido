---

description: "Task list for reservation confirmation details (US-54)"
---

# Tasks: Reservation Confirmation Details

**Input**: Design documents from `/specs/030-detalle-confirmacion/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/reservations-confirmation-api.md](./contracts/reservations-confirmation-api.md)

**Tests**: Required. The constitution requires at least one automated test per acceptance scenario, named after its US and scenario.

**Scope**: US-54 only. Do not modify `specs/031-ver-promociones/` or implement push, SMS, WhatsApp, calendar downloads or reservation editing.

## Phase 1: Setup

**Purpose**: Confirm the existing reservation, mail and frontend test surfaces before changing code.

- [X] T001 Inspect the existing reservation fixtures and authenticated diner helpers in `backend/tests/test_reservation.py` and `backend/tests/reservations.py` to identify the reusable setup for US-54 tests
- [X] T002 [P] Inspect the existing confirmation-step and active-reservation test mocks in `frontend/src/pages/ReservationPage.test.tsx` and `frontend/src/pages/DinerReservationsPage.test.tsx` before adding US-54 assertions

**Checkpoint**: Existing fixtures, API mocks and test names are understood; no source behavior has changed.

---

## Phase 2: Foundational

**Purpose**: No new shared infrastructure is required. The existing `Reservation`, `Restaurant`, `Diner`, `request_id`, mail backends and `GET /api/reservations/active` are reused.

**Checkpoint**: No database migration, new dependency, notification table, queue or service is needed; the US-54 story can be implemented directly.

---

## Phase 3: US-54 — Recibir detalle de confirmación 🎯

**Goal**: After a successful reservation confirmation, send exactly one email with the complete local-time details, show the complete receipt immediately, and expose the confirmed reservation with the same details in «Mis reservas». Rejected confirmations must have no confirmation side effect.

**Independent Test**: With a verified diner and an available verified restaurant, confirm a reservation and verify the email outbox, on-screen receipt and active-reservation response contain the same restaurant, address, Buenos Aires date/time, party size, assigned table and reservation id. Repeat the same `request_id`, force an availability conflict and force a mail failure to verify idempotency and failure behavior.

### Tests for US-54 (write first; they must fail before implementation)

- [X] T003 [P] [US1] Add `test_us54_s1_confirmation_sends_email_details` to `backend/tests/test_reservation.py`, asserting a successful `POST /api/reservations` sends one email to the authenticated diner's email containing the restaurant name/address, local date, start time, party size, assigned table and reservation id
- [X] T004 [P] [US1] Add `test_us54_s2_confirmation_receipt_shows_complete_details` to `frontend/src/pages/ReservationPage.test.tsx`, asserting the confirmation step renders restaurant, address, date, time range, party size, assigned table and reservation identifier in Spanish
- [X] T005 [P] [US1] Add `test_us54_s3_confirmed_reservation_is_active` to `backend/tests/test_reservation.py`, asserting a successful confirmation is returned by `GET /api/reservations/active` with `status` equal to `confirmed` and the same projection details
- [X] T006 [P] [US1] Add `US-54 S3 shows confirmed reservation details` to `frontend/src/pages/DinerReservationsPage.test.tsx`, asserting the active reservation is labeled `Confirmada` and exposes the same restaurant, date/time, party size, table and identifier
- [X] T007 [P] [US1] Add `test_us54_s4_rejected_confirmation_sends_no_email` to `backend/tests/test_reservation.py`, forcing an availability conflict and asserting the response is rejected, the mail outbox remains empty and no confirmed reservation is created
- [X] T008 [P] [US1] Add `test_us54_edge_duplicate_confirmation_is_idempotent` to `backend/tests/test_reservation.py`, posting the same `request_id` twice and asserting one reservation, one confirmation email and the same reservation id in both successful responses
- [X] T009 [P] [US1] Add `test_us54_edge_mail_failure_keeps_reservation_confirmed` to `backend/tests/test_reservation.py`, making `send_mail` raise `MailError` and asserting the confirmation response succeeds while the persisted and active reservation remain `confirmed`
- [X] T010 [P] [US1] Add `test_us54_edge_email_uses_buenos_aires_time` to `backend/tests/test_reservation.py`, confirming a UTC timestamp near a timezone boundary and asserting the email uses the corresponding `America/Argentina/Buenos_Aires` date and time

### Backend implementation for US-54

- [X] T011 [US1] Extend `ReservationRestaurant` and the `ReservationResponse` projection in `backend/app/schemas/reservation.py` with nullable restaurant `address`, preserving Spanish `nombre`, the existing `id` confirmation identifier, and all existing order fields
- [X] T012 [US1] Update `reservation_response` in `backend/app/api/reservation.py` to populate `address` from `Restaurant.direccion` for confirmation, day, upcoming and active reservation responses without exposing the internal `table_number`
- [X] T013 [US1] Add a confirmation email builder in `backend/app/services/mail.py` that returns a `Mail` containing restaurant name/address, Buenos Aires local date and start/end time, party size, table capacity/seating area and reservation id, addressed to the diner email
- [X] T014 [US1] Update `confirm_reservation` in `backend/app/api/reservation.py` to load the authenticated `Diner`, commit the reservation before sending mail, call the confirmation mail only when `created` is true, preserve `200` for repeated `request_id`, and catch/log `MailError` without changing the successful response or confirmed reservation
- [X] T015 [US1] Preserve the existing rollback behavior in `backend/app/api/reservation.py` for unavailable starts, validation failures and confirmation conflicts so rejected confirmations send no mail and create no confirmed reservation

### Frontend and API contract implementation for US-54

- [X] T016 [US1] Regenerate `frontend/src/api/openapi.json` and `frontend/src/api/schema.d.ts` with `make api-types`; do not edit either generated file by hand
- [X] T017 [US1] Update `frontend/src/api/reservations.ts` only as needed for the regenerated `ReservationResponse` type and preserve the existing typed confirmation and active-reservation calls
- [X] T018 [US1] Update `frontend/src/pages/reservation/ConfirmedStep.tsx` to render restaurant address and reservation id alongside the existing restaurant, Buenos Aires date/time, party size, assigned table and confirmed status, using existing design-system components and Spanish UI text
- [X] T019 [US1] Update `frontend/src/pages/DinerReservationsPage.tsx` to render the address and reservation identifier in the expanded active-reservation detail while keeping the `Confirmada` status and existing order actions
- [X] T020 [US1] Update the relevant CSS Modules in `frontend/src/pages/ReservationPage.module.css` and `frontend/src/pages/DinerReservationsPage.module.css` only when needed for the new receipt fields, preserving mobile layout, visible focus and reduced-motion behavior

**Checkpoint**: US-54 works end to end; all four acceptance scenarios and the idempotency, mail-failure and timezone edge tests pass.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [X] T021 [P] Run `cd backend && uv run pytest tests/test_reservation.py -k us54` and fix only US-54 regressions in the reservation confirmation flow
- [X] T022 [P] Run the focused frontend tests for `frontend/src/pages/ReservationPage.test.tsx` and `frontend/src/pages/DinerReservationsPage.test.tsx`, fixing only US-54 regressions
- [X] T023 Run `make format lint test` from the repository root and resolve failures caused by the US-54 changes without modifying `specs/031-ver-promociones/`
- [X] T024 Follow [quickstart.md](./quickstart.md) manually with `make up-local`, verify the receipt and «Mis reservas», and record any implementation divergence in [plan.md](./plan.md) and this file

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: No code dependency; establishes reusable test fixtures and mocks.
- **Foundational (Phase 2)**: No implementation tasks; confirms that the existing shared infrastructure is sufficient.
- **US-54 (Phase 3)**: Depends on the repository/test-surface inspection from Phase 1. Tests T003–T010 should be written before implementation T011–T020; backend projection and mail changes must precede contract regeneration and UI type usage.
- **Polish (Phase 4)**: Depends on the completed US-54 implementation and focused tests.

### Within US-54

1. Write tests T003–T010 first.
2. Implement backend schema/projection T011–T015.
3. Regenerate the API contract T016, then update the typed client T017.
4. Implement the confirmation and active-list UI T018–T020.
5. Run focused and full validation T021–T024.

### Dependency graph

```text
T001 ─┐
      ├──> T003–T010 ───> T011–T015 ───> T016 ───> T017 ───> T018–T020 ───> T021–T024
T002 ─┘
```

## Parallel Execution Examples

### US-54 test preparation

```text
Parallel: T001, T002
Parallel after setup: T003, T004, T005, T006, T007, T008, T009, T010
```

### US-54 implementation

```text
Parallel after the tests are written:
- T011 (schemas) and T013 (mail builder)
- T004/T006 frontend test review can proceed independently from backend test implementation

Sequential integration:
- T012 after T011
- T014–T015 after T012 and T013
- T016 after T011–T015
- T017 after T016
- T018–T020 after T017
```

### Validation

```text
Parallel: T021, T022
Sequential after both focused runs: T023, then T024
```

## Implementation Strategy

1. **MVP first**: Implement the single US-54 path—successful confirmation, one post-commit email,
   complete screen receipt and immediate active-list projection.
2. **Protect failure behavior**: Add conflict, duplicate request and mail-failure coverage before
   broad validation; do not introduce retries, queues or additional notification channels.
3. **Regenerate and integrate**: Regenerate the OpenAPI contract only after the backend projection
   is stable, then update the existing typed frontend surfaces.
4. **Validate end to end**: Run focused backend/frontend tests, the repository validation commands
   and the local quickstart without touching the later `031-ver-promociones` feature.

## Notes

- Every task uses the required checklist format: checkbox, sequential ID, optional `[P]`, required `[US1]` within the story phase, and an exact file path.
- No migration or new dependency is planned because all required persistence and mail infrastructure already exists.
- Commit logical groups with the US in the conventional commit message, for example `feat(US-54): send reservation confirmation details`.

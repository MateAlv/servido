# Implementation Plan: Reservar Mesa (Crear Reserva y Confirmar Datos)

**Feature**: `specs/005-reservar-mesa` | **Date**: 2026-10-23, rewritten 2026-10-28 | **Spec**: [spec.md](spec.md) | **US**: US-11 (Sprint 2), US-13 (Sprint 3) | **Sprint**: 2–3

**Input**: Feature specification from `/specs/005-reservar-mesa/spec.md`

**History**: US-11 was built in Sprint 2 on frontend test data, because spec 004 (shifts and tables) didn't exist yet; its backend was deferred. On 28/10, with 004 merged, the team took decisions D1–D10 ([research.md](research.md), all pending PO) and built US-13 together with that deferred backend. This plan describes what is built now; the Sprint 2 version is in the git history of this file.

## Summary

A diner opens a real restaurant, picks a date, a time, a party size and a seating preference (US-11), reviews the selection with the table that will be assigned («Mesa para 4 · Terraza») and confirms it (US-13). The backend computes availability from the restaurant's shifts and table groups (spec 004) and its confirmed reservations; the confirmation creates the reservation inside one transaction, and the database rejects a double booking. To make this reachable, real bookable restaurants appear on the diner's map next to the test restaurants of spec 002 (D4), and a restaurant can't remove tables that future reservations hold (D9).

## Technical Context

**Language/Version**: Python 3.12 (backend) · TypeScript (frontend)

**Primary Dependencies**: FastAPI, SQLAlchemy 2, Alembic, Pydantic · React, Vite, React Router, TanStack Query, openapi-fetch, the design system in `frontend/src/components/`

**Storage**: PostgreSQL 17; the exclusion constraint uses the `btree_gist` extension (bundled, trusted)

**Testing**: pytest against a real Postgres (`backend/tests/`), with a fixed clock · Vitest + Testing Library (`frontend/src/**/*.test.tsx`)

**Target Platform**: Mobile-first web app: static SPA plus JSON API under `/api`

**Performance Goals**: None beyond SC-001. Availability runs a handful of indexed queries per request; the app never has more than a few concurrent users.

**Constraints**: AWS Free plan, no new services or dependencies. Datetimes stored in UTC; dates, "today" and "now" evaluated in `America/Argentina/Buenos_Aires`.

**Scale/Scope**: 1 table (`reservations`) and 1 column (`table_inventory.seating_area`) in one migration; 6 endpoints (2 availability reads, the confirmation, the diner's day, 2 public restaurant reads); 1 service module; the booking page with a review and a confirmed step; the seating-area selector and the blocked-reservations list in the restaurant's table screen.

**New dependencies**: None.

## Decisions (28/10, pending PO)

D1 a reservation names its table by group + internal number · D2 the review shows the smallest fitting group of the chosen area · D3/D6 table groups have a fixed seating area · D4 real bookable restaurants on the map next to the test ones · D5 90-minute reservations every 30 minutes · D7 confirmed on creation · D8 overlapping reservations of a diner are warned about, not blocked · D9 a restaurant can't remove, shrink or change a group with future reservations · D10 bookings up to 60 days ahead. Rationale and rejected alternatives: [research.md](research.md). Recorded in `specs/README.md`.

Other choices made while building, also listed there: a visitor on a bookable restaurant is invited to sign in and comes back (`?volver=`, which also survives sign-up); without occupancy data the map, list and detail show no occupancy indicator at all; party size and table capacity are bounded to 1–100; `GET /api/reservations?date=` accepts dates from a year back to 60 days ahead; a table group's `free_quantity` counts the tables in use at this moment.

## Design

### Data model ([data-model.md](data-model.md))

- `reservations`: diner, restaurant, assigned group (`table_capacity`, `seating_area`) and `table_number` inside it, `starts_at`/`ends_at` (checked to be 90 minutes apart), `party_size` (≤ the group's capacity), `status` (`confirmed`/`cancelled`), `request_id` (unique), `created_at`.
- Exclusion constraint over (restaurant, group, table number, time range) for confirmed reservations: no double booking (risk 2, SC-003).
- `table_inventory.seating_area` (`indoor`/`outdoor`/`terrace`, existing rows `indoor`); the group's identity is (restaurant, capacity, seating area). Groups are recreated on every save, so nothing references their id.

### API ([contracts/](contracts/))

| Endpoint | Who | Contract |
| --- | --- | --- |
| `GET /api/restaurants/{id}/availability?date=&party_size=` | Diner | [availability-api.md](contracts/availability-api.md) |
| `GET /api/restaurants/{id}/availability/tables?date=&start_time=&party_size=` | Diner | [availability-api.md](contracts/availability-api.md) |
| `POST /api/reservations` | Diner | [reservations-api.md](contracts/reservations-api.md) |
| `GET /api/reservations?date=` | Diner | [reservations-api.md](contracts/reservations-api.md) |
| `GET /api/restaurants`, `GET /api/restaurants/{id}` | Public | [restaurants-api.md](contracts/restaurants-api.md) |

`400` is a malformed request or a date beyond 60 days; `409` is something that was valid when chosen but changed during the review; `401` no session; `403` a restaurant account; `404` an unknown restaurant.

### Backend

- `app/services/availability.py`: rules 0–13 of the data model, shared by the reads and the confirmation, with `current_time()` as the clock tests replace.
- The confirmation (rule 9): repeated `request_id` → the existing reservation (200); shape and horizon checks (400); restaurant still bookable and party within the maximum (409); the group locked `FOR UPDATE` and re-checked; start not past and inside a shift (409); the lowest free table number; insert inside a savepoint, telling the unique `request_id` (return the existing one) from the exclusion constraint (409).
- `app/services/reservation_conflicts.py`: the inventory rule (D9) with `check_reservation_conflict(session, restaurant_id, capacity, seating_area, new_quantity, now)`, called by `replace_inventory` inside its transaction.
- `app/api/reservation.py` (diner endpoints, role checked) and `app/api/public_restaurant.py` (bookable = coordinates, an active shift and an available group).

### Frontend

- `/reservar/:restauranteId`: the selection lives in the URL (`?fecha=&hora=&personas=&tipo=`), so reload and back keep it. Native date input with `min` (today) and `max` (60 days); party size capped at the restaurant's maximum; time slots and seating preference as chips; the assigned group is the first one the tables endpoint returns for the chosen area.
- «Siguiente» pushes `?paso=revision`: `pages/reservation/ReviewStep.tsx` shows restaurant, long date, time range, party size and «Mesa para N · Tipo», warns about overlapping reservations of the diner (it waits for that check before enabling «Confirmar reserva»), and confirms with one `request_id` per review. `ConfirmedStep.tsx` replaces the URL with `?confirmada=<id>`.
- Errors: `409` back to the selection with the message, keeping every value; `401` (also on the reads) signs out, which drops the old session's queries, and the visitor redirect sends to `/ingresar?volver=…`; `404` link to the map; a reloaded review whose time or table is gone goes back once with one notice.
- `api/restaurants.ts` merges `GET /api/restaurants` with the test restaurants of `data/restaurants.fixture.ts` (`bookable: false`); missing data is left out of the UI, never invented or announced.
- `TableInventoryPage`: a seating-area `SegmentedControl` per group and, on a `409`, the list of reservations that block the change.

## Constitution Check

| Principle | Gate | Pass |
| --- | --- | --- |
| I. Backlog-bound scope | US-11, US-13, US-10 S3 and the D4 enabler; no caching, queues or workers. The 60-day horizon and the inventory rule exist to protect invariants, not as features | [x] |
| II. Spec before code | Spec updated with D1–D10 before code (commit afa00f3), independently reviewed (bcd9bfa). **The 28/10 changes (US-13 S2 wording, new S6, D1–D10) are pending PO validation**; the PM accepted building them ahead of it, as with spec 007 | [x] with risk |
| III. Every scenario tested | The map below; the no-double-booking invariant is a database constraint with a test | [x] |
| IV. Humans own AI output | Two independent review rounds (backend, frontend) before the PR; one human approval pending on PR #29 | [ ] pending approval |
| V. Simple, cheap, conventional | No new dependency or service; `btree_gist` ships with PostgreSQL | [x] |

## Acceptance Scenario → Test Map

Backend tests are in `backend/tests/test_reservation.py` unless noted; frontend tests in `frontend/src/pages/ReservationPage.test.tsx` unless noted.

| Scenario | Backend | Frontend |
| --- | --- | --- |
| US-11 S1 date, time, preference | — | `US-11 S1 offers date, time and seating preference` |
| US-11 S2 no past dates | `test_us11_s2_rejects_past_date` | `US-11 S2 does not allow a past date` |
| US-11 S3 only inside opening hours | `test_us11_s3_returns_only_slots_inside_shifts`, `test_us11_s3_returns_no_slots_on_a_closed_weekday` | — |
| US-11 S4 occupied slot | `test_us11_s4_marks_a_slot_without_free_tables_unavailable` | `US-11 S4 disables an occupied time` |
| US-11 S5 changes update tables | — | `US-11 S5 asks again for the tables when the time changes`, `US-11 S5 clears a time that is no longer available and keeps the date` |
| US-11 S6 seating preference | `test_us11_s6_offers_only_groups_with_enough_capacity` | `US-11 S6 shows only the tables of the chosen seating area` |
| US-11 S7 no availability | `test_us11_s7_returns_no_tables_when_none_fit` | `US-11 S7 informs there are no tables and keeps the controls usable` |
| US-11 FR-013 maximum party size | `test_us11_edge_returns_the_restaurant_max_party_size`, `test_us11_edge_returns_no_max_without_active_tables`, `test_us11_edge_offers_no_slots_above_the_restaurant_maximum` | `US-11 edge caps the party size at the restaurant maximum` |
| US-11 edges | `test_us11_edge_does_not_offer_past_times_of_today`, `test_us11_edge_returns_no_slots_without_shifts`, `test_us11_edge_one_table_with_two_reservations_counts_once`, `test_us11_edge_requires_a_token`, `test_us11_edge_rejects_a_restaurant_account`, `test_us11_edge_unknown_restaurant_is_not_found`, `test_us11_edge_rejects_an_invalid_request` | `US-11 edge keeps the selection when the page reloads`, `US-11 edge ignores an invalid value in the URL`, `US-11 edge sends a visitor to the sign-in page and back`, `US-11 edge sends a restaurant account back home`, `US-11 edge offers the reserve link to a diner only` |
| US-13 S1 review opens | — | `US-13 S1 opens the review with the selection` |
| US-13 S2 every value and the assigned table | `test_us13_s2_tables_endpoint_lists_groups_smallest_first` | `US-13 S2 shows every chosen value and the assigned table` |
| US-13 S3 back keeps the selection | — | `US-13 S3 goes back with the selection kept` |
| US-13 S4 nothing without confirming | — (no endpoint other than the POST writes) | `US-13 S4 creates nothing until the diner confirms` |
| US-13 S5 explicit confirmation | `test_us13_s5_confirmation_creates_a_confirmed_reservation` | `US-13 S5 confirms and shows the reservation` |
| US-13 S6 overlap warned, still confirmable | `test_us13_s6_lists_the_diner_reservations_of_the_day`, `test_us13_s6_overlapping_reservation_can_still_be_confirmed` | `US-13 S6 warns about an overlapping reservation and still confirms` |
| US-13 edge: table taken / changed during the review | `test_us13_edge_full_group_answers_409`, `test_us13_edge_changes_during_the_review_answer_409`, `test_us13_edge_restaurant_that_stopped_taking_reservations_answers_409`, `test_us13_edge_party_above_the_maximum_answers_409` | `US-13 edge returns to the selection when the table was taken`, `US-13 edge returns a reloaded review whose table is gone to the selection`, `US-13 edge gives one notice when a reloaded review lost its time` |
| US-13 edge: no double booking, one table per confirmation | `test_us13_edge_database_rejects_a_double_booking`, `test_us13_edge_takes_the_lowest_free_table_of_the_group` | — |
| US-13 edge: double submit | `test_us13_edge_repeated_request_returns_the_same_reservation`, `test_us13_edge_request_that_committed_first_returns_its_reservation` | `US-13 edge reuses the request id when the confirmation is retried` |
| US-13 edge: privacy, roles, input | `test_us13_edge_lists_only_the_diner_reservations`, `test_us13_edge_restaurant_token_gets_403`, `test_us13_edge_rejects_malformed_requests`, `test_us13_edge_too_far_ahead_or_out_of_range_answers_400` | `US-13 edge says the restaurant was not found`, `US-13 edge only offers dates up to 60 days ahead (D10)` |
| US-13 edge: expired session | — | `US-13 edge signs out when the session expired at confirmation`, `US-13 edge signs out when the session expired while choosing`; `LoginPage.test.tsx` › `US-13 edge goes back to the page it came from`, `US-13 edge never returns to another site after signing in`; `frontend/src/lib/returnPath.test.ts` |
| US-10 S1 seating area (spec 004) | `test_table_inventory.py::test_us10_s1_groups_have_a_seating_area`, `test_us10_s1_two_groups_cannot_share_capacity_and_seating_area` | `TableInventoryPage.test.tsx` › `US-10 S1 saves the seating area of each group` |
| US-10 S3 booked tables (D9) | `test_us13_edge_inventory_change_keeps_booked_tables`; `test_table_inventory.py::test_us10_s3_reducing_booked_tables_is_rejected`, `test_us10_edge_disabling_reserved_capacity_returns_conflict`, `test_us10_edge_free_quantity_counts_tables_in_use_right_now` | `TableInventoryPage.test.tsx` › `US-10 S3 lists the reservations that block the change` |
| D4 bookable restaurants (spec 002) | `test_public_restaurants.py::test_us9_edge_lists_only_bookable_restaurants`, `test_us9_edge_detail_includes_the_menu`, `test_us9_edge_price_tier_is_null_unless_it_is_a_known_tier`, `test_us9_edge_unknown_or_not_bookable_answers_404` | `frontend/src/api/restaurants.test.ts`; `MapPage.test.tsx` › `US-5 edge shows a real restaurant without any occupancy indicator`; `US-9 edge keeps the test restaurants out of the booking flow` |
| US-4 S3 (spec 003) wrong role | `test_auth.py::test_us4_s3_restaurant_gets_403_on_diner_endpoints` | — |

SC-001 (under 3 minutes) is checked in the PO demo; SC-002 to SC-005 by the tests above (SC-005: only `POST /api/reservations` writes a reservation, after the explicit confirmation).

## Project Structure

```text
specs/005-reservar-mesa/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md · tasks.md
└── contracts/ availability-api.md · reservations-api.md · restaurants-api.md

backend/
├── app/models/reservation.py · app/models/table_inventory.py (seating_area)
├── migrations/versions/006_reservations.py
├── app/services/availability.py · reservation_conflicts.py · table_inventory.py
├── app/api/reservation.py · public_restaurant.py · restaurant.py (free_quantity, 409 detail)
├── app/schemas/reservation.py · public_restaurant.py · table_inventory.py
└── tests/test_reservation.py · test_public_restaurants.py · test_table_inventory.py · reservations.py (builders) · conftest.py (fixed clock)
frontend/src/
├── api/availability.ts · reservations.ts · restaurants.ts · errors.ts (SessionExpiredError) · session.ts
├── pages/ReservationPage.tsx · pages/reservation/ReviewStep.tsx · ConfirmedStep.tsx
├── pages/RestaurantDetailPage.tsx · TableInventoryPage.tsx · LoginPage.tsx · RegisterPage.tsx
├── components/restaurant/ (map, pin, list, legend: no indicator without occupancy data)
└── lib/date.ts · seating.ts · returnPath.ts · requestId.ts
```

## Risks

| Risk | Mitigation |
| --- | --- |
| The PO rejects one of D1–D11 | Each is local: D2 is the review text, D8 one notice, D5/D10 constants; D1 and D3 are the only schema ones and production has no reservations yet |
| A restaurant re-saves its tables while a diner confirms | The confirmation locks the group `FOR UPDATE` and looks it up again once; the inventory update locks the groups and runs the D9 check in the same transaction |
| Two identical confirmations at once | `request_id` re-checked after the lock and its unique violation answered with the existing reservation; tested, and verified with two real sessions in review |
| A reservation far ahead freezes a table group | 60-day horizon (D10) |
| A diner books many tables | No cap yet (no story asks for one); see the security review notes in PR #29 |
| Teammates' local databases ran an earlier version of migration 006 | `alembic downgrade 005_merge_feature_heads && alembic upgrade head` (PR #29) |

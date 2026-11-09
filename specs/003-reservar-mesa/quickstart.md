# Quickstart: reservar mesa (US-11, US-13)

How to try the booking flow end to end, locally and in production. Rules: [data-model.md](data-model.md); endpoints: [contracts/](contracts/). This is the script for T032 (browser pass) and T055 (production demo).

## Local setup

1. `make db`, then `cd backend && uv run alembic upgrade head && uv run uvicorn app.main:app --reload`, and `cd frontend && npm run dev` (or `make up`).
2. If you applied an earlier version of migration `006_reservations`: `cd backend && uv run alembic downgrade 005_merge_feature_heads && uv run alembic upgrade head`.
3. Create a restaurant at `/suma-tu-local` and a diner at `/registrarme`.

## Restaurant: make it bookable

A restaurant appears on the diner's map, and can be booked, once it has a location, an active shift and an available table group.

1. Sign in as the restaurant. In the profile, enter an address and confirm the location on the map preview; add a photo, cuisine and description so the listing looks complete (empty fields are simply not shown to diners).
2. In the opening hours, add shifts (for example every day 12:00–15:00 and 20:00–23:30).
3. In the tables screen, add groups with their quantity, capacity and seating area («Adentro», «Afuera», «Terraza»), for example 4 tables for 2 indoors and 2 tables for 4 on the terrace. Save.

## Diner: choose (US-11)

1. Open the map: the restaurant shows next to the test restaurants. Real restaurants have no occupancy indicator yet; the test ones can't be booked («Próximamente»).
2. Open the restaurant and press «Reservar mesa». A visitor without a session sees «Ingresá para reservar», signs in (or creates an account) and comes back here.
3. Pick a date: past days and days more than 60 days ahead can't be chosen (D10). Pick the party size (capped at the largest table), a time (occupied times show «Ocupado») and a seating preference. The page says whether there is a free table.
4. Reload: everything stays selected, because it lives in the URL.

## Diner: review and confirm (US-13)

1. Press «Siguiente». The review shows the restaurant, the date, the time range (90 minutes), the party size and the assigned table, e.g. «Mesa para 4 · Terraza» (S1, S2). Nothing is stored yet (S4).
2. Press «Volver» or the phone's back button: the selection is kept (S3). Go forward again and press «Confirmar reserva»: the reservation is confirmed and shown (S5). Reloading the confirmation keeps showing it.
3. Book an overlapping time, at this or another restaurant: the review warns «Ya tenés una reserva en … de … a …» and still lets you confirm (S6).
4. Limits (D11): a diner can't have more than 20 confirmed reservations for one day, nor more than 5 at the same restaurant that day; the next one is refused with a message.
5. With two browsers and two diners, go to the review for the last free table of a group in both, then confirm in both: one confirms, the other gets «La mesa se ocupó mientras confirmabas…» and goes back to the selection with its values.
6. Leave a review open until the session expires (or delete the token from the browser's session storage) and confirm or change the date: you are sent to sign in, and come back to the page with the selection.

## Restaurant: booked tables (D9, spec 004 US-10 S3)

1. As the restaurant, try to lower the quantity of a group that has a future reservation, disable it, remove it, or change its capacity or seating area.
2. Expected: nothing is saved and the screen lists the reservations that block the change (date, time, party size). Adding tables is always allowed.

## Production demo (T055)

1. After the deploy of PR #29 (it runs migration `006_reservations`), make La Esquina de Palermo bookable: sign in as Laura (`laura@servido.demo` / `Servido2026`) and complete its location, shifts and table groups as above, or run the team's demo-data script, which fills only what is missing.
2. Sign in as Martín (`martin@servido.demo` / `Servido2026`) at https://servido.discordia.fyi, open La Esquina de Palermo from the map and walk the two diner sections above, on a phone (360 px) and with the keyboard (T024).
3. Record the result in `tasks.md` (T032).

## Prove the double-booking rule

Insert two confirmed reservations with the same restaurant, table group and `table_number` and overlapping times by hand (psql), or run `test_us13_edge_database_rejects_a_double_booking`: the second one fails with an `IntegrityError` raised by the exclusion constraint.

## What this feature does not do yet

- Cancel or modify a reservation (Sprint 3 and later), or list the diner's reservations (US-23).
- Notifications or a receipt of the reservation.

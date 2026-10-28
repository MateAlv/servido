# Quickstart: reservar mesa (US-11)

## Prerequisites

Two ways to try it, and the second one always works:

1. **Real data** — spec 004 merged, plus a restaurant with at least one active shift and one active table. Without shifts the endpoints answer `{ "open": false, "slots": [] }`; without active tables they also answer `max_party_size: 0`. That is correct, not a bug.
2. **Mock** — nothing else needed. While spec 004 or the endpoints are missing, `frontend/src/api/availability.ts` answers from `frontend/src/data/reservationAvailability.fixture.ts` and the page shows a «Datos de prueba» pill.

The seven restaurants of `frontend/src/data/restaurants.fixture.ts` are not in the database: with real data they cannot be booked, so use a restaurant created through the app (`/suma-tu-local`) with hours and tables loaded. With the mock, those same seven restaurants can be used to show the flow.

You also need a diner session: register at `/registrarme` and sign in at `/ingresar`.

## Run it

```bash
make up                 # web on :5173, API on :8000, Postgres on :55432
make migrate            # after the feature's migration is added
```

## Check the API

```bash
TOKEN="<the JWT an AccessForm login returned>"
RESTAURANT="<id of a restaurant with shifts and tables>"
DATE="2026-10-28"        # a weekday the restaurant opens

# 1. Time slots of the day; the answer includes max_party_size (the restaurant's cap)
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/restaurants/$RESTAURANT/availability?date=$DATE&party_size=2"

# 2. Tables for one slot
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/restaurants/$RESTAURANT/availability/tables?date=$DATE&start_time=20:00&party_size=2"
```

Expected failures: `401` without a token, `403` with a restaurant token, `404` with an unknown id, `400` with a past date, a past start time or `party_size=0`. A `party_size` above `max_party_size` is not an error: the slots endpoint answers `200` with the cap and no slots, and the tables endpoint answers `200` with no tables.

## Check the flow in the browser

1. Open `/restaurantes/<id>` of a restaurant created through the app (or any of the seven fixture restaurants while the mock is in use) and press «Reservar mesa».
2. Choose a date: past days cannot be picked. A day the restaurant does not open shows "Ese día el restaurante no atiende" (with the mock, Mondays).
3. Choose the party size: until a date is chosen the stepper stays at 1, because the restaurant's cap arrives with the availability response. After that it cannot go above the maximum (with the mock, 4 people, the largest of its active tables) and the page shows "Máximo N personas". The slots refresh and a slot with no free table appears disabled and labelled «Ocupado» (with the mock, 20:30).
4. Change the date or the time: the availability notice refreshes, and a time that is no longer available is cleared with a notice.
5. Pick "Adentro" / "Afuera" / "Terraza" or "Sin preferencia" (with the mock: two indoor tables for 2, one outdoor and one terrace table for 4). The page tells you whether there is a free table for that preference; the table itself is assigned when the reservation is confirmed (US-13).
6. To see a preference without tables, choose 21:00 and 4 people and then "Terraza" (with the mock, `Mesa 4` is taken): the chip shows «Sin mesas» and cannot be chosen, while the slot stays available for the other areas. A preference that loses its last table when the date, time or party size changes goes back to "Sin preferencia" with a notice, and "No hay mesas disponibles para esta fecha y horario" appears when the response has no table at all; the controls stay usable. The stepper never lets you ask for more people than the restaurant's maximum, and a restaurant without active tables shows "El restaurante todavía no tiene mesas disponibles".
7. Reload the page: the date, time, party size and preference are still selected, because they live in the URL (`?fecha=&hora=&personas=&tipo=`). Edit the link to `personas=abc` and the page falls back to 1 person; set `personas=9` and it clamps to the restaurant's maximum with a notice; put an occupied `hora` and it is cleared with a notice. The URL holds no table, because US-11 does not choose one.

With the mock the page shows «Datos de prueba». That pill and the fixture disappear in the PR that wires the real endpoints (T018).

## Prove the double-booking rule

Insert two overlapping reservations for the same table by hand (psql) or run `test_us11_edge_database_rejects_overlapping_reservations`; the second one must fail with an `IntegrityError` raised by the exclusion constraint.

## US-13: review and confirm (after PR C)

1. As a restaurant, load the profile with an address, a shift and table groups with a seating area (the configuration screens of spec 004). The restaurant now shows on the diner's map.
2. As a diner, open it from the map and press «Reservar mesa». Choose date, time, party size and preference, then «Siguiente».
3. The review shows the restaurant, the date, the time range (90 minutes), the party size and «Mesa para N · Tipo» (S1, S2). Nothing exists in `reservations` yet (S4).
4. «Volver» returns with everything selected (S3). «Siguiente» again, then «Confirmar reserva»: the reservation is confirmed and shown (S5).
5. Book another overlapping time at any restaurant: the review warns «Ya tenés una reserva en … de … a …» and still lets you confirm (S6).
6. With two browsers, book the last free table of a group at the same time: one confirms, the other gets «La mesa se ocupó mientras confirmabas…» and keeps its selection.
7. As the restaurant, try to lower the quantity of that group: it answers with the booked reservation and changes nothing.

## What this feature does not do yet

- Cancel or modify a reservation (Sprint 3 and later).
- Notifications or a receipt of the reservation.

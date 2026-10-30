# Contract: Orders API

**Feature**: `specs/009-pedido-anticipado` | All routes under `/api`, diner token required (`Authorization: Bearer …`).

Common errors, as in spec 005: `401` no token or expired session (`SESSION_EXPIRED_DETAIL`, also when the diner no longer exists) · `403` restaurant account («Esta acción es solo para comensales.») · `400` invalid input (global validation handler, never 422). Checks run in the order of [data-model.md](../data-model.md) rule 6. Money is a decimal string with two places; datetimes are ISO 8601 with offset.

## `GET /api/reservations/{reservation_id}/order`

The order page: the reservation, its confirmed order (if any) and the menu to build it from.

**200**

```json
{
  "reservation": {
    "id": "…",
    "restaurant": { "id": "…", "nombre": "La Esquina de Palermo" },
    "date": "2026-11-05",
    "start_time": "21:00",
    "end_time": "22:30",
    "party_size": 4,
    "table": { "capacity": 4, "seating_area": "terrace" },
    "status": "confirmed",
    "has_order": true,
    "order_open": true,
    "order_deadline": "2026-11-05T20:15:00-03:00"
  },
  "order": {
    "confirmed_at": "2026-11-05T12:02:11-03:00",
    "items": [
      { "dish_id": "…", "name": "Provoleta", "unit_price": "7500.00", "prep_time_minutes": 10, "quantity": 2, "subtotal": "15000.00" }
    ],
    "total": "15000.00",
    "prep_time_minutes": 10
  },
  "menu": [
    { "id": "…", "name": "Provoleta", "description": null, "category": "entrada", "price": "7500.00", "photo_url": null, "dietary_restrictions": [], "prep_time_minutes": 10 }
  ]
}
```

- `order` is `null` when the reservation has no order. Its `prep_time_minutes` is `null` when no item has a time (P2). An item's `dish_id` is `null` if the dish was deleted after the confirmation.
- `reservation.order_open` and `order_deadline` follow data-model.md (`order_open`, `order_deadline`).
- `menu` lists the dishes on the restaurant's menu (`menu_dishes`) in a fixed category order (entrada, plato_principal, postre, bebida), then by name. It is returned even when the order is closed.

**404** «No encontramos esa reserva.»: unknown id, or a reservation of another diner (rule 1).

## `PUT /api/reservations/{reservation_id}/order`

Confirms the order: replaces it with the items sent (P1, rule 4). Sending no items leaves the reservation without an order (P11).

**Request**

```json
{
  "items": [
    { "dish_id": "…", "quantity": 2, "name": "Provoleta", "unit_price": "7500.00", "prep_time_minutes": 10 }
  ]
}
```

`name`, `unit_price` and `prep_time_minutes` are what the page showed; they are compared with the menu (rule 5), never stored from the request.

**200**: the same body as `GET`, after the change (`order` is `null` if the items were empty).

| Status | When | `detail` |
| --- | --- | --- |
| 400 | More than 50 items, a repeated `dish_id`, quantity outside 1–20, a name over 150 characters, a malformed price or time | Validation message |
| 404 | Unknown reservation or another diner's | «No encontramos esa reserva.» |
| 409 | Not open: the deadline passed, the reservation is cancelled or past, or the restaurant has no menu | «Ya no se puede cambiar el pedido de esta reserva.» |
| 403 | Email not verified (spec 007, US-51 S5; P13) | «Verificá tu email para confirmar tu pedido.» |
| 400 | No items and no order to remove | «Agregá al menos un plato para confirmar tu pedido.» |
| 409 | The menu changed: a dish is gone or belongs to another restaurant, or its name, price or time differs (P9) | «El menú cambió. Revisá tu pedido antes de confirmarlo.» |

The table follows the check order of data-model.md rule 6. Every 409 changes nothing. The page then reloads the order with `GET`, which brings the order that stayed and the current menu. It tells the two 409s apart by the reloaded `order_open`, not by the message. For a changed menu, it compares the new menu with the name, price and time its cart stored for each dish to say what changed.

## `GET /api/reservations/upcoming`

The diner home list «Tus próximas reservas» (P4): the diner's confirmed reservations that haven't started, soonest first, at most 20.

**200**

```json
{ "reservations": [ { "id": "…", "restaurant": { "id": "…", "nombre": "…" }, "date": "2026-11-05", "start_time": "21:00", "end_time": "22:30", "party_size": 4, "table": { "capacity": 4, "seating_area": "terrace" }, "status": "confirmed", "has_order": false, "order_open": true, "order_deadline": "2026-11-05T20:15:00-03:00" } ] }
```

## Changes to existing responses

- **`ReservationResponse`** (spec 005: `POST /api/reservations`, `GET /api/reservations?date=`) gains `has_order`, `order_open` and `order_deadline`, so the confirmed step and the home list can offer «Armar pedido» or «Ver pedido». `reservation_response` then needs the session and the clock.
- `GET /api/restaurants/{id}` (`PublicDish`) does not change: the order page gets its menu from the order endpoint.

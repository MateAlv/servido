"""Acceptance tests for spec 009: the pre-order (US-17), its estimate (US-19) and bill (US-21)."""

from dataclasses import dataclass
from datetime import time, timedelta
from decimal import Decimal
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.dish import Dish
from app.models.order import Order
from app.models.reservation import Reservation
from app.models.restaurant import Restaurant
from app.services import orders
from tests.reservations import (
    NOW,
    TODAY,
    TOMORROW,
    add_bookable_restaurant,
    add_cart,
    add_dish,
    add_order,
    add_reservation,
    diner_headers,
    diner_id,
    item_of,
    verify_diner,
)


@dataclass
class Setup:
    headers: dict[str, str]
    restaurant: Restaurant
    reservation: Reservation
    provoleta: Dish
    bife: Dish
    flan: Dish


def setup(
    client: TestClient,
    session: Session,
    day=TOMORROW,
    start=time(21),
    verified: bool = True,
    email: str = "martin@example.com",
) -> Setup:
    """A verified diner with a reservation at a restaurant with three dishes. Committed, like real
    data, so a rejected request rolls back only its own work."""
    restaurant = add_bookable_restaurant(session)
    headers = diner_headers(client, email)
    diner = diner_id(client, headers)
    if verified:
        verify_diner(session, diner)
    reservation = add_reservation(session, restaurant, diner, day, start, 4, "terrace")
    provoleta = add_dish(session, restaurant, "Provoleta", "7500.00", 10, "entrada")
    bife = add_dish(session, restaurant, "Bife de chorizo", "18500.00", 25)
    flan = add_dish(session, restaurant, "Flan", "6000.00", None, "postre")
    session.commit()
    return Setup(headers, restaurant, reservation, provoleta, bife, flan)


def order_url(reservation_id) -> str:
    return f"/api/reservations/{reservation_id}/order"


def cart_url(reservation_id) -> str:
    return f"/api/reservations/{reservation_id}/cart"


def confirm(client: TestClient, s: Setup, items: list[dict], reservation_id=None):
    return client.put(
        order_url(reservation_id or s.reservation.id), json={"items": items}, headers=s.headers
    )


def save(client: TestClient, s: Setup, items: list[dict], reservation_id=None):
    return client.put(
        cart_url(reservation_id or s.reservation.id), json={"items": items}, headers=s.headers
    )


def page(client: TestClient, s: Setup, reservation_id=None) -> dict:
    response = client.get(order_url(reservation_id or s.reservation.id), headers=s.headers)
    assert response.status_code == 200
    return response.json()


def restaurant_headers(client: TestClient, restaurant: Restaurant) -> dict[str, str]:
    token = client.post(
        "/api/auth/restaurante", json={"email": restaurant.email, "password": "Segura123"}
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def stored_order(session: Session, s: Setup) -> Order | None:
    session.expire_all()
    return orders.order_of(session, s.reservation.id)


# US-17 — Crear pedido


def test_us17_s1_confirmed_order_lists_each_dish_and_quantity(
    client: TestClient, session: Session
) -> None:
    s = setup(client, session)

    response = confirm(client, s, [item_of(s.provoleta, 2), item_of(s.bife)])

    assert response.status_code == 200
    listed = {item["name"]: item["quantity"] for item in response.json()["order"]["items"]}
    assert listed == {"Provoleta": 2, "Bife de chorizo": 1}


def test_us17_s2_order_of_an_unknown_or_foreign_reservation_is_not_found(
    client: TestClient, session: Session
) -> None:
    s = setup(client, session)
    other = diner_headers(client, "otra@example.com")

    foreign = client.get(order_url(s.reservation.id), headers=other)
    assert foreign.status_code == 404
    assert foreign.json()["detail"] == "No encontramos esa reserva."
    assert client.get(order_url(uuid4()), headers=s.headers).status_code == 404
    assert (
        client.put(
            order_url(s.reservation.id), json={"items": [item_of(s.flan)]}, headers=other
        ).status_code
        == 404
    )
    assert stored_order(session, s) is None


def test_us17_s6_confirmation_stores_the_order(client: TestClient, session: Session) -> None:
    s = setup(client, session)
    assert page(client, s)["order"] is None

    response = confirm(client, s, [item_of(s.provoleta)])

    assert response.status_code == 200
    assert response.json()["reservation"]["has_order"] is True
    order = stored_order(session, s)
    assert order is not None
    assert order.confirmed_at == NOW
    assert page(client, s)["order"]["items"][0]["name"] == "Provoleta"


def test_us17_s6_a_saved_cart_is_not_an_order(client: TestClient, session: Session) -> None:
    s = setup(client, session)

    assert save(client, s, [item_of(s.provoleta)]).status_code == 200

    body = page(client, s)
    assert body["order"] is None
    assert body["reservation"]["has_order"] is False
    assert body["cart"]["items"][0]["name"] == "Provoleta"
    assert stored_order(session, s) is None


def test_us17_s7_confirming_again_replaces_the_order(client: TestClient, session: Session) -> None:
    s = setup(client, session)
    assert confirm(client, s, [item_of(s.provoleta), item_of(s.bife)]).status_code == 200

    # Provoleta stays: replacing the items must not trip the unique (order_id, dish_id).
    response = confirm(client, s, [item_of(s.provoleta, 3), item_of(s.flan)])

    assert response.status_code == 200
    listed = {item["name"]: item["quantity"] for item in response.json()["order"]["items"]}
    assert listed == {"Provoleta": 3, "Flan": 1}
    assert len(stored_order(session, s).items) == 2


def test_us17_s8_no_new_order_within_45_minutes(client: TestClient, session: Session) -> None:
    s = setup(client, session, day=TODAY, start=time(9, 45))

    response = confirm(client, s, [item_of(s.provoleta)])

    assert response.status_code == 409
    assert response.json()["detail"] == "Ya no se puede cambiar el pedido de esta reserva."
    assert page(client, s)["reservation"]["order_open"] is False
    assert stored_order(session, s) is None


def test_us17_s8_no_change_within_45_minutes(client: TestClient, session: Session) -> None:
    s = setup(client, session, day=TODAY, start=time(9, 30))
    add_order(session, s.reservation, [(s.provoleta, 1)])
    session.commit()

    assert confirm(client, s, [item_of(s.provoleta, 2)]).status_code == 409
    assert confirm(client, s, []).status_code == 409

    order = stored_order(session, s)
    assert [(item.dish_name, item.quantity) for item in order.items] == [("Provoleta", 1)]


def test_us17_edge_order_is_open_until_the_deadline(client: TestClient, session: Session) -> None:
    s = setup(client, session, day=TODAY, start=time(9, 46))

    body = page(client, s)

    assert body["reservation"]["order_open"] is True
    assert body["reservation"]["order_deadline"] == "2026-11-02T09:01:00-03:00"
    assert confirm(client, s, [item_of(s.provoleta)]).status_code == 200


def test_us17_edge_changed_name_price_or_time_answers_409(
    client: TestClient, session: Session
) -> None:
    s = setup(client, session)
    shown = item_of(s.provoleta)

    for change in (
        {"name": "Provoleta grande"},
        {"unit_price": "8000.00"},
        {"prep_time_minutes": 12},
    ):
        response = confirm(client, s, [{**shown, **change}])
        assert response.status_code == 409
        assert response.json()["detail"] == "El menú cambió. Revisá tu pedido antes de confirmarlo."
    assert stored_order(session, s) is None


def test_us17_edge_dish_gone_answers_409(client: TestClient, session: Session) -> None:
    s = setup(client, session)
    shown = item_of(s.flan)
    session.delete(s.flan)
    session.commit()

    assert confirm(client, s, [shown]).status_code == 409


def test_us17_edge_dish_of_another_restaurant_answers_409(
    client: TestClient, session: Session
) -> None:
    s = setup(client, session)
    elsewhere = add_bookable_restaurant(session, cuit="20123456786")
    foreign_dish = add_dish(session, elsewhere, "Milanesa", "9000.00", 20)
    session.commit()

    assert confirm(client, s, [item_of(foreign_dish)]).status_code == 409
    assert stored_order(session, s) is None


def test_us17_edge_confirmed_order_keeps_its_values_when_the_menu_changes(
    client: TestClient, session: Session
) -> None:
    s = setup(client, session)
    assert confirm(client, s, [item_of(s.provoleta, 2)]).status_code == 200

    s.provoleta.nombre, s.provoleta.precio, s.provoleta.tiempo_preparacion_minutos = (
        "Provoleta especial",
        Decimal("9000.00"),
        15,
    )
    session.commit()

    item = page(client, s)["order"]["items"][0]
    assert (item["name"], item["unit_price"], item["prep_time_minutes"]) == (
        "Provoleta",
        "7500.00",
        10,
    )


def test_us17_edge_confirming_no_dishes_removes_the_order(
    client: TestClient, session: Session
) -> None:
    s = setup(client, session)
    assert confirm(client, s, [item_of(s.provoleta)]).status_code == 200

    response = confirm(client, s, [])

    assert response.status_code == 200
    assert response.json()["order"] is None
    assert response.json()["reservation"]["has_order"] is False
    assert stored_order(session, s) is None
    assert session.get(Reservation, s.reservation.id).status == "confirmed"


def test_us17_edge_empty_first_order_is_rejected(client: TestClient, session: Session) -> None:
    s = setup(client, session)

    response = confirm(client, s, [])

    assert response.status_code == 400
    assert response.json()["detail"] == "Agregá al menos un plato para confirmar tu pedido."


def test_us51_s5_unverified_diner_cannot_order(client: TestClient, session: Session) -> None:
    s = setup(client, session, verified=False)

    response = confirm(client, s, [item_of(s.provoleta)])

    assert response.status_code == 403
    assert response.json()["detail"] == "Verificá tu email para confirmar tu pedido."
    assert stored_order(session, s) is None


def test_us17_edge_closed_wins_over_unverified(client: TestClient, session: Session) -> None:
    s = setup(client, session, day=TODAY, start=time(9, 30), verified=False)

    assert confirm(client, s, [item_of(s.provoleta)]).status_code == 409


def test_us17_edge_cancelled_reservation_takes_no_order(
    client: TestClient, session: Session
) -> None:
    s = setup(client, session)
    s.reservation.status = "cancelled"
    session.commit()

    assert confirm(client, s, [item_of(s.provoleta)]).status_code == 409
    assert save(client, s, [item_of(s.provoleta)]).status_code == 409
    assert page(client, s)["reservation"]["order_open"] is False


def test_us17_edge_cancelling_keeps_the_order(client: TestClient, session: Session) -> None:
    s = setup(client, session)
    assert confirm(client, s, [item_of(s.provoleta)]).status_code == 200

    s.reservation.status = "cancelled"
    session.commit()

    body = page(client, s)
    assert body["reservation"]["has_order"] is True
    assert body["order"]["items"][0]["name"] == "Provoleta"


def test_us17_edge_restaurant_token_gets_403(client: TestClient, session: Session) -> None:
    s = setup(client, session)
    headers = restaurant_headers(client, s.restaurant)
    body = {"items": [item_of(s.provoleta)]}

    assert client.get(order_url(s.reservation.id), headers=headers).status_code == 403
    assert client.put(order_url(s.reservation.id), json=body, headers=headers).status_code == 403
    assert client.put(cart_url(s.reservation.id), json=body, headers=headers).status_code == 403
    assert client.delete(cart_url(s.reservation.id), headers=headers).status_code == 403
    assert client.get("/api/reservations/upcoming", headers=headers).status_code == 403


def test_us17_edge_requires_a_token(client: TestClient, session: Session) -> None:
    s = setup(client, session)
    body = {"items": [item_of(s.provoleta)]}

    assert client.get(order_url(s.reservation.id)).status_code == 401
    assert client.put(order_url(s.reservation.id), json=body).status_code == 401
    assert client.put(cart_url(s.reservation.id), json=body).status_code == 401
    assert client.delete(cart_url(s.reservation.id)).status_code == 401
    assert client.get("/api/reservations/upcoming").status_code == 401


def test_us17_edge_rejects_out_of_bounds_items(client: TestClient, session: Session) -> None:
    s = setup(client, session)
    shown = item_of(s.provoleta)
    invalid = [
        [{**shown, "quantity": 0}],
        [{**shown, "quantity": 21}],
        [shown, shown],
        [{**shown, "name": ""}],
        [{**shown, "name": "   "}],
        [{**shown, "name": "x" * 151}],
        [{**shown, "unit_price": "0"}],
        [{**shown, "unit_price": "12345678901"}],
        [{**shown, "unit_price": "10.001"}],
        [{**shown, "prep_time_minutes": 0}],
        [{**shown, "prep_time_minutes": 2_147_483_648}],
        [{**shown, "dish_id": str(uuid4())} for _ in range(51)],
    ]

    for items in invalid:
        assert confirm(client, s, items).status_code == 400, items
        assert save(client, s, items).status_code == 400, items
    assert stored_order(session, s) is None


# P1 — the saved cart


def test_us17_edge_cart_is_saved_and_read_back(client: TestClient, session: Session) -> None:
    s = setup(client, session)
    assert save(client, s, [item_of(s.provoleta), item_of(s.bife)]).status_code == 200

    # Provoleta stays: replacing the items must not trip the unique (cart_id, dish_id).
    response = save(client, s, [item_of(s.provoleta, 3)])

    assert response.status_code == 200
    saved = response.json()["cart"]["items"]
    assert [(item["name"], item["quantity"], item["unit_price"]) for item in saved] == [
        ("Provoleta", 3, "7500.00")
    ]
    body = page(client, s)
    assert body["cart"]["items"] == saved
    assert body["reservation"]["has_cart"] is True


def test_us17_edge_confirming_deletes_the_cart(client: TestClient, session: Session) -> None:
    s = setup(client, session)
    assert save(client, s, [item_of(s.provoleta)]).status_code == 200

    response = confirm(client, s, [item_of(s.provoleta)])

    assert response.json()["cart"] is None
    assert response.json()["reservation"]["has_cart"] is False
    session.expire_all()
    assert orders.cart_of(session, s.reservation.id) is None


def test_us17_edge_discarding_the_cart(client: TestClient, session: Session) -> None:
    s = setup(client, session)
    assert confirm(client, s, [item_of(s.provoleta)]).status_code == 200
    assert save(client, s, [item_of(s.provoleta), item_of(s.flan)]).status_code == 200

    assert client.delete(cart_url(s.reservation.id), headers=s.headers).status_code == 204

    body = page(client, s)
    assert body["cart"] is None
    assert [item["name"] for item in body["order"]["items"]] == ["Provoleta"]
    # Discarding again, or once the order is closed, is harmless.
    assert client.delete(cart_url(s.reservation.id), headers=s.headers).status_code == 204
    s.reservation.status = "cancelled"
    session.commit()
    assert client.delete(cart_url(s.reservation.id), headers=s.headers).status_code == 204


def test_us17_edge_no_cart_saved_once_closed(client: TestClient, session: Session) -> None:
    s = setup(client, session, day=TODAY, start=time(9, 45))

    response = save(client, s, [item_of(s.provoleta)])

    assert response.status_code == 409
    assert response.json()["detail"] == "Ya no se puede cambiar el pedido de esta reserva."
    session.expire_all()
    assert orders.cart_of(session, s.reservation.id) is None


def test_us17_edge_cart_of_a_closed_order_is_hidden(client: TestClient, session: Session) -> None:
    s = setup(client, session, day=TODAY, start=time(9, 30))
    add_cart(session, s.reservation, [(s.provoleta, 1)])
    session.commit()

    body = page(client, s)

    assert body["cart"] is None
    assert body["reservation"]["has_cart"] is False


def test_us17_edge_cart_rejects_a_dish_off_the_menu(client: TestClient, session: Session) -> None:
    s = setup(client, session)
    elsewhere = add_bookable_restaurant(session, cuit="20123456786")
    foreign_dish = add_dish(session, elsewhere, "Milanesa", "9000.00", 20)
    session.commit()

    response = save(client, s, [item_of(foreign_dish)])

    assert response.status_code == 409
    assert response.json()["detail"] == "El menú cambió. Revisá tu pedido antes de confirmarlo."
    # A changed price is stored as sent: the confirmation is what compares it (P9).
    changed = {**item_of(s.provoleta), "unit_price": "1.00"}
    assert save(client, s, [changed]).json()["cart"]["items"][0]["unit_price"] == "1.00"


def test_us17_edge_unverified_diner_can_save_a_cart(client: TestClient, session: Session) -> None:
    s = setup(client, session, verified=False)

    assert save(client, s, [item_of(s.provoleta)]).status_code == 200
    assert confirm(client, s, [item_of(s.provoleta)]).status_code == 403

    # The 403 keeps the dishes saved.
    assert page(client, s)["cart"]["items"][0]["name"] == "Provoleta"


def test_us17_edge_cart_of_another_diner_is_not_found(client: TestClient, session: Session) -> None:
    s = setup(client, session)
    add_cart(session, s.reservation, [(s.provoleta, 1)])
    session.commit()
    other = diner_headers(client, "otra@example.com")
    body = {"items": [item_of(s.flan)]}

    assert client.put(cart_url(s.reservation.id), json=body, headers=other).status_code == 404
    assert client.delete(cart_url(s.reservation.id), headers=other).status_code == 404
    assert page(client, s)["cart"]["items"][0]["name"] == "Provoleta"


def test_us17_edge_empty_cart_kept_only_with_an_order(client: TestClient, session: Session) -> None:
    s = setup(client, session)
    assert save(client, s, [item_of(s.provoleta)]).status_code == 200

    # No order: an empty save leaves no cart.
    response = save(client, s, [])
    assert response.status_code == 200
    assert response.json()["cart"] is None
    assert page(client, s)["reservation"]["has_cart"] is False

    # A confirmed order emptied by the diner, not confirmed yet (P11).
    assert confirm(client, s, [item_of(s.provoleta)]).status_code == 200
    assert save(client, s, []).json()["cart"] == {
        "updated_at": "2026-11-02T09:00:00-03:00",
        "items": [],
    }
    assert page(client, s)["reservation"]["has_cart"] is True


# FR-011 — where the diner reaches the order (P4, P14)


def test_us17_edge_reservation_says_whether_it_takes_an_order(
    client: TestClient, session: Session
) -> None:
    s = setup(client, session)
    day = client.get(f"/api/reservations?date={TOMORROW}", headers=s.headers).json()

    reservation = day["reservations"][0]
    assert reservation["has_order"] is False
    assert reservation["has_cart"] is False
    assert reservation["order_open"] is True
    assert reservation["order_deadline"] == "2026-11-03T20:15:00-03:00"


def test_us17_edge_restaurant_without_menu_takes_no_order(
    client: TestClient, session: Session
) -> None:
    s = setup(client, session)
    for dish in (s.provoleta, s.bife, s.flan):
        session.delete(dish)
    session.commit()

    body = page(client, s)

    assert body["reservation"]["order_open"] is False
    assert body["menu"] == []
    assert save(client, s, []).status_code == 409


def test_us17_edge_upcoming_lists_only_future_confirmed_reservations_of_the_diner(
    client: TestClient, session: Session
) -> None:
    s = setup(client, session)
    diner = s.reservation.diner_id
    later = add_reservation(
        session, s.restaurant, diner, TOMORROW + timedelta(days=1), time(13), 2, "indoor"
    )
    add_reservation(session, s.restaurant, diner, TODAY, time(8), 2, "indoor")
    cancelled = add_reservation(session, s.restaurant, diner, TOMORROW, time(13), 2, "indoor")
    cancelled.status = "cancelled"
    other = diner_id(client, diner_headers(client, "otra@example.com"))
    add_reservation(session, s.restaurant, other, TOMORROW, time(20), 2, "indoor")
    add_order(session, s.reservation, [(s.provoleta, 1)])
    session.commit()

    response = client.get("/api/reservations/upcoming", headers=s.headers)

    assert response.status_code == 200
    listed = response.json()["reservations"]
    assert [item["id"] for item in listed] == [str(s.reservation.id), str(later.id)]
    assert [item["has_order"] for item in listed] == [True, False]


def test_us17_edge_arrival_and_suggested_preparation_start(
    client: TestClient, session: Session
) -> None:
    s = setup(client, session)
    order = add_order(session, s.reservation, [(s.provoleta, 2), (s.bife, 1), (s.flan, 1)])
    session.refresh(order)

    arrival = orders.arrival_time(s.reservation)
    assert arrival.isoformat() == "2026-11-03T21:00:00-03:00"
    assert orders.prep_start_time(s.reservation, order) == arrival - timedelta(minutes=25)

    lunch = add_reservation(
        session, s.restaurant, s.reservation.diner_id, TOMORROW, time(13), 2, "indoor"
    )
    no_times = add_order(session, lunch, [(s.flan, 1)])
    session.refresh(no_times)
    assert orders.prep_start_time(lunch, no_times) == orders.arrival_time(lunch)


# US-19 — Ver tiempo estimado


def test_us19_s1_order_returns_its_estimated_time(client: TestClient, session: Session) -> None:
    s = setup(client, session)

    response = confirm(client, s, [item_of(s.bife)])

    assert response.json()["order"]["prep_time_minutes"] == 25
    menu_times = {dish["name"]: dish["prep_time_minutes"] for dish in page(client, s)["menu"]}
    assert menu_times == {"Provoleta": 10, "Bife de chorizo": 25, "Flan": None}


def test_us19_s2_estimate_is_the_slowest_dish(client: TestClient, session: Session) -> None:
    s = setup(client, session)

    response = confirm(client, s, [item_of(s.provoleta, 4), item_of(s.bife), item_of(s.flan)])

    # Four provoletas take as long as one: the kitchen cooks them together (P2).
    assert response.json()["order"]["prep_time_minutes"] == 25


def test_us19_s4_no_estimate_without_preparation_times(
    client: TestClient, session: Session
) -> None:
    s = setup(client, session)

    response = confirm(client, s, [item_of(s.flan, 2)])

    assert response.json()["order"]["prep_time_minutes"] is None


# US-21 — Ver cuenta y total a pagar


def test_us21_s2_total_is_the_sum_of_the_subtotals(client: TestClient, session: Session) -> None:
    s = setup(client, session)
    cents = add_dish(session, s.restaurant, "Agua", "100.50", None, "bebida")
    session.commit()

    response = confirm(client, s, [item_of(s.provoleta, 2), item_of(s.bife), item_of(cents, 3)])

    order = response.json()["order"]
    assert order["total"] == "33801.50"
    assert Decimal(order["total"]) == sum(Decimal(item["subtotal"]) for item in order["items"])


def test_us21_s3_each_item_has_quantity_unit_price_and_subtotal(
    client: TestClient, session: Session
) -> None:
    s = setup(client, session)

    response = confirm(client, s, [item_of(s.provoleta, 2), item_of(s.bife)])

    items = {item["name"]: item for item in response.json()["order"]["items"]}
    assert items["Provoleta"] | {"dish_id": None} == {
        "dish_id": None,
        "name": "Provoleta",
        "quantity": 2,
        "unit_price": "7500.00",
        "prep_time_minutes": 10,
        "subtotal": "15000.00",
    }
    assert items["Bife de chorizo"]["subtotal"] == "18500.00"


def test_us17_edge_menu_follows_the_category_order(client: TestClient, session: Session) -> None:
    s = setup(client, session)
    add_dish(session, s.restaurant, "Agua", "1500.00", None, "bebida")
    session.commit()

    menu = [(dish["category"], dish["name"]) for dish in page(client, s)["menu"]]

    assert menu == [
        ("entrada", "Provoleta"),
        ("plato_principal", "Bife de chorizo"),
        ("postre", "Flan"),
        ("bebida", "Agua"),
    ]


def test_us17_edge_deleted_dish_keeps_the_confirmed_item(
    client: TestClient, session: Session
) -> None:
    s = setup(client, session)
    assert confirm(client, s, [item_of(s.flan)]).status_code == 200
    session.delete(s.flan)
    session.commit()

    item = page(client, s)["order"]["items"][0]

    assert (item["dish_id"], item["name"]) == (None, "Flan")

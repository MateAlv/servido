"""Acceptance tests for spec 028-editar-promociones (US-48): crear y editar promociones."""

from dataclasses import dataclass
from datetime import time
from decimal import Decimal
from unittest.mock import patch
from uuid import UUID, uuid4

from fastapi.testclient import TestClient
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.dish import Dish
from app.models.order import Order
from app.models.promotion import Promotion
from app.models.reservation import Reservation
from app.models.restaurant import Restaurant
from app.services.auth import hash_password
from tests.reservations import (
    NOW,
    TOMORROW,
    StableTokenClock,
    add_bookable_restaurant,
    add_dish,
    add_reservation,
    diner_headers,
    diner_id,
    item_of,
    verify_diner,
)

PROMOTIONS_URL = "/api/restaurant/promotions"
POLICIES_URL = "/api/restaurant/promotions/policies"


def promotion_url(promotion_id: UUID) -> str:
    return f"/api/restaurant/promotions/{promotion_id}"


def restaurant_headers(client: TestClient, restaurant: Restaurant) -> dict[str, str]:
    with patch("app.services.auth.datetime", StableTokenClock):
        token = client.post(
            "/api/auth/restaurante",
            json={"email": restaurant.email, "password": "Segura123"},
        ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def percentage_payload(request_id: UUID | None = None) -> dict:
    payload = {
        "request_id": str(request_id or uuid4()),
        "name": "20% los martes",
        "description": "Veinte por ciento de descuento general.",
        "discount_type": "percentage",
        "discount_value": "20.00",
        "minimum_amount": None,
        "starts_on": None,
        "ends_on": None,
        "weekdays": [2],
        "start_time": "20:00",
        "end_time": "23:00",
        "active": True,
        "stackable": True,
    }
    return payload


def fixed_payload(request_id: UUID | None = None) -> dict:
    payload = {
        "request_id": str(request_id or uuid4()),
        "name": "$3.000 desde $10.000",
        "description": None,
        "discount_type": "fixed",
        "discount_value": "3000.00",
        "minimum_amount": "10000.00",
        "starts_on": None,
        "ends_on": None,
        "weekdays": [2],
        "start_time": "20:00",
        "end_time": "23:00",
        "active": True,
        "stackable": True,
    }
    return payload


def edit_payload(payload: dict) -> dict:
    """Una edición nunca lleva request_id (el esquema de edición lo prohíbe)."""
    edited = dict(payload)
    edited.pop("request_id", None)
    return edited


@dataclass
class PromoSetup:
    headers: dict[str, str]
    restaurant: Restaurant


def promo_setup(client: TestClient, session: Session) -> PromoSetup:
    restaurant = add_bookable_restaurant(session, cuit="30712345671")
    session.commit()
    return PromoSetup(restaurant_headers(client, restaurant), restaurant)


@dataclass
class OrderSetup:
    headers: dict[str, str]
    restaurant: Restaurant
    reservation: Reservation
    provoleta: Dish
    bife: Dish


def order_setup(client: TestClient, session: Session) -> OrderSetup:
    restaurant = add_bookable_restaurant(session, cuit="30712345672")
    session.commit()
    headers = diner_headers(client, "martin@example.com")
    diner = diner_id(client, headers)
    verify_diner(session, diner)
    session.commit()
    reservation = add_reservation(session, restaurant, diner, TOMORROW, time(21), 4, "terrace")
    provoleta = add_dish(session, restaurant, "Provoleta", "7500.00", 10, "entrada")
    bife = add_dish(session, restaurant, "Bife de chorizo", "18500.00", 25)
    session.commit()
    return OrderSetup(headers, restaurant, reservation, provoleta, bife)


def cart_url(reservation_id: UUID) -> str:
    return f"/api/reservations/{reservation_id}/cart"


def order_url(reservation_id: UUID) -> str:
    return f"/api/reservations/{reservation_id}/order"


def save_cart(client: TestClient, setup: OrderSetup, items: list[dict]) -> dict:
    body = {
        "items": items,
        "arrival_at": setup.reservation.starts_at.isoformat(),
        "payment_method": "cash",
    }
    return client.put(cart_url(setup.reservation.id), json=body, headers=setup.headers)


def confirm(client: TestClient, setup: OrderSetup, items: list[dict]) -> dict:
    body = {
        "items": items,
        "arrival_at": setup.reservation.starts_at.isoformat(),
        "payment_method": "cash",
        "operation_id": str(uuid4()),
    }
    return client.put(order_url(setup.reservation.id), json=body, headers=setup.headers)


# US-48 S1 — promoción porcentual con vigencia


def test_us48_s1_creates_a_percentage_promotion_with_its_validity(
    client: TestClient, session: Session
) -> None:
    s = promo_setup(client, session)
    response = client.post(PROMOTIONS_URL, json=percentage_payload(), headers=s.headers)

    assert response.status_code == 201, response.text
    data = response.json()
    assert data["name"] == "20% los martes"
    assert data["discount_type"] == "percentage"
    assert data["discount_value"] == "20.00"
    assert data["minimum_amount"] is None
    assert data["weekdays"] == [2]
    assert data["start_time"] == "20:00:00"
    assert data["end_time"] == "23:00:00"
    assert data["active"] is True
    assert data["stackable"] is True
    assert data["state"] == "active"

    listed = client.get(PROMOTIONS_URL, headers=s.headers).json()
    assert listed["stack_promotions"] is False
    assert len(listed["promotions"]) == 1
    assert listed["promotions"][0]["id"] == data["id"]


# US-48 S2 — monto fijo con monto mínimo de pedido


def test_us48_s2_creates_a_fixed_amount_promotion_with_its_minimum(
    client: TestClient, session: Session
) -> None:
    s = promo_setup(client, session)
    response = client.post(PROMOTIONS_URL, json=fixed_payload(), headers=s.headers)

    assert response.status_code == 201, response.text
    data = response.json()
    assert data["discount_type"] == "fixed"
    assert data["discount_value"] == "3000.00"
    assert data["minimum_amount"] == "10000.00"
    assert data["state"] == "active"


# US-48 S3 — listado con descuento, mínimo, vigencia y estado


def test_us48_s3_lists_promotions_with_their_discount_validity_and_state(
    client: TestClient, session: Session
) -> None:
    s = promo_setup(client, session)
    client.post(PROMOTIONS_URL, json=percentage_payload(), headers=s.headers)
    client.post(PROMOTIONS_URL, json=fixed_payload(), headers=s.headers)

    listed = client.get(PROMOTIONS_URL, headers=s.headers).json()
    assert len(listed["promotions"]) == 2
    assert {promotion["state"] for promotion in listed["promotions"]} == {"active"}
    by_name = {promotion["name"]: promotion for promotion in listed["promotions"]}
    assert by_name["20% los martes"]["minimum_amount"] is None
    assert by_name["$3.000 desde $10.000"]["minimum_amount"] == "10000.00"


# US-48 S4 — editar todos los atributos y activar/pausar


def test_us48_s4_edits_a_promotion_and_changes_its_state(
    client: TestClient, session: Session
) -> None:
    s = promo_setup(client, session)
    created = client.post(PROMOTIONS_URL, json=percentage_payload(), headers=s.headers).json()
    promotion_id = created["id"]

    edited = edit_payload(percentage_payload())
    edited["name"] = "25% los martes"
    edited["discount_value"] = "25.00"
    edited["start_time"] = "19:00"
    edited["stackable"] = False
    response = client.put(promotion_url(promotion_id), json=edited, headers=s.headers)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["name"] == "25% los martes"
    assert data["discount_value"] == "25.00"
    assert data["start_time"] == "19:00:00"
    assert data["stackable"] is False
    assert data["state"] == "active"

    paused = client.patch(promotion_url(promotion_id), json={"active": False}, headers=s.headers)
    assert paused.status_code == 200
    assert paused.json()["active"] is False
    assert paused.json()["state"] == "paused"

    reactivated = client.patch(
        promotion_url(promotion_id), json={"active": True}, headers=s.headers
    )
    assert reactivated.json()["state"] == "active"


# US-48 S5 — datos inválidos son rechazados informando qué corregir


def detail_messages(response) -> list[str]:
    return [error["msg"] for error in response.json()["detail"]]


def test_us48_s5_rejects_invalid_promotions(client: TestClient, session: Session) -> None:
    s = promo_setup(client, session)

    cases = [
        ({**percentage_payload(), "name": "   "}, "Ingresá el nombre de la promoción."),
        (
            {**fixed_payload(), "minimum_amount": None},
            "Indicá el monto mínimo del pedido para un descuento de monto fijo.",
        ),
        (
            {**fixed_payload(), "minimum_amount": "2000.00"},
            "El monto mínimo no puede ser menor que el descuento.",
        ),
        (
            {**percentage_payload(), "discount_value": "101.00"},
            "El porcentaje no puede superar el 100%.",
        ),
        (
            {**percentage_payload(), "minimum_amount": "1000.00"},
            "El monto mínimo solo aplica a los descuentos de monto fijo.",
        ),
        (
            {
                **percentage_payload(),
                "starts_on": "2026-11-05",
                "ends_on": "2026-11-01",
            },
            "La fecha de fin no puede ser anterior a la de inicio.",
        ),
        (
            {**percentage_payload(), "start_time": "23:00", "end_time": "20:00"},
            "La hora de fin tiene que ser posterior a la de inicio.",
        ),
        (
            {**percentage_payload(), "weekdays": None, "start_time": None, "end_time": None},
            "Elegí al menos una fecha, un día o un horario para la vigencia.",
        ),
        (
            {**percentage_payload(), "weekdays": [8]},
            "Los días de la semana no son válidos.",
        ),
        # discount_value <= 0: Pydantic rechaza con su propio mensaje; lo importante es el 400.
        ({**fixed_payload(), "discount_value": "0"}, None),
    ]

    for payload, message in cases:
        response = client.post(PROMOTIONS_URL, json=payload, headers=s.headers)
        assert response.status_code == 400, (payload, response.text)
        if message is not None:
            assert message in detail_messages(response), (payload, response.text)

    assert (
        session.scalar(
            select(Promotion).where(Promotion.restaurant_id == s.restaurant.id_restaurante)
        )
        is None
    )


def test_us48_s5_refuses_invalid_edits_without_changing_the_promotion(
    client: TestClient, session: Session
) -> None:
    s = promo_setup(client, session)
    created = client.post(PROMOTIONS_URL, json=percentage_payload(), headers=s.headers).json()
    promotion_id = created["id"]

    bad_edit = edit_payload(percentage_payload())
    bad_edit["name"] = "   "
    response = client.put(
        promotion_url(promotion_id),
        json=bad_edit,
        headers=s.headers,
    )
    assert response.status_code == 400, response.text

    unchanged_resp = client.get(PROMOTIONS_URL, headers=s.headers).json()
    unchanged = next(p for p in unchanged_resp["promotions"] if p["id"] == promotion_id)
    assert unchanged["name"] == "20% los martes"
    assert unchanged["discount_value"] == "20.00"


# US-55 — las promociones alteran el pedido del comensal


def test_us55_promotion_discount_is_applied_to_the_diner_cart(
    client: TestClient, session: Session
) -> None:
    s = order_setup(client, session)
    rh = restaurant_headers(client, s.restaurant)
    client.post(PROMOTIONS_URL, json=percentage_payload(), headers=rh)

    cart = save_cart(client, s, [item_of(s.provoleta)]).json()["cart"]
    assert cart["subtotal"] == "7500.00"
    assert cart["discount"] == "1500.00"
    assert cart["total"] == "6000.00"

    # Monto fijo por debajo del mínimo: no descuenta (7500 < 10000).
    client.post(PROMOTIONS_URL, json=fixed_payload(), headers=rh)
    cart = save_cart(client, s, [item_of(s.provoleta)]).json()["cart"]
    assert cart["discount"] == "1500.00"
    assert cart["total"] == "6000.00"

    # Con el bife (18500 >= 10000): ambas elegibles, gana la que más ahorra (3700 > 3000).
    cart = save_cart(client, s, [item_of(s.bife)]).json()["cart"]
    assert cart["discount"] == "3700.00"
    assert cart["total"] == "14800.00"

    # Solo la fija, por debajo del mínimo: sin descuento.
    session.execute(delete(Promotion).where(Promotion.restaurant_id == s.restaurant.id_restaurante))
    session.commit()
    client.post(PROMOTIONS_URL, json=fixed_payload(), headers=rh)
    cart = save_cart(client, s, [item_of(s.provoleta)]).json()["cart"]
    assert cart["discount"] == "0.00"
    assert cart["total"] == "7500.00"


# US-55 — el pedido confirmado incorpora el descuento congelado


def test_us55_confirmed_order_freezes_the_promotion_discount(
    client: TestClient, session: Session
) -> None:
    s = order_setup(client, session)
    rh = restaurant_headers(client, s.restaurant)
    client.post(PROMOTIONS_URL, json=percentage_payload(), headers=rh)

    response = confirm(client, s, [item_of(s.provoleta)])
    assert response.status_code == 200, response.text
    order = response.json()["order"]
    assert order["subtotal"] == "7500.00"
    assert order["discount"] == "1500.00"
    assert order["promotions"][0]["amount"] == "1500.00"
    assert order["total"] == "6000.00"

    stored = session.scalar(select(Order).where(Order.reservation_id == s.reservation.id))
    assert stored.discount_amount == Decimal("1500.00")
    assert stored.total == Decimal("6000.00")

    # El Responsable pausa la promoción después de confirmar: nada cambia.
    promotion = session.scalar(
        select(Promotion).where(Promotion.restaurant_id == s.restaurant.id_restaurante)
    )
    client.patch(promotion_url(promotion.id), json={"active": False}, headers=rh)
    session.commit()

    current = client.get(order_url(s.reservation.id), headers=s.headers).json()["order"]
    assert current["subtotal"] == "7500.00"
    assert current["discount"] == "1500.00"
    assert current["promotions"][0]["amount"] == "1500.00"
    assert current["total"] == "6000.00"
    session.expire_all()
    assert session.get(Order, stored.id).discount_amount == Decimal("1500.00")


# Edge: las promociones pausadas o vencidas no se aplican


def test_us48_edge_paused_or_expired_promotions_do_not_apply(
    client: TestClient, session: Session
) -> None:
    s = order_setup(client, session)
    rh = restaurant_headers(client, s.restaurant)

    client.post(
        PROMOTIONS_URL,
        json={**percentage_payload(), "name": "Pausada", "active": False},
        headers=rh,
    )
    client.post(
        PROMOTIONS_URL,
        json={
            **percentage_payload(),
            "name": "Vencida",
            "starts_on": "2026-10-25",
            "ends_on": "2026-10-31",
            "weekdays": None,
            "start_time": None,
            "end_time": None,
        },
        headers=rh,
    )

    response = save_cart(client, s, [item_of(s.bife)])
    assert response.status_code == 200
    assert response.json()["cart"]["discount"] == "0.00"
    assert response.json()["cart"]["total"] == "18500.00"


# Edge: vigencia en Buenos Aires — fechas son condiciones AND


def test_us48_edge_validity_uses_buenos_aires(client: TestClient, session: Session) -> None:
    s = order_setup(client, session)
    rh = restaurant_headers(client, s.restaurant)

    # Solo rige el lunes 2/11; la reserva es el martes 3/11.
    client.post(
        PROMOTIONS_URL,
        json={
            **percentage_payload(),
            "name": "Solo lunes",
            "starts_on": "2026-11-02",
            "ends_on": "2026-11-02",
            "weekdays": None,
            "start_time": None,
            "end_time": None,
        },
        headers=rh,
    )

    response = save_cart(client, s, [item_of(s.bife)])
    assert response.json()["cart"]["discount"] == "0.00"


# Edge: día de la semana y horario son condiciones AND


def test_us48_edge_weekday_and_hours_are_and_conditions(
    client: TestClient, session: Session
) -> None:
    s = order_setup(client, session)
    rh = restaurant_headers(client, s.restaurant)
    client.post(PROMOTIONS_URL, json=percentage_payload(), headers=rh)

    # Martes 21:00 está dentro de 20:00-23:00: se aplica.
    cart = save_cart(client, s, [item_of(s.bife)]).json()["cart"]
    assert cart["total"] == "14800.00"
    assert cart["discount"] == "3700.00"

    # Misma promoción, reserva al mediodía: fuera del horario, no se aplica.
    lunch = add_reservation(
        session, s.restaurant, s.reservation.diner_id, TOMORROW, time(12), 2, "indoor"
    )
    session.commit()
    lunch_setup = OrderSetup(s.headers, s.restaurant, lunch, s.provoleta, s.bife)
    cart = save_cart(client, lunch_setup, [item_of(s.bife)]).json()["cart"]
    assert cart["total"] == "18500.00"
    assert cart["discount"] == "0.00"


# Edge P5 — política de promociones simultáneas


def test_us48_edge_p5_best_saving_is_applied_by_default(
    client: TestClient, session: Session
) -> None:
    s = order_setup(client, session)
    rh = restaurant_headers(client, s.restaurant)
    client.post(PROMOTIONS_URL, json=percentage_payload(), headers=rh)
    client.post(PROMOTIONS_URL, json=fixed_payload(), headers=rh)

    # Sin apilamiento (por defecto): gana la que más ahorra (20% de 18500 = 3700 > 3000).
    cart = save_cart(client, s, [item_of(s.bife)]).json()["cart"]
    assert cart["discount"] == "3700.00"
    assert cart["total"] == "14800.00"


def test_us48_edge_p5_stacks_and_compares_the_exclusive_promotion(
    client: TestClient, session: Session
) -> None:
    s = order_setup(client, session)
    rh = restaurant_headers(client, s.restaurant)
    client.post(PROMOTIONS_URL, json=percentage_payload(), headers=rh)
    client.post(PROMOTIONS_URL, json=fixed_payload(), headers=rh)

    client.put(POLICIES_URL, json={"stack_promotions": True}, headers=rh)

    # Ambas acumulables: 3700 + 3000 = 6700.
    cart = save_cart(client, s, [item_of(s.bife)]).json()["cart"]
    assert cart["discount"] == "6700.00"
    assert cart["total"] == "11800.00"

    # La fija se vuelve no acumulable: compite 3000 (fija sola) contra 3700 (porcentual).
    promotion = session.scalar(
        select(Promotion).where(
            Promotion.name == "$3.000 desde $10.000",
            Promotion.restaurant_id == s.restaurant.id_restaurante,
        )
    )
    edited = edit_payload(fixed_payload())
    edited["stackable"] = False
    client.put(promotion_url(promotion.id), json=edited, headers=rh)
    cart = save_cart(client, s, [item_of(s.bife)]).json()["cart"]
    assert cart["discount"] == "3700.00"
    assert cart["total"] == "14800.00"


def test_us48_edge_p5_total_never_goes_below_zero(client: TestClient, session: Session) -> None:
    s = order_setup(client, session)
    rh = restaurant_headers(client, s.restaurant)
    agua = add_dish(session, s.restaurant, "Agua con gas", "3000.00", None, "bebida")
    session.commit()

    first = fixed_payload(uuid4())
    first.update(name="$6.000 desde $10.000", discount_value="6000.00", minimum_amount="10000.00")
    second = fixed_payload(uuid4())
    second.update(
        name="$6.000 desde $10.000 (otra)",
        discount_value="6000.00",
        minimum_amount="10000.00",
    )
    client.post(PROMOTIONS_URL, json=first, headers=rh)
    client.post(PROMOTIONS_URL, json=second, headers=rh)
    client.put(POLICIES_URL, json={"stack_promotions": True}, headers=rh)

    # Subtotal 10500: 6000 + 6000 se tapa en el subtotal, total nunca negativo.
    cart = save_cart(client, s, [item_of(s.provoleta), item_of(agua)]).json()["cart"]
    assert cart["subtotal"] == "10500.00"
    assert cart["discount"] == "10500.00"
    assert cart["total"] == "0.00"


# Edge: doble envío del formulario crea una sola promoción


def test_us48_edge_repeated_request_creates_one_promotion(
    client: TestClient, session: Session
) -> None:
    s = promo_setup(client, session)
    request_id = uuid4()
    first = client.post(PROMOTIONS_URL, json=percentage_payload(request_id), headers=s.headers)
    assert first.status_code == 201, first.text
    promotion_id = first.json()["id"]

    second = client.post(PROMOTIONS_URL, json=percentage_payload(request_id), headers=s.headers)
    assert second.status_code == 200, second.text
    assert second.json()["id"] == promotion_id

    listed = client.get(PROMOTIONS_URL, headers=s.headers).json()
    assert len(listed["promotions"]) == 1


# Edge: aislamiento — solo el dueño ve y edita sus promociones


def test_us48_edge_only_the_owner_reads_and_edits_promotions(
    client: TestClient, session: Session
) -> None:
    owner = promo_setup(client, session)
    created = client.post(PROMOTIONS_URL, json=percentage_payload(), headers=owner.headers).json()
    promotion_id = created["id"]

    other = add_bookable_restaurant(session, cuit="30712345673")
    session.commit()
    other_headers = restaurant_headers(client, other)

    assert client.get(PROMOTIONS_URL, headers=other_headers).json()["promotions"] == []
    assert (
        client.put(
            promotion_url(promotion_id),
            json=edit_payload(percentage_payload()),
            headers=other_headers,
        ).status_code
        == 404
    )
    assert (
        client.patch(
            promotion_url(promotion_id), json={"active": False}, headers=other_headers
        ).status_code
        == 404
    )

    diner = diner_headers(client, "otra@example.com")
    assert client.post(PROMOTIONS_URL, json=percentage_payload(), headers=diner).status_code == 403
    assert (
        client.put(
            promotion_url(promotion_id), json=edit_payload(percentage_payload()), headers=diner
        ).status_code
        == 403
    )


# Edge: sesión vencida durante el guardado no guarda nada


def test_us48_edge_expired_session_saves_nothing(client: TestClient, session: Session) -> None:
    s = promo_setup(client, session)
    created = client.post(PROMOTIONS_URL, json=percentage_payload(), headers=s.headers).json()
    promotion_id = created["id"]

    s.restaurant.password_hash = hash_password("OtraClave456")
    s.restaurant.password_changed_at = NOW
    session.commit()

    expired_edit = edit_payload(percentage_payload())
    expired_edit["name"] = "Modificada"
    response = client.put(
        promotion_url(promotion_id),
        json=expired_edit,
        headers=s.headers,
    )
    assert response.status_code == 401, response.text

    session.expire_all()
    stored = session.get(Promotion, UUID(promotion_id))
    assert stored.name == "20% los martes"


# Edge: porcentual sin monto mínimo; fijo exige mínimo


def test_us48_edge_percentage_has_no_minimum(client: TestClient, session: Session) -> None:
    s = promo_setup(client, session)
    client.post(PROMOTIONS_URL, json=percentage_payload(), headers=s.headers)
    listed = client.get(PROMOTIONS_URL, headers=s.headers).json()
    assert listed["promotions"][0]["minimum_amount"] is None

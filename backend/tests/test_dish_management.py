"""US-34 acceptance and management contract tests, on real PostgreSQL."""

from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import uuid4

import pytest

from app.services import orders
from tests.reservations import add_bookable_restaurant, add_cart, add_order
from tests.test_order import page, restaurant_headers, setup


@pytest.fixture
def managed(client, session, monkeypatch, tmp_path):
    from app.api import dish
    from app.services import auth

    class TokenClock(datetime):
        @classmethod
        def now(cls, tz=None):
            # These are menu tests, not clock tests. Avoid WSL clock adjustments making a
            # token issued a moment ago fail PyJWT's future-iat check during fixture setup.
            return datetime.now(tz) - timedelta(minutes=1)

    monkeypatch.setattr(auth, "datetime", TokenClock)
    monkeypatch.setattr(dish, "DISH_UPLOADS_DIR", tmp_path)
    s = setup(client, session)
    other = add_bookable_restaurant(session, cuit="30712345672")
    add_order(session, s.reservation, [(s.provoleta, 2)])
    add_cart(session, s.reservation, [(s.provoleta, 2)])
    session.commit()
    return s, restaurant_headers(client, s.restaurant), restaurant_headers(client, other)


def url(s):
    return f"/api/restaurant/dishes/{s.provoleta.id_plato}"


def edit(client, s, headers, **changes):
    data = dict(
        name="Provoleta",
        description="Con orégano",
        category="entrada",
        price="7500.00",
        prep_time_minutes="10",
        photo_action="keep",
        expected_revision="1",
    )
    data.update(changes)
    return client.put(url(s), headers=headers, data=data)


def public(client, s):
    return client.get(f"/api/restaurants/{s.restaurant.id_restaurante}").json()["menu"]


def test_us34_s1_updates_dish_and_public_menu(client, managed):
    s, headers, _ = managed
    response = edit(
        client,
        s,
        headers,
        name="Nueva",
        price="8100.50",
        category="postre",
        dietary_restrictions="vegano",
    )
    assert response.status_code == 200
    dish = response.json()["dish"]
    assert (dish["name"], dish["price"], dish["category"], dish["dietary_restrictions"]) == (
        "Nueva",
        "8100.50",
        "postre",
        ["vegano"],
    )
    assert next(d for d in public(client, s) if d["id"] == dish["id"])["name"] == "Nueva"


@pytest.mark.parametrize(
    "field,value",
    [
        ("name", " "),
        ("category", ""),
        ("price", "0"),
        ("price", "-1"),
        ("price", "1.001"),
        ("price", "NaN"),
        ("price", "100000000"),
        ("name", "a" * 151),
        ("description", "a" * 2001),
        ("prep_time_minutes", "2147483648"),
        ("dietary_restrictions", "invalid"),
    ],
)
def test_us34_s2_rejects_invalid_edit(client, managed, field, value):
    s, headers, _ = managed
    before = client.get(url(s), headers=headers).json()
    assert edit(client, s, headers, **{field: value}).status_code == 400
    assert client.get(url(s), headers=headers).json() == before


def test_us34_s3_hides_unavailable_dish(client, managed):
    s, headers, _ = managed
    assert (
        client.patch(
            url(s) + "/availability",
            headers=headers,
            json={"available": False, "expected_revision": 1},
        ).status_code
        == 200
    )
    assert all(d["id"] != str(s.provoleta.id_plato) for d in public(client, s))
    owned = client.get("/api/restaurantes/me/platos", headers=headers).json()
    assert next(d for d in owned if d["id"] == str(s.provoleta.id_plato))["disponible"] is False


def test_us34_s4_restores_availability(client, managed):
    s, headers, _ = managed
    client.patch(
        url(s) + "/availability", headers=headers, json={"available": False, "expected_revision": 1}
    )
    edit(client, s, headers, name="Vigente", expected_revision="2")
    response = client.patch(
        url(s) + "/availability", headers=headers, json={"available": True, "expected_revision": 3}
    )
    assert response.status_code == 200
    assert any(d["name"] == "Vigente" for d in public(client, s))


def test_us34_s6_removes_dish_from_menus(client, managed, session):
    s, headers, _ = managed
    assert client.delete(url(s), headers=headers).status_code == 204
    session.refresh(s.provoleta)
    deleted_at, revision = s.provoleta.deleted_at, s.provoleta.revision
    assert deleted_at and not s.provoleta.disponible
    assert client.delete(url(s), headers=headers).status_code == 204
    session.refresh(s.provoleta)
    assert (s.provoleta.deleted_at, s.provoleta.revision) == (deleted_at, revision)
    assert all(d["id"] != str(s.provoleta.id_plato) for d in public(client, s))
    assert all(
        d["id"] != str(s.provoleta.id_plato)
        for d in client.get("/api/restaurantes/me/platos", headers=headers).json()
    )
    assert client.get(url(s), headers=headers).status_code == 404
    assert edit(client, s, headers).status_code == 404
    assert (
        client.patch(
            url(s) + "/availability",
            headers=headers,
            json={"available": True, "expected_revision": 1},
        ).status_code
        == 404
    )


@pytest.mark.parametrize("operation", ["edit", "disable", "remove"])
def test_us34_s8_preserves_confirmed_order(client, managed, session, operation):
    s, headers, _ = managed
    before = page(client, s)["order"]
    order = orders.order_of(session, s.reservation.id)
    prep_start = order.prep_start_time
    restaurant_url = f"/api/restaurante/pedidos/{order.id}"
    restaurant_before = client.get(restaurant_url, headers=headers).json()
    if operation == "edit":
        assert (
            edit(client, s, headers, name="Otra", price="9000", prep_time_minutes="30").status_code
            == 200
        )
    elif operation == "disable":
        assert (
            client.patch(
                url(s) + "/availability",
                headers=headers,
                json={"available": False, "expected_revision": 1},
            ).status_code
            == 200
        )
    else:
        assert client.delete(url(s), headers=headers).status_code == 204
    assert page(client, s)["order"] == before
    assert client.get(restaurant_url, headers=headers).json() == restaurant_before
    session.refresh(order)
    assert order.prep_start_time == prep_start
    assert order.items[0].dish_id == s.provoleta.id_plato


@pytest.mark.parametrize("method", ["get", "put", "patch", "delete"])
def test_us34_edge_permissions(client, managed, method):
    s, headers, other = managed
    path = url(s) + ("/availability" if method == "patch" else "")
    kwargs = (
        {
            "data": dict(
                name="X", category="entrada", price="1", photo_action="keep", expected_revision="1"
            )
        }
        if method == "put"
        else {"json": {"available": False, "expected_revision": 1}}
        if method == "patch"
        else {}
    )
    for auth, status in [(None, 401), (s.headers, 403), (other, 403)]:
        assert client.request(method, path, headers=auth, **kwargs).status_code == status
    assert (
        client.request(
            method, path.replace(str(s.provoleta.id_plato), str(uuid4())), headers=headers, **kwargs
        ).status_code
        == 404
    )
    assert (
        client.request(
            method, path.replace(str(s.provoleta.id_plato), "invalid"), headers=headers, **kwargs
        ).status_code
        == 400
    )


def test_us34_edge_noop_stale_and_live_duplicate(client, managed):
    s, headers, _ = managed
    assert edit(client, s, headers).status_code == 200
    current = client.get(url(s), headers=headers).json()
    assert (
        edit(client, s, headers, expected_revision=str(current["revision"])).json()["dish"][
            "revision"
        ]
        == current["revision"]
    )
    stale = edit(client, s, headers, name="Última")
    assert stale.json()["changed_since_open"] is True
    assert stale.json()["dish"]["name"] == "Última"
    assert edit(client, s, headers, name=s.bife.nombre).status_code == 409


def test_us34_edge_photo_actions_and_optional_clearing(client, managed):
    s, headers, _ = managed
    data = dict(
        name="Provoleta",
        category="entrada",
        price="7500",
        photo_action="replace",
        expected_revision="1",
    )
    uploaded = client.put(
        url(s), headers=headers, data=data, files={"photo": ("dish.png", b"image", "image/png")}
    )
    assert uploaded.status_code == 200
    photo = uploaded.json()["dish"]["photo_url"]
    assert photo
    assert edit(client, s, headers, photo_action="replace").status_code == 400
    for content, mime in [(b"x", "text/plain"), (b"x" * (5 * 1024 * 1024 + 1), "image/png")]:
        assert (
            client.put(
                url(s), headers=headers, data=data, files={"photo": ("bad.png", content, mime)}
            ).status_code
            == 400
        )
    assert client.get(url(s), headers=headers).json()["photo_url"] == photo
    cleared = edit(
        client, s, headers, description="", prep_time_minutes="", photo_action="remove"
    ).json()["dish"]
    assert (
        cleared["description"] is None
        and cleared["prep_time_minutes"] is None
        and cleared["photo_url"] is None
    )
    assert cleared["dietary_restrictions"] == []


def test_us34_edge_failed_replacement_keeps_old_photo_and_cleans_new_file(
    client, managed, tmp_path
):
    s, headers, _ = managed
    data = dict(
        name="Provoleta",
        category="entrada",
        price="7500",
        photo_action="replace",
        expected_revision="1",
    )
    response = client.put(
        url(s), headers=headers, data=data, files={"photo": ("old.png", b"old", "image/png")}
    )
    assert response.status_code == 200
    old = response.json()["dish"]
    before = set(tmp_path.iterdir())
    data["name"] = s.bife.nombre
    response = client.put(
        url(s), headers=headers, data=data, files={"photo": ("new.png", b"new", "image/png")}
    )
    assert response.status_code == 409
    assert set(tmp_path.iterdir()) == before
    assert client.get(url(s), headers=headers).json() == old


def test_us34_edge_photo_storage_failure_preserves_dish(client, managed, monkeypatch):
    s, headers, _ = managed
    before = client.get(url(s), headers=headers).json()

    def fail_write(*args, **kwargs):
        raise OSError("simulated disk failure")

    monkeypatch.setattr(Path, "write_bytes", fail_write)
    response = client.put(
        url(s),
        headers=headers,
        data=dict(
            name="Otra",
            category="entrada",
            price="7500",
            photo_action="replace",
            expected_revision="1",
        ),
        files={"photo": ("dish.png", b"new", "image/png")},
    )
    assert response.status_code == 500
    assert client.get(url(s), headers=headers).json() == before


def test_us34_edge_availability_noop_and_stale_notice(client, managed):
    s, headers, _ = managed
    first = client.patch(
        url(s) + "/availability", headers=headers, json={"available": False, "expected_revision": 1}
    ).json()
    repeated = client.patch(
        url(s) + "/availability",
        headers=headers,
        json={"available": False, "expected_revision": first["dish"]["revision"]},
    ).json()
    assert repeated["dish"]["revision"] == first["dish"]["revision"]
    stale = client.patch(
        url(s) + "/availability", headers=headers, json={"available": True, "expected_revision": 1}
    ).json()
    assert stale["changed_since_open"] is True
    assert stale["dish"]["name"] == "Provoleta"


@pytest.mark.parametrize(
    "values", [{"revision": 0}, {"deleted_at": datetime.now(UTC), "disponible": True}]
)
def test_us34_edge_database_state_constraints(session, managed, values):
    from sqlalchemy import update
    from sqlalchemy.exc import IntegrityError

    from app.models.dish import Dish

    s, _, _ = managed
    with pytest.raises(IntegrityError), session.begin_nested():
        session.execute(update(Dish).where(Dish.id_plato == s.provoleta.id_plato).values(**values))


def test_us34_edge_removed_dish_still_checks_ownership(client, managed):
    s, headers, other = managed
    assert client.delete(url(s), headers=headers).status_code == 204
    assert client.delete(url(s), headers=other).status_code == 403
    assert client.get(url(s), headers=other).status_code == 403

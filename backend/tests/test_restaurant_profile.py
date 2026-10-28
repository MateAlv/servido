from typing import Any

from fastapi.testclient import TestClient


def _auth(client: TestClient) -> dict[str, str]:
    client.post(
        "/api/restaurantes",
        json={
            "nombre": "Local de prueba",
            "email": "profile@example.com",
            "cuit": "30712345671",
            "telefono": "1155554444",
            "password": "Segura123",
        },
    )
    token = client.post(
        "/api/auth/restaurante",
        json={"email": "profile@example.com", "password": "Segura123"},
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_us6_s1_profile_information_is_saved_and_available(client: TestClient) -> None:
    headers = _auth(client)
    payload = {
        "nombre": "La Esquina",
        "descripcion": "Cocina de barrio",
        "tipo_cocina": "Italiana",
        "rango_precio": "$$",
        "foto_url": "https://example.com/local.jpg",
        "restricciones_tags": ["vegetariano"],
        "direccion": "Av. Siempre Viva 123",
        "latitud": -34.6037,
        "longitud": -58.3816,
    }

    response = client.put("/api/restaurante/perfil", json=payload, headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert {key: body[key] for key in payload if key not in {"latitud", "longitud"}} == {
        key: payload[key] for key in payload if key not in {"latitud", "longitud"}
    }
    assert float(body["latitud"]) == payload["latitud"]
    assert float(body["longitud"]) == payload["longitud"]


def test_us6_s2_name_is_required(client: TestClient) -> None:
    headers = _auth(client)

    response = client.put(
        "/api/restaurante/perfil",
        json={"nombre": "   "},
        headers=headers,
    )

    assert response.status_code == 400
    assert "nombre" in response.json()["detail"][0]["loc"]


def test_us6_s4_unresolved_address_is_rejected_without_saving(
    client: TestClient, monkeypatch: Any
) -> None:
    headers = _auth(client)
    monkeypatch.setattr(
        "app.api.restaurant.geocode_address",
        lambda address: (_ for _ in ()).throw(
            __import__("app.services.geocoding", fromlist=["GeocodingError"]).GeocodingError(
                "No encontramos esa dirección."
            )
        ),
    )

    response = client.post(
        "/api/restaurante/perfil/geocodificar",
        json={"address": "Dirección inexistente"},
        headers=headers,
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "No encontramos esa dirección."
    assert client.get("/api/restaurante/perfil", headers=headers).json()["direccion"] is None


def test_us6_s5_restaurant_photo_can_be_uploaded_from_device(client: TestClient) -> None:
    headers = _auth(client)
    response = client.post(
        "/api/restaurante/perfil/foto",
        files={"foto": ("local.png", b"\x89PNG\r\n\x1a\n", "image/png")},
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["foto_url"].startswith("/media/restaurants/")


def test_us6_edge_description_is_at_most_2000_characters(client: TestClient) -> None:
    headers = _auth(client)
    profile = {"nombre": "Local de prueba", "descripcion": "a" * 2001}

    response = client.put("/api/restaurante/perfil", json=profile, headers=headers)

    assert response.status_code == 400

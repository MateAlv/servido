from base64 import b64decode
from datetime import timedelta

import pytest

from app.config import settings
from tests.reservations import add_bookable_restaurant
from tests.test_reviews import (
    YESTERDAY,
    finished,
    public_detail,
    restaurant_headers,
    review_url,
    verified_diner,
)

PNG = b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP438AAAAQBAYDFKhhdAAAAAElFTkSuQmCC"
)


@pytest.fixture
def visit(client, session, monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "review_photo_dir", tmp_path)
    restaurant = add_bookable_restaurant(session)
    headers, diner = verified_diner(client, session, "photos@example.com")
    reservation = finished(session, restaurant, diner)
    session.commit()
    return restaurant, headers, diner, reservation


def publish(client, reservation, headers, contents=(PNG,)):
    return client.post(
        review_url(reservation.id),
        headers=headers,
        data={"review": '{"rating":5}'},
        files=[("photos", ("dish.png", content, "image/png")) for content in contents],
    )


def test_us57_s3_persists_ordered_photos_for_the_published_review(client, visit):
    _, headers, _, reservation = visit
    response = publish(client, reservation, headers, (PNG, PNG))
    assert response.status_code == 201
    photos = response.json()["photos"]
    assert len({photo["id"] for photo in photos}) == 2
    assert [client.get(photo["url"]).content for photo in photos] == [PNG, PNG]


def test_us57_s4_returns_photos_in_public_and_restaurant_review_responses(client, visit):
    restaurant, headers, _, reservation = visit
    photos = publish(client, reservation, headers).json()["photos"]
    assert public_detail(client, restaurant)["opinions"][0]["photos"] == photos
    response = client.get("/api/restaurant/reviews", headers=restaurant_headers(client, restaurant))
    assert response.json()["reviews"][0]["photos"] == photos


@pytest.mark.parametrize(
    ("contents", "index", "code"),
    [
        ((b"invalid",), 0, "unsupported_format"),
        ((PNG + bytes(5_000_000),), 0, "too_large"),
        ((PNG,) * 5, 4, "too_many_photos"),
    ],
)
def test_us57_s5_rejects_unsupported_oversized_and_excess_photos(
    client, visit, contents, index, code
):
    _, headers, _, reservation = visit
    response = publish(client, reservation, headers, contents)
    assert response.status_code == 400
    assert [
        (item["index"], item["code"]) for item in response.json()["detail"]["photo_errors"]
    ] == [(index, code)]


def test_us57_s6_lists_latest_photo_only_review_and_hides_older_review(client, session, visit):
    restaurant, headers, diner, reservation = visit
    previous = finished(session, restaurant, diner, day=YESTERDAY - timedelta(days=1))
    assert (
        client.post(
            review_url(previous.id), json={"rating": 4, "comment": "Antes"}, headers=headers
        ).status_code
        == 201
    )
    published = publish(client, reservation, headers)
    assert published.status_code == 201
    opinions = public_detail(client, restaurant)["opinions"]
    assert len(opinions) == 1
    assert opinions[0]["comment"] is None
    assert len(opinions[0]["photos"]) == 1
    owner = restaurant_headers(client, restaurant)
    rows = client.get("/api/restaurant/reviews", headers=owner).json()["reviews"]
    latest = next(row for row in rows if row["id"] == published.json()["id"])
    assert latest["can_reply"] is True
    response = client.post(
        f"/api/restaurant/reviews/{latest['id']}/reply", json={"text": "Gracias"}, headers=owner
    )
    assert response.status_code == 201
    assert public_detail(client, restaurant)["opinions"][0]["reply"]["text"] == "Gracias"


def test_us57_s7_rejects_the_entire_publication_and_allows_retry(client, visit, tmp_path):
    restaurant, headers, _, reservation = visit
    assert publish(client, reservation, headers, (PNG, b"bad")).status_code == 400
    assert public_detail(client, restaurant)["opinions"] == []
    assert not list(tmp_path.iterdir())
    assert publish(client, reservation, headers).status_code == 201
    assert publish(client, reservation, headers).status_code == 409


def test_us57_s8_allows_only_the_owning_restaurant_to_fetch_hidden_photos(client, session, visit):
    restaurant, headers, diner, reservation = visit
    previous = finished(session, restaurant, diner, day=YESTERDAY - timedelta(days=1))
    photo = publish(client, previous, headers).json()["photos"][0]
    assert client.get(photo["url"]).status_code == 200
    assert (
        client.post(review_url(reservation.id), headers=headers, json={"rating": 5}).status_code
        == 201
    )
    assert client.get(photo["url"]).status_code == 404
    assert client.get(photo["url"], headers=restaurant_headers(client, restaurant)).content == PNG
    assert client.get(photo["url"], headers=headers).status_code == 404
    other = add_bookable_restaurant(session, cuit="30712345672")
    assert client.get(photo["url"], headers=restaurant_headers(client, other)).status_code == 404


def test_us57_edge_post_contract_and_no_photo_json(client, visit):
    _, headers, _, reservation = visit
    operation = client.get("/api/openapi.json").json()["paths"][
        "/api/reservations/{reservation_id}/review"
    ]["post"]
    assert set(operation["requestBody"]["content"]) == {"application/json", "multipart/form-data"}
    assert "PhotoErrorResponse" in str(operation["responses"]["400"])
    assert (
        client.post(review_url(reservation.id), headers=headers, json={"rating": 4}).json()[
            "photos"
        ]
        == []
    )


@pytest.mark.parametrize("content_type", ["text/plain", "application/problem+json", None])
def test_us57_edge_does_not_publish_json_with_unsupported_content_type(client, visit, content_type):
    restaurant, headers, _, reservation = visit
    if content_type is not None:
        headers = {**headers, "Content-Type": content_type}
    response = client.post(review_url(reservation.id), headers=headers, content=b'{"rating":4}')

    assert response.status_code == 400
    assert public_detail(client, restaurant)["opinions"] == []


def test_us57_edge_multipart_preserves_session_role_ownership_and_conflicts(client, session, visit):
    restaurant, headers, diner, reservation = visit
    stranger, _ = verified_diner(client, session, "stranger-photos@example.com")
    future = finished(session, restaurant, diner, day=YESTERDAY + timedelta(days=2))
    assert publish(client, reservation, {}).status_code == 401
    assert publish(client, reservation, restaurant_headers(client, restaurant)).status_code == 403
    assert publish(client, reservation, stranger).status_code == 404
    assert publish(client, future, headers).status_code == 409


def test_us57_edge_cleans_files_on_write_failure(client, visit, tmp_path, monkeypatch):
    from app.services import review_photos

    original = review_photos.store

    def failed_store(session, review_id, files, paths):
        original(session, review_id, files[:1], paths)
        raise OSError("simulated write failure")

    restaurant, headers, _, reservation = visit
    with monkeypatch.context() as patch:
        patch.setattr(review_photos, "store", failed_store)
        with pytest.raises(OSError, match="simulated write failure"):
            publish(client, reservation, headers)
    assert not list(tmp_path.iterdir())
    assert public_detail(client, restaurant)["opinions"] == []
    assert publish(client, reservation, headers).status_code == 201


def test_us57_edge_files_without_committed_metadata_are_not_served(client, tmp_path, monkeypatch):
    from uuid import uuid4

    monkeypatch.setattr(settings, "review_photo_dir", tmp_path)
    photo_id = uuid4()
    (tmp_path / f"{photo_id}.png").write_bytes(PNG)
    assert client.get(f"/api/review-photos/{photo_id}").status_code == 404
    assert client.get(f"/media/{photo_id}.png").status_code == 404


def test_us57_edge_accepts_four_photos_at_the_size_limit(client, visit):
    from struct import pack
    from zlib import crc32

    # Add a valid PNG text chunk to reach the exact limit without a large fixture on disk.
    payload = b"Note\x00" + b"x" * (5_000_000 - len(PNG) - 17)
    chunk = b"tEXt" + payload
    image = PNG[:-12] + pack(">I", len(payload)) + chunk + pack(">I", crc32(chunk)) + PNG[-12:]
    assert len(image) == 5_000_000
    _, headers, _, reservation = visit
    response = publish(client, reservation, headers, (image,) * 4)
    assert response.status_code == 201
    assert len(response.json()["photos"]) == 4


def test_us57_edge_rejects_corrupt_png_with_valid_outer_markers(client, visit):
    _, headers, _, reservation = visit
    image = PNG[:41] + b"\0" * (len(PNG) - 53) + PNG[-12:]
    response = publish(client, reservation, headers, (image,))
    assert response.status_code == 400
    assert response.json()["detail"]["photo_errors"][0]["code"] == "unsupported_format"


@pytest.mark.parametrize("committed", [False, True])
def test_us57_edge_reconciles_files_after_commit_failure(
    client, session, visit, tmp_path, monkeypatch, committed
):
    _, headers, _, reservation = visit
    commit = session.commit

    def fail_commit():
        if committed:
            commit()
        raise OSError("commit connection lost")

    monkeypatch.setattr(session, "commit", fail_commit)
    with pytest.raises(OSError, match="commit connection lost"):
        publish(client, reservation, headers)
    assert len(list(tmp_path.iterdir())) == int(committed)


def test_us57_edge_rejects_small_file_with_excessive_pixel_count(client, visit):
    from io import BytesIO

    from PIL import Image

    image = BytesIO()
    with Image.new("L", (5000, 4000)) as source:
        source.save(image, format="PNG")
    assert image.tell() < 5_000_000
    _, headers, _, reservation = visit
    response = publish(client, reservation, headers, (image.getvalue(),))
    assert response.status_code == 400
    assert response.json()["detail"]["photo_errors"][0]["code"] == "too_many_pixels"


def test_us57_edge_keeps_files_when_commit_cannot_be_confirmed(
    client, session, visit, tmp_path, monkeypatch
):
    _, headers, _, reservation = visit

    def fail_commit():
        raise OSError("commit connection lost")

    def fail_rollback():
        raise OSError("rollback connection lost")

    with monkeypatch.context() as patch:
        patch.setattr(session, "commit", fail_commit)
        patch.setattr(session, "rollback", fail_rollback)
        with pytest.raises(OSError, match="commit connection lost"):
            publish(client, reservation, headers)
    assert len(list(tmp_path.iterdir())) == 1


def test_us57_edge_checks_webp_canvas_before_opening_decoder(monkeypatch):
    from io import BytesIO

    from PIL import Image

    from app.services import review_photos

    data = BytesIO()
    with Image.new("RGB", (5000, 4000)) as image:
        image.save(data, format="WEBP", lossless=True)
    assert data.tell() < 5_000_000

    def fail_if_opened(*args, **kwargs):
        pytest.fail("The WebP decoder must not allocate an oversized canvas")

    monkeypatch.setattr(Image, "open", fail_if_opened)
    with pytest.raises(review_photos.PhotoTooLargeToDecode):
        review_photos.image_type(data.getvalue())

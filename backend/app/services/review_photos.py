import logging
from io import BytesIO
from pathlib import Path
from uuid import UUID, uuid4

from PIL import Image
from sqlalchemy import select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from starlette.datastructures import UploadFile

from app.config import settings
from app.models.reservation import Reservation
from app.models.review_photo import ReviewPhoto
from app.schemas.review import PhotoError, PhotoReference

logger = logging.getLogger(__name__)

MAX_DECODED_PIXELS = 16_000_000
IMAGE_TYPES = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}
MAX_PHOTOS = 4
MAX_PHOTO_BYTES = 5_000_000
MAX_BODY_BYTES = 24 * 1024 * 1024
EXTENSIONS = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}


class PhotoTooLargeToDecode(ValueError):
    pass


def image_type(data: bytes) -> str | None:
    if data.startswith(b"RIFF") and data[8:12] == b"WEBP":
        size = webp_canvas_size(data)
        if size is None:
            return None
        if size[0] * size[1] > MAX_DECODED_PIXELS:
            raise PhotoTooLargeToDecode
    with BytesIO(data) as source:
        try:
            with Image.open(source, formats=tuple(IMAGE_TYPES)) as image:
                check_pixel_budget(image)
                media_type = IMAGE_TYPES[image.format]
                image.verify()
            source.seek(0)
            with Image.open(source, formats=tuple(IMAGE_TYPES)) as image:
                frames = check_pixel_budget(image)
                for frame in range(frames):
                    image.seek(frame)
                    image.load()
        except Image.DecompressionBombError as error:
            raise PhotoTooLargeToDecode from error
        except PhotoTooLargeToDecode:
            raise
        except (OSError, ValueError, SyntaxError, EOFError):
            return None
    return media_type


def webp_canvas_size(data: bytes) -> tuple[int, int] | None:
    # WebP allocates its canvas while opening. Read the dimensions from the first chunk.
    chunk = data[12:16]
    if chunk == b"VP8X" and len(data) >= 30:
        return int.from_bytes(data[24:27], "little") + 1, int.from_bytes(data[27:30], "little") + 1
    if chunk == b"VP8L" and len(data) >= 25 and data[20] == 0x2F:
        bits = int.from_bytes(data[21:25], "little")
        return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
    if chunk == b"VP8 " and len(data) >= 30 and data[23:26] == b"\x9d\x01\x2a":
        return (
            int.from_bytes(data[26:28], "little") & 0x3FFF,
            int.from_bytes(data[28:30], "little") & 0x3FFF,
        )
    return None


def check_pixel_budget(image: Image.Image) -> int:
    pixels = image.width * image.height
    if pixels > MAX_DECODED_PIXELS:
        raise PhotoTooLargeToDecode
    frames = getattr(image, "n_frames", 1)
    if pixels * frames > MAX_DECODED_PIXELS:
        raise PhotoTooLargeToDecode
    return frames


def validate(files: list[UploadFile]) -> tuple[list[tuple[str, bytes]], list[PhotoError]]:
    valid = []
    errors = []
    for index, file in enumerate(files):
        if index >= MAX_PHOTOS:
            errors.append(
                PhotoError(
                    index=index, code="too_many_photos", message="Podés adjuntar hasta 4 fotos."
                )
            )
            continue
        data = file.file.read(MAX_PHOTO_BYTES + 1)
        if not data:
            errors.append(
                PhotoError(index=index, code="empty_file", message="El archivo está vacío.")
            )
        elif len(data) > MAX_PHOTO_BYTES:
            errors.append(
                PhotoError(index=index, code="too_large", message="La foto supera los 5 MB.")
            )
        else:
            try:
                kind = image_type(data)
            except PhotoTooLargeToDecode:
                errors.append(
                    PhotoError(
                        index=index,
                        code="too_many_pixels",
                        message="La foto supera el límite de resolución.",
                    )
                )
                continue
            if kind is None:
                errors.append(
                    PhotoError(
                        index=index,
                        code="unsupported_format",
                        message="Elegí una foto JPG, PNG o WebP que se pueda abrir.",
                    )
                )
            else:
                valid.append((kind, data))
    return valid, errors


def photo_path(photo: ReviewPhoto) -> Path:
    return settings.review_photo_dir / f"{photo.id}{EXTENSIONS[photo.media_type]}"


def store(
    session: Session, review_id: UUID, files: list[tuple[str, bytes]], paths: list[Path]
) -> list[ReviewPhoto]:
    if files:
        settings.review_photo_dir.mkdir(parents=True, exist_ok=True)
    photos = []
    for position, (kind, data) in enumerate(files, 1):
        photo = ReviewPhoto(id=uuid4(), review_id=review_id, position=position, media_type=kind)
        path = photo_path(photo)
        with path.open("xb") as stream:
            paths.append(path)
            stream.write(data)
        session.add(photo)
        photos.append(photo)
    session.flush()
    return photos


def reconcile_failed_commit(session: Session, reservation_id: UUID, paths: list[Path]) -> None:
    if not paths:
        return
    try:
        session.rollback()
        ids = {UUID(path.stem): path for path in paths}
        with Session(bind=session.get_bind()) as verification:
            # Publication holds this row lock through commit. Wait for that transaction
            # to finish before treating absent photo metadata as a rollback.
            verification.execute(text("SET LOCAL lock_timeout = '2s'"))
            verification.execute(
                select(Reservation.id).where(Reservation.id == reservation_id).with_for_update()
            )
            committed = set(
                verification.scalars(select(ReviewPhoto.id).where(ReviewPhoto.id.in_(ids)))
            )
        for photo_id in ids.keys() - committed:
            ids[photo_id].unlink(missing_ok=True)
    except (SQLAlchemyError, OSError):
        logger.exception("Could not reconcile review photos after a failed commit")


def reference(photo: ReviewPhoto) -> PhotoReference:
    return PhotoReference(id=photo.id, url=f"/api/review-photos/{photo.id}")


def by_review(session: Session, ids: set[UUID]) -> dict[UUID, list[PhotoReference]]:
    if not ids:
        return {}
    photos = session.scalars(
        select(ReviewPhoto).where(ReviewPhoto.review_id.in_(ids)).order_by(ReviewPhoto.position)
    )
    result: dict[UUID, list[PhotoReference]] = {}
    for photo in photos:
        result.setdefault(photo.review_id, []).append(reference(photo))
    return result

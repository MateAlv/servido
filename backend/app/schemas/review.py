from datetime import date, datetime
from typing import ClassVar, Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.models.review import MAX_COMMENT_LENGTH, MAX_SPEND_PER_PERSON
from app.models.review_reply import MAX_REPLY_LENGTH


class PhotoReference(BaseModel):
    id: UUID
    url: str


class PhotoError(BaseModel):
    index: int
    code: Literal[
        "empty_file", "unsupported_format", "too_large", "too_many_photos", "too_many_pixels"
    ]
    message: str


class PhotoErrorDetail(BaseModel):
    message: str
    photo_errors: list[PhotoError]


class PhotoErrorResponse(BaseModel):
    detail: PhotoErrorDetail


class ReviewRequest(BaseModel):
    rating: int = Field(strict=True, ge=1, le=5)
    comment: str | None = None
    spend_per_person: int | None = Field(default=None, strict=True, ge=1, le=MAX_SPEND_PER_PERSON)

    @field_validator("comment")
    @classmethod
    def clean_comment(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if "\x00" in value:
            raise ValueError("El comentario tiene caracteres que no se pueden guardar.")
        value = value.strip()
        if len(value) > MAX_COMMENT_LENGTH:
            raise ValueError(f"El comentario puede tener hasta {MAX_COMMENT_LENGTH} caracteres.")
        return value or None


class PublishedReviewResponse(BaseModel):
    photos: list[PhotoReference]
    id: UUID
    rating: int
    comment: str | None
    spend_per_person: int | None
    published_at: datetime


class PendingReview(BaseModel):
    reservation_id: UUID
    restaurant_id: UUID
    restaurant_name: str
    date: date
    start_time: str
    party_size: int
    # A later visit to this restaurant was reviewed: this review would stay private (R13, R14).
    hidden_by_later_visit: bool
    # This review would take the public place of the diner's earlier one (R14).
    replaces_earlier_review: bool


class PendingReviewsResponse(BaseModel):
    # How the diner's reviews are signed, for «Así se va a ver».
    author: str
    reservations: list[PendingReview]


class ReplyRequest(BaseModel):
    EMPTY_MESSAGE: ClassVar[str] = "Escribí tu respuesta."

    text: str

    @field_validator("text")
    @classmethod
    def clean_text(cls, value: str) -> str:
        if "\x00" in value:
            raise ValueError("La respuesta tiene caracteres que no se pueden guardar.")
        value = value.strip()
        if not value:
            raise ValueError(cls.EMPTY_MESSAGE)
        if len(value) > MAX_REPLY_LENGTH:
            raise ValueError(f"La respuesta puede tener hasta {MAX_REPLY_LENGTH} caracteres.")
        return value


class ReplyEditRequest(ReplyRequest):
    # A reply can be edited but not deleted (spec 025, C4).
    EMPTY_MESSAGE: ClassVar[str] = (
        "La respuesta no puede quedar vacía. Podés editarla, pero no borrarla."
    )


class ReviewReplyResponse(BaseModel):
    text: str
    created_at: datetime
    # Set when the text changed after publishing: shown as «Editada» (C3).
    edited_at: datetime | None


class RestaurantReview(BaseModel):
    photos: list[PhotoReference]
    id: UUID
    author: str
    visit_date: date
    visit_time: str
    rating: int
    comment: str | None
    spend_per_person: int | None
    published_at: datetime
    # False for an older visit of the same person: not in the average, not public (R13, R14).
    counts_in_average: bool
    reply: ReviewReplyResponse | None
    # Shown in Opiniones and still without a reply (spec 025, C1).
    can_reply: bool


class RestaurantReviewsResponse(BaseModel):
    # The average and the count the diners see: the latest review of each person.
    rating: float | None
    review_count: int
    # Every review received, older visits of the same person included.
    total_reviews: int
    # The tier diners see, and the spend behind it when it is calculated (R6).
    price_tier: str | None
    average_spend_per_person: int | None
    spend_people: int
    reviews: list[RestaurantReview]
    next_offset: int | None

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.models.review import MAX_COMMENT_LENGTH, MAX_SPEND_PER_PERSON


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


class RestaurantReview(BaseModel):
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

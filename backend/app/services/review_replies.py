"""The restaurant's replies to its reviews (spec 025, US-42)."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.reservation import Reservation
from app.models.review import Review
from app.models.review_reply import ReviewReply
from app.services.reviews import latest_reviews


class ReviewNotFoundError(Exception):
    """The review doesn't exist or belongs to another restaurant."""


class AlreadyRepliedError(Exception):
    pass


class NotRepliableError(Exception):
    """The review isn't shown in Opiniones (C1)."""


class ReplyNotFoundError(Exception):
    pass


def shown_review_ids(session: Session, restaurant_id: UUID) -> set[UUID]:
    """The reviews in the public Opiniones: each person's latest one, if it has a comment (R14)."""
    return {review.id for review, _, _ in latest_reviews(session, restaurant_id) if review.comment}


def replies_by_review(session: Session, review_ids: set[UUID]) -> dict[UUID, ReviewReply]:
    replies = session.scalars(select(ReviewReply).where(ReviewReply.review_id.in_(review_ids)))
    return {reply.review_id: reply for reply in replies}


def _own_review(session: Session, restaurant_id: UUID, review_id: UUID) -> Review:
    # The lock makes a repeated reply wait and then find the first one (FR-003).
    review = session.scalar(
        select(Review)
        .join(Reservation, Review.reservation_id == Reservation.id)
        .where(Review.id == review_id, Reservation.restaurant_id == restaurant_id)
        .with_for_update(of=Review)
    )
    if review is None:
        raise ReviewNotFoundError
    return review


def reply(
    session: Session, restaurant_id: UUID, review_id: UUID, text: str, now: datetime
) -> ReviewReply:
    _own_review(session, restaurant_id, review_id)
    if session.scalar(select(ReviewReply.id).where(ReviewReply.review_id == review_id)):
        raise AlreadyRepliedError
    if review_id not in shown_review_ids(session, restaurant_id):
        raise NotRepliableError
    review_reply = ReviewReply(review_id=review_id, text=text, created_at=now)
    session.add(review_reply)
    session.flush()
    return review_reply


def edit_reply(
    session: Session, restaurant_id: UUID, review_id: UUID, text: str, now: datetime
) -> ReviewReply:
    """Replaces the text, also of a reply whose review left Opiniones (spec 025, edge cases)."""
    _own_review(session, restaurant_id, review_id)
    review_reply = session.scalar(select(ReviewReply).where(ReviewReply.review_id == review_id))
    if review_reply is None:
        raise ReplyNotFoundError
    if review_reply.text != text:
        review_reply.text = text
        review_reply.edited_at = now
        session.flush()
    return review_reply

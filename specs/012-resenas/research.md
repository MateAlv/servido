# Research: Reseñas de Reservas

Product decisions R1–R19 are in `spec.md` and `specs/README.md`. These are the technical ones.

## The review only references the reservation

**Decision**: `reviews` has `reservation_id` and no `diner_id` or `restaurant_id`.
**Why**: The reservation already names both, so they can't disagree.
**Rejected**: Copying both ids for simpler queries. Every query joins at most two tables, and the app has one user at a time.

## Derive on read, store nothing

**Decision**: Average, count, opinions and calculated price tier are computed for each request.
**Why**: Reviews never change, but a stored value would have to be kept in step with R13, R14 and R15. The map already queries once per restaurant for its menu, and the app never has concurrent users (constitution, principle I).
**Rejected**: Columns on `restaurantes` or a materialized view.

## «Latest» is one `DISTINCT ON`

**Decision**: `DISTINCT ON (reservations.diner_id) ORDER BY diner_id, starts_at DESC, published_at DESC`, used for both the rating (all reviews) and the spend (only reviews with an amount, which gives R15).
**Why**: It states the rule directly in one query, with the tie-break of the spec.

## A repeated publication

**Decision**: Publishing locks the reservation row, then checks for a review; the unique constraint on `reservation_id` backs it up.
**Why**: The second request waits and gets a clean 409, as `confirm_order` does in spec 009. No request id is needed, because a review can't be created twice.

## Status codes

Unverified is 403, as in the order (P13). Already reviewed, cancelled, not ended and past 30 days are 409. Someone else's reservation and an unknown one both answer 404 with the same message.

## Spend type

**Decision**: `Numeric(10, 0)`, exposed as a whole number.
**Why**: The convention is decimals for money, never floats. A scale of 0 keeps that while the spec asks for whole pesos.

## Pagination

**Decision**: `offset` with a page of 20, and `next_offset` in the response.
**Why**: Reviews are only added, so at worst a new one repeats an item while scrolling. The page keys its list by id and a reload fixes it.

## Name of the endpoint

**Decision**: `/api/restaurant/reviews`.
**Why**: `AGENTS.md` keeps Spanish names only for the access API and asks not to copy that style into new code, so this doesn't follow `/api/restaurante/…`. The page route, which users see, is `/restaurante/resenas`.

## Demo data

**Decision**: `backend/scripts/review_demo.py`, used by `seed.py` and by hand in production.
**Details**: Refuses a restaurant without «demo» in its name. Identifies its reservations by a deterministic `request_id` and its reviewers by email, so it can repeat and remove. Uses table numbers from 9000, above any real table, so they can't collide with the no-overlap constraint. Reads the password from `REVIEW_DEMO_PASSWORD`, so none is committed. It never deletes a reviewer who has other reservations.
**Known limit**: Reviewer accounts can sign in on production, as decided in R18, and they are as safe as that password.

# Implementation Plan: Reseñas de Reservas

**Feature**: `specs/012-resenas` | **Date**: 2026-11-05 | **Spec**: [spec.md](spec.md) | **US**: US-27, US-50, US-24, pending criterion of US-7 | **Sprint**: 4

**Input**: Feature specification from `/specs/012-resenas/spec.md`

## Summary

A diner reviews a finished reservation from a block on their home: required stars, optional comment and spend, a preview, then a final publication. One new table, `reviews`, hangs off the reservation, which already names the diner and the restaurant. Everything public (average, count, opinions, calculated price tier) is derived on read from the latest review of each person. The restaurant gets a read-only page. A script loads demo data, because a reservation can't be created in the past.

## Technical Context

**Language/Version**: Python 3.12 (backend) · TypeScript (frontend)

**Primary Dependencies**: FastAPI, SQLAlchemy 2, Alembic, Pydantic · React, Vite, React Router, TanStack Query, openapi-fetch, the design system in `frontend/src/components/`

**Storage**: PostgreSQL 17 in Docker (locally, in CI and on the production instance)

**Testing**: pytest against a real Postgres in `backend/tests/` · Vitest + Testing Library in `frontend/src/**/*.test.tsx`

**Target Platform**: Mobile-first web app: static SPA plus JSON API under `/api`

**Project Type**: Web application (backend + frontend)

**Performance Goals**: Only what the spec's success criteria state; the app never has more than one concurrent user

**Constraints**: Single AWS free-tier account; no new services, paid APIs or dependencies

**Scale/Scope**: 1 table, 3 endpoints, 3 new fields on the public restaurant list and 1 on its detail, 1 page, 1 home block with its dialog, 2 shared components, 1 script

**New dependencies**: None

**Open clarifications**: None marked. R1–R19 are recorded in the spec as team decisions pending PO validation.

## Constitution Check

| Principle | Gate | Pass |
| --- | --- | --- |
| I. Backlog-bound scope | Builds only the spec's US; no caching, queues, workers, flags or speculative abstractions | ✅ |
| II. Spec before code | Spec validated by the PO; every open clarification answered or recorded as an explicit assumption | ⚠️ Spec reviewed and merged by the team (PR #35). PO validation of R1–R19 is still pending: the team member chose to build before it, and a PO change would mean adjusting this work |
| III. Every scenario tested | Every acceptance scenario appears in the test map below; critical invariants enforced by database constraints | ✅ |
| IV. Humans own AI output | Design is small enough for a teammate to review and explain | ✅ |
| V. Simple, cheap, conventional | Uses only the standard stack | ✅ |

## Acceptance Scenario → Test Map

Backend tests are in `backend/tests/test_reviews.py`. Frontend tests: `PendingReviews` = `frontend/src/pages/home/PendingReviews.test.tsx`, `ReviewsPage` = `frontend/src/pages/RestaurantReviewsPage.test.tsx`, `Detail` = `frontend/src/pages/RestaurantDetailPage.test.tsx`, `api` = `frontend/src/api/restaurants.test.ts`.

| Scenario | Backend | Frontend |
| --- | --- | --- |
| US-27 S1 — pending block | `test_us27_s1_finished_reservation_is_pending` | `PendingReviews` |
| US-27 S2 — publish | `test_us27_s2_publishes_a_rating_for_that_reservation` | `PendingReviews` |
| US-27 S3 — stars required | `test_us27_s3_rating_is_required_and_whole` | `PendingReviews` |
| US-27 S4 — not ended | `test_us27_s4_reservation_that_has_not_ended_is_refused`, `test_us27_s4_can_be_reviewed_exactly_when_it_ends` | |
| US-27 S5 — cancelled | `test_us27_s5_cancelled_reservation_is_refused` | |
| US-27 S6 — 30 days | `test_us27_s6_after_30_days_it_is_refused` | `PendingReviews` |
| US-27 S7 — someone else's | `test_us27_s7_other_diner_or_unknown_reservation_is_not_found` | |
| US-27 S8 — second review | `test_us27_s8_second_review_of_a_reservation_is_refused` | `PendingReviews` |
| US-27 S9 — final | `test_us27_s9_diner_cannot_change_a_review` | `PendingReviews` |
| US-27 S10 — unverified | `test_us27_s10_unverified_diner_cannot_publish` | `PendingReviews` |
| US-27 S11 — average and count | `test_us27_s11_rating_and_count_are_public` | `Detail`, `api` |
| US-27 S12 — latest visit | `test_us27_s12_only_the_most_recent_visit_counts` | |
| US-27 S13 — no reviews | `test_us27_s13_restaurant_without_reviews_shows_no_rating` | `Detail` |
| US-50 S1 — comment and spend | `test_us50_s1_comment_and_spend_stay_with_the_review` | |
| US-50 S2 — asks the spend | | `PendingReviews` |
| US-50 S3 — preview | | `PendingReviews` |
| US-50 S4 — go back | | `PendingReviews` |
| US-50 S5 — once | `test_us50_s5_repeated_publication_stores_one_review` | `PendingReviews` |
| US-50 S6 — blanks | `test_us50_s6_empty_comment_and_spend_are_left_out` | `PendingReviews` |
| US-50 S7 — limits | `test_us50_s7_invalid_comment_or_spend_is_refused`, `test_us50_s7_limits_are_accepted` | `PendingReviews` |
| US-50 S8 — public opinion | `test_us50_s8_opinion_is_public_with_only_its_fields` | `Detail`, `api` |
| US-50 S9 — newer hides older | `test_us50_s9_newer_review_hides_the_previous_opinion` | |
| US-50 S10 — late review | `test_us50_s10_late_review_of_an_old_visit_keeps_the_recent_opinion` | |
| US-50 S11 — no comment | `test_us50_s11_review_without_comment_counts_but_is_not_listed` | `Detail` |
| US-24 S1 — list | `test_us24_s1_lists_the_reviews_newest_published_first` | `ReviewsPage` |
| US-24 S2, S3 — all, and both counts | `test_us24_s2_s3_sees_every_review_and_both_counts` | `ReviewsPage` (S3) |
| US-24 S4 — read only | `test_us24_s4_restaurant_cannot_change_a_review` | `ReviewsPage` |
| US-24 S5 — only its own | `test_us24_s5_only_the_restaurant_sees_its_reviews` | `ReviewsPage` |
| US-24 S6 — no contact data | `test_us24_s6_no_contact_data_or_reservation_link` | |
| US-24 S7 — empty | `test_us24_s7_without_reviews_the_list_is_empty` | `ReviewsPage` |
| US-24 S8 — 20 at a time | `test_us24_s8_returns_20_at_a_time` | `ReviewsPage` |
| US-7 S4 — up to 4 people | `test_us7_s4_up_to_4_people_keep_the_declared_tier` | |
| US-7 S5 — from 5 people | `test_us7_s5_from_5_people_the_mean_sets_the_tier`, `test_us7_s5_uses_the_limits_of_spec_002` | `Detail`, `api` |
| US-7 S6 — one amount per person | `test_us7_s6_a_person_counts_once_with_the_latest_amount` | |
| US-7 S7 — declared ignored | `test_us7_s7_declared_tier_no_longer_matters_once_calculated` | |

The demo data (R18) is covered by `backend/tests/test_review_demo.py`.

## Project Structure

### Documentation (this feature)

```text
specs/012-resenas/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/reviews-api.md
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── app/api/review.py                    # + the 3 endpoints; ~ app/api/__init__.py
├── app/api/public_restaurant.py         # ~ rating, count, calculated tier, opinions
├── app/models/review.py                 # + Review; ~ app/models/__init__.py
├── app/schemas/review.py                # + requests and responses
├── app/schemas/public_restaurant.py     # ~ new public fields
├── app/services/reviews.py              # + every rule of the spec
├── migrations/versions/…_add_reviews.py # +
├── scripts/review_demo.py               # + demo data (R18); ~ scripts/seed.py
└── tests/test_reviews.py, test_review_demo.py
frontend/src/
├── api/reviews.ts                       # +; ~ api/restaurants.ts, openapi.json, schema.d.ts
├── components/review/OpinionCard.tsx    # + shared by the preview, the detail and US-24
├── components/ui/TextAreaField.tsx      # + TextField for longer text; ~ StarRating (keyboard focus)
├── components/access/UnverifiedNotice.tsx # ~ `purpose`
├── components/restaurant/…              # ~ count in the map and the list
├── data/restaurants.fixture.ts          # ~ real rating and count
├── pages/home/PendingReviews.tsx, ReviewDialog.tsx # +; ~ DinerHome, RestaurantHome
├── pages/RestaurantReviewsPage.tsx      # +; ~ router.tsx
└── pages/RestaurantDetailPage.tsx, DesignSystemPage.tsx # ~
```

**Structure Decision**: The standard layout. The demo script joins `backend/scripts/` next to `seed.py`, which reuses it.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Coding before PO validation (principle II) | The defense is on 11/11, and the team member decided to start after the team merged the spec | Waiting risks not having the story for the defense |

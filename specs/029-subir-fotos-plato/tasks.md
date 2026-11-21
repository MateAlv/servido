---
description: "Implementation tasks for US-57 review photos"
---

# Tasks — Review photos

**Input**: [Spec](spec.md), [plan](plan.md), [research](research.md), [data model](data-model.md), [API contract](contracts/review-photos-api.md) and [quickstart](quickstart.md).

**Tests**: Required for every acceptance scenario. Write the scenario tests before the corresponding behavior.

**Format**: `[ID] [P?] [Story?] Description`. `[P]` identifies independent tasks within the same wave. `[US57]` maps to backlog US-57.

## Phase 1 — Setup

- [X] T001 Confirm a usable PostgreSQL test database and eligible review fixtures using `Makefile`, `backend/tests/conftest.py` and `backend/tests/test_reviews.py`. Run the existing review and reply backend suites and the pending review frontend suite as a baseline.

## Phase 2 — Foundation

- [X] T002 [P] Add `ReviewPhoto` in `backend/app/models/review_photo.py` and register it in `backend/app/models/__init__.py`. Use a server-generated UUID primary key, a non-null foreign key to `reviews.id`, a required position from 1 through 4 unique with `review_id`, a required server-validated JPEG, PNG or WebP media type, and a required timezone-aware timestamp stored in UTC.
- [X] T003 [P] Configure a dedicated review photo directory outside the public `/media` tree in `backend/app/config.py`, `docker-compose.yml` and `infra/ec2/compose.yml`. Use existing local persistence and the existing backed-up production data volume.
- [X] T004 [P] Scope the 24 MiB transport ceiling to the review publication URL in `frontend/nginx.conf`, retaining the existing API proxy behavior.
- [X] T005 Generate and review the Alembic migration in `backend/migrations/versions/` using `make migration m="add review photos"`. Verify that existing reviews survive the migration without a backfill.

**Checkpoint**: Storage, proxy and schema prerequisites are ready.

## Phase 3 — US-57 Review photos

**Goal**: A verified diner can preview and publish up to four optional photos when reviewing an eligible visit. Other users can see the photos on the latest visible opinion, and the restaurant can see photos throughout its private review history.

**Independent test**: Publish a photo-only review on an eligible latest visit and see it signed out in Opiniones. Exercise a rejected upload, verify that no review was published, then confirm the corrected draft. Check the older photo in the restaurant panel after displacement and verify that a latest-visit review without a comment offers a first reply.

### Tests

- [X] T006 [P] [US57] Add publication and contract tests in `backend/tests/test_review_photos.py` for ordered association (S3), invalid formats and exact size and count boundaries (S5), and atomic rejection and retry (S7). Cover file cleanup on known rollback, hidden crash orphans, the existing JSON no-photo path, both OpenAPI request media types, the structured 400 and multipart parity for 401/403/404/409.
- [X] T007 [P] [US57] Add UI tests in `frontend/src/pages/home/PendingReviews.test.tsx` for selecting on an eligible review (S1), previewing and removing before confirmation (S2), keeping valid selections on local rejection (S5), and displaying per-file errors and requiring a fresh confirmation after server rejection (S7).
- [X] T008 [P] [US57] Add public display tests in `frontend/src/pages/RestaurantDetailPage.test.tsx` for ordered photos (S4) and a photo-only opinion (S6).
- [X] T009 [P] [US57] Add panel tests in `frontend/src/pages/RestaurantReviewsPage.test.tsx` for displaying authenticated photos (S4), loading photos on a displaced review (S8), and offering the first reply on a latest-visit photo-only review and withholding it on displaced reviews.
- [X] T010 [P] [US57] Add US-42 regression tests in `backend/tests/test_review_replies.py` and `backend/tests/test_review_photos.py` for a successful first reply on photo-only and rating-only opinions, including eligibility for a temporarily unbookable restaurant. Verify first reply with a written comment and editing an existing reply after displacement.
- [X] T011 [US57] Extend `backend/tests/test_review_photos.py` for both read responses (S4), latest photo-only visibility and older-review displacement (S6), and media authorization (S8). Cover anonymous access for a visible opinion and denial for an older review or another restaurant.

### Implementation

- [X] T012 [US57] Define photo references, ordered photo arrays and the structured photo rejection in `backend/app/schemas/review.py` and update `PublicOpinion` in `backend/app/schemas/public_restaurant.py` to accept nullable comments.
- [X] T013 [US57] Implement bounded file validation and filesystem persistence in `backend/app/services/review_photos.py`. Check actual JPEG, PNG and WebP signatures and basic containers, cap each file at 5,000,000 bytes, reject excess selections, and return messages indexed by input order. Derive storage keys from validated type and UUID.
- [X] T014 [US57] Integrate photos with the existing locked publication transaction in `backend/app/services/reviews.py` and `backend/app/api/review.py`. Validate all photos before final writes, persist metadata in the review transaction, clean up files on known rollback and verify metadata before deletion on an uncertain commit.
- [X] T015 [US57] Extend the review POST in `backend/app/api/review.py` to accept existing JSON and bounded multipart with a JSON `review` part and repeated `photos`. Preserve legacy validation and statuses, apply the application transport ceiling, and document both representations and the typed photo-specific 400 in `backend/app/main.py` without changing unrelated operations.
- [X] T016 [US57] Use latest-visit selection for all reviews in `backend/app/services/reviews.py` and `backend/app/api/public_restaurant.py`. Batch ordered metadata for Opiniones and for every review in the restaurant's current page in `backend/app/api/review.py`. Keep rating, price summaries and pagination behavior.
- [X] T017 [US57] Add `GET /api/review-photos/{photo_id}` in `backend/app/api/review.py`, using committed photo metadata and current public bookability and opinion visibility, or authenticated restaurant ownership. Return 404 for missing or inaccessible media and send the validated media type, `nosniff` and `private, no-store`.
- [X] T018 [US57] Verify `backend/app/services/review_replies.py` and `backend/app/api/review.py` use the latest-visit rule without content or bookability filters for first replies and panel `can_reply`. Preserve editing and reply endpoints and status codes.
- [X] T019 [US57] Run `make api-types` to regenerate `frontend/src/api/openapi.json` and `frontend/src/api/schema.d.ts`.
- [X] T020 [US57] Adapt `frontend/src/api/reviews.ts` for multipart via the existing FormData serializer pattern, index-based photo errors, 413 fallback and authenticated image fetch. Preserve the JSON no-photo path and session and conflict handling.
- [X] T021 [US57] Extend `frontend/src/pages/home/PendingReviews.tsx`, `frontend/src/pages/home/ReviewDialog.tsx` and `frontend/src/pages/home/ReviewDialog.module.css` for per-reservation photo selection, preview and removal. Preserve draft data through back navigation and recoverable errors, and require a fresh confirmation after server rejection.
- [X] T022 [US57] Render ordered photos with `frontend/src/components/review/OpinionCard.tsx` and `frontend/src/components/review/OpinionCard.module.css`. Update `frontend/src/components/review/OpinionList.tsx`, `frontend/src/api/restaurants.ts` and fixtures in `frontend/src/data/restaurants.fixture.ts` where needed for nullable comments, photo data and opinion counts.
- [X] T023 [US57] Use the shared card for photos in `frontend/src/pages/RestaurantReviewsPage.tsx`. Load private photos with the bearer session, revoke object URLs for discarded previews and panel views, and continue to rely on `can_reply` for the new reply action.

**Checkpoint**: US-57 works end to end and all eight acceptance scenarios and US-42 regressions pass.

## Phase 4 — Wrap-up

- [X] T024 Run `make format lint test` using `Makefile`. Inspect the generated API contract and types in `frontend/src/api/` and verify the Alembic upgrade on an existing database.
- [X] T025 Follow `specs/029-subir-fotos-plato/quickstart.md`. Check a valid four-photo upload through Nginx, the mobile layout at 360 px, keyboard navigation and public and private media access after displacement.

## Dependencies and execution order

- `T001 → T002–T004 → T005 → T006–T011 → T012–T018 → T019 → T020–T023 → T024–T025`.
- T005 depends on T002. T011 follows T006 because both edit the same backend test file.
- Complete the publication and read contracts before T019. Complete T020 before using the typed client from the UI. Wire the shared opinion card before panel integration.

## Parallel execution example

After T001, the model, storage configuration and Nginx tasks can run together because they edit different files. After the foundation, T006–T010 can run together. Schedule T011 after T006.

## Implementation strategy

US-57 is the sole MVP story. Deliver the complete selection, preview, publication and read path with rejection recovery, private history and US-42 compatibility in the same increment. Use the automated acceptance mapping and quickstart as the release checks.

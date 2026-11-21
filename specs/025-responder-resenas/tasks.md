---

description: "Tasks for spec 025: the restaurant replies to reviews (US-42)"
---

# Tasks: Responder Reseñas

**Input**: [spec.md](spec.md) and [plan.md](plan.md) in `/specs/025-responder-resenas/`

**Tests**: REQUIRED. One automated test per acceptance scenario, named after US-42 and its scenario (see the map in plan.md).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: `[US42]`

## Phase 1: Foundational

- [x] T001 Create the `ReviewReply` model (unique `review_id`, text check, `created_at`, `edited_at`) in backend/app/models/review_reply.py and import it in backend/app/models/__init__.py
- [x] T002 Generate and review the migration with `make migration m="add review replies"` in backend/migrations/versions/; check `uv run alembic heads` shows one head

**Checkpoint**: The table exists; the story can start.

---

## Phase 2: US-42 — Responder Reseñas 🎯

**Goal**: The restaurant replies to the reviews shown in Opiniones, edits the reply, and everyone sees it under its review.

**Independent Test**: The one in spec.md.

### Tests for US-42 (write first; they must fail before the implementation)

- [x] T003 [P] [US42] Backend scenarios S1–S8 and the edge cases in backend/tests/test_review_replies.py
- [x] T004 [P] [US42] Update the exact field lists of `test_us24_s6_…` and `test_us50_s8_…` in backend/tests/test_reviews.py
- [x] T005 [P] [US42] UI scenarios S1, S3–S7 and S9 (`US-42 S…`) in frontend/src/pages/RestaurantReviewsPage.test.tsx
- [x] T006 [P] [US42] Public reply with «Editada» (`US-42 S2`, `US-42 S4`) in frontend/src/pages/RestaurantDetailPage.test.tsx and frontend/src/api/restaurants.test.ts

### Implementation for US-42

- [x] T007 [US42] `ReplyRequest`, `ReviewReplyResponse` and the new `RestaurantReview` fields in backend/app/schemas/review.py; `PublicReply` in backend/app/schemas/public_restaurant.py
- [x] T008 [US42] Reply, edit and latest-visit eligibility (C1, including rating-only reviews) in backend/app/services/review_replies.py
- [x] T009 [US42] `POST` and `PUT /api/restaurant/reviews/{review_id}/reply`, `reply` and `can_reply` in the list, in backend/app/api/review.py
- [x] T010 [US42] `reply` in each opinion in backend/app/api/public_restaurant.py
- [x] T011 [US42] Regenerate the API contract and types with `make api-types` (frontend/src/api/)
- [x] T012 [US42] `publishReply` and `editReply` in frontend/src/api/reviews.ts; the reply in each opinion in frontend/src/api/restaurants.ts and the optional `reply` in frontend/src/data/restaurants.fixture.ts
- [x] T013 [P] [US42] `OpinionReply` in frontend/src/components/review/, `children` in `OpinionCard`, the reply in `OpinionList`; add it to `/diseno` (frontend/src/pages/DesignSystemPage.tsx) and docs/design/README.md
- [x] T014 [US42] The reply form with the counter in frontend/src/pages/reviews/ReplyForm.tsx, and «Responder» / «Editar respuesta» in frontend/src/pages/RestaurantReviewsPage.tsx, at 360 px wide

**Checkpoint**: US-42 works end to end and its scenario tests pass.

---

## Phase 3: Wrap-up

- [x] T015 Run `make format lint test` and fix any failure
- [x] T016 Update specs/README.md and the «Where things stand» section of AGENTS.md
- [ ] T017 Try the feature in the running app (`make up-local`): reply, edit, and check the detail at 360 px

---

## Dependencies & Execution Order

- T001–T002 block everything else.
- Tests (T003–T006) first, then T007–T010, then T011 before the frontend (T012–T014).

## Notes

- Commit after each logical group, with the US in the message: `feat(US-42): …`.

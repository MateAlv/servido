# Implementation Plan: Responder Reseñas

**Feature**: `specs/025-responder-resenas` | **Date**: 2026-11-15 | **Spec**: [spec.md](spec.md) | **US**: US-42 | **Sprint**: 5

**Input**: Feature specification from `/specs/025-responder-resenas/spec.md`

## Summary

The restaurant answers a review from its reviews page (US-24). One new table, `review_replies`, holds at most one reply per review, with its text, when it was published and when it was last edited. Two endpoints under the restaurant role create and edit it; there is no delete (C4). A first reply is allowed on each diner's latest reviewed visit, including rating-only and photo-only reviews. C1 reuses the selection in spec 014 and also applies when the restaurant is temporarily unbookable. Earlier visits remain editable if they already have a reply. The restaurant's list and the public detail carry the reply, and the UI shows it under its review with «Editada» when it changed (C3).

## Technical Context

**Language/Version**: Python 3.12 (backend) · TypeScript (frontend)

**Primary Dependencies**: FastAPI, SQLAlchemy 2, Alembic, Pydantic · React, Vite, React Router, TanStack Query, openapi-fetch, the design system in `frontend/src/components/` (see `docs/design/README.md`)

**Storage**: PostgreSQL 17 in Docker (locally, in CI and on the production instance)

**Testing**: pytest against a real Postgres in `backend/tests/` · Vitest + Testing Library in `frontend/src/**/*.test.tsx`

**Target Platform**: Mobile-first web app: static SPA plus JSON API under `/api`

**Project Type**: Web application (backend + frontend)

**Performance Goals**: Only what the spec's success criteria state; the app never has more than one concurrent user

**Constraints**: Single AWS free-tier account; no new services, paid APIs or dependencies

**Scale/Scope**: 1 table, 2 endpoints, 2 new fields on each item of `GET /api/restaurant/reviews` and 1 on each public opinion, 1 shared component (`OpinionReply`), changes to 2 pages

**New dependencies**: None

**Open clarifications**: None marked. C1–C5 are team decisions recorded in the spec, pending PO validation.

## Design

### Data

`review_replies` (new):

| Field | Type | Rules |
| --- | --- | --- |
| `id` | UUID | Primary key |
| `review_id` | UUID | FK `reviews.id`, `ON DELETE RESTRICT`, unique: one reply per review (FR-003) |
| `text` | varchar(500) | Not blank and up to 500 characters, as a check constraint (FR-005) |
| `created_at` | timestamptz | When it was published |
| `edited_at` | timestamptz, null | Last edit; null until the text changes (C3) |

No history of edits is kept (C3). Saving the same text again is not an edit.

### API

| Method and path | Role | Answers |
| --- | --- | --- |
| `POST /api/restaurant/reviews/{review_id}/reply` `{text}` | restaurant | 201 the reply · 400 blank or over 500 characters · 401 · 403 diner · 404 not its review · 409 «ya tiene tu respuesta» or «solo las que se ven en Opiniones» |
| `PUT /api/restaurant/reviews/{review_id}/reply` `{text}` | restaurant | 200 the reply · 400 · 401 · 403 · 404 not its review, or no reply yet |
| `GET /api/restaurant/reviews` | restaurant | Each item adds `reply` (`text`, `created_at`, `edited_at`) and `can_reply` (shown in Opiniones and without a reply) |
| `GET /api/restaurants/{id}` | public | Each opinion adds `reply` (`text`, `date`, `edited`) |

The text is trimmed before it is checked and stored. Another restaurant's review answers 404, as a diner's reservation does in spec 014, so it doesn't reveal that the review exists. The review row is locked while replying, so a repeated submission finds the first reply and gets 409 (edge case «Doble envío»). Editing does not require the review to be in Opiniones: a reply whose review left Opiniones stays visible to the restaurant and editable (edge case «Respuesta que deja de verse»). No mail or notification is sent (C5).

### UI

- `RestaurantReviewsPage`: «Responder» only when `can_reply`; a `TextAreaField` with «Te quedan N caracteres» (counts code points of the trimmed text, as the server does, so 👍🏽 is 2 on both sides; over the limit it reads only «Te pasaste por N caracteres del máximo de 500.» in red, and publishing then shows a single error), «Publicar respuesta» and «Cancelar». A published reply shows under its review as «Tu respuesta» with «Respondió el …» and «· Editada», and «Editar respuesta» opens the same form with the current text, the caret at its end and the text scrolled to it. Emptying it while editing says it can be edited but not deleted (C4). Escape cancels. Cancelling, or opening another review's form, asks before losing a changed, non-empty draft; once the form closes the focus goes back to that review's button, and «Seguir escribiendo» puts it back in the text. A 409 on publishing reloads the list: if the review now has a reply, the form switches to editing it, says so («Respondida desde otra pestaña») and keeps what the restaurant typed next to it, with «Usar lo que escribiste»; if the review left Opiniones, the message shows with the typed text.
- `RestaurantDetailPage` (Opiniones): the reply under its opinion, indented and smaller, labelled «Respuesta de <restaurante>», with «Respondió el …» and «· Editada», shortened to about three lines with a «Leer más» / «Ver menos» toggle that keeps the focus, shared with the comments (spec 014).
- `OpinionReply` (new, `components/review/`): the reply block both screens use, a labelled group (not a landmark), inside `OpinionCard` through `children`. Added to `/diseno` and the design guide. `Modal` gains `onClosed`, so the page can move the focus once the confirmation is gone, and `TextAreaField` gains `hintTone` and regular-weight text.
- The test restaurants of `restaurants.fixture.ts` have no replies.

## Constitution Check

| Principle | Gate | Pass |
| --- | --- | --- |
| I. Backlog-bound scope | Builds only US-42; no caching, queues, workers, flags or speculative abstractions | ✅ |
| II. Spec before code | Spec validated by the PO; every open clarification answered or recorded as an explicit assumption | ⚠️ C1–C5 are recorded as team decisions; PO validation is pending, as with spec 014 |
| III. Every scenario tested | Every acceptance scenario appears in the test map below; one reply per review and the text limits are database constraints | ✅ |
| IV. Humans own AI output | One table, two endpoints, one component | ✅ |
| V. Simple, cheap, conventional | Uses only the standard stack | ✅ |

## Acceptance Scenario → Test Map

Backend tests are in `backend/tests/test_review_replies.py`. Frontend: `ReviewsPage` = `frontend/src/pages/RestaurantReviewsPage.test.tsx`, `Detail` = `frontend/src/pages/RestaurantDetailPage.test.tsx`, `api` = `frontend/src/api/restaurants.test.ts`.

| Scenario | Backend | Frontend |
| --- | --- | --- |
| S1 — reply and see it in the list | `test_us42_s1_reply_is_stored_and_shown_under_the_review` | `ReviewsPage` › `US-42 S1 publishes a reply and shows it under the review` |
| S2 — public, with name and date | `test_us42_s2_anyone_sees_the_reply_under_the_opinion` | `Detail` › `US-42 S2 shows the reply under its opinion as the restaurant's`; `US-42 S2 shortens a long reply until asked, so it stays below the review`; `api` › `US-42 S2 keeps the reply of each opinion` |
| S3 — no second reply, edit offered | `test_us42_s3_second_reply_is_refused_and_the_first_one_kept` | `ReviewsPage` › `US-42 S3 offers editing instead of a second reply`, `US-42 S3 switches to editing the existing reply and keeps what was typed` |
| S4 — edit, «Editada» | `test_us42_s4_edited_reply_replaces_the_text_and_is_marked` | `ReviewsPage` › `US-42 S4 edits the reply and marks it`; `Detail` › `US-42 S4 marks an edited reply` |
| S5 — blank, over 500, counter | `test_us42_s5_empty_or_too_long_reply_is_refused`, `test_us42_s5_500_characters_are_accepted` | `ReviewsPage` › `US-42 S5 counts the remaining characters and refuses an empty or long reply`, `US-42 S5 counts characters as the server does, an emoji as one`, `US-42 S5 says a reply can be edited but not emptied` |
| S6 — give up | `test_us42_s6_review_stays_without_reply_until_one_is_published` | `ReviewsPage` › `US-42 S6 cancelling an empty reply closes it and returns the focus`, `US-42 S6 asks before discarding what was typed`, `US-42 S6 asks before leaving a draft to answer another review` |
| S7 — not in Opiniones | `test_us42_s7_older_visit_of_the_same_person_cannot_be_replied` | `ReviewsPage` › `US-42 S7 offers no reply on a review that is not public` |
| S8 — another restaurant | `test_us42_s8_cannot_reply_or_edit_on_another_restaurant` | |
| S9 — first reply without a comment | `test_us42_s9_latest_rating_only_review_can_be_replied`, `test_us57_s6_lists_latest_photo_only_review_and_hides_older_review` | `ReviewsPage` › `US-42 S9 offers a first reply for a public review without a comment` |

Edge cases: `test_us42_edge_double_submit_keeps_one_reply`, `test_us42_edge_database_keeps_one_reply_per_review`, `test_us42_edge_database_refuses_blank_or_long_text`, `test_us42_edge_reply_hidden_by_a_later_visit_persists_for_the_restaurant`, `test_us42_edge_saving_the_same_text_is_not_an_edit`, `test_us42_edge_editing_a_review_without_reply_is_not_found`, `test_us42_edge_reply_cannot_be_deleted`, `test_us42_edge_the_diner_gets_no_mail`. The expired session is the 401 of S8 and, in the UI, the same sign-out the page already does.

## Project Structure

### Documentation (this feature)

```text
specs/025-responder-resenas/
├── spec.md
├── plan.md      # This file; data model and contract are in «Design» above
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── app/api/review.py                       # + POST and PUT …/reply; ~ restaurant list
├── app/api/public_restaurant.py            # ~ reply in each opinion
├── app/models/review_reply.py              # + ReviewReply; ~ app/models/__init__.py
├── app/schemas/review.py                   # + ReplyRequest, ReviewReplyResponse; ~ RestaurantReview
├── app/schemas/public_restaurant.py        # + PublicReply; ~ PublicOpinion
├── app/services/review_replies.py          # + the rules of the spec
├── migrations/versions/…_add_review_replies.py # +
└── tests/test_review_replies.py            # +; ~ test_reviews.py (new fields)
frontend/src/
├── api/reviews.ts, restaurants.ts          # ~; openapi.json, schema.d.ts regenerated
├── components/review/OpinionReply.tsx      # + with its CSS; ~ OpinionCard (children), OpinionList, index.ts
├── data/restaurants.fixture.ts             # ~ optional `reply` on a review
├── pages/RestaurantReviewsPage.tsx         # ~ reply actions; + pages/reviews/ReplyForm.tsx (not a route)
└── pages/RestaurantDetailPage.tsx, DesignSystemPage.tsx # ~
```

**Structure Decision**: The standard layout; `pages/reviews/` holds the form of the reviews page, as `pages/home/` does for the home. The rules go in their own service module next to `reviews.py`, which they import for the Opiniones rule. The plan carries the data model and the contract because both are small.

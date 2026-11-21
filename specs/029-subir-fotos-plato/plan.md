# Implementation Plan — Review photos

**Feature**: `specs/029-subir-fotos-plato` | **Date**: 2026-11-21 | **Spec**: [spec.md](spec.md) | **US**: US-57 | **Sprint**: 6

## Summary

Add up to four optional photos to the existing diner review draft, preview and confirmed publication. Extend the existing publication route with multipart while retaining JSON for reviews without files. Persist ordered photo metadata and use the existing backed-up data volume for the files. Use each diner's latest reviewed visit for Opiniones, photo access and first-reply eligibility. Rating-only and photo-only reviews qualify and reply eligibility also applies when the restaurant is temporarily unbookable.

## Technical context

| Area | Design |
| --- | --- |
| Backend | Python 3.12, FastAPI, existing python-multipart, Pydantic, SQLAlchemy 2, Alembic |
| Frontend | TypeScript, React, TanStack Query, generated openapi-fetch types and existing Modal, OpinionCard and OpinionList |
| Storage | PostgreSQL 17 for metadata and a dedicated directory on the existing EBS data volume for review files |
| Tests | pytest with real PostgreSQL and isolated media directory, plus Vitest and Testing Library |
| Target | Existing mobile-first SPA and FastAPI service, including the current Nginx and CloudFront path |
| Performance | Validate the spec's under-one-minute interaction using a representative mobile viewport and supported fixtures |
| Dependencies | Existing AWS resources and application dependencies, plus Pillow for bounded decoding of review images |
| Scope | One child model, one photo read operation and extensions to the review POST and two review read surfaces |

### Decisions and implementation gate

The five accepted decisions in the spec are binding. Use 5,000,000 bytes for the approved 5 MB and preserve the existing per-reservation draft through preview, back navigation and recoverable publication failure. The thumbnail preview and removal are in scope. Expanded gallery presentation remains an F3 proposal and requires approval if made an acceptance requirement.

Preserve 404 for foreign or unknown reservations, 409 for ineligible or already reviewed reservations, and 400 for invalid review data or photos, as specified in spec 029 and the API contract. For US-42, use the updated C1 rule in spec 025. A latest-visit review with no reply qualifies regardless of its comment, photos or restaurant bookability.

## Constitution check

The design was checked before research and after the contract and data model were drafted.

| Principle | Result |
| --- | --- |
| I. Backlog-bound scope | Pass. Review photos only, on the existing publication and reading flows. |
| II. Spec before code | Planning complete. Spec 029 documents the existing review HTTP statuses and the US-42 compatibility rule. |
| III. Every scenario tested | Pass at design stage. See test mapping and database constraints. |
| IV. Humans own AI output | Pass at design stage. The implementation PR must document AI use and receive teammate review. |
| V. Simple, cheap, conventional | Pass. Pillow provides the required image decoders on the existing backend. Reuse the data volume, services and proxy. |

## Acceptance scenario → test map

Backend test names below belong in `backend/tests/test_review_photos.py`. Frontend test names identify cases in existing suites.

| Scenario | Planned automated evidence |
| --- | --- |
| US-57 S1 — Select photos on an eligible visit | `PendingReviews.test.tsx` › `US-57 S1 selects photos on an eligible review` |
| US-57 S2 — Preview and remove | `PendingReviews.test.tsx` › `US-57 S2 previews and removes selected photos before publishing` |
| US-57 S3 — Persist association | `test_us57_s3_persists_ordered_photos_for_the_published_review` |
| US-57 S4 — Display published photos | `test_us57_s4_returns_photos_in_public_and_restaurant_review_responses`; `RestaurantDetailPage.test.tsx` and `RestaurantReviewsPage.test.tsx` › `US-57 S4 displays review photos` |
| US-57 S5 — Reject invalid selections | `test_us57_s5_rejects_unsupported_oversized_and_excess_photos`; `PendingReviews.test.tsx` › `US-57 S5 preserves the draft and valid selections` |
| US-57 S6 — Latest review with photos and no comment | `test_us57_s6_lists_latest_photo_only_review_and_hides_older_review`; `RestaurantDetailPage.test.tsx` › `US-57 S6 renders a photo-only opinion` |
| US-57 S7 — Reject at confirmation, then retry | `test_us57_s7_rejects_the_entire_publication_and_allows_retry`; `PendingReviews.test.tsx` › `US-57 S7 reports rejected photos and requires confirmation again` |
| US-57 S8 — Private history | `test_us57_s8_allows_only_the_owning_restaurant_to_fetch_hidden_photos`; `RestaurantReviewsPage.test.tsx` › `US-57 S8 displays photos on an older review` |

Add focused coverage for the exact size and count boundaries, write failure cleanup, existing JSON publication and multipart parity for 401/403/404/409. Cover first replies and public rendering on rating-only and photo-only opinions, first replies for a temporarily unbookable restaurant, and the existing edit-only rule after displacement. Check generated OpenAPI for both request media types and compatibility of status schemas.

## Project structure and integration

- **Backend publication** — Extend `backend/app/api/review.py` and `backend/app/services/reviews.py`. Reuse role/session dependencies, the reservation lock, the existing publication validation and transaction, and the model's reservation uniqueness. Group photo validation and storage in one review-specific service if needed. Register `ReviewPhoto` in `backend/app/models/__init__.py` and add an Alembic migration.
- **Backend reads** — Update the review and public-restaurant schemas, public restaurant detail and restaurant review list. Batch photo metadata for returned review IDs. Reuse the latest-visit query for detail, photo visibility and first-reply eligibility. Keep the existing bookability check for public photo access. Keep the public rating and price calculations independent of the Opinions filter.
- **Frontend** — Extend `frontend/src/api/reviews.ts` using the FormData serializer pattern from `dishes.ts`. Refresh generated OpenAPI and TypeScript types. Extend `PendingReviews` and `ReviewDialog` with file selection, preview and retry. Reuse `OpinionCard` in detail and panel, support nullable opinion comments, and update the Opinions count wording and preview visibility notices to account for photo-only opinions. Revoke object URLs when their selections or views are discarded.
- **Deployment** — Use an app-configured review-photo directory outside the public static root. Mount it under the existing production data volume and provide equivalent local persistence in Docker Compose. Scope the Nginx request body increase to review publication. No Terraform resources are needed.

## Design artifacts

- [Research](research.md)
- [Data model](data-model.md)
- [API contract](contracts/review-photos-api.md)
- [Validation quickstart](quickstart.md)

## Complexity tracking

No constitution exceptions.

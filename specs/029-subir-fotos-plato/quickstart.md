# Quickstart — Validate US-57 after implementation

## Setup

Run `make up-local` from the repository root and open the frontend at `http://localhost:5173`. Use a verified diner with a completed eligible reservation and its restaurant account. Prepare supported JPG, PNG and WebP fixtures, one unsupported file, and one supported image over 5 MB. For the displacement check, use two eligible visits by the same diner to the same restaurant.

## Browser checks

1. Open **¿Cómo estuvo?**, choose an eligible visit, enter a rating and select photos. Preview the selected photos, go back, remove one and confirm. Try a fifth photo and check that the valid selections and review fields are retained.
2. Exercise a server-side rejection with the acceptance test fixture or request described in the API contract. Verify that no review or photo is published, the rejection identifies each affected photo, and the diner can review the remaining selections and confirm again.
3. Publish a photo-only review for the latest visit. Open the bookable restaurant's detail in a signed-out window and verify the photos in Opiniones. Check at 360 px with keyboard navigation.
4. Sign in as the restaurant. Verify that the photo-only review offers a first reply, and that the reply appears with the photos in the public detail. Publish a rating-only review for the latest visit of another diner and verify the same reply flow. Use a separate pair of visits whose earlier review has photos and a written comment. Reply while the earlier review is visible, then publish the newer visit. Verify that the previous review and reply leave Opiniones, the old photo URL is unavailable anonymously, and the restaurant can still view the old photos and edit its existing reply.
5. Verify the JSON no-photo path and check that a valid four-photo upload fits through the production-style Nginx proxy.

## Automated checks

Run `make api-types` after backend contract changes, then `make format lint test`. The acceptance mapping in [plan.md](plan.md) identifies the focused tests and regressions. Review the [API contract](contracts/review-photos-api.md) for the status matrix and [data model](data-model.md) for persistence checks.

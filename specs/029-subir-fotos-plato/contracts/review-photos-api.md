# API contract — US-57

## Publish a review

`POST /api/reservations/{reservation_id}/review` uses the existing diner bearer session.

| Content type | Body |
| --- | --- |
| `application/json` | Existing `ReviewRequest`, including rating, optional comment and optional spend per person |
| `multipart/form-data` | One text part named `review` containing the same JSON object, plus repeated file parts named `photos` in selection order |

The browser constructs the multipart boundary. Existing JSON callers retain their current body and status contract. Multipart uses the same validated inputs and eligibility rules. Assign photo positions in part order.

| Status | Meaning |
| --- | --- |
| 201 | Review and every submitted photo published. Existing response fields plus ordered `photos`. |
| 400 | Invalid review data, malformed supported representation, or rejected photo inputs. |
| 401 | Missing or invalid session. |
| 403 | Wrong role or unverified diner email. |
| 404 | Unknown reservation or one belonging to another diner, with the same response. |
| 409 | Already reviewed, cancelled, unfinished, or outside the 30-day window. Existing messages and conflict handling apply. |
| 413 | Request exceeds transport limits. Proxies can return a non-JSON response. The client shows a Spanish fallback and retains the draft. |

For identifiable file failures, use the existing error envelope with a structured detail. Example:

```json
{
  "detail": {
    "message": "Revisá las fotos antes de volver a publicar.",
    "photo_errors": [
      {"index": 1, "code": "unsupported_format", "message": "Elegí una foto JPG, PNG o WebP."}
    ]
  }
}
```

Index is zero-based in the submitted file list and identifies the selection even if names repeat. Codes are `empty_file`, `unsupported_format`, `too_large`, `too_many_photos` and `too_many_pixels`. The server verifies decodability and applies a safety budget of 16 million decoded pixels per file across all frames. The client associates each failure with the submitted file, displays its name and reason, keeps the valid selections and entered fields, and requires a fresh confirmation. Configuration and OpenAPI must preserve the existing generic error shapes and document the structured variant for this operation. Preserve normal session and conflict handling.

## Read reviews and photos

Add ordered `photos` arrays to `PublishedReviewResponse`, `PublicOpinion` and `RestaurantReview`. Each item has UUID `id` and relative `url`. Reviews without photos return an empty array. Keep other response fields, pagination and aggregate calculations. Compute Opiniones from each person's latest reviewed visit, including rating-only reviews. The restaurant panel lists all existing reviews as before.

`GET /api/review-photos/{photo_id}` returns image bytes with the server-selected content type, `X-Content-Type-Options: nosniff` and `Cache-Control: private, no-store`. Access is allowed anonymously if the review is currently visible in the public detail of a bookable restaurant, or with a valid bearer session for the owning restaurant. Use 404 for missing or inaccessible media. The authenticated panel loads bytes with its bearer header and uses disposable object URLs for display.

## US-42 replies

Retain the existing reply POST and PUT routes, payloads, statuses and response schema. For a first reply, retain the existing requirements of restaurant ownership, a latest-visit review and no existing reply, including rating-only and photo-only reviews. Eligibility does not depend on restaurant bookability. A hidden review also remains ineligible for a first reply. The owning restaurant can still edit an existing reply after its review becomes hidden. The public detail shows replies only with their visible review.

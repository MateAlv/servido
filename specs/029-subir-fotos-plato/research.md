# Research — US-57 review photos

## Keep one publication operation

**Decision.** Extend the existing review POST with multipart for submissions with photos. Keep the existing JSON representation, validation and responses for reviews without photos. Use a JSON text part for the review fields so both representations pass through the same strict `ReviewRequest`. Reuse the installed multipart parser and the typed client's FormData serializer pattern from `frontend/src/api/dishes.ts`.

**Rationale.** The existing transaction, reservation lock and unique review constraint already govern publication. A separate pre-upload workflow would require staging ownership, expiry and cleanup across requests. Replacing JSON would break existing clients and tests.

## Serve photos according to review visibility

**Decision.** Reuse the EC2 EBS data volume and its backup policy with a dedicated review-photo path outside FastAPI's public `/media` mount. Stream files through an API route that permits public access while a review appears in Opiniones and otherwise requires the owning restaurant's session. Send `Cache-Control: private, no-store` on media responses. Use an authenticated fetch for the private panel because image tags cannot send the bearer header.

**Rationale.** Saving under the public static mount would allow a copied URL to expose photos after the review leaves Opiniones. This design reuses the existing instance and storage. Keeping bytes in PostgreSQL would simplify atomicity but moves up to four large binary objects per review into the database and departs from the volume-backed design in the spec.

## Validate and publish as one user action

**Decision.** Check submitted files with bounded reads and restrict Pillow decoding to JPEG, PNG and WebP. Verify the container and decode every frame after checking a budget of 16 million pixels per file across all frames. Pick the response MIME type on the server. Reuse the menu uploader’s generated-filename convention. Pillow supplies decoders for all three approved formats and can reject corrupt pixel data that a signature check would accept. Keep the selected files in the existing per-reservation frontend draft until the publish result. Return all identifiable per-file rejections in one response and require a fresh confirmation after any rejection.

**Rationale.** An already published review is final. Silent partial publication would prevent the diner from approving the final content. Validate before writing final files, associate them in the review transaction and delete files on failures known to have rolled back. After a commit error, release the original transaction and recheck photo metadata in a fresh transaction under the reservation lock. Delete files whose metadata is absent after the check and keep files if verification fails. After a process crash, files without committed metadata are inaccessible. No worker is needed.

## Reuse the US-42 visibility rule

**Decision.** Reuse the latest-visit selection for the public detail, public photo access and first-reply eligibility. Rating-only and photo-only reviews are included. Restaurant bookability still controls public detail and photo access. Keep ownership, one reply, editing while hidden, duplicate conflicts and public reply presentation. An older review stays out of Opiniones even if the newer review has neither photos nor comment.

**Rationale.** The 2026-11-21 decision supersedes the earlier visibility filter and written-comment prerequisite. The panel and reply endpoint share the latest-visit rule and preserve first-reply eligibility while the restaurant is temporarily unbookable.

## Preserve the incumbent HTTP contract

**Decision.** Retain 401 for missing or invalid sessions, 403 for wrong role or unverified email, 404 for unknown or foreign reservations, and 409 for already reviewed or ineligible reservations. Use 400 for invalid review or photo data. Spec 029 and the API contract record this mapping. Existing tests and the frontend conflict-refresh path guard these distinctions.

**Rationale.** Returning 403 for a foreign reservation would disclose its existence compared with the current 404. Returning 400 for a lifecycle conflict would bypass the existing conflict UX.

## Fit the current deployment

**Decision.** Set a review-publication-only Nginx body ceiling of 24 MiB, with a matching application transport bound and a bounded multipart parser. Use 5,000,000 bytes per image for the spec's 5 MB limit. Permit a modest number of excess multipart parts so ordinary over-count submissions can return a per-photo 400. Larger transport violations return 413. Keep the existing CloudFront behavior, which forwards requests without caching the API.

**Rationale.** The current Nginx limit blocks valid uploads. A scoped cap fits four files plus the multipart envelope and keeps transport errors distinct from application validation. No new service or proxy dependency is required.

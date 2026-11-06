---
description: "Tasks for spec 012, reviews"
---

# Tasks: Reseñas de Reservas

**Input**: Design documents from `/specs/012-resenas/`

**Tests**: One per acceptance scenario, mapped in [plan.md](plan.md).

## Phase 1: Foundational

- [x] T001 Create `Review` in backend/app/models/review.py and import it in backend/app/models/\_\_init\_\_.py
- [x] T002 Generate and review the migration in backend/migrations/versions/
- [x] T003 Write the rules in backend/app/services/reviews.py

## Phase 2: US-27 — Dar un rating de la experiencia 🎯

- [x] T004 [US27] Tests S1–S13 in backend/tests/test_reviews.py
- [x] T005 [US27] `GET /api/reviews/pending` and `POST /api/reservations/{id}/review` in backend/app/api/review.py, with backend/app/schemas/review.py
- [x] T006 [US27] Add `rating` and `review_count` to backend/app/api/public_restaurant.py
- [x] T007 [US27] Run `make api-types` and add frontend/src/api/reviews.ts
- [x] T008 [US27] «¿Cómo estuvo?» in frontend/src/pages/home/PendingReviews.tsx and DinerHome.tsx, with `purpose` in UnverifiedNotice
- [x] T009 [US27] Show the real average and count in the map, the list and the detail
- [x] T010 [US27] Tests in frontend/src/pages/home/PendingReviews.test.tsx and RestaurantDetailPage.test.tsx

## Phase 3: US-50 — Dejar comentarios en texto

- [x] T011 [US50] Tests S1–S11 in backend/tests/test_reviews.py
- [x] T012 [US50] Add `opinions` to the public detail
- [x] T013 [US50] Add `TextAreaField` and `OpinionCard` to the design system, /diseno and docs/design/README.md
- [x] T014 [US50] Form and «Así se va a ver» in frontend/src/pages/home/ReviewDialog.tsx
- [x] T015 [US50] Opinions in frontend/src/pages/RestaurantDetailPage.tsx
- [x] T016 [US50] Tests in PendingReviews.test.tsx, RestaurantDetailPage.test.tsx and restaurants.test.ts

## Phase 4: US-24 — Ver Reseñas

- [x] T017 [US24] Tests S1–S8 in backend/tests/test_reviews.py
- [x] T018 [US24] `GET /api/restaurant/reviews` in backend/app/api/review.py
- [x] T019 [US24] frontend/src/pages/RestaurantReviewsPage.tsx, its route and the card in RestaurantHome.tsx
- [x] T020 [US24] Tests in frontend/src/pages/RestaurantReviewsPage.test.tsx

## Phase 5: US-7 — Criterio pendiente

- [x] T021 [US7] Tests S4–S7 in backend/tests/test_reviews.py
- [x] T022 [US7] Calculated tier and average spend in backend/app/services/reviews.py and public_restaurant.py
- [x] T023 [US7] Map them in frontend/src/api/restaurants.ts, with tests

## Phase 6: Demo and closing

- [x] T024 Write backend/scripts/review_demo.py with backend/tests/test_review_demo.py, and use it from backend/scripts/seed.py
- [x] T025 Update specs 002 and 005, specs/README.md, AGENTS.md, docs/design/README.md and docs/product/plan.md
- [x] T026 Walk through the flow in the running app at 360 px and with the keyboard
- [x] T030 Fix what the UI/UX and accessibility review of 05/11 found, and walk through it again in the running app
- [ ] T027 PO validation of R1–R19
- [ ] T028 Update the Cronograma and the backlog in the workbook, then re-export backlog.md (needs edit access)
- [ ] T029 After deploying, load the demo in production, only with Mateo's approval (R18)

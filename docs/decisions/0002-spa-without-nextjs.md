# 0002 — Single-page app with Vite instead of Next.js

- **Status**: Accepted
- **Date**: 2026-10-18

## Context

The backend is a separate Python API. The app sits behind login, has no SEO needs, and hosting must be as cheap and simple as possible.

## Decision

Build the frontend as a static single-page app with Vite and React Router.

## Consequences

- The build output is static files that can be served by any web server at near-zero cost (in production, nginx behind CloudFront: [ADR 0008](0008-aws-free-plan-hosting.md)); there is no Node server to run or monitor.
- One server-side runtime (Python) instead of two, and no duplicated logic between Next.js server code and the FastAPI backend.
- No server-side rendering. Acceptable for an app behind login with a single user at a time.

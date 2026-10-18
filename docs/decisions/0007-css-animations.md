# 0007 — Animations with CSS, no animation library

- **Status**: Accepted
- **Date**: 2026-10-18

## Context

The brand relies on small animations (logo appearing and disappearing, cloche lid, cutlery, stamps, map pins). Libraries such as Motion add a dependency and a second way of animating, which AI agents would mix inconsistently with CSS.

## Decision

- Animations are CSS `@keyframes` and transitions inside each component's CSS Module, using the motion tokens in `tokens.css` (durations and easings).
- React only switches classes and remounts elements (changing `key`) to replay an animation; `onAnimationEnd` drives multi-step sequences such as the brand splash.
- A global rule makes every animation reach its end state instantly when the user prefers reduced motion. Components that must keep signalling (loaders) declare a gentle alternative.
- Entrance animations mark themselves with `data-entrance` so they wait while the brand splash covers the page.

## Consequences

- No new dependency; animations are visible and editable in plain CSS.
- Exit animations need explicit handling (the component stays mounted until its `animationend`), as in `BrandSplash` and `Modal`.
- If a future feature needs gestures or layout animations that CSS cannot do (dragging, shared-element transitions), revisit with a new ADR.
- jsdom has no `AnimationEvent`; `src/test/polyfills.ts` defines it so tests can fire `animationend`.

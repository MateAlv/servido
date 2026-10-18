# 0006 — Production database on Amazon RDS

- **Status**: Accepted
- **Date**: 2026-10-18

## Context

The cost plan presented to the Product Owner uses PostgreSQL on Amazon RDS. The project must run on a single AWS free-tier account.

## Decision

Production uses PostgreSQL on Amazon RDS (smallest free-tier eligible instance, single-AZ). Development and CI use the official `postgres:17` image, so the same engine runs everywhere.

## Consequences

- The backend reads its connection string from `DATABASE_URL`; nothing in the code is RDS-specific.
- The rest of the hosting is decided in [0008](0008-aws-free-plan-hosting.md).
- AWS accounts created after 2025-07-15 do not get 12 free months of RDS; usage is paid from the account's free-plan credits. Check the account type before provisioning.

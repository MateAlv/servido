# Architecture Decision Records

Short records of decisions that shape the codebase. The course asks teams to document architecture decisions, and agents read these before proposing alternatives.

| ADR | Decision | Status |
| --- | --- | --- |
| [0001](0001-stack.md) | FastAPI + SQLAlchemy + PostgreSQL backend, React + TypeScript frontend, one repo | Accepted |
| [0002](0002-spa-without-nextjs.md) | Vite single-page app instead of Next.js | Accepted |
| [0003](0003-maps-leaflet-openstreetmap.md) | Maps with Leaflet + OpenStreetMap | Accepted |
| [0004](0004-language-policy.md) | English code, Spanish product | Accepted |
| [0005](0005-spec-kit-and-agents-md.md) | Spec Kit for SDD, `AGENTS.md` as the shared agent context | Accepted |
| [0006](0006-database-on-rds.md) | Production database on Amazon RDS | Superseded by 0008 |
| [0007](0007-css-animations.md) | Animations with CSS, no animation library | Accepted |
| [0008](0008-aws-free-plan-hosting.md) | Hosting on the AWS Free plan: everything in Docker on one instance, Terraform | Accepted |
| [0009](0009-google-sign-in-and-ses-mail.md) | Google sign-in with Google Identity Services, transactional mail with Amazon SES | Accepted |

## Adding one

Copy the format of an existing ADR, use the next number, and link it here. Keep it to context, decision and consequences. If a decision changes, add a new ADR that supersedes the old one instead of rewriting history.

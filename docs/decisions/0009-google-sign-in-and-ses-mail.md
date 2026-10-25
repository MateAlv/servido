# 0009 — Google sign-in and transactional mail with Amazon SES

- **Status**: Accepted
- **Date**: 2026-10-24

## Context

Spec 007 brings the first two pieces that depend on outside services.

- **US-52, Ingresar con Google:** diners sign in with their Google account.
- **US-51, Recibir mail de verificación:** diners receive a verification link by mail when they register.

Until now authentication was built in-house with email and password (spec 001), and the app sent no mail. The constraints don't change: the AWS Free plan, no long-lived keys, no queues or workers, and nothing a teammate can't explain.

## Decision

- **Google sign-in:**
  - The browser uses Google Identity Services (the "Sign in with Google" button) with the public OAuth client `Servido! web` of the Google Cloud project `servido-512622`. That project is owned by the team account `servido.gdsi@gmail.com` (infra/README.md).
  - The API verifies the ID token with PyJWT (`crypto` extra) against Google's public keys: signature, audience, issuer, expiry and verified email.
  - The diner with the same email gets the usual session JWT.
  - There is no redirect flow and the client secret is never used.
- **Mail:**
  - Amazon SES (v2 API through `boto3`), sending as `no-reply@servido.discordia.fyi` with Easy DKIM.
  - The instance role is allowed `ses:SendEmail`, so there are no stored keys.
  - Mails are sent inside the request that triggers them.
  - Locally the mail is printed to the log, and in tests it's kept in memory.

## Consequences

- **Two new backend dependencies:**
  - `cryptography`, through `pyjwt[crypto]`, for Google's RS256 signatures;
  - `boto3`, for SES.
- **Sign-in depends on Google being reachable.** The email and password login stays as the fallback.
- **The Google consent screen is published.** Google requires the provisional `/privacidad` and `/terminos` pages for that; US-29 replaces the terms. Without brand verification, the consent screen shows the domain instead of the app name.
- **SES starts in the sandbox:**
  - It only delivers to verified addresses until AWS approves production access, a one-time request.
  - If AWS refuses, the fallback is SMTP with the team Gmail. Only the mail sender changes.
- **A failed send doesn't fail registration:** the account is created unverified and the diner can ask for a new mail.
- **Cost:** SES charges about USD 0.10 per 1,000 mails, paid from the Free plan credits, and Google sign-in is free.

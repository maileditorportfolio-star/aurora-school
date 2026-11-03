# 0004 — Make Sentry error tracking optional and lazily loaded

- Status: Accepted
- Recorded: 2026-11-02

## Context

Production support benefits from exception reporting with request context, but tests,
local development and Docker builds must not require a DSN or a reachable Sentry endpoint.
A hard dependency at startup would make the project harder to run in isolation.

## Decision

Wrap `@sentry/node` in `server/src/config/error-tracker.js`. The SDK is required lazily only
when `SENTRY_DSN` is set; initialisation, capture and flush failures are logged and never
reach the request pipeline. The error middleware reports unexpected failures and 5xx
responses, not expected 4xx errors.

## Consequences

- The app boots and the full unit suite runs with no Sentry configuration.
- `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE` and `SENTRY_TRACES_SAMPLE_RATE` are
  documented in both `.env.example` files.
- `server/tests/error-tracking.test.js` and `server/tests/error-middleware.test.js` pin the
  disabled path, the initialisation options, request context and failure isolation.

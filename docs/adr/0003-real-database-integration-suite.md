# 0003 — Add a separate real-database integration suite

- Status: Accepted
- Recorded: 2026-11-02

## Context

The database-free unit suite proves the HTTP layer but cannot catch migration drift,
constraint behaviour, transaction semantics or stock decrements that only a real database
exposes. Running those checks inside the default suite would break the fresh-clone
guarantee.

## Decision

Keep a dedicated suite in `server/tests/integration/` with its own
`vitest.integration.config.js`, exposed as `npm run test:integration`. It loads the real
Prisma client, uses Supertest against the Express app, creates uniquely named fixtures and
removes them afterwards. CI runs it in a job with a `mysql:8` service after applying
migrations and seeding.

## Consequences

- `npm test` stays database-free; integration coverage is opt-in and explicit.
- CI proves migrations, seed data, registration/login, auth guards, validation and checkout
  against a live database.
- The integration job is slower and must run after `prisma migrate deploy` and `npm run
  seed`; the README and `docs/verification.md` document the order.

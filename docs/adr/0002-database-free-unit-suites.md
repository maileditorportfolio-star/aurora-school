# 0002 — Keep unit suites database-free with an injected Prisma stand-in

- Status: Accepted
- Recorded: 2026-11-02

## Context

Most behaviour lives in Express controllers, middleware and validation. Requiring MySQL for
every spec would make `npm test` fail on a fresh checkout, slow the feedback loop and make
CI depend on a database service for changes that never touch SQL.

## Decision

Run the API unit suite against a Prisma stand-in installed into `require.cache` before the
app is loaded (`server/tests/helpers/prisma-mock.js`). The API is CommonJS, so this is more
reliable than `vi.mock` for intercepting `require()` calls. Storefront specs use `jsdom`,
Testing Library and local fixtures.

## Consequences

- `npm test` and `npm run test:coverage` work with no database, no network and no seed.
- The HTTP layer, auth guards, Zod validation, error middleware and logging are exercised
  end to end inside the process.
- Prisma query semantics are not covered by unit specs; the separate integration suite
  (ADR 0003) covers the real client, migrations and seeded data.

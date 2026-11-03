# Architecture decision records

Short records of the decisions that shape the repository. Each entry states the context,
the decision and its consequences so a reader can understand the trade-offs without
reconstructing them from the diff.

| ADR | Decision |
| --- | -------- |
| [0001](0001-npm-workspaces.md) | Use one npm-workspaces monorepo with a single lockfile |
| [0002](0002-database-free-unit-suites.md) | Keep unit suites database-free with an injected Prisma stand-in |
| [0003](0003-real-database-integration-suite.md) | Add a separate real-database integration suite |
| [0004](0004-optional-error-tracking.md) | Make Sentry error tracking optional and lazily loaded |

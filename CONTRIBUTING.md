# Contributing

Thanks for taking the time to improve Aurora Commerce. This guide covers the
day-to-day workflow so changes land consistently.

## Getting set up

```bash
npm ci
cp server/.env.example server/.env
cp client/.env.example client/.env.local
npm run prisma:migrate
npm run seed
npm run dev
```

See the [README](README.md#local-setup) for database details and the seeded
demo accounts.

## Before opening a pull request

Run the same checks as CI:

```bash
npm run verify      # format, lint, typecheck, env docs, coverage
npm run audit
npm run deps:check
```

`npm run verify:full` adds the dependency audit and both production builds. The exact
commands, the isolation matrix and the last verified results live in
[`docs/verification.md`](docs/verification.md); architecture decisions are recorded in
[`docs/adr/`](docs/adr/).

`npm run deps:check` lists outdated workspace packages; it exits non-zero when updates
are available, so treat it as a report rather than a gate.

Changes that touch the Prisma schema, controllers or auth flow should also run the
integration suite against a migrated and seeded MySQL:

```bash
npm run prisma:deploy
npm run seed
npm run test:integration
```

Or fix formatting in place with `npm run format`.

## Tests

- API specs live in `server/tests/` and use Vitest with Supertest.
- Real-database specs live in `server/tests/integration/` and are opt-in via
  `npm run test:integration`; the default `npm test` stays database-free.
- Storefront specs live in `client/tests/` and use Vitest with React Testing
  Library.
- Every behaviour change should come with a spec that fails without the change.
- New API endpoints need at least a happy-path spec and a validation or
  authorisation spec.
- `npm run test:coverage` enforces the coverage gates in `server/vitest.config.js`
  and `client/vitest.config.ts`. Add real tests rather than lowering a threshold;
  if a threshold genuinely must move, explain why in the pull request.
- Pair new features with their specs in the same commit so history stays
  reviewable. The pull request template asks for the commands you ran.

The API is CommonJS, so tests inject a Prisma stand-in through `require.cache`
(see `server/tests/helpers/prisma-mock.js`) instead of `vi.mock`.

## Code style

- Prettier owns formatting; do not hand-format code.
- ESLint runs across the API and the storefront. Unused variables must be
  prefixed with `_`.
- Server modules use CommonJS; client modules use TypeScript and ESM.
- Keep controllers thin: validate with Zod, let the error middleware shape
  responses, and log through `server/src/config/logger.js` rather than
  `console`.

## Commit messages

Use a short conventional prefix and keep each commit focused:

```
feat(server): verify database connectivity in the health endpoint
fix(client): keep the suspense boundary on the product catalogue
test(server): add order endpoint specs
docs: document the Docker workflow
chore: update dependencies
```

Prefixes in use: `feat`, `fix`, `test`, `docs`, `chore`, `ci`, `build`,
`style`, `refactor`.

## Database changes

1. Edit `server/prisma/schema.prisma`.
2. Run `npm run prisma:migrate` and give the migration a descriptive name.
3. Commit the schema **and** the generated migration.
4. Update the seed if the demo data needs to reflect the change.

## Security

- Never commit `.env` files, database dumps or uploaded files.
- Do not log credentials; the Pino logger redacts common secret fields, but do
  not pass them in the first place.
- Report vulnerabilities privately instead of opening a public issue.

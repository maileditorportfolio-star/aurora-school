# Verification and reproducibility

This document records how Aurora School is installed, built and tested.

Last verified: **2026-11-03** on tag **`v0.1.0`**.

## Toolchain

| Tool | Version |
| ---- | ------- |
| Node.js | 20.9+ (CI: 20, local check: 24.19.0) |
| npm | 10.9.0 |
| MySQL / MariaDB | 8.0 / 10.4+ (local: MariaDB 10.4.32) |
| OS | CI: `ubuntu-latest`; local check: Windows 11 |

## Fresh-clone path

```bash
git clone https://github.com/maileditorportfolio-star/aurora-school.git
cd aurora-school
nvm use
npm ci
npm run test:unit        # 211 API + 12 storefront specs, no database
npm run build            # Prisma generate + Next production build (32 routes)
```

Full gate:

```bash
npm run verify            # format, lint, typecheck, env docs, coverage
npm run verify:full       # verify + audit + build
```

Database-backed suite (needs MySQL + seed):

```bash
mysql -u root -e "CREATE DATABASE aurora_school CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
npm run prisma:deploy --workspace server
npm run seed --workspace server
npm run test:integration   # 13 specs
```

## Last verification results

- Server unit suite: 26 files, 211 specs — **pass**.
- Client unit suite: 3 files, 12 specs — **pass**.
- Integration suite: 4 files, 13 specs (live MySQL) — **pass**.
- Coverage (server): statements 84.5%, branches 63.6%, functions 80.6%, lines 87.3%.
- Coverage (client): statements 2.0%, branches 1.3%, functions 1.6%, lines 2.0% (minimal suite).
- `npx tsc --noEmit`: clean.
- `eslint .` (both workspaces): clean.
- `next build`: 32 routes, no errors.
- `node scripts/check-env-example.js`: pass (14 server + 2 client vars documented).
- Live smoke: admin dashboard (40 students, ৳64,500 outstanding), gradebook GPA 3.43,
  teacher register, parent portal (2 children), fees bKash history — all verified in browser.

## Notes

- Docker build was not run locally (Docker not installed in the dev environment); the
  Dockerfiles and compose file follow the same structure as the reference project.
- Client coverage is minimal; the thresholds are set accordingly.
EOF
echo written
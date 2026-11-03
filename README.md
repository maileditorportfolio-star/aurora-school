# Aurora School

Aurora School is a full-stack school management system for grades 1 to 10 —
students & admissions, teachers & staff, attendance, exams & grades, fees & payments,
timetable, notices & events, library and transport — with an admin console, a teacher
console and a family (student/parent) portal. Built on the same stack and conventions
as Aurora Commerce: npm workspaces, Next.js 16 (App Router) + React 19 + Tailwind 4 + TypeScript
on the front end, Express 4 + Socket.IO + Prisma 6 + MySQL on the back end.

## Quick start (local)

Prerequisites: Node.js 20.9+, npm 10.9+, a running MySQL 8 / MariaDB 10.4+ instance.

```bash
# 1. Install
npm ci

# 2. Configure the API
cp server/.env.example server/.env
# edit server/.env — set DATABASE_URL and a long random JWT_SECRET

# 3. Create the database and apply migrations
#    (MariaDB example)
mysql -u root -e "CREATE DATABASE aurora_school CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
npm run prisma:deploy --workspace server
npm run seed --workspace server

# 4. Configure the storefront
cp client/.env.example client/.env.local
# (defaults already point at http://localhost:4000)

# 5. Run everything
npm run dev          # API on :4000, storefront on :3000
```

## Demo accounts (password `aurora123`)

| Role | Email |
| ---- | ----- |
| Super admin | `admin@aurora.school` |
| Office admin (all permissions) | `office@aurora.school` |
| Teacher (Mathematics) | `arif@aurora.school` |
| Student | `student@aurora.school` |
| Parent (two children) | `parent@aurora.school` |

## Quality gates

```bash
npm run verify       # format, lint, typecheck, env docs, unit suites + coverage
npm run verify:full  # verify + audit + production build
npm run test:integration  # needs a live, seeded MySQL (aurora_school)
```

Coverage is enforced in CI via `test.coverage.thresholds`:

- Server (`server/vitest.config.js`): statements 82, branches 60, functions 78, lines 85.
- Client (`client/vitest.config.ts`): minimal suite (12 specs).

### Docker

```bash
cp .env.example .env
docker compose up --build
```

The compose file spins up MySQL, the API (port 4000) and the storefront (port 3000).
Migrations run automatically on first boot via `prisma migrate deploy`.

## Repository layout

```
aurora-school/
├── client/        # Next.js 16 App Router storefront + three consoles
├── server/        # Express 4 + Socket.IO + Prisma 6 API
├── scripts/       # check-env-example.js
├── docs/          # verification notes, ADRs
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## License

MIT — see `LICENSE`.
EOF
echo written
# Aurora School

[![CI](https://github.com/maileditorportfolio-star/aurora-school/actions/workflows/ci.yml/badge.svg)](https://github.com/maileditorportfolio-star/aurora-school/actions/workflows/ci.yml)

A production-ready, full-stack **school management system** for grades 1 to 10: students & admissions, teachers & staff, attendance, exams & grades, fees & payments, timetable, notices & events, library and transport — with an **admin console**, a **teacher console** and a **family (student/parent) portal**. Built on Next.js 16 (App Router) + Express + Prisma + MySQL, with JWT auth, role-based access control, granular permissions, real-time support chat, and a seeded demo school.

This repository contains **source code only**. No database, no credentials, and no runtime data are committed — you create your own environment from the provided `.env.example` files.

Installation, build and the unit suites are reproducible from the committed lockfile: `npm ci && npm run test:unit && npm run build`. The unit suites need no database or network; the MySQL integration suite is opt-in. [`docs/verification.md`](docs/verification.md) records the exact commands, the isolation matrix and the last verified results.

---

## Table of contents

1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Requirements](#requirements)
4. [Download the project](#download-the-project)
5. [Local setup](#local-setup)
6. [Project structure](#project-structure)
7. [Available scripts](#available-scripts)
8. [Testing](#testing)
9. [Verification](#verification)
10. [Customizing the project](#customizing-the-project)
11. [API reference](#api-reference)
12. [Deployment](#deployment)
13. [Docker](#docker)
14. [Troubleshooting](#troubleshooting)

---

## Features

### Public site (Next.js 16 App Router)

- **Home** (`/`) — hero, stats strip, feature grid, live notice board and upcoming events
- **Notices** (`/notices`) — pinned/urgent notices and the events calendar
- **Support chat** — floating widget backed by Socket.IO, persisted messages
- **Motion** — Framer Motion transitions and scroll reveals throughout

### Admin console (`/admin`)

- **Dashboard** — enrolment, today's attendance, fee collection, class strength, top defaulters, trend charts
- **Students** — admit, search, filter, archive, CSV export, guardian management, portal logins
- **Teachers & staff** — employee numbers, designations, qualifications
- **Classes & subjects** — grade structure, sections, subject catalogue, class-subject links
- **Teacher assignments** — class-wide or section-specific subject→teacher mapping
- **Attendance** — daily register per section, all-present/all-absent shortcuts, save under your name
- **Exams & marks** — exam setup, bulk marks entry per subject, printable result sheet with GPA
- **Fees & payments** — structures, bulk invoice generation, collection, waive, receipts
- **Timetable** — weekly grid per section (class/break/assembly), copy-to-all-days
- **Notices & events** — publish to the board and calendar, pin/urgent flags
- **Library** — catalogue, lending, returns with fines, lost handling
- **Transport** — routes, stops, vehicles, rider assignments
- **Team & permissions** — super admin creates admins and grants granular permissions
- **School settings** — name, contact, announcement, hero copy (live on the public site)

### Teacher console (`/teacher`)

- **Dashboard** — today's periods, notices, quick actions
- **Mark attendance** — only for assigned sections
- **Enter marks** — only for assigned subjects; result matrix view
- **My timetable** — Sunday–Thursday grid
- **Notices** — faculty announcements

### Family portal (`/portal`) — student & parent

- **Dashboard** — attendance rate, fees due, upcoming exams, latest marks per child
- **Attendance** — every marked day with status
- **Results & report cards** — printable per-exam result sheet with GPA
- **Fees & receipts** — invoices, balances, payment history
- **Timetable** — weekly grid
- **Notices** — family announcements
- **Library** — books on loan, due dates, fines
- **Transport** — route, stops, pickup time, driver contact
- **Multi-child** — parents switch between children from one account

### API (Express)

- **JWT auth** — login, profile, change password (no public self-registration; accounts are provisioned)
- **Role-based access** — `SUPER_ADMIN`, `ADMIN`, `TEACHER`, `STUDENT`, `PARENT`
- **Granular permissions** — `students.write`, `staff.write`, `classes.write`, `attendance.write`, `marks.write`, `fees.write`, `timetable.write`, `notices.write`, `library.write`, `transport.write`, `analytics.read`, `settings.write`. Super admins bypass.
- **Zod validation** — every request body schema-validated
- **Prisma + MySQL** — typed data layer, migrations, idempotent seed
- **Socket.IO** — real-time support chat
- **Security** — Helmet, CORS allow-list, rate limiting on auth, bcrypt hashing
- **Error tracking** — optional Sentry (lazy-loaded, disabled when `SENTRY_DSN` is empty)
- **Observability** — `/api/health` (liveness + DB reachability) and `/api/metrics`
- **Consistent responses** — `{ success, data | message, details }` envelope
- **Prisma P2002** (unique violation) mapped to 409 Conflict

---

## Tech stack

| Layer     | Technology                                             |
| --------- | ------------------------------------------------------ |
| Frontend  | Next.js 16.4 (App Router), React 19, TypeScript        |
| Styling   | Tailwind CSS 4, Framer Motion, Lucide icons             |
| State     | Zustand (auth, persisted to `localStorage`)            |
| Backend   | Node.js, Express 4, Socket.IO                           |
| Database  | MySQL 8 / MariaDB via Prisma 6                          |
| Auth      | `jsonwebtoken` (JWT) + `bcryptjs`                       |
| Validation| Zod                                                     |
| Security  | Helmet, `express-rate-limit`, CORS                      |
| Logging   | Pino (redacts secrets)                                  |

### Dependencies

Runtime dependencies live with the workspace that uses them:

- **API** — `server/package.json` (`express`, `@prisma/client`, `zod`, `pino`, …)
- **Storefront** — `client/package.json` (`next`, `react`, `zustand`, `framer-motion`, …)

The root `package.json` holds the workspace scripts, `concurrently` (invoked by the
production `npm start` script) and Prettier. A single `package-lock.json` at the root pins
the whole tree, so `npm ci` installs both apps reproducibly; CI verifies the lockfile does
not change after install. Run `npm run deps:check` (`npm outdated --workspaces`) to review
freshness across both manifests, and Dependabot proposes weekly minor and patch updates.

---

## Requirements

- **Node.js 20.9+** (developed on 20/24)
- **npm 10.9+**
- **MySQL 8+** or **MariaDB 10.6+** running locally
- A MySQL user with permission to create databases

Check your versions:

```bash
node -v
npm -v
mysql --version
```

---

## Download the project

### Option A — clone with Git (recommended)

```bash
git clone https://github.com/maileditorportfolio-star/aurora-school.git
cd aurora-school
```

Already have it locally but want the latest? Inside the project folder:

```bash
git pull origin main
npm install
```

### Option B — download as a ZIP

1. Open the repository on GitHub: <https://github.com/maileditorportfolio-star/aurora-school>
2. Click **Code → Download ZIP**
3. Unzip it and rename the folder to `aurora-school`
4. Open a terminal inside that folder

```bash
cd aurora-school
npm install
```

> The project uses **npm workspaces**, so a single `npm install` at the repository root installs the client and server dependencies together.

---

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create the database

```sql
CREATE DATABASE aurora_school CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Configure environment variables

**Server** — copy `server/.env.example` to `server/.env`:

```bash
# Windows PowerShell
Copy-Item server/.env.example server/.env

# macOS / Linux
cp server/.env.example server/.env
```

Edit `server/.env`:

```ini
PORT=4000
NODE_ENV=development

# Database (MySQL / MariaDB)
DATABASE_URL="mysql://root:yourpassword@localhost:3306/aurora_school"

# Auth — CHANGE THIS to a long random string
JWT_SECRET="change-me-to-a-long-random-string"
JWT_EXPIRES_IN="7d"

# Security
BCRYPT_ROUNDS=12
AUTH_RATE_LIMIT=20

# Client
CLIENT_URL="http://localhost:3000"
CORS_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"

# Logging (trace, debug, info, warn, error, fatal)
LOG_LEVEL=debug

# Demo seed password (development only)
SEED_DEMO_PASSWORD=aurora123

# Error tracking (optional — leave SENTRY_DSN empty to disable)
SENTRY_DSN=
SENTRY_ENVIRONMENT=development
SENTRY_RELEASE=
SENTRY_TRACES_SAMPLE_RATE=0
```

**Client** — copy `client/.env.example` to `client/.env.local`:

```bash
Copy-Item client/.env.example client/.env.local   # Windows
cp client/.env.example client/.env.local           # macOS / Linux
```

```ini
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

> `.env` and `.env.local` are git-ignored — your secrets never leave your machine.

### 4. Create the schema and seed demo data

```bash
npm run prisma:migrate   # applies migrations to your database
npm run seed             # inserts demo classes, students, teachers, fees, exams, notices
```

Optional — browse the data in a GUI:

```bash
npm run prisma:studio
```

### 5. Run both apps

```bash
npm run dev
```

- Storefront → <http://localhost:3000>
- API → <http://localhost:4000/api/health>

### Demo accounts (created by the seed, password `aurora123`)

| Role | Email | Console |
| ---- | ----- | ------- |
| Super admin | `admin@aurora.school` | `/admin` |
| Office admin (all permissions) | `office@aurora.school` | `/admin` |
| Teacher (Mathematics) | `arif@aurora.school` | `/teacher` |
| Student | `student@aurora.school` | `/portal` |
| Parent (two children) | `parent@aurora.school` | `/portal` |

> The seeded super admin can create standard admins from **Admin → Team** and choose their
> permissions. Change or delete these demo accounts before deploying anywhere public.

### Roles & permissions

| Role | Console access |
| ---- | -------------- |
| `SUPER_ADMIN` | Everything; bypasses permission checks |
| `ADMIN` | Only the permissions granted by the super admin |
| `TEACHER` | Teacher console — only assigned sections/subjects |
| `STUDENT` / `PARENT` | Family portal — only their own / their children's records |

Granular permissions: `students.write`, `staff.write`, `classes.write`, `attendance.write`,
`marks.write`, `fees.write`, `timetable.write`, `notices.write`, `library.write`,
`transport.write`, `analytics.read`, `settings.write`. Standard admins receive `403` on
any route outside their set. The API is the source of truth, and the sidebar hides
sections the signed-in admin cannot use.

---

## Project structure

```
aurora-school/
├── .github/
│   ├── workflows/              # ci, release, codeql, dependency-review, deps
│   ├── pull_request_template.md
│   └── dependabot.yml          # Weekly npm / actions updates
├── client/                     # Next.js 16 storefront + consoles
│   ├── app/                    # App Router routes
│   │   ├── page.tsx            # Home
│   │   ├── notices/            # Public notice board
│   │   ├── login/              # Sign-in
│   │   ├── admin/              # Admin console
│   │   ├── teacher/            # Teacher console
│   │   ├── portal/             # Family portal
│   │   ├── account/            # Profile & password
│   │   ├── layout.tsx          # Root layout, fonts, metadata
│   │   └── globals.css         # Tailwind layers + print styles
│   ├── components/
│   │   ├── admin/  chat/  layout/  motion/  providers/  ui/
│   ├── lib/                    # api.ts (typed client), utils.ts, gradebook.ts, permissions.ts
│   ├── store/                  # Zustand: auth.ts
│   ├── tests/                  # Vitest setup + RTL specs
│   ├── types/                  # Shared TypeScript types
│   ├── tailwind.config.js      # Theme tokens (teal palette, Fraunces display font)
│   ├── vitest.config.ts
│   ├── Dockerfile
│   └── next.config.js
│
├── server/                     # Express + Prisma API
│   ├── prisma/
│   │   ├── schema.prisma       # Data model (User, Student, Exam, FeeInvoice, …)
│   │   ├── migrations/         # Versioned SQL migrations
│   │   └── seed.js             # Idempotent demo seed
│   ├── src/
│   │   ├── index.js            # Entry point
│   │   ├── app.js              # Express app, middleware, CORS
│   │   ├── config/             # env.js, prisma.js, logger.js (Pino)
│   │   ├── controllers/        # one per module
│   │   ├── middleware/         # auth.js (guards), error.js (P2002→409)
│   │   ├── routes/             # Route definitions (mounted under /api)
│   │   ├── services/           # token.service.js, grade.service.js, settings.service.js
│   │   ├── socket/             # Socket.IO chat
│   │   ├── utils/              # ApiError, asyncHandler
│   │   └── validation/         # schemas.js (Zod)
│   ├── tests/                  # 26 unit spec files + integration/ (MySQL)
│   ├── vitest.config.js
│   ├── Dockerfile
│   └── .env.example
│
├── docs/
│   ├── verification.md         # Commands, isolation matrix, last verified results
│   └── adr/                    # Architecture decision records
├── scripts/                    # check-env-example.js
├── docker-compose.yml          # MySQL 8 + API + storefront
├── .nvmrc                      # Node 20 for nvm
├── .prettierrc                 # Shared formatting rules
├── package.json                # npm workspaces root + shared scripts
└── .gitignore
```

---

## Available scripts

Run from the repository root unless noted.

| Command                  | What it does                                                |
| ------------------------ | ----------------------------------------------------------- |
| `npm run dev`            | Runs API (nodemon) and storefront (`next dev`) together      |
| `npm run dev:server`     | API only, on `:4000`                                          |
| `npm run dev:client`     | Storefront only, on `:3000`                                   |
| `npm run build`          | Prisma generate + production build of both workspaces         |
| `npm start`              | Runs the built API and the built storefront                   |
| `npm run lint`           | ESLint for the API and the storefront                         |
| `npm run format`         | Rewrites every file with Prettier                             |
| `npm run format:check`   | Fails if any file is not Prettier-formatted                   |
| `npm run typecheck`      | `tsc --noEmit` for the client                                 |
| `npm test`               | Runs the API and storefront unit suites                       |
| `npm run test:unit`      | Both unit suites, no database or network                     |
| `npm run test:server`    | API specs only (Vitest + Supertest)                          |
| `npm run test:client`    | Storefront specs only (Vitest + Testing Library)             |
| `npm run test:coverage`  | Both suites with an HTML coverage report                     |
| `npm run test:integration` | API specs against a live MySQL (migrate + seed first)      |
| `npm run verify`         | Format, lint, typecheck, env docs and coverage gates         |
| `npm run verify:full`    | `verify` plus the dependency audit and both builds           |
| `npm run audit`          | `npm audit --audit-level=high --omit=dev`                    |
| `npm run check:env`      | Fails if a `process.env` variable is missing from an example |
| `npm run deps:check`     | `npm outdated --workspaces` for both workspaces              |
| `npm run prisma:migrate` | Create/apply a development migration                         |
| `npm run prisma:deploy`  | Apply migrations in production (no prompts)                  |
| `npm run prisma:studio`  | Browse your database in a GUI                                |
| `npm run seed`           | Insert demo data (safe to re-run)                            |
| `npm run docker:up`      | Builds and starts MySQL, the API and the storefront          |
| `npm run docker:down`    | Stops the Docker Compose stack                               |

---

## Testing

The repository ships with two database-free Vitest suites plus a separate
integration suite. `npm test` works on a clean checkout without MySQL.

```bash
npm test                  # API + storefront unit suites
npm run test:server       # 211 API specs
npm run test:client       # 12 storefront specs
npm run test:coverage     # + coverage reports, gated by thresholds
npm run test:integration  # 13 API specs against a live MySQL instance
```

The integration suite needs a migrated and seeded database. Locally:

```bash
npm run prisma:deploy
npm run seed
npm run test:integration
```

| Suite       | Tooling                                 | What it covers                                                                                                     |
| ----------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| API         | Vitest, Supertest, mocked Prisma client | Auth, students, staff, classes, attendance, marks/gradebook, fees, timetable, notices, library, transport, portal, teacher, admin stats, team, chat, metrics, error tracking, structured logging |
| Storefront  | Vitest, jsdom, React Testing Library    | Auth store, utils, grade-badge helper |
| Integration | Vitest, Supertest, real MySQL           | Health, auth flow, students CRUD, fees ledger |

Coverage is enforced: the API must stay above **82% statements, 60% branches,
78% functions, 85% lines**; the storefront thresholds are set for the minimal
suite. `npm run test:coverage` fails the build when a threshold regresses.

The API is CommonJS, so the unit specs inject a Prisma stand-in into
`require.cache` before the app is loaded. That keeps the HTTP layer, middleware
and validation fully exercised without touching a real database. The
integration specs deliberately skip the mock and load the real Prisma client.

Both unit suites emit JUnit XML and coverage in `json-summary` and `lcov` formats;
the integration suite emits its own JUnit file. CI uploads them as the
`unit-test-reports` and `integration-test-report` artifacts, so a run can be audited
without re-executing it.

CI (`.github/workflows/ci.yml`) runs formatting, linting, typechecking, both unit suites
with coverage gates, a blocking production-dependency audit and lockfile check, both
production builds, both Docker image builds, and a MySQL-backed job that applies
migrations, seeds the database, runs the integration specs and waits for `/api/health`.
A separate `deps.yml` workflow checks for outdated packages weekly. Dependency Review
runs on pull requests and CodeQL scans the source on pushes, pull requests and a weekly
schedule.

---

## Verification

Everything below is reproducible from a fresh clone. [`docs/verification.md`](docs/verification.md)
records the exact commands, the isolation matrix, the last verified results and the CI job
mapping.

```bash
npm ci
npm run test:unit   # 211 + 12 specs, no database
npm run build       # Prisma generate + Next production build (32 routes)
npm run verify      # format, lint, typecheck, env docs, coverage
```

### Isolation

| Target | Command | Needs MySQL |
| ------ | ------- | ----------- |
| API unit specs | `npm run test:server` | No — Prisma is injected through `require.cache` |
| Storefront unit specs | `npm run test:client` | No — jsdom and local fixtures |
| Both unit suites | `npm run test:unit` | No |
| Coverage gates | `npm run test:coverage` | No |
| Database integration | `npm run test:integration` | Yes — migrate and seed first |
| Production build | `npm run build` | No |

Only the integration suite loads the real Prisma client; CI runs it in a separate job with
a `mysql:8` service. Architecture decisions are recorded in [`docs/adr/`](docs/adr/), and
every pull request carries the test-evidence checklist in
`.github/pull_request_template.md`.

---

## Customizing the project

### Change the school name and copy

The public site reads from `SchoolSetting` (a single row in the database). Edit it from
**Admin → School Settings**, or seed it in `server/prisma/seed.js`. The announcement
ticker, hero description, contact details and principal name all flow from there.

### Change the color theme

`client/tailwind.config.js` holds every design token (teal palette, Fraunces display font):

```js
colors: {
  brand: { 50: '#f0fdfa', 500: '#14b8a6', 600: '#0d9488', ... },  // brand accent
  ink:   { 50: '#f8fafc', 900: '#0f172a', ... },                  // neutrals / text
  signal:{ 50: '#fffbeb', 300: '#fcd34d', ... },                   // gold accent
},
fontFamily: {
  sans: ['Inter', 'system-ui', ...],
  display: ['Fraunces', 'Georgia', 'serif'],
},
```

Swap the `brand` ramp for your school color and the whole UI follows. Fonts are loaded in
`client/app/layout.tsx` via `next/font/google`.

### Change the currency

`client/lib/utils.ts`:

```ts
export function formatCurrency(value: number, currency = 'BDT'): string {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}
```

### Change fees, grades or attendance rules

- Fee structures, invoices and payments are managed from **Admin → Fees**; no code changes
  needed for amounts or due days.
- The GPA scale lives in `server/src/services/grade.service.js` (SSC/HSC style: A+ at 80+ … F below 33).
- Attendance rate = present + late. Change it in `server/src/controllers/attendance.controller.js`
  and `server/src/controllers/portal.controller.js`.

### Add a new module or endpoint

1. Add a Zod schema in `server/src/validation/schemas.js`
2. Add the handler in `server/src/controllers/<area>.controller.js`
3. Register the route in `server/src/routes/<area>.routes.js` and mount it in `routes/index.js`
4. Guard it with `requireAuth` / `requireAdmin` / `requirePermission(...)`
5. Add the typed client method in `client/lib/api.ts`

### Extend the data model

Edit `server/prisma/schema.prisma`, then:

```bash
npm run prisma:migrate   # prompts for a migration name
npm run prisma:generate  # regenerate the typed client
```

### Provision accounts

Accounts are created by the school — there is no public self-registration. Use
**Admin → Team** for staff and **Admin → Students → Admit student** for students/guardians.
Portal logins are created from the student detail panel.

---

## API reference

Base URL: `http://localhost:4000/api`

Every response uses the envelope `{ success, data | message, details }`.

### Auth

| Method | Endpoint | Auth | Description |
| ------ | -------- | ---- | ----------- |
| POST | `/auth/login` | — | Sign in, returns a JWT |
| GET | `/auth/me` | token | Current profile |
| PATCH | `/auth/me` | token | Update name / phone |
| PATCH | `/auth/password` | token | Change password |

### Students

| Method | Endpoint | Auth | Description |
| ------ | -------- | ---- | ----------- |
| GET | `/students` | staff | List + search + filter + paginate |
| POST | `/students` | `students.write` | Admit a student |
| GET | `/students/:id` | staff | Detail + attendance rate |
| PATCH | `/students/:id` | `students.write` | Update |
| DELETE | `/students/:id` | `students.write` | Archive (soft delete) |
| POST | `/students/:id/account` | `students.write` | Create student portal login |
| POST | `/students/:studentId/guardians` | `students.write` | Add a guardian |
| POST | `/students/guardians/:id/account` | `students.write` | Create parent portal login |

### Classes, subjects, assignments

| Method | Endpoint | Auth | Description |
| ------ | -------- | ---- | ----------- |
| GET | `/classes` | staff/teacher | Class tree with sections and subjects |
| POST | `/classes` | `classes.write` | Create a class |
| POST | `/sections` | `classes.write` | Create a section |
| GET | `/subjects` | staff/teacher | Subject catalogue |
| POST | `/subjects` | `classes.write` | Create a subject |
| GET | `/assignments` | staff | Teacher→subject→class/section mappings |
| POST | `/assignments` | `classes.write` | Create or reassign an assignment |

### Attendance

| Method | Endpoint | Auth | Description |
| ------ | -------- | ---- | ----------- |
| GET | `/attendance?sectionId=&date=` | staff/teacher | Roster merged with marks |
| POST | `/attendance/mark` | staff/teacher | Save a register |
| GET | `/attendance/summary` | staff/teacher | Per-student counts + rate |

### Exams & marks

| Method | Endpoint | Auth | Description |
| ------ | -------- | ---- | ----------- |
| GET | `/exams` | staff/teacher | List exams |
| POST | `/exams` | `marks.write` | Create an exam with subjects |
| DELETE | `/exams/:id` | `marks.write` | Delete an exam |
| POST | `/exams/marks` | staff/teacher | Bulk marks entry (assigned teachers only) |
| GET | `/exams/marks/gradebook` | staff/teacher | Result matrix with GPA |

### Fees

| Method | Endpoint | Auth | Description |
| ------ | -------- | ---- | ----------- |
| GET | `/fees/structures` | staff | List fee structures |
| POST | `/fees/structures` | `fees.write` | Create a structure |
| GET | `/fees/invoices` | staff | Paginated invoice ledger |
| POST | `/fees/invoices` | `fees.write` | One-off invoice |
| POST | `/fees/invoices/generate` | `fees.write` | Bulk generation from a structure |
| POST | `/fees/invoices/:id/payments` | `fees.write` | Record a payment |
| POST | `/fees/invoices/:id/waive` | `fees.write` | Waive an invoice |
| GET | `/fees/students/:studentId/summary` | staff | Per-student totals |
| GET | `/fees/receipts/:paymentId` | staff | Receipt payload |

### Timetable, notices, library, transport

| Method | Endpoint | Auth | Description |
| ------ | -------- | ---- | ----------- |
| GET | `/timetable?sectionId=` | staff/teacher | Section grid |
| PUT | `/timetable/slots` | `timetable.write` | Replace the whole grid |
| GET | `/timetable/teacher` | teacher | The signed-in teacher's grid |
| GET | `/notices/public` | — | Live notices (family-safe) |
| GET | `/events/public` | — | Upcoming events |
| GET / POST / PATCH / DELETE | `/notices`, `/events` | staff | Manage notices and events |
| GET / POST / PATCH / DELETE | `/library/books` | staff | Catalogue CRUD |
| POST | `/library/issues` | `library.write` | Issue a book |
| POST | `/library/issues/:id/return` | `library.write` | Return with optional fine |
| GET / POST / PATCH / DELETE | `/transport/routes`, `/vehicles` | staff | Routes, stops, vehicles |
| POST | `/transport/assignments` | `transport.write` | Assign a student to a route/stop |

### Portal (student/parent)

| Method | Endpoint | Auth | Description |
| ------ | -------- | ---- | ----------- |
| GET | `/portal/overview` | portal | Children + attendance/fees/exams |
| GET | `/portal/attendance` | portal | Attendance records + rate |
| GET | `/portal/results` | portal | Result cards with GPA |
| GET | `/portal/fees` | portal | Invoices + totals |
| GET | `/portal/timetable` | portal | Weekly grid |
| GET | `/portal/notices` | portal | Family notices |
| GET | `/portal/library` | portal | Books on loan |
| GET | `/portal/transport` | portal | Route, stop, driver |

### Admin, settings, chat, metrics

| Method | Endpoint | Auth | Description |
| ------ | -------- | ---- | ----------- |
| GET | `/admin/stats` | `analytics.read` | Dashboard composite |
| GET / PATCH | `/admin/settings` | `settings.write` | School profile |
| GET / POST / PATCH | `/admin/users` | super admin | Team management |
| POST | `/admin/uploads/image` | admin | Image upload (max 5MB) |
| GET | `/settings/public` | — | Public school copy |
| GET | `/chat/:conversationId` | — | Chat history |
| POST | `/chat` | optional | Send a message |
| GET | `/health` | — | Liveness + DB reachability |
| GET | `/metrics` | — | Process + school metrics |

---

## Deployment

### 1. Prepare the server

```bash
npm ci
npm run build
```

Set production environment variables on the host — `NODE_ENV=production`, a real `DATABASE_URL`, and a strong `JWT_SECRET` (the API refuses to boot in production with the default secret).

Apply migrations without prompts:

```bash
npm run prisma:deploy
```

### 2. Run the API

```bash
npm run start:server
```

Put it behind a reverse proxy (Nginx / Caddy) and terminate TLS there. The app listens on `PORT` (default `4000`).

### 3. Deploy the storefront

`client/` is a standard Next.js app. Deploy to Vercel, or build and run it on your own server:

```bash
npm run build:client
npm run start:client
```

Set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL` to your public API URL **before building** — they are inlined at build time.

### 4. Seed or create your first admin

```bash
npm run seed
```

Then sign in and change the seeded passwords immediately. Set `SEED_DEMO_PASSWORD` to a strong value (or unset it in production, where the seed refuses to run with the default).

---

## Docker

The whole stack — MySQL 8, the API and the storefront — runs with one command.
Prisma migrations are applied automatically on API startup.

```bash
cp .env.example .env        # optional: override defaults
npm run docker:up           # builds and starts everything
```

| Service      | URL                             |
| ------------ | ------------------------------- |
| Storefront   | <http://localhost:3000>         |
| API          | <http://localhost:4000/api/health> |
| MySQL        | `localhost:3306`                |

Seed the demo data inside the running API container:

```bash
docker compose exec server npm run seed
```

Useful commands:

```bash
npm run docker:logs         # follow all container logs
npm run docker:down         # stop the stack
docker compose down -v      # stop and delete the database volume
```

Both images are multi-stage and run as the unprivileged `node` user with a
container health check. They are also built in CI to catch Dockerfile
regressions.

---

## Troubleshooting

**`Error: listen EADDRINUSE :::4000`** — another process holds the port. Find and stop it, or change `PORT` in `server/.env`.

**`Environment variable not found: DATABASE_URL`** — `server/.env` is missing or `DATABASE_URL` is unset. Copy `server/.env.example` to `server/.env` and fill it in.

**`Can't reach database server`** — MySQL is not running, or the host/port/credentials in `DATABASE_URL` are wrong. Test the connection with `mysql -u root -p -h localhost`.

**Prisma says the schema is out of sync** — run `npm run prisma:migrate` to create the missing migration.

**Storefront loads but shows no data** — the client cannot reach the API. Confirm `NEXT_PUBLIC_API_URL` matches the API host and that the API's `CORS_ORIGINS` includes your storefront origin.

**`JWT_SECRET must be set to a unique value in production`** — set a real secret before running with `NODE_ENV=production`.

**Stale build after editing the client** — stop the dev server and delete `client/.next`, then rebuild.

---

## Security

Please report vulnerabilities privately — see [`SECURITY.md`](SECURITY.md). The API refuses
to boot in production with the default `JWT_SECRET`, secrets are read from the environment,
`.env` files are git-ignored, demo passwords come from `SEED_DEMO_PASSWORD`, and
`npm run audit` blocks high-severity production advisories in CI.

---

## License

Released for use and modification. Replace the branding, demo data and copy with your own before going live.
EOF
echo written
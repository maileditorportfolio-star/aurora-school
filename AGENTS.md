# AGENTS.md

Guidance for AI coding agents working in the Aurora School repository.

## Project

Aurora School is a school management system: students & admissions, teachers & staff,
attendance, exams & grades, fees & payments, timetable, notices & events, library and
transport. Three role-gated consoles: admin, teacher, student/parent portal.

## Stack

- Monorepo (npm workspaces): `client/` (Next.js 16 App Router, React 19, Tailwind 4, TypeScript, Zustand)
  and `server/` (Express 4, Socket.IO, Prisma 6, MySQL, JWT, Zod, Pino).
- Database: MySQL 8 / MariaDB 10.4+. Local dev DB name: `aurora_school`.

## Conventions

- Server code is CommonJS (`require`/`module.exports`). Client code is TypeScript/TSX.
- All server routes live under `/api`. Public routes: `/api/health`, `/api/settings/public`,
  `/api/notices/public`, `/api/events/public`, `/api/auth/login`.
- Authentication: JWT bearer tokens. Accounts are provisioned by the school —
  `POST /api/auth/register` does not exist (returns 404).
- Permissions: granular `*.write` / `analytics.read` / `settings.write`. Super admins bypass.
- Teachers may only mark attendance / enter marks for sections they are assigned to
  (class-wide or section-specific `SubjectAssignment`).
- Grade scale: SSC/HSC GPA in `server/src/services/grade.service.js`.
- Prisma P2002 (unique violation) is mapped to 409 in `server/src/middleware/error.js`.
- Attendance rate = present + late.

## Running locally

- API: `npm run dev:server` (port 4000). Client: `npm run dev:client` (port 3000).
- MariaDB client: `D:\Bismillah\empty\mysql\bin\mysql.exe` (root, no password).
- Kill servers: `Get-NetTCPConnection -LocalPort 3000/4000 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`.

## Quality gates

- `npm run verify` — format, lint, typecheck, env docs, unit suites + coverage.
- `npm run test:integration` — needs live, seeded MySQL.
- Do not use PowerShell `Set-Content -Encoding utf8` (writes BOM); use the file tools.

## Do not

- Modify `D:\ecommerce1` — it is the reference standard only.
- Commit `.env` or `.env.local`.
EOF
echo written
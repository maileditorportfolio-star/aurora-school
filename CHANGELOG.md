# Changelog

All notable changes to Aurora School are documented in this file.

## [0.1.0] — 2026-11-03

### Added
- Initial release: full-stack school management system.
- Modules: students & admissions, teachers & staff, attendance, exams & grades,
  fees & payments, timetable, notices & events, library, transport.
- Three role-gated consoles: admin, teacher, student/parent portal.
- Gradebook with SSC/HSC-style GPA; printable result sheets.
- Real-time support chat (Socket.IO).
- Seed data: 40 students across 10 grades, 8 teachers, demo accounts.
- Unit suites (211 server specs, 12 client specs) and 13 integration specs.
- Docker Compose, CI workflow, environment documentation gate.

### Changed
- Accounts are provisioned by the school; public self-registration removed.
EOF
echo written
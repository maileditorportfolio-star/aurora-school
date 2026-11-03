# 0001 — Use one npm-workspaces monorepo with a single lockfile

- Status: Accepted
- Recorded: 2026-11-02

## Context

The storefront (`client/`) and API (`server/`) share types, environment conventions and a
release cadence. Two independent repositories would duplicate tooling, make coordinated
changes harder and produce two lockfiles that drift.

## Decision

Use a single root `package.json` with npm workspaces for `client` and `server`, one
`package-lock.json`, and root scripts that fan out to both workspaces. Runtime dependencies
stay in the workspace that uses them; the root holds workspace tooling and `concurrently`
because the production `npm start` invokes it.

## Consequences

- `npm ci` at the root installs both apps reproducibly; CI verifies the lockfile is
  unchanged after install.
- One Dependabot configuration covers the whole tree.
- Workspace-scoped dependency counts are not visible in the root manifest, so the README
  documents where runtime dependencies live and `npm run deps:check` reports freshness
  across both workspaces.

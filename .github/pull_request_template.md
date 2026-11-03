# Pull request

## Summary

<!-- What changes, and why. Link the issue or ADR when one exists. -->

## Test evidence

<!-- Paste the commands you ran and their result. Unit suites must pass without MySQL. -->

- [ ] `npm run test:unit`
- [ ] `npm run test:coverage`
- [ ] `npm run build`
- [ ] `npm run test:integration` (only when the change touches Prisma, controllers or auth)
- [ ] `npm run verify` (format, lint, typecheck, env docs, coverage)

## Checklist

- [ ] The behaviour change and the spec that pins it are in the same commit.
- [ ] `CHANGELOG.md` has an entry for user-visible changes.
- [ ] New environment variables are added to the matching `.env.example`
      (`npm run check:env` passes).
- [ ] No `.env` files, credentials, database dumps or uploads are included.
- [ ] The commit subject uses a conventional prefix and the diff stays focused.

# MediaMatrix engineering guide

## Scope and review gates

- The active assignment is Phase 2 (core validation and discovery). **Do not begin later phases without new explicit human approval.**
- Preserve working features. The repository already contains later-phase modules; their presence is not permission to rewrite or extend them during this review.
- Do not deploy to production, apply destructive migrations, seed real environments, or configure live paid services without explicit approval.
- Keep changes scoped and use focused commits. Do not commit generated builds, dependencies, exports, database dumps, or secrets.

## Repository map

- `apps/web`: Next.js App Router UI, APIs, auth and application components.
- `packages/config`: Zod environment validation and integration-status projection.
- `packages/database`: Prisma schema, migration, seed and lazy PostgreSQL client.
- `packages/shared`: Shared contracts and display helpers.
- `packages/ui`: Reusable UI primitives.
- `packages/api-client`: Browser API client and normalized errors.
- `packages/media-engine`: Playback source/format helpers.
- `packages/cms-editions`: WordPress/Blogger sources and distribution exporter.
- `services/*`: TMDB, availability, playlists, GitHub, media-server and transcoder boundaries.
- `workers/*`: Explicitly configured background schedulers.
- `tests`: Unit, integration, security and Playwright tests.
- `docs`: Architecture, audit, roadmap, decisions and operational guides.

Do not create empty placeholder packages or confuse untracked empty local directories with source modules.

## Required foundation commands

Use Node 22 and pnpm 9.15.9:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm db:validate
pnpm db:generate
pnpm -r --no-bail --if-present typecheck
pnpm lint
pnpm test:unit
pnpm test:integration
pnpm test
pnpm build
pnpm validate:config
pnpm audit --prod --audit-level=high
git diff --check
```

When a sandbox cannot download Prisma native engines, record the exact limitation. Never substitute a dummy executable for a migration diff or claim that an authored migration was generated/executed when it was not.

`pnpm test:integration` uses a disposable PostgreSQL 17 cluster and direct migration-SQL mode by default. `MEDIAMATRIX_TEST_MIGRATION=prisma pnpm test:integration` runs the real CLI migration path and must never use a dummy engine. Live TMDB additionally requires authorized credentials and `MEDIAMATRIX_LIVE_TMDB=1`.

Browser tests additionally require Chromium and a built/startable application. Report skipped tests separately from passed tests.

## Coding conventions

- Use strict TypeScript and existing package aliases. Validate external input with Zod at trust boundaries.
- Keep server-only credentials out of `NEXT_PUBLIC_` variables, client components, public responses and logs.
- Preserve normalized `ApiError` responses and honest empty/error states.
- Route API errors through the request-aware handlers and use the shared JSON log schema; do not log raw ORM/provider errors, query strings or request bodies.
- Reuse `packages/ui` primitives where appropriate; do not move application-specific components prematurely.
- Avoid new dependencies, especially paid services, unless a requirement justifies them and the decision is recorded.
- Do not weaken lint/security rules to make a change pass. Narrow existing relaxed rules only through a reviewed maintenance change.
- Keep test fixtures and mocked providers out of production runtime paths.

## Database and migration rules

- Review `packages/database/prisma/schema.prisma` and the migration before any database operation.
- Never run `db:migrate`, `db:deploy`, or `db:seed` against a real/shared database without explicit operator approval and a backup where applicable.
- The initial migration is manually authored and executed against disposable PostgreSQL in Phase 2 tests. Shared/production migration remains a separate operator-approved acceptance step.
- Use least-privilege, non-production credentials for integration tests and never print connection strings.

## Security and privacy

- Do not log environment objects, authorization headers, reset tokens, raw request bodies, signed media URLs, or provider credentials.
- Keep origin checks, streamed body limits, output escaping, RBAC/session revalidation and URL/private-network defenses intact.
- `AUTH_TRUST_HOST`, `TRUST_PROXY`, and private-network source flags require a matching trusted topology; do not enable them unconditionally.
- Only connect media sources the operator owns or is authorized to use. No DRM/paywall/access-control bypass work.

## Definition of done

A change is complete only when:

1. It stays within the approved phase and preserves existing behavior.
2. Relevant lint/type/test/build/config checks actually run and results are reported accurately.
3. Documentation identifies new configuration, operational impact and unverified external behavior.
4. `git diff --check` passes and no secrets/generated artifacts enter Git.
5. Failed, skipped and unexecuted checks are not described as passes.
6. The work stops at the current review gate until approval is given.

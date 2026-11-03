# Testing and verification

## Commands

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm -r --no-bail --if-present typecheck
pnpm test
pnpm test:unit
pnpm test:integration
pnpm test:security
pnpm build
pnpm audit --prod --audit-level=high
pnpm validate:config
pnpm exec playwright install chromium
pnpm test:e2e
pnpm export:all
pnpm validate:export
```

Prisma configuration requires placeholder `DATABASE_URL`/`DIRECT_URL` values for schema-only commands. Sandboxes that cannot download the native schema engine may use the previously validated `PRISMA_SCHEMA_ENGINE_BINARY=/bin/true` override **only for `db:validate`/`db:generate` on the packaged WASM path**. Never use that override for migration acceptance.

## Isolated PostgreSQL acceptance

`tests/integration/database-auth-library.test.ts` starts a real, disposable PostgreSQL 17 cluster using the development-only `embedded-postgres` package. It generates a temporary directory, random password, and available local port; no shared database or committed credential is used. The cluster is stopped and removed after the suite.

Two explicit migration modes exist:

```bash
# Offline-capable local diagnostic: apply each checked-in migration SQL file in order.
pnpm test:integration

# Real Prisma CLI acceptance: runs pnpm db:deploy and checks _prisma_migrations.
MEDIAMATRIX_TEST_MIGRATION=prisma pnpm test:integration
```

The default `sql` mode is real PostgreSQL execution of the migration artifact, but it is **not** labeled as a Prisma CLI migration. The `prisma` mode requires the native Prisma schema engine and is the CI acceptance path. Both modes then run the real seed and the same schema/auth/library assertions.

Coverage includes:

- 28 application tables, seven enums, and—when using `prisma` mode—completed migration records.
- Canonical roles and 35 genre mappings, generated administrator seeding, and credential-safe password hashes.
- Registration, duplicate conflicts, malformed JSON, credential authorization, unknown/wrong/soft-deleted users, and generic failures.
- User/admin RBAC, profile/preferences persistence, and stale session-version rejection.
- Watchlist/favorites upsert and persistence, cross-user read/removal isolation, and metadata validation.
- Playback progress, resume filtering, recent-history deduplication, history clearing, and audit records.

Rollback/destructive recovery, production backup/restore, and shared-database seeding are not performed by this suite.

## TMDB contract modes

Deterministic tests use mocked transport fixtures only:

```bash
pnpm exec vitest run tests/integration/tmdb-client.test.ts
```

They cover bearer/API-key handling, caching, retries/timeouts, pagination bounds, malformed JSON and nested records, movie/TV details, seasons/episodes, people, image paths, and safe provider errors. Fixtures never enter production runtime paths.

The client permits four concurrent upstream requests, defaults to two retries, honors numeric `Retry-After` up to a two-second delay cap, and applies endpoint-specific in-memory TTLs. Provider quotas/terms still apply. The site footer retains TMDB attribution and the non-endorsement notice.

Live acceptance is read-only and doubly opt-in:

```bash
MEDIAMATRIX_LIVE_TMDB=1 \
TMDB_ACCESS_TOKEN='YOUR_AUTHORIZED_TOKEN' \
pnpm exec vitest run tests/integration/tmdb-live.test.ts
```

`TMDB_API_KEY` may be used instead. `TMDB_API_BASE_URL` is honored only when explicitly configured. Do not put real credentials in shell history on a shared machine or in CI logs. Without both the flag and credentials, all three live tests report **skipped**. A mocked pass is never presented as live connectivity.

## Coverage of automated tests

- Environment defaults, URL/boolean/numeric validation, complete integration flags and non-secret status projections.
- Health behavior for unconfigured, reachable and unreachable database states, including cache and secret-exposure checks.
- Real isolated PostgreSQL migration/seed/auth/RBAC/profile/library/history/progress behavior described above.
- TMDB mocked contracts and separately labeled live acceptance.
- Public discovery route page/type/query bounds and media-only response shaping.
- Search suggestion loading/success/empty/error behavior, runtime result filtering, combobox keyboard semantics, mobile Escape/focus return, reduced motion, and visible focus.
- Media-grid success/empty rendering, missing-poster fallback, pagination disabled semantics, accessible loading announcements, and horizontal-overflow checks.
- Request-ID validation/propagation and JSON logs without query strings, provider details, IP addresses, or raw error messages.
- Process-local rate-limit windows, scopes, retry/correlation headers, proxy trust, and spoof resistance.
- M3U parsing, playback helpers, availability normalization, source security, CMS exports, transcoder helpers, and existing release structure checks.

## Browser verification

```bash
pnpm exec playwright install chromium
pnpm test:e2e
# Discovery only, when iterating:
pnpm exec playwright test --list
```

Playwright runs the real built application in CI on desktop Chromium and Pixel 7 mobile Chromium. Suggestion responses are explicitly named browser fixtures injected with `page.route`; they are not presented as live TMDB content. Server-rendered catalog success still requires separately authorized provider acceptance.

The local sandbox could not download Chromium, so local browser assertions are not claimed. `playwright test --list` validates discovery only; the CI browser job is the execution evidence.

## External verification matrix

The following require explicit environments and must not be inferred from unit tests:

| Check | Required environment/status |
| --- | --- |
| Disposable migration/seed/auth/library | Automated locally with PostgreSQL 17; CI separately runs Prisma CLI mode |
| Shared/production migration, backup, rollback, restore | Approved operator environment; not performed |
| Live TMDB catalog | Authorized credentials/network plus `MEDIAMATRIX_LIVE_TMDB=1`; skipped otherwise |
| Live availability | Valid availability provider credentials |
| HLS/DASH/native playback | Authorized streams, codecs, browser/CORS |
| GitHub private synchronization | Authorized repository/token |
| Jellyfin browsing/playback | Authorized test Jellyfin server |
| FFmpeg transcoding | FFmpeg plus authorized input and durable storage |
| SMTP recovery | Test SMTP inbox |
| Vercel/Netlify deployment | Provider project/account |
| WordPress activation | Supported WordPress/PHP host |
| Blogger upload/rendering | Blogger test blog |
| Docker builds/runtime | Docker daemon; CI builds images, local runtime remains separate |

`release/verification.json` records release-time evidence. A skipped check is not a pass. A failed prerequisite (for example a browser download) is reported separately from assertions that never ran.

## CI

GitHub Actions runs quality, browser, container-build, and export jobs. Quality includes the isolated PostgreSQL suite with `MEDIAMATRIX_TEST_MIGRATION=prisma`; live TMDB remains skipped unless separately authorized. CI does not deploy, migrate a production database, publish releases, or contact private media sources.

The existing action majors were retained for this mixed phase. Checkout/setup-node/upload-artifact v7 and pnpm/action-setup v6 were evaluated on 2026-11-03; their multi-major runtime/behavior changes belong in an isolated maintenance change rather than being hidden in Phase 2.

## Phase 2 local evidence snapshot — 2026-11-03

- Frozen lockfile install: passed.
- Prisma schema validation and Client 7.10.1 generation: passed on the documented schema-only WASM path.
- Workspace typechecks: 16/16 passed.
- ESLint: passed with global `no-explicit-any` and `error-boundaries` enforcement; six named legacy effect exceptions remain.
- Full Vitest: **69 passed, 3 skipped** across 17 files. Skips are the opt-in live TMDB tests.
- Deployment configuration: 7/7 structural checks passed.
- Production dependency audit: no known vulnerabilities.
- Production build: passed; 20 static pages and standalone assets prepared.
- Playwright: 20 tests discovered across two projects; local execution unavailable, CI execution required.
- `git diff --check`: passed.

# Phase 2 implementation plan — core validation and discovery

**Status:** implemented; available local and CI gates passed, with external acceptance limits recorded in `docs/TESTING.md`; no later phase is authorized

**Baseline:** `7e3352b454238ae76b303fe2832d6c6a3a1b912b`  
**Architecture:** preserve the existing Next.js modular monolith, Prisma persistence, NextAuth authentication, provider services, and Vitest/Playwright test stack.

## 1. Objective and acceptance boundary

Phase 2 converts the foundation into evidence-backed core behavior:

1. apply the checked-in migration to an isolated PostgreSQL database and exercise database-backed auth/library flows;
2. validate TMDB contracts with deterministic fixtures and run authorized live acceptance only when credentials are available;
3. validate discovery UX on desktop/mobile, including accessibility and loading/empty/success/error behavior;
4. add request correlation and structured operational logging, reduce focused lint debt, make the shared rate-limit contract explicit, and maintain CI.

The phase is complete only when implemented checks are reported accurately as passed, failed, skipped, or unverified. It does not authorize production deployment, provider writes, a merge, or Phase 3+.

## 2. Scope and non-goals

### In scope

- Disposable PostgreSQL 17 test infrastructure and real migration execution.
- Registration, credential login, protected library reads/writes, persistence, and cross-user isolation.
- TMDB mocked contract tests and opt-in live health/read-only contract checks.
- Existing discovery routes/components/hooks, with focused fixes demonstrated by tests.
- Request-ID propagation, safe structured logs, pagination/input boundaries, and focused type safety.
- Rate-limit documentation/tests and CI execution of the new acceptance checks.
- Testing, configuration, architecture, roadmap, and limitation documentation.

### Out of scope

- New product architecture, visual redesign, paid services, fake production data, or unnecessary runtime dependencies.
- Production/shared database operations, deployment, destructive migration repair, or real secrets in the repository.
- Unauthorized provider calls, playback/transcoding, CMS installation, mobile native apps, or later roadmap phases.
- Claiming that mocked tests prove a live provider or external service.

## 3. Required files and likely touchpoints

The exact final list will be recorded in the Phase 2 report. Expected areas are:

| Area | Existing files to inspect/reuse | Planned additions or focused edits |
| --- | --- | --- |
| Database | `packages/database/prisma/*`, `packages/database/src/index.ts`, `apps/web/auth.ts`, `apps/web/lib/credentials.ts`, `apps/web/app/api/user/*` | Integration harness/tests; schema/migration only if a demonstrated defect requires it |
| Auth/API | `apps/web/app/api/auth/*`, `apps/web/app/api/user/*`, `apps/web/lib/api.ts`, `apps/web/lib/observability.ts` | Focused validation/correlation/logging changes and route tests |
| Provider | `services/tmdb/src/index.ts`, `apps/web/app/api/public/discover/route.ts`, `apps/web/app/api/public/search/route.ts`, `apps/web/app/api/search/suggestions/route.ts` | Typed unknown-record handling, mocked/live contract tests, redacted failures |
| Discovery | `apps/web/components/search-box.tsx`, `apps/web/components/site-header.tsx`, `apps/web/components/catalog-filters.tsx`, `apps/web/components/media-grid.tsx`, `apps/web/app/movies/page.tsx`, `apps/web/app/tv/page.tsx`, `apps/web/app/search/page.tsx` | Focused UX/accessibility fixes and component/Playwright assertions |
| Reliability | `apps/web/lib/rate-limit.ts`, `apps/web/middleware.ts`, `eslint.config.mjs`, `vitest.config.ts`, `.github/workflows/ci.yml` | Structured request context, narrowed lint rules, rate-limit contract tests, CI database acceptance |
| Documentation | `README.md`, `.env.example`, `docs/TESTING.md`, `docs/ARCHITECTURE.md`, `docs/IMPLEMENTATION-ROADMAP.md`, `docs/LIMITATIONS.md` | Exact commands, evidence boundaries, environment examples, and remaining risks |

Generated Prisma clients, PostgreSQL binaries/data, Playwright output, caches, and exports must remain untracked.

## 4. Dependencies and environment

- Keep runtime dependencies unchanged unless a demonstrated requirement says otherwise.
- Add `embedded-postgres` only as a pinned development/test dependency if its isolated PostgreSQL 17 runtime passes local validation. It supplies a real database without Docker or a shared server; it is not production infrastructure.
- Reuse existing Prisma, NextAuth, Zod, Vitest, Testing Library, and Playwright dependencies.
- Live TMDB checks are opt-in and read-only. They require an authorized `TMDB_API_KEY` or `TMDB_ACCESS_TOKEN` in the execution environment. Missing credentials produce an explicit skip, never a fabricated pass.
- Test database credentials are generated locally and never committed. No existing environment secret is printed or copied into documentation.

## 5. Database and API plan

1. Start an ephemeral PostgreSQL 17 cluster with a temporary data directory and random credentials/port.
2. Apply the checked-in migration through the real Prisma migration path where supported. If the CLI cannot run, report that separately from any direct SQL diagnostic; never relabel direct SQL as `prisma migrate deploy` success.
3. Verify expected tables, enums, constraints, and indexes from the actual database.
4. Exercise registration, password verification/session-adjacent auth logic, library CRUD, persistence, unique constraints, invalid credentials, and cross-user access denial.
5. Use the existing normalized API response helpers and ownership predicates. Avoid changing public response shapes unless required to fix a verified defect.
6. No production schema change is planned. Any necessary migration change requires a new reviewed migration and explicit documentation; no destructive operation is authorized.

API behavior to validate includes bounded/validated query parameters, malformed JSON, safe provider failures, request-ID response propagation, authentication requirements, and generic public errors.

## 6. Security and privacy controls

- Keep provider tokens and database URLs server-side; use placeholders in examples.
- Redact provider URLs/query strings, authorization headers, cookies, request bodies, and database details from logs.
- Accept or generate a bounded request ID; do not reflect arbitrary headers into logs/responses.
- Treat all provider JSON as untrusted and normalize it without `any` in the focused modules where practical.
- Preserve generic login errors and user-scoped database predicates.
- Rate limits remain defense-in-depth; document whether the current store is process-local and what a multi-instance deployment requires.
- Do not run database repair/reset, force pushes, deployment, or production network changes.

## 7. Test and quality plan

### Focused fast checks

- Unit: environment, API helpers, request IDs/logging, rate limiting, provider fixtures, discovery state/accessibility helpers.
- Integration: real migration, auth credentials, library persistence/isolation, API validation/error mapping.
- Browser: existing public/discovery journeys plus keyboard, mobile menu/search, loading/empty/error assertions supported by accessible locators.

### Final local gate

Run the relevant commands and capture exact outcomes:

- `pnpm install --frozen-lockfile`
- Prisma validate/generate and isolated migration/database tests
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test` (or the exact focused/full scripts used)
- `pnpm test:config`
- `pnpm build`
- `pnpm audit --prod`
- documentation-link and whitespace/error checks
- Playwright locally if Chromium is available; otherwise report the local limitation and use the CI browser job as evidence

### CI and review

- Add isolated database acceptance to CI only after it is reliable and does not require secrets.
- Keep live TMDB separate and explicitly skipped without authorized credentials.
- Review the full diff for accidental deletions, unrelated edits, secrets, debug code, generated artifacts, dependency risk, and missing tests before committing.
- Push only `arena/ec083c70-flixhub`; do not merge or deploy.

## 8. Risks and fallbacks

| Risk | Handling |
| --- | --- |
| Embedded PostgreSQL lacks a host library or cannot run in CI | Capture the exact failure, isolate it to the database job, and report database acceptance as unverified rather than substituting mocks |
| Prisma migration CLI requires an unavailable engine | Attempt the supported packaged/WASM path; distinguish CLI migration results from direct SQL diagnostics |
| No TMDB credentials | Keep deterministic provider tests and mark all live checks skipped; do not weaken contracts to match invented responses |
| Browser assertions expose pre-existing issues | Reproduce, classify, make only focused Phase 2 fixes, and disclose anything unresolved |
| Global lint exceptions conceal many unrelated errors | Narrow only rules/files that can be cleaned safely; document remaining debt instead of broad rewrites |
| In-memory rate limits differ across instances | Preserve current behavior, test its contract, and document the distributed-store production requirement |

## 9. Completion evidence and stop condition

The final response will contain the requested 12 sections: phase; implementation; files; database; APIs; security; exact tests; build; limitations; Git/PR status; next phase; and approvals. It will include command-level evidence, skipped/unverified checks, and remaining risks.

Work stops after Phase 2 verification, documentation, diff review, and branch delivery. Later phases require new owner instruction.

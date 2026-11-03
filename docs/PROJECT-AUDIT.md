# MediaMatrix repository audit

> Historical Phase 0/Phase 1 baseline. Statements about unexecuted database runtime and basic logging describe that checkpoint. Current Phase 2 implementation and evidence are in `docs/TESTING.md` and `docs/IMPLEMENTATION-ROADMAP.md`.

**Audit date:** 2026-11-03
**Audited baseline:** `07b60dc` on `arena/ec083c70-flixhub`
**Classification:** **C — existing working application**

The current checkout is not empty and is not merely a scaffold. It contains a Next.js application, reusable packages, service adapters, workers, database schema/migration, tests, deployment configuration, and distribution tooling. A previous clean-HEAD CI run passed quality, browser, container-build, and export jobs. That evidence does not prove external database/provider/CMS/production behavior.

This Phase 0/Phase 1 review preserves all existing features, including source modules that go beyond the current review gate. Their presence is not treated as approval to begin additional Phase 2 work.

## 1. Repository inventory

| Area | Existing implementation | Evidence |
| --- | --- | --- |
| Application framework | Next.js 15 App Router, React 19, TypeScript, standalone production output | `apps/web`, `apps/web/next.config.ts` |
| Package management | pnpm 9.15.9, lockfile, Node 22 engine, workspace scripts | `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` |
| Monorepo/tasks | `apps/web`, `packages/*`, `services/*`, `workers/*`; Turbo task configuration | `pnpm-workspace.yaml`, `turbo.json` |
| TypeScript/linting | Strict shared TS config, `noUncheckedIndexedAccess`, ESLint 9, Next and React Hooks rules | `tsconfig.base.json`, package tsconfigs, `eslint.config.mjs` |
| Shared configuration | Zod-validated server environment, safe defaults, integration-status projection | `packages/config/src/index.ts` |
| UI foundation | Tailwind, reusable buttons/cards/badges/skeletons/logo/empty/error states, responsive app components | `packages/ui`, `apps/web/components`, `apps/web/app/globals.css` |
| Database | PostgreSQL, Prisma 7 driver adapter, lazy client, schema, initial migration and seed | `packages/database` |
| API/error handling | Typed `ApiError`, normalized JSON errors, body limits, origin checks, user/admin guards | `apps/web/lib/api.ts`, `apps/web/app/api` |
| Logging | Basic process-boundary `console` logging with sensitive-value avoidance; Prisma warning/error logging | API, seed, transcoder and worker entry points |
| Health | Dynamic `/api/health`, database reachability probe, non-secret configuration flags, degraded 503 behavior | `apps/web/app/api/health/route.ts` |
| External APIs | Real server-side TMDB, availability, GitHub, Jellyfin and SMTP adapters; no sample catalog fallback | `services`, `apps/web/lib` |
| Tests | Vitest unit/integration/security tests and Playwright desktop/mobile projects | `tests`, `vitest.config.ts`, `playwright.config.ts` |
| CI | Frozen install, Prisma validation/generation, lint, typechecks, tests, build, audit, browser, container and export jobs | `.github/workflows/ci.yml` |
| Containers | PostgreSQL/web Compose services, optional worker/transcoder profiles, non-root Dockerfiles | `docker-compose.yml`, `infrastructure/docker` |
| Provider deployment | Vercel and Netlify configuration; no production deployment credential or claim | `vercel.json`, `netlify.toml`, `docs/DEPLOYMENT.md` |
| Documentation | README plus architecture, security, testing, deployment, export, CMS and limitation guides | `README.md`, `docs` |
| Release evidence | Machine-readable check statuses and release notes | `release/verification.json`, `RELEASE_NOTES.md` |

The tracked baseline contains 252 files. Local empty directories such as `apps/blogger`, `apps/wordpress`, `deployment`, and `workers/transcoder-worker` are not tracked source modules and must not be mistaken for implemented packages. Actual CMS sources live in `packages/cms-editions`.

## 2. Existing application modules

Source exists for discovery/search/details, authentication, account libraries, playback, M3U playlists, GitHub synchronization, Jellyfin, transcoding, administration, public CMS APIs, WordPress/Blogger presentation clients, and distribution exports. These are existing features to preserve, not Phase 1 deliverables to rewrite.

Verification is layered:

- **Verified in previous CI:** dependency installation, Prisma schema validation/client generation, lint, typechecks, unit/security tests, production build, public browser tests, Docker image builds, and export structure/checksums.
- **Structurally verified only:** initial SQL migration coverage, deployment files, CMS package structure, and provider configuration.
- **Still environment-dependent:** applying the migration, database-backed auth/CRUD, live provider connectivity, real media playback/transcoding, SMTP delivery, Compose runtime, CMS installation, and provider deployment.

See `release/verification.json` for the baseline evidence and `docs/TESTING.md` for the external test matrix.

## 3. Phase 0 documentation gaps

Before this review, the repository did not contain the requested `PROJECT-AUDIT.md`, implementation roadmap, technical-decision record, or root `AGENTS.md`. `ARCHITECTURE.md` existed but needed explicit foundation boundaries, dependency direction, logging, health, and review-gate guidance.

These are documentation/governance gaps, not reasons to replace the working application.

## 4. Architecture concerns and technical debt

### Near-term foundation concerns

1. **Database runtime is unverified locally.** The initial migration was manually authored from the Prisma schema and structurally tested, but has not been applied to an approved PostgreSQL database. It must not be represented as Prisma-diff-generated or production-proven.
2. **Basic logging is not structured or correlated.** Existing logging is intentionally small and avoids secrets, but there are no request IDs, common log schema, or central log drains. This is acceptable for Phase 1 and technical debt for production hardening.
3. **Rate limiting is process-local.** Multi-instance deployments need a shared limiter or edge enforcement. `REDIS_URL` is reserved configuration, not evidence of a Redis-backed limiter.
4. **Some lint guardrails are relaxed.** `no-explicit-any`, `react-hooks/error-boundaries`, and `react-hooks/set-state-in-effect` are disabled globally for TypeScript. Future work should narrow exceptions rather than weakening checks further.
5. **Auth.js uses a beta release line.** The dependency is pinned and tested, but upgrades need focused session/RBAC regression tests.
6. **CI action deprecation warnings remain.** The previous CI run passed but reported Node 20 action-runtime deprecation warnings. Action major upgrades should be evaluated separately rather than mixed into feature work.

### Scaling and operational debt

- The transcoder is intentionally single-instance with local durable state/output. A shared queue and object-storage adapter are not implemented.
- S3/MinIO environment entries are reserved and do not constitute an implemented storage backend.
- The catalog synchronizes explicit IDs; it is not a complete TMDB mirror.
- Jellyfin is the only media-server adapter; Plex is not implemented.
- WordPress/Blogger are presentation clients, not full-stack backend ports.

## 5. Security review

### Existing strengths

- `.env` and common secret/runtime artifacts are ignored; `.env.example` contains placeholders only.
- Secrets remain server-side; health/integration responses expose booleans rather than credential values.
- Authentication includes password hashing, session-version checks, current-role revalidation, and reset-token protections.
- Request validation includes Zod schemas, streamed byte limits, origin checks, output normalization, and secure headers/CSP.
- Remote-source code includes protocol/private-network/redirect/byte-limit defenses.
- Audit logs and explicit authorization attestations exist; these do not prove media rights.

### Concerns requiring operational attention

- Never enable `AUTH_TRUST_HOST`, `TRUST_PROXY`, or private-network source access without a matching trusted network/proxy topology.
- Compose exposes PostgreSQL and transcoder ports for development; production deployments must restrict them.
- A shared rate limiter, egress controls, secret management, HTTPS, backups, and dependency/image scanning remain production responsibilities.
- No migration, seed, deployment, or live-provider test should run without explicit environment approval and appropriate credentials.

## 6. Deployment constraints

- Node 22 and pnpm 9.15.9 are required.
- PostgreSQL is external to serverless hosting and mandatory for authenticated/ready operation.
- FFmpeg requires a persistent worker and durable storage; serverless filesystems are unsuitable.
- Next standalone output needs its static/public assets prepared; the existing build script handles this.
- Runtime exports require a clean self-hosted Git checkout and external output directory; serverless runtime export is deliberately disabled.
- Vercel/Netlify configuration and Docker image builds are not deployments.

## 7. Recommended next actions

1. Review the completed Phase 0/Phase 1 documentation, environment, Compose, and focused foundation-test changes; no product feature was rewritten.
2. Submit Phase 0/Phase 1 for human review and record any corrections.
3. Only after explicit approval, begin Phase 2 with isolated PostgreSQL migration/auth validation and live TMDB contract/acceptance tests.
4. Keep production deployment, destructive migrations, secret provisioning, and unrelated later-phase feature expansion outside the Phase 1 gate.

## 8. Phase 1 verification results

Executed on 2026-11-03 against this review's working tree:

| Check | Actual result |
| --- | --- |
| `pnpm install --frozen-lockfile` | Passed; lockfile already up to date, no dependency changes |
| `pnpm db:validate` | Passed with required placeholder build URLs; no database connection or migration |
| `pnpm db:generate` | Passed; Prisma Client 7.10.1 generated |
| `pnpm -r --no-bail --if-present typecheck` | Passed for 16/16 workspace projects with typecheck scripts |
| `pnpm lint` | Passed |
| `pnpm test:unit` | 26/26 tests passed in 8/8 files |
| `pnpm test` | 39/39 tests passed in 11/11 files |
| `pnpm validate:config` | 7/7 structural checks passed |
| `pnpm audit --prod --audit-level=high` | No known vulnerabilities found |
| `pnpm build` | Passed; Next.js compiled/type-checked and generated 20 static pages plus standalone assets |
| `git diff --check` | Passed |

An initial Prisma validation invocation without `DATABASE_URL` stopped before schema validation because `prisma.config.ts` requires that variable. It was rerun with the non-secret placeholder URLs used by CI. Prisma's local observed WASM validate/generate path was used; this is not a migration or database-runtime claim.

Playwright was not rerun locally during this Phase 1 gate. Previous CI browser/container/export evidence remains recorded separately in `release/verification.json`; no new external-service verification is claimed.

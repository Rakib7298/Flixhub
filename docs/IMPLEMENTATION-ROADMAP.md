# Implementation roadmap

## Current gate

**Phase 0 and Phase 1 are the only active scope. Phase 2 is blocked pending explicit human approval.**

The repository already contains later-phase source modules. They are preserved as existing work. This roadmap does not retroactively claim that those modules were reviewed, externally verified, or approved for production.

## Phase 0 — repository audit and planning

- [x] Inspect tracked repository structure and application framework.
- [x] Inventory dependencies, TypeScript, pnpm workspace, Turbo, lint and package scripts.
- [x] Inspect PostgreSQL/Prisma schema, client, migration and seed boundaries.
- [x] Inspect reusable UI and existing application components.
- [x] Inspect API routes and external service adapters.
- [x] Review environment template and validated server configuration.
- [x] Review Docker, Compose, Vercel, Netlify and CI configuration.
- [x] Inventory unit, integration, security and browser tests.
- [x] Review existing documentation and release evidence.
- [x] Classify the repository as an existing working application.
- [x] Record architecture concerns, security concerns, technical debt and deployment constraints.

**Artifacts:** `docs/PROJECT-AUDIT.md`, `docs/ARCHITECTURE.md`, `docs/TECHNICAL-DECISIONS.md`, `AGENTS.md`.

## Phase 1 — foundation

- [x] Strict TypeScript base configuration and package-level configs.
- [x] pnpm package manager, lockfile and workspace configuration.
- [x] Modular monorepo structure without empty tracked placeholder modules.
- [x] Shared Zod environment validation and non-secret integration status.
- [x] Reusable Tailwind/UI primitives and App Router structure.
- [x] PostgreSQL/Prisma package, lazy client, schema, initial migration and seed entry point.
- [x] Normalized API errors, UI error/empty states and basic non-sensitive process logging.
- [x] Dynamic health endpoint with database readiness and degraded behavior.
- [x] Vitest, Playwright and CI quality-gate configuration.
- [x] Docker/Compose development foundation with optional worker profiles.
- [x] Professional installation, environment, development, test and build documentation.
- [x] Focused environment-validation and health-endpoint tests.
- [x] Phase 0 governance and architecture documentation.

**Exit criteria:** the foundation commands in `docs/PROJECT-AUDIT.md` and `AGENTS.md` pass, no working feature is removed, no secret is committed, no migration/deployment is performed, and the reviewer explicitly approves Phase 2.

## Phase 2 — recommended core validation and discovery work

> Do not start these tasks until Phase 0/Phase 1 approval is recorded.

### 2.1 Isolated database acceptance

- Provision a disposable PostgreSQL test database with least-privilege credentials.
- Review and apply the initial migration only with operator approval; compare the resulting schema with Prisma.
- Seed non-production roles/admin credentials without logging secrets.
- Add executable integration tests for registration, login, session invalidation, RBAC, profile, watchlist, favorites, history and progress.
- Test rollback/recovery procedures and backup expectations without touching production data.

### 2.2 Live TMDB provider acceptance

- Use authorized server-side TMDB credentials in a secret-managed test environment.
- Verify discover, multi-search, details, credits, seasons/episodes, people, images, pagination and provider errors.
- Confirm normalization, cache behavior and honest empty/error states; never add a fabricated production fallback.
- Record rate-limit, attribution and availability constraints.

### 2.3 Core discovery UX acceptance

- Review home, catalog, filters, search and detail journeys on desktop/mobile.
- Exercise keyboard navigation, focus states, reduced motion, loading/error/empty states and accessible names.
- Run browser tests against real test-provider responses where permitted, keeping secrets out of artifacts.

### 2.4 Foundation hardening carried into Phase 2

- Add request correlation IDs and a shared structured-log schema without sensitive payloads.
- Narrow relaxed lint rules where practical.
- Define the shared rate-limit/edge-limit strategy before multi-instance deployment.
- Evaluate CI action major upgrades in an isolated maintenance change.

## Later phases — not active

The following remain subject to separate review and approval even where source already exists:

- Availability-provider live acceptance and official-link behavior.
- Authorized playlist/GitHub/Jellyfin source acceptance.
- Real HLS/DASH/direct playback and codec/CORS matrices.
- FFmpeg transcoding with authorized fixtures and durable storage.
- Worker scheduling and multi-instance scaling.
- WordPress/Blogger installation and rendering acceptance.
- Production deployment, observability, backup/restore and release approval.

## Review gates

Each phase should end with:

1. A scoped diff and preserved working features.
2. Actual command results, distinguishing passed/failed/skipped/unverified checks.
3. Updated architecture/decision/documentation evidence.
4. Security, migration and deployment impacts.
5. Explicit human approval before the next phase.

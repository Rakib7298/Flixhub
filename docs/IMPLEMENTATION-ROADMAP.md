# Implementation roadmap

## Current gate

**Phase 2 is explicitly approved and is the only active implementation scope. Later phases remain blocked pending new human approval.**

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

## Phase 2 — core validation and discovery

> Implementation and local verification are complete; real Prisma CLI migration and expanded browser execution remain CI review gates at this checkpoint.

### 2.1 Isolated database acceptance

- [x] Provision a disposable PostgreSQL 17 cluster with generated test-only credentials and automatic cleanup.
- [x] Apply the checked-in SQL migration locally and compare actual tables/enums with the Prisma model contract.
- [ ] Complete real `prisma migrate deploy` acceptance in CI (configured; execution pending).
- [x] Seed non-production roles/admin credentials and canonical genres without logging secrets.
- [x] Exercise registration, credentials, session invalidation, RBAC, profile/preferences, watchlist, favorites, history and progress.
- [ ] Perform operator-approved rollback/recovery and backup/restore acceptance (not attempted; no shared data touched).

### 2.2 TMDB provider acceptance

- [ ] Run authorized live TMDB acceptance (three tests currently skipped because credentials/opt-in are absent).
- [x] Verify discover, multi-search, details, credits, seasons/episodes, people, image paths, pagination and provider errors with deterministic mocked contracts.
- [x] Confirm normalization, cache/retry behavior and honest empty/error states without a fabricated production fallback.
- [x] Preserve TMDB attribution and document client/provider limits.

### 2.3 Core discovery UX acceptance

- [x] Review home, catalog, filters, search and detail journeys and preserve existing server-rendering architecture.
- [x] Implement/test keyboard navigation, focus states, reduced motion, loading/error/empty states and accessible names.
- [ ] Execute the expanded 20-scenario desktop/mobile Playwright suite in CI (20 discovered locally; Chromium execution unavailable locally).
- [ ] Run browser journeys against live test-provider responses where permitted; this remains tied to authorized TMDB credentials.

### 2.4 Foundation hardening carried into Phase 2

- [x] Add validated request correlation IDs and a shared structured-log schema without sensitive payloads.
- [x] Enforce `no-explicit-any` and `error-boundaries` globally; confine remaining effect-rule debt to six named legacy components.
- [x] Test and document the process-local rate-limit contract and the shared/edge requirement before multi-instance deployment.
- [x] Evaluate action major upgrades; defer checkout/setup-node/upload-artifact v7 and pnpm/action-setup v6 to isolated maintenance.
- [ ] Pass the complete Phase 2 GitHub Actions review gate and inspect the final diff before delivery.

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

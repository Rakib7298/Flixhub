# Technical decisions

These decisions describe the current architecture and its consequences. They are records of reviewed choices, not permission to expand into later phases.

## TD-001 — Modular monolith with a pnpm workspace

**Status:** Accepted
**Decision:** Keep the Next.js application and HTTP APIs together, with reusable packages and protocol-specific services in one pnpm workspace. Isolate FFmpeg and schedulers only at runtime boundaries that require them.

**Why:** It preserves shared types and transactional simplicity while avoiding unnecessary microservice operations.
**Consequences:** Workspace dependency direction must remain disciplined; worker/runtime scaling is a separate concern.

## TD-002 — Next.js App Router and standalone output

**Status:** Accepted
**Decision:** Use Next.js 15/React 19, server components for server-side discovery, route handlers for APIs, and standalone production output.

**Why:** One application supports SEO-friendly rendering and normalized APIs with a small deployment footprint.
**Consequences:** Static/public standalone assets must be copied by `scripts/prepare-standalone.mjs`; serverless hosts still need external PostgreSQL and workers.

## TD-003 — Strict TypeScript and package-level checks

**Status:** Accepted
**Decision:** Share strict compiler settings, `noUncheckedIndexedAccess`, bundler resolution and no-emit package checks.

**Why:** Shared contracts catch integration drift across web, services and workers.
**Consequences:** Generated Prisma types are required before some checks. `no-explicit-any` and `error-boundaries` are enforced globally; only six named legacy components retain a scoped `set-state-in-effect` exception.

## TD-004 — PostgreSQL with Prisma 7 driver adapter

**Status:** Accepted; disposable runtime acceptance implemented, shared/production acceptance pending
**Decision:** Use PostgreSQL, Prisma schema/client, the PostgreSQL driver adapter, transactions and a lazy singleton client.

**Why:** PostgreSQL fits relational identity/library/catalog data; lazy initialization lets unconfigured public pages build without opening a connection.
**Consequences:** `DATABASE_URL` is required for database features. The initial SQL migration is manually authored and must be reviewed/applied only in an approved environment. Phase 2 authorizes disposable test clusters, not destructive or shared/production migration.

## TD-005 — Zod environment validation with honest optional capabilities

**Status:** Accepted
**Decision:** Validate environment values centrally for the web application and expose only integration booleans through `integrationStatus`.

**Why:** Invalid configuration should fail safely without leaking values; optional integrations should show configuration/unavailable states rather than fabricated data.
**Consequences:** A configuration flag is not a connectivity check. Feature-specific worker/transcoder settings remain close to their runtime entry points.

## TD-006 — Tailwind and reusable UI primitives

**Status:** Accepted
**Decision:** Use Tailwind with a small shared UI package for buttons, cards, badges, skeletons, logo and empty/error states.

**Why:** Consistency and accessibility foundations without a paid component dependency.
**Consequences:** Complex application components remain in `apps/web/components`; generic primitives should move to `packages/ui` only when reuse is real.

## TD-007 — Normalized errors and correlated structured logging

**Status:** Accepted
**Decision:** Use typed API errors, safe JSON responses, UI error boundaries, validated request IDs, and a shared JSON log schema with allowlisted non-sensitive fields. Disable raw Prisma query logging that could bypass the schema.

**Why:** This provides operability and request correlation without adding a logging service or exposing credentials, query strings, bodies, or provider details.
**Consequences:** Central drains, metrics/tracing and worker-wide correlation remain future production-hardening work.

## TD-008 — Vitest, Playwright and CI quality gates

**Status:** Accepted
**Decision:** Use Vitest for unit/integration/security checks, Playwright for real browser/public-app checks, and GitHub Actions for frozen-install/build/browser/container/export validation.

**Why:** Fast deterministic tests cover contracts; browser and clean-checkout CI catch different failure modes.
**Consequences:** Mocked providers are test fixtures only. A passing browser job does not prove real media playback or third-party connectivity; disposable migration acceptance does not prove shared/production migration.

## TD-009 — Optional Docker development dependencies

**Status:** Accepted
**Decision:** Provide PostgreSQL/web Compose services and optional transcoder/worker profiles, while keeping local non-Docker development supported.

**Why:** Teams can choose reproducible containers or direct Node/PostgreSQL development.
**Consequences:** Development ports are not production network policy; migrations never auto-run; optional profiles require explicit secrets/configuration.

## TD-010 — No fake production integrations or catalog data

**Status:** Accepted
**Decision:** Use real server-side adapters and honest configuration/error/empty states. Keep mocked responses inside tests.

**Why:** Fabricated titles, availability, playback or success responses would be misleading and could conceal integration failures.
**Consequences:** An unconfigured installation intentionally displays less content until real credentials/sources are supplied.

## TD-011 — Process-local rate limiting for the base application

**Status:** Accepted with scaling limitation
**Decision:** Retain the small in-memory limiter with forwarded-IP trust disabled unless explicitly configured.

**Why:** It provides baseline abuse resistance without requiring Redis for a single instance.
**Consequences:** It is not a multi-instance or edge-security solution. Shared/edge limiting is required before horizontal scaling.

## TD-012 — Explicit review gates for migrations, deployment and later phases

**Status:** Accepted
**Decision:** Do not deploy, apply destructive migrations, expose secrets, or begin the next phase without explicit approval.

**Why:** Repository validation and external state changes have different risk profiles.
**Consequences:** CI may build and test artifacts, but it does not approve production deployment or external provider acceptance.

## TD-013 — Embedded PostgreSQL only for disposable acceptance

**Status:** Accepted
**Decision:** Use a pinned development-only `embedded-postgres` PostgreSQL 17 package for migration/seed/auth/library tests. Keep direct SQL and real Prisma CLI migration modes explicit.

**Why:** Real database behavior can be tested without Docker, shared credentials, paid infrastructure, or relabeling mocks as database acceptance.
**Consequences:** The dependency downloads platform binaries during development installation and is excluded from production dependencies. Temporary clusters are removed after tests; native Prisma CLI acceptance still requires its schema engine.

# MediaMatrix architecture

## 1. System shape

MediaMatrix is a **modular monolith** with independently deployable workers only where runtime boundaries justify them.

- `apps/web` owns Next.js App Router rendering and authenticated/public HTTP APIs.
- `packages/*` contains shared contracts, validated configuration, persistence, reusable UI, browser API helpers, playback helpers and CMS/export tooling.
- `services/*` isolates upstream protocols and security-sensitive download/media/transcoding logic.
- `workers/*` contains explicitly configured background schedulers.
- PostgreSQL is the system of record. FFmpeg output and export artifacts use operator-selected durable directories outside the source tree.

This is not a microservice fleet. Normal discovery, account and administration flows share typed packages and one web deployment.

## 2. Foundation layers

| Layer | Responsibility | Primary location |
| --- | --- | --- |
| Presentation | App Router pages, responsive components, loading/error/empty states | `apps/web/app`, `apps/web/components`, `packages/ui` |
| HTTP boundary | Input parsing, streamed limits, origin checks, authentication/RBAC, normalized responses | `apps/web/app/api`, `apps/web/lib/api.ts` |
| Configuration | Zod validation, safe defaults, non-secret integration status | `packages/config` |
| Domain/shared contracts | Media types, offers, display helpers, playback source handling | `packages/shared`, `packages/media-engine` |
| Persistence | Prisma schema/client, PostgreSQL adapter, transactions, migration and seed | `packages/database` |
| Integration | Real TMDB/availability/GitHub/Jellyfin/playlist/transcoder adapters | `services` |
| Operations | Health, correlated structured logging, workers, containers, CI, exports and evidence | `apps/web/app/api/health`, `workers`, `infrastructure`, `.github`, `scripts` |

### Dependency direction

The intended direction is:

```text
apps/web and workers
        ↓
services and reusable packages
        ↓
shared contracts / configuration / database
```

Shared packages must not import application pages or route handlers. Browser-safe packages must not import server-only database/provider credentials. A service may depend on shared/database contracts where persistence is explicitly part of its boundary.

## 3. Configuration and secrets

`packages/config` validates the web server environment with Zod. Optional integrations remain optional so public pages can build and display honest setup states. `requireServerEnv` fails only when a feature actually requires a missing value.

`integrationStatus` projects configuration into booleans for health/admin surfaces. It never returns secret values and does not claim connectivity. Worker/transcoder-specific settings are consumed near their own runtime entry points.

`.env.example` is the canonical placeholder template. `.env` and credential/runtime artifacts are excluded from Git and distribution archives.

## 4. Request and error flow

1. API middleware accepts a bounded incoming `x-request-id` or generates a UUID, forwards it to the route, and returns the same value to the client.
2. Public server components call server-side integration clients; browser mutations use the API client/route handlers.
3. Mutating APIs apply origin/Fetch-Site checks, rate limits where configured, streamed byte limits and Zod schemas.
4. `requireUser` validates the Auth.js session and rechecks current user, deletion state, role and session version in PostgreSQL. `requireAdmin` additionally requires `ADMIN`.
5. Domain/service code performs the operation with principal-scoped or administrator-authorized queries.
6. `ApiError` becomes a safe normalized JSON response. Unknown errors return a generic 500 and emit a JSON event containing the request ID, method, pathname, status, safe code and error name—never query strings, bodies, cookies, provider URLs or raw error messages.
7. App Router error/loading/empty components provide retry and configuration states without exposing internal details.

## 5. Data flow

1. Server components request TMDB through the server-only client, normalize records, cache upstream responses with TTLs, and render honest states.
2. Optional availability requests use the documented v4 show endpoint, select only the requested country, normalize provider offers, and render official links.
3. Explicit administrative/worker sync writes movie/TV/season/episode/genre/credit metadata in Prisma transactions and records background job status/audit events.
4. Auth.js establishes a JWT session; protected APIs re-read the user/role/session version from PostgreSQL. Account/library records are principal-scoped.
5. Playlist imports fetch/parse authorized channel lists, encrypt source/stream URLs, and upsert items by stable channel hash. Missing entries become inactive instead of being destructively removed during synchronization.
6. Playback selects native/HLS.js/Dash.js/direct modes. Authenticated clients save progress/history; the player restores resumable VOD positions.
7. Optional Jellyfin requests remain server-side and stream through an administrator Range proxy. Optional transcoding runs on its own bearer-authenticated worker with durable non-sensitive job records.
8. WordPress/Blogger call only public discovery APIs. WordPress additionally proxies fixed paths through its own REST API.

## 6. Persistence and migrations

PostgreSQL stores identity, metadata, availability snapshots, library state, encrypted playlist/source values, settings, jobs and audit events. Prisma Client 7 uses the PostgreSQL driver adapter. The client initializes lazily so an unconfigured public build does not open a database connection.

The initial migration is in `packages/database/prisma/migrations`. It remains manually authored rather than native-diff-generated. Phase 2 executes it against disposable PostgreSQL 17 clusters: local tests can apply the SQL files directly, while CI is configured to run real `prisma migrate deploy` and verify migration records. The same ephemeral clusters execute the seed and database-backed auth/library acceptance. None of these operations targets a shared or production database; applying migrations there remains operator-approved.

Transcoder state/output uses a worker-local durable directory. Source exports use an external operator-selected directory. Neither is automatically a public object store.

## 7. Health and logging

`GET /api/health` is dynamic and uncached. It reports:

- `ok` only when the database answers `SELECT 1` and authentication is configured;
- `degraded` with HTTP 503 otherwise;
- non-secret integration flags and `databaseReachable` (`true`, `false`, or `null` when unconfigured);
- version and timestamp, never connection strings or credentials.

API errors, public discovery failures and rate-limit rejections use a shared JSON log schema with timestamp, level, event and allowlisted request fields. Raw Prisma query logging is disabled because it can include query inputs; application boundaries emit sanitized errors instead. Request IDs correlate responses and logs without accepting malformed header values. Central log aggregation, metrics/tracing and worker-wide correlation remain production-hardening work.

## 8. Security boundaries

Public routes are read-only except account registration/recovery. Principal routes require current user sessions. Administrative routes require current ADMIN role. Worker routes use separate bearer/internal secrets. Browser-facing public source responses re-check public credential policy.

CSP/security headers, input limits, origin checks, output escaping, encrypted source values, URL/private-network defenses and safe provider errors are boundary controls, not substitutes for HTTPS, network policy, shared rate limits, secret management or media authorization.

## 9. Testing and delivery

- Vitest covers unit, mocked integration and security contracts, plus a real disposable PostgreSQL 17 migration/seed/auth/library suite.
- Live TMDB tests are read-only, credential-dependent and explicitly opt-in; otherwise they are reported skipped.
- Playwright covers public desktop/mobile behavior, request IDs, search keyboard/loading/empty/error states, filters, focus, reduced motion and overflow against a real application.
- GitHub Actions checks clean frozen installation, Prisma CLI migration acceptance, lint, types, tests, builds, audit, browser behavior, container builds and exports.
- Docker Compose provides optional local PostgreSQL/web/worker/transcoder services; migrations never run automatically.
- Vercel/Netlify configuration describes deployment targets but does not deploy them.

Passing local/CI checks is not evidence of shared/production migration, live provider connectivity, real playback, CMS installation or production deployment. Disposable database acceptance is reported separately from those external states.

## 10. Scaling path

Start with one web instance and managed PostgreSQL. Add a shared rate limiter before multiple web instances. Scale the transcoder independently with a durable shared queue/object-storage design before running multiple worker replicas; the current worker is intentionally single-instance with bounded in-memory scheduling and persistent status.

## 11. Current review boundary

Phase 0/Phase 1 covered audit and foundation verification. Phase 2 is explicitly approved for core validation and discovery; later-phase modules and external production state remain outside that approval, as tracked in `docs/IMPLEMENTATION-ROADMAP.md`.

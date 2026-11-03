# Architecture

## Modular monolith

`apps/web` owns App Router rendering and authenticated/public HTTP APIs. Reusable packages contain contracts, UI, configuration, persistence, playback helpers, and export tooling. Services isolate upstream protocols and security-sensitive download/playback/transcoding logic without requiring a microservice fleet for normal discovery.

## Data flow

1. Server components request TMDB through the server-only client, normalize records, cache upstream responses with TTLs, and render honest states.
2. Optional availability requests use the documented v4 show endpoint, select only the requested country, normalize provider offers, and render official links.
3. Explicit administrative/worker sync writes movie/TV/season/episode/genre/credit metadata in Prisma transactions and records background job status/audit events.
4. Auth.js establishes a JWT session; protected APIs re-read the user/role/session version from PostgreSQL. Account/library records are principal-scoped.
5. Playlist imports fetch/parse authorized channel lists, encrypt source/stream URLs, and upsert items by stable channel hash. Missing entries become inactive instead of being destructively removed during synchronization.
6. Playback selects native/HLS.js/Dash.js/direct modes. Authenticated clients save progress/history; the player restores resumable VOD positions.
7. Optional Jellyfin requests remain server-side and stream through an administrator Range proxy. Optional transcoding runs on its own bearer-authenticated worker with durable non-sensitive job records.
8. WordPress/Blogger call only public discovery APIs. WordPress additionally proxies fixed paths through its own REST API.

## Storage

PostgreSQL stores identity, metadata, availability snapshots, library state, encrypted playlist/source values, settings, jobs, and audit events. Prisma Client 7 uses the PostgreSQL driver adapter. The initial migration is in `packages/database/prisma/migrations`.

Transcoder state/output uses a worker-local durable directory. Source exports use an external operator-selected directory. Neither is a public object store.

## Security boundaries

Public routes are read-only except account registration/recovery. Principal routes require current user sessions. Administrative routes require current ADMIN role. Worker routes use separate bearer/internal secrets. Browser-facing public source responses re-check public credential policy. Secret values are never included in public health or admin configuration panels.

## Scaling path

Start with one web instance and managed PostgreSQL. Add a shared rate limiter before multiple web instances. Scale the transcoder independently with a durable shared queue/object-storage design before running multiple worker replicas; the current worker is intentionally single-instance with bounded in-memory scheduling and persistent status.

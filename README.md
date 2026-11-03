# MediaMatrix v1.0

A mobile-first cinematic media discovery and **authorized-playback** platform built with Next.js, React, TypeScript, PostgreSQL, Prisma, HLS.js/Dash.js, and an optional independent FFmpeg worker.

MediaMatrix does not include a content license. Connect only playlists, media sources, GitHub files, Jellyfin libraries, and transcoding inputs you own or are authorized to use. It does not bypass DRM, subscriptions, paywalls, logins, or provider access controls. Public accessibility of a playlist does not prove redistribution rights.

## What is implemented

- Cinematic responsive home, movie/TV catalogs, filters, pagination, search suggestions, detail pages, cast, seasons/episodes, and people.
- Real server-side TMDB integration; no bundled sample catalog or fabricated viewing links.
- Optional Movie of the Night v4/RapidAPI streaming availability with country-specific official provider links and honest unavailable states.
- Auth.js credentials accounts, bcrypt password hashes, JWT session-version checks, profile/preferences, password changes, and SMTP recovery.
- Watchlists, media/channel favorites, watch history, Continue Watching, and playback-position restoration.
- HLS.js, Dash.js, native HLS, and direct native playback with retry, volume, seek, fullscreen, error, and progress handling.
- Principal-owned M3U/M3U8 upload/URL import, public administrator playlists, refresh, logs, channel search/groups/favorites, and authorized GitHub Contents API synchronization.
- Optional administrator Jellyfin browsing and Range-capable credentialed stream proxying.
- Optional independent bearer-authenticated FFmpeg worker with bounded downloads, queue/concurrency/time limits, cancellation, persistent non-sensitive job status, HLS verification, and thumbnails.
- RBAC administration for analytics, TMDB sync, authorized media sources, playlists, users/roles, Jellyfin, transcoding, jobs/logs, integration health, and exports.
- Full Source, Vercel, Netlify, installable WordPress theme, and Blogger XML packaging with structural validation, build metadata, and SHA-256 checksums.

WordPress and Blogger are **presentation editions only**. They call read-only public discovery APIs on a separately deployed MediaMatrix application. They do not contain Next.js, PostgreSQL, Auth.js accounts, playlists, Jellyfin, or FFmpeg.

## Project governance

- [Repository audit](docs/PROJECT-AUDIT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Implementation roadmap and review gates](docs/IMPLEMENTATION-ROADMAP.md)
- [Technical decisions](docs/TECHNICAL-DECISIONS.md)
- [Phase 2 implementation plan](docs/PHASE-2-PLAN.md)
- [Engineering guide](AGENTS.md)

Phase 0 (audit) and Phase 1 (foundation) are complete. Phase 2 (core validation and discovery) is explicitly approved; later-phase work still requires new owner instruction.

## Stack and repository layout

```text
apps/web                     Next.js App Router application and API routes
packages/shared             Shared media contracts and display helpers
packages/config             Validated environment and integration status
packages/database           Prisma schema, migration, PostgreSQL adapter, seed
packages/ui                 Cinematic UI primitives
packages/api-client         Browser API client and normalized errors
packages/media-engine       Playback format/source validation
packages/cms-editions       WordPress/Blogger sources and export pipeline
services/tmdb               TMDB client and transactional persistence
services/streaming-availability
services/playlist-manager   M3U parser, secure downloader, SSRF controls
services/github-sync        Authorized GitHub Contents API synchronization
services/media-server       Optional Jellyfin adapter
services/transcoder         Independent FFmpeg HTTP worker
workers/sync-worker         Explicit-target TMDB synchronization
workers/playlist-worker     Scheduled playlist refresh through internal API
infrastructure/docker      Web, worker, and transcoder images
scripts                     Export and deployment validation commands
tests                       Unit, integration, security, and Playwright tests
```

The application is a modular monolith. The transcoder and schedulers are separate only where serverless/time/filesystem boundaries require them. Redis is not required by the base application; the current in-memory rate limiter should be replaced with a shared store for multi-instance production deployments.

## Prerequisites

- Node.js 22 or newer
- pnpm 9.15.9 (`corepack enable`)
- PostgreSQL 17 or a compatible PostgreSQL service
- TMDB API read access token or API key for real discovery
- Optional: FFmpeg 7+ on the transcoder worker, Git, and tar for exports

Docker is optional. Docker, PostgreSQL, FFmpeg, and third-party credentials are not vendored. Automated tests use a development-only embedded PostgreSQL 17 package for disposable database acceptance; it is not production infrastructure.

## Local setup

1. Install dependencies:

   ```bash
   corepack enable
   pnpm install --frozen-lockfile
   cp .env.example .env
   ```

2. Edit `.env` locally. Never commit it. Generate authentication/encryption material with:

   ```bash
   openssl rand -base64 32
   ```

   Set at least:

   ```dotenv
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/mediamatrix
   DIRECT_URL=postgresql://USER:PASSWORD@localhost:5432/mediamatrix
   AUTH_SECRET=YOUR_GENERATED_SECRET
   AUTH_TRUST_HOST=true
   TMDB_ACCESS_TOKEN=YOUR_SERVER_SIDE_TMDB_READ_TOKEN
   ```

   `AUTH_TRUST_HOST=true` is appropriate for a local server or a trusted reverse proxy that controls Host/forwarded headers. Leave it false in an untrusted direct-hosting context. Set `TRUST_PROXY=true` only when the proxy overwrites forwarded IP headers.

3. Create an empty PostgreSQL database, back it up if it contains data, and review the migration. Applying migrations is an operator-approved action:

   ```bash
   pnpm db:generate
   pnpm db:validate
   pnpm db:deploy
   ```

4. Optional one-time administrator seed:

   ```bash
   ADMIN_EMAIL=admin@example.com \
   ADMIN_USERNAME=admin \
   ADMIN_PASSWORD='use-a-long-unique-password' \
   pnpm db:seed
   ```

   Remove/unset the administrator password after seeding. Do not put it in shell history or source control on a shared machine. Regular users can register through the UI.

5. Start the application:

   ```bash
   pnpm dev
   ```

   Open `http://localhost:3000`. Without TMDB credentials the UI deliberately shows an honest configuration/empty state.

## Optional integrations

### Official streaming availability

```dotenv
STREAMING_AVAILABILITY_API_KEY=...
STREAMING_API_PROVIDER=movie-of-the-night
STREAMING_DEFAULT_COUNTRY=BD
# Or use STREAMING_API_PROVIDER=rapidapi with the documented RapidAPI base URL.
```

Availability is fetched only when configured. No result is not proof of universal unavailability. Provider country, account, subscription, rental, and purchase rules still apply.

### Playlists and GitHub

Users can import authorized uploads or public HTTPS/HTTP channel lists. GitHub sources and public publishing are administrator-only. Set `GITHUB_TOKEN` only when private/authorized repository access or a higher API limit is required. The token stays on the server.

Remote downloads enforce protocol/credential checks, DNS and connection-time IP validation, redirect revalidation, timeouts, and byte limits. Private-network sources are blocked by default. `PLAYLIST_ALLOW_PRIVATE_NETWORK=true` enables them only for explicitly approved administrator playlist sources; do not expose this to untrusted administrators.

### Jellyfin

```dotenv
JELLYFIN_SERVER_URL=https://jellyfin.example.com
JELLYFIN_API_KEY=...
JELLYFIN_USER_ID=...
JELLYFIN_ALLOW_PRIVATE_NETWORK=false
```

Jellyfin is administrator-only in v1. The API key is never returned to the browser. Plex is not implemented. Playback support still depends on the source container/codec and browser.

### Transcoding

Deploy `services/transcoder` separately and configure the web application:

```dotenv
TRANSCODER_WORKER_URL=http://transcoder:4100
TRANSCODER_WORKER_API_KEY=A_SHARED_SECRET_AT_LEAST_32_CHARACTERS
TRANSCODER_STORAGE_ROOT=/data
TRANSCODER_MAX_CONCURRENT=1
TRANSCODER_ALLOW_PRIVATE_NETWORK=false
```

The worker listens on `0.0.0.0:4100`; protect it with a private network or firewall. `/health` is public and returns only version/job-count/persistence status. All job APIs require the bearer key. Output paths are worker-local and are not automatically public URLs. An S3-compatible upload adapter is not implemented in v1.

### SMTP recovery

Set `SMTP_URL` and `EMAIL_FROM`. Without SMTP, recovery reports that delivery is not configured; it never prints a reset token or pretends email was sent.

## Quality commands

```bash
pnpm lint
pnpm -r --no-bail --if-present typecheck
pnpm test
pnpm test:integration
pnpm test:security
pnpm build
pnpm audit --prod --audit-level=high
pnpm validate:config
```

Browser tests:

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

The Playwright suite uses the real application without catalog credentials and checks honest states, API correlation/security headers, discovery loading/empty/error behavior, keyboard/focus/reduced-motion accessibility, filters, mobile navigation, and overflow. Browser-injected suggestion fixtures are test-only. Real PostgreSQL acceptance runs separately in Vitest; live TMDB checks require their own explicitly authorized environment.

See `docs/TESTING.md` and `release/verification.json` for executed evidence and skipped/unverified checks.

## Deployment

- **Vercel:** import the repository, use the included `vercel.json`, and configure environment variables. External PostgreSQL and separate workers are required.
- **Netlify:** use `netlify.toml` and the included Next.js runtime plugin. FFmpeg and persistent workers must run elsewhere.
- **Docker:** see `docs/DEPLOYMENT.md` and `docker-compose.yml`. Migrations are not automatic.
- **WordPress/Blogger:** see `docs/CMS-EDITIONS.md`.

No deployment target is claimed to have been deployed by the repository itself. Serverless filesystem output is ephemeral, and the runtime export manager is intentionally unavailable on Vercel/Netlify.

## Export packages

From a clean, committed Git checkout with Git and tar:

```bash
export MEDIAMATRIX_EXPORT_DIR=/tmp/mediamatrix-exports
pnpm export:all
pnpm validate:export
```

All five artifacts are generated together so their manifest/checksums remain consistent. Individual `export:full`, `export:vercel`, `export:netlify`, `export:wordpress`, and `export:blogger` commands regenerate the set and report the selected artifact. Generated files stay outside the source tree.

For an explicitly enabled self-hosted admin export manager, set `MEDIAMATRIX_EXPORTS_ENABLED=true`, an external `MEDIAMATRIX_EXPORT_DIR`, and—when needed—`MEDIAMATRIX_REPOSITORY_ROOT`. The checkout must be clean. Downloads are administrator-only and checksum-verified.

See `docs/EXPORTS.md`.

## Security and responsible use

Read `docs/SECURITY.md` before production deployment. Key controls include server-only secrets, AES-GCM source encryption, keyed fingerprints, RBAC revalidation, CSRF/origin checks, bounded streamed request bodies, rate limiting, safe upload parsing, parameterized Prisma operations, secure headers, SSRF/DNS/redirect defenses, output escaping, audit logs, and sensitive-value redaction.

Do not log environment variables, playlist URLs with credentials, Jellyfin keys, reset tokens, or request bodies. Review provider terms and media rights before connecting any source.

## Release status

See `RELEASE_NOTES.md`, `docs/LIMITATIONS.md`, and `release/verification.json` for the precise release evidence and remaining external verification requirements. A successful typecheck/build is not presented as proof of PostgreSQL migration, TMDB reachability, media playback, FFmpeg execution, WordPress/Blogger installation, or provider deployment.

# Testing and verification

## Commands

```bash
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

## Coverage of automated tests

- M3U metadata/group parsing, duplicates, invalid schemes/credentials, HLS-playlist rejection, orphan entries, and limits.
- Playback format detection, unsafe URLs, generic errors, and shared display helpers.
- Country-specific availability normalization, official URL sanitization, v4 endpoint/header contracts, and no cross-country substitution.
- TMDB credential/header behavior, record/person mapping, and response caching with mocked transport fixtures.
- Literal private/reserved IP rejection, sensitive query detection, AES-GCM round trips/tamper rejection, keyed hashes, and redaction.
- CSRF/origin checks, streamed/chunked body-size enforcement, schema validation, rate limiting, and forwarded-IP spoof resistance.
- Blogger XML structure and Prisma/migration structural coverage.
- FFmpeg fixed argument arrays and real temporary-filesystem job-store persistence.
- Playwright public home/API/security headers/mobile navigation using the real unconfigured app.

Mocked transport fixtures are tests only; production discovery has no sample-data fallback.

## External verification matrix

The following require explicit environments and must not be inferred from unit tests:

| Check | Required environment |
| --- | --- |
| Apply migration/seed | Approved PostgreSQL test database |
| Register/login/RBAC CRUD | Migrated test database and Auth secret |
| Live TMDB catalog | Valid TMDB credentials/network |
| Live availability | Valid availability provider credentials |
| HLS/DASH/native playback | Authorized streams, codecs, browser/CORS |
| GitHub private synchronization | Authorized repository/token |
| Jellyfin browsing/playback | Authorized test Jellyfin server |
| FFmpeg transcoding | FFmpeg plus authorized input and durable storage |
| SMTP recovery | Test SMTP inbox |
| Vercel/Netlify deployment | Provider project/account |
| WordPress activation | Supported WordPress/PHP host |
| Blogger upload/rendering | Blogger test blog |
| Docker builds/runtime | Docker daemon |

`release/verification.json` records which of these actually ran in the release environment. A skipped check is not a pass. A failed prerequisite (for example a browser download) is reported separately from test assertions that never ran.

## CI

GitHub Actions runs quality, browser, container-build, and export jobs. CI does not deploy, migrate a production database, publish releases, or contact private media sources. Artifact retention is limited and no secrets are included in test configuration.

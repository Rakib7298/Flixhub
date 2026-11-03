# MediaMatrix v1.0.0 — 2026-11-03

## Highlights

- Replaced the initial Flixhub placeholder with a cinematic, responsive media discovery and authorized-playback application.
- Added real TMDB discovery/search/details, normalized country-specific official streaming availability, accounts, user libraries, playback progress, Live TV playlists, authorized GitHub sync, optional Jellyfin, and an independent FFmpeg worker.
- Added RBAC administration, integration health, audit/job history, secure source storage, public read-only CMS APIs, and WordPress/Blogger presentation editions.
- Added full-source, Vercel, Netlify, WordPress, and Blogger exports with metadata, manifests, structural validation, and SHA-256 checksums.
- Added Docker/Compose, Vercel, Netlify, worker, CI, setup/deployment/security/testing/export documentation, and explicit release evidence.

## Security and reliability hardening

- Server-only provider credentials, encrypted source values, keyed hashes, role/session revalidation, CSRF/origin checks, streamed byte limits, safe multipart handling, rate limits, secure headers/CSP, SSRF defenses, and sensitive-log avoidance.
- Atomic password-reset token consumption and session-version invalidation.
- Persistent transcoder status without input URLs, fail-closed persistence health, shutdown flushing, actual-process-exit tracking, bounded inputs, and fixed FFmpeg argument arrays.
- Exact-country availability only; no fabricated links or cross-country fallback.
- Dependency remediation: Zod 4.6.7, Nodemailer 10.3.1, PostCSS 8.5.32 resolution. Production audit reports no known vulnerabilities at release verification time.
- Corrected CMS clients to consume the public `availability.offers` contract and added regression coverage.

## Local verification

- ESLint passed.
- All 16 workspace typechecks passed.
- 33/33 automated Vitest tests passed across 9 files.
- Security-only 10/10 and mocked integration 3/3 passes confirmed.
- Next.js production build passed with 20 static pages and standalone assets.
- Production standalone HTTP smoke checks passed for home/login/static assets/CSP and honest unavailable health/discovery responses.
- 7/7 deployment-configuration structural checks passed.
- Production dependency audit reported no known vulnerabilities.
- WordPress browser JavaScript passed Node syntax checking; Blogger XML and CMS contracts passed structural tests.
- All five distribution artifacts generated from clean HEAD; independent archive/XML/ZIP validation and all five SHA-256 checks passed.

See `release/verification.json` for commands/status and `docs/TESTING.md` for the external verification matrix.

## Known boundaries

The initial PostgreSQL migration is manually authored and structurally tested but has not been applied to a database in this environment. Playwright Chromium could not be downloaded because the CDN connection failed, so browser assertions remain unexecuted locally. Live TMDB/availability/GitHub/Jellyfin/SMTP services, real media playback, FFmpeg, Docker, WordPress/Blogger installation, and Vercel/Netlify deployment require authorized external environments and are not claimed as locally verified.

WordPress/Blogger are presentation clients only. Transcoder output is worker-local and not automatically a public URL. Multi-instance production requires a shared rate limiter. Use only media sources you own or are authorized to access.

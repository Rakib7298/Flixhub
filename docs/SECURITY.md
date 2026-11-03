# Security model

## Trust boundaries

- Browser code receives public TMDB metadata and only the playback URLs intended for its authenticated/public authorization level.
- TMDB, availability, GitHub, SMTP, Jellyfin, and transcoder credentials are server-only.
- PostgreSQL is accessed through Prisma and the PostgreSQL driver adapter; user values are parameters, not SQL fragments.
- Jellyfin and transcoder administration require the current database-backed `ADMIN` role. Session version and account deactivation are rechecked on protected API calls.
- WordPress/Blogger are untrusted presentation clients and receive only public discovery/normalized provider data.

## Implemented controls

- bcrypt password hashing (cost 12), dummy-hash comparison for missing users, long password validation, hashed single-use reset tokens, expiry, atomic token consumption, and session-version invalidation.
- AES-256-GCM for stored source/reset-sensitive values with random IVs; keyed HMAC fingerprints for lookup/deduplication; source labels remove query strings.
- Auth.js HTTP-only SameSite session cookies with secure production names/settings and explicit host trust.
- Origin/Fetch-Site checks on mutations, bounded streamed JSON/multipart bodies, Zod validation, upload extension/size/channel limits, and output escaping through React/DOM text APIs.
- In-memory route throttles with forwarded-IP trust disabled unless explicitly configured. Use a shared rate-limit store for multiple production instances.
- Secure headers including `nosniff`, frame denial, referrer/permissions policy, COOP, CSP, and HTTPS-only HSTS on configured HTTPS deployments.
- CSP restricts objects, frames, base URI, and form targets while allowing the inline styles/bootstrap required by this Next.js release and blob workers/media required by playback engines.
- Remote playlist/transcoder downloads validate protocols, credentials, literal/DNS IP ranges, redirects, timeouts, and byte counts. Playlist connections also validate DNS at connection time.
- Public playlists reject credential-like URL parameters at publication and again when served to non-owners. Private-network access is off by default and separately gated for administrators.
- Jellyfin item IDs and fixed upstream paths are validated; API keys stay upstream; redirects are rejected; Range responses are proxied without caching.
- FFmpeg receives fixed argument arrays with `shell: false`; queue, concurrency, download, runtime, and persisted-record limits apply. Job status excludes input URLs. Persistence failures degrade health and reject new jobs.
- Audit events cover authentication, playlist/source/user/transcoding/export administration without intentionally storing credentials or raw source URLs.
- Export downloads require admin, fixed manifest names, external output directories, and checksum verification.

## Production responsibilities

1. Keep operating systems, Node, PostgreSQL, FFmpeg, WordPress, Blogger widgets, and dependencies patched. Run `pnpm audit --prod` and container/image scans.
2. Use unique secrets, secret-manager injection, key rotation, TLS, least-privilege database/API users, and encrypted backups.
3. Add a shared rate limiter/session-aware abuse controls for multi-instance deployments. The in-memory limiter is per process.
4. Restrict egress. URL validation reduces SSRF risk but is not a replacement for network policy, especially for administrator-configured integrations.
5. Confirm media authorization. Technical validation and an authorization checkbox do not prove ownership or redistribution rights.
6. Do not expose transcoder output or job storage directly without an authenticated, reviewed serving design. No public output URL is generated in v1.
7. Configure WordPress reverse-proxy IP handling and edge throttling. Theme REST requests are read-only, fixed-path, HTTPS, redirect-disabled, size-limited, and timeout-limited.
8. Review the CSP when adding third-party scripts. Do not add broad analytics/exfiltration endpoints without a privacy/security review.
9. Treat administrator access as highly trusted. Admins can connect internal services and publish playlists; private-network flags should remain disabled unless required.

## Sensitive logging

Do not log request bodies, authorization headers, environment objects, reset URLs/tokens, encrypted payloads, full signed media URLs, or SMTP/Jellyfin/TMDB responses indiscriminately. Public health responses contain flags, not secrets. Build/export metadata must not contain environment values.

## Reporting a vulnerability

Do not open an issue containing secrets, private stream URLs, personal data, or exploit details against a production instance. Rotate exposed credentials first, preserve non-sensitive evidence, and contact the repository maintainer privately where possible.

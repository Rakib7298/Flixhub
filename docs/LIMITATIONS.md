# Known limitations and unverified features

## Platform limitations

- Serverless hosts do not provide a durable FFmpeg workspace or persistent transcoder queue. Use the independent worker with durable storage.
- Worker outputs are local paths, not public playback URLs. S3/MinIO environment names are reserved, but an object-storage upload adapter is not implemented.
- The base rate limiter is process-local. Use a shared store/edge limiter for multi-instance production.
- Scheduled workers require explicit deployment/configuration. No Vercel/Netlify cron is claimed.
- The current catalog persistence synchronizes explicit movie/TV IDs and metadata; it is not a complete mirror of TMDB.
- Jellyfin is the only media-server adapter. Plex is not implemented.
- WordPress/Blogger are presentation editions, not feature-equivalent account/playback applications.
- Runtime export packaging requires a clean self-hosted Git checkout, Git/tar, and external durable output. Serverless deployments use CLI exports.

## Verification boundaries

The initial SQL migration was manually authored from the Prisma schema because the sandbox could not download Prisma's native schema engine for a native diff. Phase 2 executes that SQL against disposable PostgreSQL 17 locally. Real `prisma migrate deploy` acceptance is a separate CI-mode check; direct SQL execution is not relabeled as CLI success. No shared/production migration, destructive rollback, backup, or restore is performed.

No authorized TMDB credentials or live-test opt-in are present in the current shell, so all live TMDB checks are skipped. Mocked provider contracts and real disposable database tests do not prove live third-party connectivity, browser playback, email delivery, container runtime, CMS installation, or production deployment. Local Chromium is unavailable; use the CI browser job for Phase 2 browser execution. Consult `release/verification.json` for release-time evidence.

## Product boundaries

- No DRM circumvention, unauthorized extraction, scraping, paywall bypass, or redistribution tooling.
- Provider availability can be incomplete/stale; empty results are not universal unavailability claims.
- Codec/CORS/browser support can prevent an otherwise authorized source from playing.
- A user's/admin's authorization confirmation is recorded as an attestation, not a legal rights verification.
- Recommendations/similar titles come from TMDB; they are not a custom machine-learning recommendation system.

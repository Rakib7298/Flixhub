# Deployment guide

## Shared production requirements

1. Use Node 22, pnpm 9.15.9, and PostgreSQL with TLS where supported.
2. Set `NEXT_PUBLIC_APP_URL` to the exact public HTTPS origin, a unique `AUTH_SECRET` of at least 32 characters, `DATABASE_URL`, `DIRECT_URL`, and TMDB credentials.
3. Set `AUTH_TRUST_HOST=true` only behind a trusted host/proxy. Set `TRUST_PROXY=true` only when forwarded IP headers are overwritten by that proxy.
4. Run `pnpm install --frozen-lockfile`, `pnpm db:generate`, and `pnpm build` in the build environment.
5. Back up the database, review `packages/database/prisma/migrations`, and run `pnpm db:deploy` as a separate approved operation. Builds do not migrate data.
6. Configure SMTP, availability, GitHub, Jellyfin, and transcoding only when those features are needed.
7. Terminate HTTPS at a trusted proxy, add edge rate limits, restrict outbound access where practical, and keep the transcoder off the public internet.

`/api/health` distinguishes configuration flags from actual database reachability. A 503 degraded response is intentional when required services are unavailable. Provider flags do not prove third-party connectivity.

## Vercel

The included `vercel.json` uses the workspace build and `apps/web/.next` output.

1. Import the Git repository and verify that Vercel detects the Next.js workspace using the included configuration. If your project settings override Root Directory, use the repository root consistently with `vercel.json`; do not simultaneously set conflicting output paths.
2. Use Node 22 and retain `pnpm install --frozen-lockfile` / `pnpm build`.
3. Add environment variables in Vercel project settings. Never use `NEXT_PUBLIC_` for TMDB, availability, GitHub, Jellyfin, SMTP, or worker secrets.
4. Use managed PostgreSQL. Use a pooled connection for `DATABASE_URL` when appropriate and a direct migration connection for `DIRECT_URL`.
5. Run migrations from an approved secure CI/job or local operator session, not during every serverless invocation.
6. Deploy the transcoder and scheduler workers to a persistent host and configure their private URLs/keys. Vercel Functions are not an FFmpeg runtime or durable job store in this design.
7. Use CLI exports; runtime export packaging returns an explicit serverless unsupported response.

Vercel deployment itself requires an authorized provider account and is not executed by the local quality gate.

## Netlify

`netlify.toml` uses `@netlify/plugin-nextjs`, Node 22, pnpm 9.15.9, the root build, and `apps/web/.next` publish path.

1. Import the repository and keep the included Next.js runtime plugin enabled.
2. Configure the same server-only environment and managed PostgreSQL.
3. Run approved migrations separately.
4. Deploy persistent workers elsewhere. Do not schedule long FFmpeg tasks as Netlify Functions.
5. Use CLI exports. Runtime exports are disabled on Netlify.

Netlify deployment itself is not executed by the local quality gate.

## Docker Compose

Create a local `.env` with at least `POSTGRES_PASSWORD`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, and TMDB credentials. Do not use the example password in production.

```bash
# Build images
docker compose build web

# Start only PostgreSQL first
docker compose up -d postgres

# After review/backup, apply the initial migration
docker compose run --rm web pnpm db:deploy

# Start the web application
docker compose up -d web
```

Optional transcoder:

```bash
export TRANSCODER_WORKER_API_KEY='a-unique-secret-at-least-32-characters'
export TRANSCODER_WORKER_URL='http://transcoder:4100'
docker compose --profile transcoding up -d --build transcoder
```

Optional schedulers:

```bash
export SYNC_CRON_SECRET='another-unique-secret-at-least-32-characters'
export TMDB_SYNC_IDS='movie:238,tv:1396'
docker compose --profile workers up -d --build sync-worker playlist-worker
```

`TMDB_SYNC_IDS` is an explicit allowlist; the worker does not infer that it may mirror an entire catalog. The playlist worker calls the web internal endpoint with `SYNC_CRON_SECRET`.

The Compose PostgreSQL port is exposed for local development. Remove or localhost-bind database and worker ports in production. Put transcoder storage on a durable volume. The web image does not auto-migrate, and Docker runtime exports should normally run from an external clean checkout because container images intentionally omit `.git`.

## Standalone Node

Next.js standalone output is enabled. A conventional process supervisor can also run:

```bash
pnpm start
```

For standalone-output deployments, set `MEDIAMATRIX_REPOSITORY_ROOT` only if using the optional runtime exporter, and provide a separate clean source checkout with Git/tar. Never place export output inside the served source tree.

## Reverse proxy checklist

- Forward only the intended public hostname and overwrite `X-Forwarded-For`/`X-Real-IP`.
- Limit request bodies to the documented playlist maximum plus multipart overhead.
- Add request rate limits and timeouts at the edge.
- Do not publicly proxy the transcoder, PostgreSQL, or worker-internal API.
- Restrict access to `/admin` at the application RBAC layer; optional edge authentication is defense in depth, not a replacement.
- Keep HSTS enabled only when the public deployment is HTTPS. Review subdomain readiness before adding `includeSubDomains` or preload externally.

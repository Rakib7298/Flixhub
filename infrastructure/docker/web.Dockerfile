FROM node:22-alpine AS dependencies
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/database/package.json packages/database/
COPY packages/shared/package.json packages/shared/
COPY packages/config/package.json packages/config/
COPY packages/ui/package.json packages/ui/
COPY packages/api-client/package.json packages/api-client/
COPY packages/media-engine/package.json packages/media-engine/
COPY packages/cms-editions/package.json packages/cms-editions/
COPY services/tmdb/package.json services/tmdb/
COPY services/streaming-availability/package.json services/streaming-availability/
COPY services/playlist-manager/package.json services/playlist-manager/
COPY services/github-sync/package.json services/github-sync/
COPY services/media-server/package.json services/media-server/
COPY services/transcoder/package.json services/transcoder/
COPY workers/sync-worker/package.json workers/sync-worker/
COPY workers/playlist-worker/package.json workers/playlist-worker/
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
COPY . .
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV DIRECT_URL=postgresql://build:build@localhost:5432/build
RUN pnpm build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
COPY --from=build --chown=node:node /app /app
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:3000/api/health || exit 1
CMD ["pnpm", "start"]

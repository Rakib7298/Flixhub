FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter @mediamatrix/transcoder typecheck
ENV NODE_ENV=production TRANSCODER_STORAGE_ROOT=/data
RUN mkdir -p /data && chown -R node:node /data /app
USER node
EXPOSE 4100
CMD ["pnpm", "--filter", "@mediamatrix/transcoder", "start"]

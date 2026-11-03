FROM node:22-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
COPY . .
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build DIRECT_URL=postgresql://build:build@localhost:5432/build
RUN pnpm install --frozen-lockfile && pnpm db:generate
ARG WORKER_PACKAGE
ENV WORKER_PACKAGE=${WORKER_PACKAGE}
USER node
CMD ["sh", "-c", "pnpm --filter \"$WORKER_PACKAGE\" start"]

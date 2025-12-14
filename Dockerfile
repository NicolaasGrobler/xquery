# syntax=docker/dockerfile:1

FROM oven/bun:1.3.1-alpine AS base
WORKDIR /app

# Build the application
FROM base AS builder
COPY package.json bun.lock turbo.json ./
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
COPY packages/api/package.json ./packages/api/
COPY packages/auth/package.json ./packages/auth/
COPY packages/db/package.json ./packages/db/
COPY packages/config/package.json ./packages/config/
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# Production image
FROM base AS runner
ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 hono
USER hono

COPY --from=builder --chown=hono:nodejs /app/apps/server/dist ./dist

EXPOSE 3000

CMD ["bun", "run", "dist/index.mjs"]

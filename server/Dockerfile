# syntax=docker/dockerfile:1

# Build from the repository root so the npm workspace lockfile is available:
#   docker build -f server/Dockerfile -t aurora-api .

FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

FROM base AS deps
COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
COPY client/package.json ./client/package.json
RUN npm ci --workspace server --include-workspace-root

FROM deps AS build
COPY server/prisma ./server/prisma
RUN npx prisma generate --schema server/prisma/schema.prisma

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=4000

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server/prisma ./server/prisma
COPY package.json ./package.json
COPY server/package.json ./server/package.json
COPY server/src ./server/src
RUN mkdir -p /app/server/uploads && chown -R node:node /app/server/uploads

USER node
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/api/health || exit 1

CMD ["node", "server/src/index.js"]

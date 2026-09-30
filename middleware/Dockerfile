# Multi-stage production Dockerfile for haass-weather-travel middleware
# Pinned Node.js 24 runtime following ADR-009

FROM node:24.21.0-bookworm-slim AS base
WORKDIR /app

# Stage 1: Production dependencies
FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 2: Production release image
FROM base AS release
ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

# Run as non-root user 'node'
USER node

COPY --chown=node:node --from=dependencies /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node src/ ./src/

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e 'fetch("http://127.0.0.1:3000/health").then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))'

CMD ["node", "src/server.js"]

# syntax=docker/dockerfile:1
# The API and its CLI (node dist/cli.js …). Build from this folder: docker build -t glotcast-api .
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-slim
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
# Read at runtime next to dist/: the migrations db-migrate applies on every start, the Supabase CA.
COPY drizzle ./drizzle
COPY certs ./certs
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD node -e "fetch('http://127.0.0.1:3000/v1/health/live').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
# Migrations first (idempotent; a session connection via DATABASE_MIGRATION_URL), then the server.
CMD ["sh", "-c", "node dist/cli.js db-migrate && exec node dist/main.js"]

# ─── Stage 1: Install dependencies ───────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN NODE_OPTIONS="--max-old-space-size=512" npm ci --legacy-peer-deps

# ─── Stage 2: Development (hot-reload via volume mount) ───────────────────────
FROM deps AS development
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ─── Stage 3: Production build ────────────────────────────────────────────────
FROM deps AS builder
COPY . .
RUN NODE_OPTIONS="--max-old-space-size=4096" npm run build

# ─── Stage 4: Production runtime ─────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/.env ./.env
RUN apk add --no-cache postgresql-client
EXPOSE 3000
CMD ["npm", "start"]

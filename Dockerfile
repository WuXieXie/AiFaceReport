# ---- Base Stage ----
FROM node:20-bookworm-slim AS base

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl ca-certificates fontconfig fonts-noto-cjk && \
    rm -rf /var/lib/apt/lists/*

# ---- Build Stage ----
FROM base AS builder

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js
RUN npm run build

# ---- Production Stage ----
FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs --home-dir /app --shell /usr/sbin/nologin nextjs

# Copy built assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma files needed for db push and seed
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

# Copy seed script
COPY --from=builder /app/package.json ./package.json

# Create data & uploads directories
RUN mkdir -p /app/data /app/public/uploads && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL="file:/app/data/medspa.db"

# Start: push schema then run server
CMD ["sh", "-c", "npx prisma db push --skip-generate && node server.js"]

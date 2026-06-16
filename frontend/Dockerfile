# Stage 1: Build
FROM node:20-slim AS builder
WORKDIR /app

# Accept build arguments
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_FASTAPI_BASE_URL

# Set them as environment variables so Next.js bakes them into the build
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_FASTAPI_BASE_URL=$NEXT_PUBLIC_FASTAPI_BASE_URL
ENV FASTAPI_BASE_URL=$NEXT_PUBLIC_FASTAPI_BASE_URL

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
# Ensure standalone output is enabled in next.config.ts if not already
RUN npm run build

# Stage 2: Runner
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# IMPORTANT: Copy public directory for static assets
COPY --from=builder /app/public ./public

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]

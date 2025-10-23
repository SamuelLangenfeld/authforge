# ============================================================================
# Stage 1: Builder
# ============================================================================
# Use Node.js Alpine for smaller image (80MB vs 300MB)
FROM node:20-alpine AS builder

LABEL stage=builder

WORKDIR /build

# Copy package files for dependency installation
COPY package*.json ./

# Install all dependencies (including dev deps for build)
# Using npm ci for reproducible builds (respects package-lock.json)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client and build Next.js application
RUN npm run build

# Prune dev dependencies for production
RUN npm prune --omit=dev

# ============================================================================
# Stage 2: Runtime
# ============================================================================
FROM node:20-alpine

LABEL maintainer="Sam Langenfeld" \
      description="AuthForge - Authentication SaaS Platform" \
      version="0.1.0"

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user for security (prevents running as root)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001

WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=appuser:nodejs /build/.next .next
COPY --from=builder --chown=appuser:nodejs /build/public public
COPY --from=builder --chown=appuser:nodejs /build/package*.json ./
COPY --from=builder --chown=appuser:nodejs /build/node_modules node_modules
COPY --from=builder --chown=appuser:nodejs /build/prisma prisma

# Switch to non-root user
USER appuser

# Expose port (configurable via PORT env var at runtime)
EXPOSE 3000

# Health check - verify app is responsive
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Use dumb-init to handle signals properly and avoid zombie processes
# This ensures SIGTERM is properly forwarded to the Node process
ENTRYPOINT ["/usr/sbin/dumb-init", "--"]

# Start Next.js in production mode
# Using next start directly (not npm start wrapper) for:
# - Proper signal handling
# - Faster startup
# - Direct process for docker logs
CMD ["node_modules/.bin/next", "start"]


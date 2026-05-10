# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install backend dependencies
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci

# Install frontend dependencies
COPY frontend/package*.json ../frontend/
WORKDIR /app/frontend
RUN npm ci

# Copy backend and frontend source
WORKDIR /app
COPY backend/tsconfig.json backend/tsconfig.build.json backend/server.ts ./backend/
COPY backend/src/ ./backend/src/
COPY frontend/ ./frontend/

# Build backend
WORKDIR /app/backend
RUN npm run build

# Build frontend
WORKDIR /app/frontend
RUN npm run build

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:20-alpine AS production

# Run as non-root for security
RUN addgroup -S shortr && adduser -S shortr -G shortr

WORKDIR /app

# Copy backend package and production dependencies
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled backend
COPY --from=builder /app/backend/dist ./dist

# Copy static frontend files into /app/backend/out to match app.ts path resolution
COPY --from=builder /app/frontend/out ./out

# Pre-create logs dir with correct ownership
RUN mkdir -p logs && chown -R shortr:shortr /app

USER shortr

EXPOSE 3000

# node directly — no npm wrapper so SIGTERM reaches the process
CMD ["node", "dist/server.js"]

# Local Development Setup

## Prerequisites

- Node.js 18+ (`node --version`)
- npm 9+
- Homebrew (macOS)

---

## 1. MongoDB

```bash
# Install
brew tap mongodb/brew
brew install mongodb-community

# Start as a background service
brew services start mongodb-community

# Verify
mongosh --eval "db.runCommand({ ping: 1 })"
# Expected: { ok: 1 }
```

Default connection: `mongodb://localhost:27017`

---

## 2. Redis

```bash
# Install
brew install redis

# Start as a background service
brew services start redis

# Verify
redis-cli ping
# Expected: PONG
```

Default connection: `redis://localhost:6379`

---

## 3. Project Setup

```bash
# Clone and install
git clone <repo>
cd shortr
npm install

# Create your local env file
cp .env.example .env
```

`.env` — no changes needed for local defaults:

```env
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
BASE_URL=http://localhost:3000

MONGO_URI=mongodb://localhost:27017/shortr
REDIS_URL=redis://localhost:6379

RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
CREATE_RATE_LIMIT_WINDOW_MS=60000
CREATE_RATE_LIMIT_MAX_REQUESTS=10

LOG_LEVEL=info
LOG_DIR=logs
```

```bash
# Run in dev mode (hot reload)
npm run dev
```

Expected output:
```
info: MongoDB connected
info: Redis connected
info: ID range seeded { seed: 56800235584 }
info: shortr running { host: '0.0.0.0', port: 3000, env: 'development', pid: XXXXX }
```

---

## 4. Verify the APIs

```bash
# Health check
curl http://localhost:3000/api/v1/health

# Readiness (checks MongoDB + Redis)
curl http://localhost:3000/api/v1/health/ready

# Create a short URL
curl -X POST http://localhost:3000/create \
  -H "Content-Type: application/json" \
  -d '{"longURL": "https://www.example.com/some/very/long/path"}'
# Response: 201 { "success": true, "data": { "shortUrl": "http://localhost:3000/1000000", ... } }
# Note: first code on a fresh DB is always '1000000' (counter seeded at 62^6)

# Follow the redirect — -L follows it, -v shows the 301 response
curl -Lv http://localhost:3000/1000000

# 301 Permanent Redirect: browsers cache this, so repeat visits won't hit the server.
# Change to 302 in redirect.controller.ts if full click-tracking coverage is needed.
```

---

## 5. Stopping Services

```bash
brew services stop mongodb-community
brew services stop redis
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `MongoServerSelectionError` | Run `brew services start mongodb-community` |
| `Redis connection refused` | Run `brew services start redis` |
| `Port 3000 in use` | Change `PORT` in `.env` or `kill $(lsof -ti:3000)` |
| `tsx: command not found` | Run `npm install` — `tsx` is a dev dependency |
| MongoDB data lives at | `/opt/homebrew/var/mongodb` (Apple Silicon) or `/usr/local/var/mongodb` (Intel) |

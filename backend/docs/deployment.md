# Deployment Guide

Target architecture: **Fly.io** (multi-region compute) + **Cloudflare** (CDN + edge cache) + **MongoDB Atlas** (managed replica set) + **Upstash Redis** (serverless cache).

---

## Current Status

| Step | Status |
|---|---|
| Dockerize app | ✅ Done |
| MongoDB Atlas M0 | ✅ Done |
| Upstash Redis | ✅ Done |
| Fly.io initial deploy (`iad`) | ✅ Done — 2 machines running |
| Second region (`fra`) | ⬜ Pending |
| Custom domain + Cloudflare | ⬜ Pending |
| Cloudflare edge cache rule | ⬜ Pending |

App is live at: `https://your-shortr.fly.dev`

---

## Architecture

```
Users
  │
  ▼
Cloudflare (CDN, edge cache, DDoS, WAF)        ← ⬜ pending
  │
  ├── Cache HIT  → 301 served from edge (0 server load)
  │
  └── Cache MISS → Fly.io Anycast (routes to nearest region)
                          │
                ┌─────────┴──────────┐
                ▼                    ▼
          shortr [iad]         shortr [fra]     ← fra ⬜ pending
          (256MB VM)           (256MB VM)
                │                    │
                └─────────┬──────────┘
                          │
               ┌──────────┴───────────┐
               ▼                      ▼
         Upstash Redis           MongoDB Atlas
       (cache-aside)          (3-node replica set)
```

| Layer | Service | Status |
|---|---|---|
| Edge | Cloudflare CDN + WAF | ⬜ Pending |
| Compute | Fly.io `iad` (2 machines) | ✅ Running |
| Compute | Fly.io `fra` (1 machine) | ⬜ Pending |
| Cache | Upstash Redis | ✅ Running |
| Database | MongoDB Atlas M0 | ✅ Running |

---

## Prerequisites

- [flyctl](https://fly.io/docs/hands-on/install-flyctl/) installed
- A [Fly.io](https://fly.io) account (free, credit card required for verification)
- A [MongoDB Atlas](https://cloud.mongodb.com) account (free M0 tier)
- An [Upstash](https://upstash.com) account (free tier)
- A domain and [Cloudflare](https://cloudflare.com) account (free)

---

## Step 1 — MongoDB Atlas ✅

1. Create a free **M0** cluster (any cloud / region)
2. Under **Database Access** → add a user with `readWriteAnyDatabase` role
3. Under **Network Access** → Add IP `0.0.0.0/0` (allow all — Fly.io IPs are dynamic)
4. Under **Connect** → choose **Drivers** → copy the connection string and append the database name before the `?`:
   ```
   mongodb+srv://<user>:<password>@<cluster>.mongodb.net/shortr?retryWrites=true&w=majority&appName=shortr
   ```

> **Gotcha — URL-encode special characters in passwords.** If your password contains `@ # ! $ % & + = , /`, they must be percent-encoded (e.g. `#` → `%23`, `@` → `%40`). The simplest fix is to reset the password in Atlas to one containing only letters and numbers.

---

## Step 2 — Upstash Redis ✅

1. Create a **Redis** database (free tier, region closest to your Fly primary — `us-east-1` for `iad`)
2. Copy the **TLS Redis URL** from the dashboard (note double-s — `rediss://`):
   ```
   rediss://default:<password>@<host>.upstash.io:6379
   ```

> **Gotcha — always use `rediss://` (TLS), not `redis://`.** ioredis handles TLS URLs natively. The plain `redis://` URL will be rejected by Upstash in production.

---

## Step 3 — Fly.io Initial Deploy ✅

```bash
# Authenticate
fly auth login

# Create the app
fly apps create your-shortr

# Set secrets — these are never committed to git
fly secret set \
  MONGO_URI="mongodb+srv://..." \
  REDIS_URL="rediss://..." \
  API_KEY="$(openssl rand -hex 32)"

# Deploy — Fly builds the Docker image remotely and deploys
fly deploy

# fly deploy may start only 1 machine; explicitly scale to 2 for HA
fly scale count 2
```

Verify:
```bash
fly status          # should show 2 machines in iad, both started
fly checks list     # health checks should be passing
curl https://your-shortr.fly.dev/api/v1/health/ready
```

Expected response:
```json
{ "success": true, "status": "ready", "checks": { "db": "ok", "cache": "ok" } }
```

> **Gotcha — missing Redis secret causes a 503/429 cascade.** The `/api/v1/health/ready` endpoint pings both MongoDB and Redis. If `REDIS_URL` is not set, the ping fails → 503 → Fly's Consul health checker starts hammering the endpoint to detect recovery → your global rate limiter returns 429 to the health checker → Fly marks the machine as unhealthy. Fix: ensure both secrets are set before deploying, then verify with `fly secrets list`.

---

## Step 4 — Add Frankfurt Region ⬜

Running an instance in a second region gives true geographic redundancy. Fly.io's Anycast network routes each request to the nearest healthy instance automatically — no configuration needed beyond deploying the machine.

```bash
# Check current machine IDs
fly status

# Clone one of the running iad machines into Frankfurt
# (Fly Machines API — use clone, not the legacy `fly regions add`)
fly machine clone <machine-id> --region fra
```

Verify:
```bash
fly status
# Should show 2x iad + 1x fra, all started

fly checks list
# All machines should show passing
```

> **Free tier note:** Fly's free plan includes 3 shared-cpu VMs. 2 in `iad` + 1 in `fra` = 3 total — exactly within limits.

---

## Step 5 — Custom Domain via Cloudflare ⬜

You'll need a domain pointed to Cloudflare. If you don't have one, [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/) sells at cost (~$10/yr).

### 5a — Issue TLS certificate on Fly first

Do this before switching DNS so the cert is ready:

```bash
fly certs add yourdomain.com
fly certs add www.yourdomain.com
```

### 5b — DNS records in Cloudflare

Add these records with proxy status set to **Proxied** (orange cloud — not grey):

| Type | Name | Content | Proxy |
|---|---|---|---|
| CNAME | `@` | `your-shortr.fly.dev` | ✅ Proxied |
| CNAME | `www` | `your-shortr.fly.dev` | ✅ Proxied |

Proxied means all traffic flows through Cloudflare's network, enabling CDN, caching, and DDoS protection.

### 5c — Update BASE_URL

```bash
fly secret set BASE_URL="https://yourdomain.com"
```

This triggers an automatic redeploy. After it completes, `POST /create` will return short URLs with your domain.

---

## Step 6 — Cloudflare Edge Caching ⬜

The redirect endpoint (`GET /:shortCode`) returns a `301`. Cloudflare can cache these at the edge so repeat visits for a given short code never reach your server.

### Cache Rule

Cloudflare dashboard → **Caching** → **Cache Rules** → **Create rule**:

- **Rule name:** Cache short URL redirects
- **When:** Custom filter expression:
  ```
  http.request.uri.path matches "^/[a-zA-Z0-9]{7}$"
  ```
- **Cache eligibility:** Eligible for cache
- **Edge TTL:** Override → 1 hour
- **Browser TTL:** Respect origin headers

### WAF Rate Limiting Rule

Cloudflare → **Security** → **WAF** → **Rate Limiting Rules** (free plan: 1 custom rule):

- **When:** URI Path equals `/create` AND Request Method equals `POST`
- **Action:** Block
- **Threshold:** 20 requests per 1 minute per IP

This adds a second layer of rate limiting at the edge, before traffic reaches your server.

---

## Step 7 — Verify the Full Stack ⬜

```bash
# Health (direct to Fly, bypasses Cloudflare)
curl https://your-shortr.fly.dev/api/v1/health/ready

# Create a short URL (through Cloudflare)
curl -X POST https://yourdomain.com/create \
  -H "Content-Type: application/json" \
  -d '{"longURL": "https://example.com/some/very/long/path"}'

# First redirect — hits Fly (cache MISS)
curl -sI https://yourdomain.com/1000000 | grep -E "cf-cache-status|location"

# Second redirect — served from Cloudflare edge (cache HIT)
curl -sI https://yourdomain.com/1000000 | grep -E "cf-cache-status|location"
```

Expected on the second request:
```
cf-cache-status: HIT
location: https://example.com/some/very/long/path
```

`cf-cache-status: HIT` means the 301 was served from a Cloudflare PoP without touching your server.

---

## Ongoing Operations

```bash
# Rolling deploy (zero-downtime)
fly deploy

# View all machines and their regions
fly status

# View health check state for all machines
fly checks list

# Scale primary region (iad) to N machines
fly scale count <N> --region iad

# Add a machine in a new region
fly machine clone <machine-id> --region <region-code>

# Tail live logs
fly logs

# SSH into a specific machine
fly ssh console -s   # interactive machine picker

# List secrets (names only — values are never shown)
fly secrets list

# Update a secret (triggers a rolling redeploy)
fly secret set MONGO_URI="new-connection-string"
```

---

## Known Issues

| Issue | Cause | Fix |
|---|---|---|
| ~~Health check returns 429~~ | ~~Global rate limiter applies to `/api/v1/health/ready`; Consul hammers the endpoint when it detects a failing check, exhausting the limit~~ | ✅ Fixed — `globalLimiter` now skips `/api/v1/health/*` |
| `bad auth: Authentication failed` on startup | Special characters in Atlas password not URL-encoded in `MONGO_URI` | Reset Atlas password to alphanumeric only, or percent-encode special chars |
| `/api/v1/health/ready` returns 503 with `cache: error` | `REDIS_URL` secret not set | `fly secret set REDIS_URL="rediss://..."` |
| Only 1 machine after `fly deploy` | `min_machines_running` in `fly.toml` is a floor during deploy but the initial deploy may start 1 | Run `fly scale count 2` explicitly after first deploy |

---

## Free Tier Limits

| Service | Free Allowance | Usage |
|---|---|---|
| Fly.io | 3 shared VMs, 160GB transfer/mo | 3 VMs (2x iad + 1x fra) |
| MongoDB Atlas | 512MB storage | Well under for portfolio traffic |
| Upstash Redis | 10,000 commands/day | Easily sufficient |
| Cloudflare | Unlimited bandwidth, 1 WAF rate limit rule | Unlimited |

### Scale-out path (when needed)

| Current | Upgrade | Cost |
|---|---|---|
| Atlas M0 (single region) | Atlas M10 with regional read replicas | ~$57/mo |
| Upstash single-region | Upstash Global (replicated reads) | ~$10/mo |
| Cloudflare WAF (1 rule) | Cloudflare Pro WAF | $20/mo |
| Fly.io Anycast LB | Cloudflare Load Balancer (weighted routing) | $5/mo |

---

## Next Features (App Roadmap)

- **Analytics query endpoint** — `GET /api/v1/analytics/:shortCode` returning click count and recent activity
- **URL expiry** — optional `expiresAt` on `ShortUrl`; expired codes return 410 Gone
- **Per-key rate limiting** — replace IP-based `createLimiter` on `POST /create` with key-aware limiting

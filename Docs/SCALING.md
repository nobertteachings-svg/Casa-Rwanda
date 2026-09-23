# Scaling Casa on Railway

## Architecture

| Service | `PROCESS_ROLE` | Replicas | Responsibility |
|---------|----------------|----------|----------------|
| **Web** | `web` | 2+ | HTTP API + webhook queue consumer |
| **Worker** (optional) | `worker` | 1 | Webhook queue + scheduled jobs |

Webhook replies are processed on **web** as well as worker, so a missing worker service no longer silently drops chats. Scheduled jobs (digests, price tips) still prefer a dedicated worker / `PROCESS_ROLE=all`.

For local dev, use `PROCESS_ROLE=all` (default) — one process does everything.

## Deploy web tier

Uses `railway.toml` at repo root:

```env
PROCESS_ROLE=web
SENTRY_DSN=https://...@sentry.io/...
WHATSAPP_APP_SECRET=...
```

## Deploy worker tier (optional, for scheduled jobs)

Create a second Railway service pointing at the same repo, config file `railway.worker.toml`:

```env
PROCESS_ROLE=worker
# Same DATABASE_URL, REDIS_URL, WHATSAPP_* as web
```

## Load test

```bash
cd backend
LOAD_TEST_URL=https://your-web-service.railway.app npm run loadtest
```

## PostGIS

Migration `007_postgis.sql` runs automatically on deploy. Supabase has PostGIS enabled by default. Local Docker uses `postgis/postgis:16-3.4-alpine`.

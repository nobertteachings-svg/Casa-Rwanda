# Deploy Casa on Railway (Postgres + Redis)

Everything runs on Railway:
- **Casa backend** — WhatsApp webhook + API (from GitHub)
- **PostgreSQL** — Railway database plugin
- **Redis** — Railway Redis plugin (conversation sessions)

---

## Architecture

```
GitHub (Casa-Rwanda repo)
        ↓
Railway: Casa backend service  ←→  Railway Postgres
        ↓                          Railway Redis
   Public URL /webhook
        ↓
   Meta WhatsApp
```

---

## Step 1 — Push code to GitHub

```bash
cd "/Users/macbookpro2017/Desktop/Casa Rwanda"
git add .
git commit -m "Prepare Railway deploy with Postgres and Redis"
git push -u origin main
```

Repo: `git@github.com-casa-rwanda:nobertteachings-svg/Casa-Rwanda.git`

---

## Step 2 — Create Railway project

1. Go to [railway.app/new](https://railway.app/new)
2. **Deploy from GitHub repo** → select **nobertteachings-svg/Casa-Rwanda**
3. Railway reads `railway.toml` and builds with `backend/Dockerfile`

Rename the GitHub service to **casa-backend** (optional, for clarity).

---

## Step 3 — Add PostgreSQL

1. In your Railway project, click **+ New**
2. Choose **Database** → **PostgreSQL**
3. Railway provisions Postgres and exposes `DATABASE_URL`

Rename this service to **Postgres** (click service name → rename).

---

## Step 4 — Add Redis

1. Click **+ New** again
2. Choose **Database** → **Redis**
3. Railway provisions Redis and exposes `REDIS_URL`

Rename this service to **Redis**.

---

## Step 5 — Link database & Redis to the backend

1. Open the **casa-backend** service (your GitHub deploy)
2. Go to **Variables**
3. Click **+ New Variable** → **Add reference**

Add these references:

| Variable name | Reference |
|---------------|-----------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` |

> If you used different service names, pick the matching service from the dropdown.  
> Railway auto-fills the `${{ServiceName.VARIABLE}}` syntax.

---

## Step 6 — Add app secrets

Still in **casa-backend** → **Variables**, add manually (copy from your local `.env`):

| Variable | Notes |
|----------|--------|
| `NODE_ENV` | `production` |
| `WHATSAPP_TOKEN` | Meta WhatsApp |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta |
| `WHATSAPP_VERIFY_TOKEN` | Your secret verify string |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Meta |
| `ANTHROPIC_API_KEY` | Claude |
| `CLOUDINARY_CLOUD_NAME` | Optional |
| `CLOUDINARY_API_KEY` | Optional |
| `CLOUDINARY_API_SECRET` | Optional |
| `PAYSTACK_SECRET_KEY` | Optional (Rwanda payments) |
| `FLUTTERWAVE_SECRET_KEY` | Optional (Rwanda payments) |
| `UNLOCK_FEE_RWF` | `5000` |
| `DEFAULT_SEARCH_RADIUS_KM` | `100` |
| `ADMIN_API_KEY` | Admin dashboard login |
| `ADMIN_ORIGIN` | `https://admin.casahomesrwanda.com` (or localhost until admin is live) |
| `MARKETING_ORIGIN` | `https://casahomesrwanda.com,https://www.casahomesrwanda.com` |
| `WHATSAPP_APP_SECRET` | Required in production for webhook signatures |

**Do not set `PORT`** — Railway sets it automatically.

You do **not** need `DATABASE_POOL_URL` with Railway Postgres.

Template: see `railway.env.example` in the repo root.

---

## Step 7 — Public + custom domains

1. **casa-backend** → **Settings** → **Networking** → **Generate Domain**  
   Backup URL example: `https://casa-backend-production.up.railway.app`
2. Attach **`api.casahomesrwanda.com`** — full clicks + DNS: **[DOMAIN_SETUP.md](./DOMAIN_SETUP.md)**

### Test health

```bash
# After custom domain SSL is active:
curl https://api.casahomesrwanda.com/health

# Or Railway backup URL:
curl https://YOUR-DOMAIN.up.railway.app/health
```

Expected:
```json
{"status":"ok","whatsapp":true,"timestamp":"..."}
```

On first deploy, migrations run automatically.

---

## Step 8 — WhatsApp webhook

Meta Developers → WhatsApp → Configuration:

| Field | Value |
|-------|--------|
| **Callback URL** | `https://api.casahomesrwanda.com/webhook` |
| **Verify token** | Same as `WHATSAPP_VERIFY_TOKEN` |

**Verify and save** → subscribe to **messages**.

Until the custom domain is ready, you can temporarily use the Railway `*.up.railway.app` webhook URL, then switch to `api.casahomesrwanda.com`.

---

## Step 9 — Redeploy after variable changes

Any time you change variables:
- Railway redeploys automatically, or
- **casa-backend** → **Deployments** → **Redeploy**

---

## Deploy from CLI (optional)

```bash
cd "/Users/macbookpro2017/Desktop/Casa Rwanda"
npx railway login
npx railway link          # select your project + casa-backend service
npx railway up
```

---

## What runs on each deploy

1. Docker build (`backend/Dockerfile`)
2. `node dist/db/migrate.js` — creates tables on Railway Postgres
3. `node dist/index.js` — starts API on Railway `PORT`
4. Health check: `GET /health`

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Build failed | Check **Deployments** → build logs; ensure `db/migrations/` is in repo |
| `Migration failed` | Confirm `DATABASE_URL` reference is linked to Postgres service |
| Health check 503 | Postgres or Redis not linked; check variable references |
| Redis connection error | Use `${{Redis.REDIS_URL}}` reference — Railway uses `redis://` internally |
| Webhook verify fails | Backend must be running; verify token must match Meta exactly |
| `relation does not exist` | Redeploy to re-run migrations, or run migrate manually via Railway shell |

### Run migrations manually (Railway shell)

**casa-backend** → **Settings** → enable shell, then:
```bash
node dist/db/migrate.js
```

---

## Local dev with Railway databases (optional)

Pull Railway env vars to a local file:
```bash
npx railway link
npx railway variables --kv > .env.railway
```

Use those URLs locally only for debugging — prefer local Docker Postgres/Redis for day-to-day dev.

---

## After backend is live

1. Attach custom domains — **[DOMAIN_SETUP.md](./DOMAIN_SETUP.md)** (`api` / apex / `www` / `admin`)
2. Deploy **admin** with `VITE_API_URL=https://api.casahomesrwanda.com`
3. Set `ADMIN_ORIGIN=https://admin.casahomesrwanda.com`
4. Deploy **marketing** — [MARKETING_RAILWAY.md](./MARKETING_RAILWAY.md)
5. Set `MARKETING_ORIGIN=https://casahomesrwanda.com,https://www.casahomesrwanda.com`
6. Point Meta webhook at `https://api.casahomesrwanda.com/webhook`
7. Test WhatsApp by messaging your business number

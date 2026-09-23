# Railway — Casa marketing site (static Vite app)

Add a **new service** in your existing Casa Railway project (same GitHub repo).

**Production domain:** `casahomeskenya.com` / `www.casahomeskenya.com`  
**Full DNS + Railway clicks:** [DOMAIN_SETUP.md](./DOMAIN_SETUP.md)

## 1. Create the service

1. Open your Railway project (same one as **casa-backend**, **Postgres**, **Redis**, **admin**).
2. Click **+ New** → **GitHub Repo** → select **Casa-Kenya** (if not already linked).
3. Rename the service to **casa-marketing**.

## 2. Service settings

In **casa-marketing** → **Settings**:

| Setting | Value |
|---------|--------|
| **Root Directory** | `marketing` |
| **Config file** | `/marketing/railway.toml` |

Railway will run `npm ci && npm run build` inside `marketing/`, then `npm start` (serves `dist/` on `PORT`).

## 3. Environment variables

In **casa-marketing** → **Variables**, add:

| Variable | Example | Notes |
|----------|---------|--------|
| `VITE_API_URL` | `https://api.casahomeskenya.com` | Backend custom domain (no trailing slash) |
| `VITE_WHATSAPP_PHONE` | `15556677919` | Digits only, country code included |
| `VITE_CONTACT_EMAIL` | `hello@casahomeskenya.com` | Footer contact |

`VITE_*` variables are baked in at **build time**. After changing them, **redeploy** the marketing service.

Until the custom domain is live, you can temporarily use the Railway backend URL:

```env
VITE_API_URL=https://${{casa-backend.RAILWAY_PUBLIC_DOMAIN}}
```

## 4. Domains

1. **casa-marketing** → **Settings** → **Networking** → **Generate Domain** (backup URL).
2. Attach custom domains **casahomeskenya.com** and **www.casahomeskenya.com** — follow [DOMAIN_SETUP.md](./DOMAIN_SETUP.md).

## 5. Link backend CORS

On **casa-backend** → **Variables**, set:

```env
MARKETING_ORIGIN=https://casahomeskenya.com,https://www.casahomeskenya.com
```

Redeploy the backend after updating.

## 6. Deploy latest backend (required for live data)

The marketing site calls:

- `GET /api/public/stats`
- `GET /api/public/listings`
- `GET /api/public/media`

## 7. Verify

```bash
curl -s https://casahomeskenya.com/ | head
curl -s https://api.casahomeskenya.com/api/public/stats
curl -s https://api.casahomeskenya.com/api/public/listings
```

Open https://casahomeskenya.com — stats and the listings carousel should load when the backend is up and has active listings with media.

## CLI deploy (optional)

```bash
cd "/Users/macbookpro2017/Desktop/Casa Kenya"
npx railway login
npx railway link    # select project + casa-marketing service
npx railway up --service casa-marketing
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Build fails | Check **Deployments** logs; ensure Root Directory is `marketing` |
| Blank page / 404 on refresh | `npm start` uses `serve -s` for SPA routing — confirm `start` script in `marketing/package.json` |
| Stats / listings unavailable | Set `VITE_API_URL=https://api.casahomeskenya.com` and redeploy marketing |
| CORS errors in browser | Set `MARKETING_ORIGIN` on backend to exact marketing URLs |
| WhatsApp button wrong number | Set `VITE_WHATSAPP_PHONE` and redeploy marketing |
| Custom domain SSL pending | See [DOMAIN_SETUP.md](./DOMAIN_SETUP.md) troubleshooting |

# Casa Rwanda — marketing site

Live stats and listing carousel need the backend public API (`/api/public/*`).

**Production domain:** [casahomesrwanda.com](https://casahomesrwanda.com)  
**Custom domain steps:** [Docs/DOMAIN_SETUP.md](../Docs/DOMAIN_SETUP.md)

## Brand assets

Regenerate feature graphic, OG image, lockup, and icons from the master mark:

```bash
.venv-brand/bin/python scripts/generate_brand_assets.py
```

## Environment variables

Set on Railway **casa-marketing** (build-time for `VITE_*`):

```env
VITE_WHATSAPP_PHONE=250735496786
VITE_API_URL=https://api.casahomesrwanda.com
VITE_CONTACT_EMAIL=hello@casahomesrwanda.com
```

On **casa-backend**, set CORS:

```env
MARKETING_ORIGIN=https://casahomesrwanda.com,https://www.casahomesrwanda.com
```

Full Railway steps: [Docs/MARKETING_RAILWAY.md](../Docs/MARKETING_RAILWAY.md)

## Local dev

```bash
cd marketing
npm install
npm run dev
```

Open http://localhost:5174 (proxies `/api` to `localhost:3000` when backend is running).

## Deploy on Railway

1. New service in your existing Casa Rwanda Railway project
2. **Root Directory:** `marketing`
3. **Config file:** `/marketing/railway.toml`
4. Add `VITE_*` variables above
5. Generate a Railway domain, then attach **casahomesrwanda.com** / **www** — see [DOMAIN_SETUP.md](../Docs/DOMAIN_SETUP.md)
6. Set `MARKETING_ORIGIN` on the backend

## Deploy on Vercel (alternative)

1. Import repo → **Root Directory** `marketing`
2. Add `VITE_*` environment variables
3. Deploy, then point the domain at Vercel if not using Railway for marketing

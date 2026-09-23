# Custom domain setup — casahomesrwanda.com

You own **casahomesrwanda.com**. Use these hostnames with Railway:

| Hostname | Railway service | Purpose |
|----------|-----------------|---------|
| `casahomesrwanda.com` | **casa-marketing** | Public landing page |
| `www.casahomesrwanda.com` | **casa-marketing** | Same site (www → apex or both) |
| `api.casahomesrwanda.com` | **casa-backend** | WhatsApp webhook + `/api/*` |
| `admin.casahomesrwanda.com` | **casa-admin** | Admin dashboard |

Keep the default `*.up.railway.app` URLs as backups until DNS + SSL are green.

---

## Before you start

1. Railway project is deployed with **casa-backend**, **casa-marketing**, and **casa-admin** (names may differ — use yours).
2. Each of those services already has a Railway public domain (Generate Domain).
3. You can log into your domain registrar (Namecheap, GoDaddy, etc.) DNS panel for `casahomesrwanda.com`.

---

## Part A — Railway: add custom domains (clicks)

Do this **three times** — once per service.

### A1. Backend → `api.casahomesrwanda.com`

1. Open [railway.app](https://railway.app) → your Casa project.
2. Click the **casa-backend** service.
3. Open **Settings**.
4. Scroll to **Networking**.
5. Under **Public Networking**, click **Custom Domain** (or **+ Custom Domain**).
6. Type: `api.casahomesrwanda.com`
7. Confirm / Add.
8. Railway shows a **DNS target** — usually a CNAME like:
   - `xxxxx.up.railway.app`  
   or a value under **CNAME** / **Value**.
9. **Copy that target** — you need it for the registrar in Part B.
10. Leave this tab open; SSL stays “Pending” until DNS propagates.

### A2. Marketing → apex + www

1. Click **casa-marketing**.
2. **Settings** → **Networking** → **Custom Domain**.
3. Add `casahomesrwanda.com` (apex / root).
4. Copy the DNS instructions Railway shows for the apex (often **CNAME** flattening, **ALIAS**, or an **A/AAAA** target — follow Railway’s exact row).
5. Add a second custom domain: `www.casahomesrwanda.com`.
6. Copy the **www** CNAME target (usually `something.up.railway.app`).

### A3. Admin → `admin.casahomesrwanda.com`

1. Click **casa-admin**.
2. **Settings** → **Networking** → **Custom Domain**.
3. Add `admin.casahomesrwanda.com`.
4. Copy the CNAME target.

---

## Part B — Registrar DNS records

In your registrar’s DNS for `casahomesrwanda.com`, add records that match what Railway showed. Typical pattern:

| Type | Host / Name | Value | TTL |
|------|-------------|-------|-----|
| CNAME | `api` | *(backend target from A1)* | Auto / 300 |
| CNAME | `admin` | *(admin target from A3)* | Auto / 300 |
| CNAME | `www` | *(marketing www target from A2)* | Auto / 300 |
| ALIAS / ANAME / CNAME | `@` (root) | *(marketing apex target from A2)* | Auto / 300 |

Notes:

- **Namecheap:** Host `api` means `api.casahomesrwanda.com`. Host `@` is the root domain. Host `www` is www.
- If the registrar has no ALIAS/ANAME for `@`, use whatever Railway documents for apex (some use their nameservers or an A record). Prefer Railway’s on-screen instructions over guessing.
- Do **not** point MX records away if you use the 3 mailboxes you bought — leave email MX as the registrar set them.
- Remove conflicting old A/CNAME records for the same hostnames if any exist.

Save DNS. Propagation is often 5–30 minutes; can take up to 48 hours.

---

## Part C — Wait for SSL on Railway

Back on each service → **Settings** → **Networking**:

- Custom domain status should change from **Pending** → **Active** / certificate issued.
- Test in a browser (or curl):

```bash
curl -I https://api.casahomesrwanda.com/health
curl -I https://casahomesrwanda.com/
curl -I https://www.casahomesrwanda.com/
curl -I https://admin.casahomesrwanda.com/
```

All should return HTTPS successfully (not certificate errors).

---

## Part D — Update Railway environment variables

### D1. Backend (`casa-backend` → Variables)

```env
ADMIN_ORIGIN=https://admin.casahomesrwanda.com
MARKETING_ORIGIN=https://casahomesrwanda.com,https://www.casahomesrwanda.com
```

Optional while migrating (comma-separated):

```env
ADMIN_ORIGIN=https://admin.casahomesrwanda.com,https://casa-admin-production.up.railway.app
MARKETING_ORIGIN=https://casahomesrwanda.com,https://www.casahomesrwanda.com,https://casa-marketing-production.up.railway.app
```

Redeploy backend (or let Railway restart after variable change).

### D2. Marketing (`casa-marketing` → Variables)

`VITE_*` are **build-time** — change then **Redeploy**:

```env
VITE_API_URL=https://api.casahomesrwanda.com
VITE_WHATSAPP_PHONE=250735496786
VITE_CONTACT_EMAIL=hello@casahomesrwanda.com
```

### D3. Admin (`casa-admin` → Variables)

```env
VITE_API_URL=https://api.casahomesrwanda.com
```

Redeploy admin after changing this.

---

## Part E — WhatsApp webhook (Meta)

1. [developers.facebook.com](https://developers.facebook.com) → your app → **WhatsApp** → **Configuration**.
2. Edit webhook **Callback URL**:

```text
https://api.casahomesrwanda.com/webhook
```

3. **Verify token** = same as Railway `WHATSAPP_VERIFY_TOKEN`.
4. Click **Verify and save**.
5. Confirm **messages** is subscribed.

Test: send a WhatsApp message to the business number; check backend logs.

---

## Part F — Email mailboxes (optional)

You purchased 3 mailboxes with the domain. Suggested:

| Address | Use |
|---------|-----|
| `hello@casahomesrwanda.com` | Public contact (matches `VITE_CONTACT_EMAIL`) |
| `support@casahomesrwanda.com` | Tenant / landlord support |
| `admin@casahomesrwanda.com` | Internal / Meta Business verification |

Create them in the registrar’s email panel. Do not change MX records unless the email provider tells you to.

---

## Part G — Final checklist

- [ ] `https://api.casahomesrwanda.com/health` → `{"status":"ok",...}`
- [ ] `https://casahomesrwanda.com` loads marketing; stats/listings work (no CORS errors in browser console)
- [ ] `https://admin.casahomesrwanda.com` login works with `ADMIN_API_KEY`
- [ ] Meta webhook verifies against `https://api.casahomesrwanda.com/webhook`
- [ ] WhatsApp bot replies
- [ ] `hello@casahomesrwanda.com` receives a test email

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| SSL stuck on Pending | DNS not propagated or wrong CNAME; check with `dig api.casahomesrwanda.com CNAME` |
| Apex (`@`) won’t attach | Use registrar ALIAS/ANAME or Railway’s apex instructions; `www` often works first |
| Marketing loads but stats fail | Redeploy marketing with `VITE_API_URL=https://api.casahomesrwanda.com`; set `MARKETING_ORIGIN` on backend |
| Admin login / API errors | Set admin `VITE_API_URL` + backend `ADMIN_ORIGIN` to the exact admin URL (no trailing slash) |
| Webhook verify fails | Backend healthy; token match; use `https://api.../webhook` not the old railway.app URL |
| Email works but website doesn’t | Unrelated — email MX ≠ web CNAME; fix web records only |

---

## Related docs

- [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md) — backend + Postgres + Redis
- [MARKETING_RAILWAY.md](./MARKETING_RAILWAY.md) — marketing service
- [SCALING.md](./SCALING.md) — web / worker roles
- [Developer_Handover.md](./Developer_Handover.md) — full system overview

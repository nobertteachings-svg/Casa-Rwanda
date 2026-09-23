# Casa Rwanda — Developer Handover Document

**Project:** Casa Rwanda  
**Version:** 0.3.1 (production-ready MVP)  
**Date:** 14 July 2026  
**Status:** Deployed on Railway — payments gated off for launch (`PAYMENTS_ENABLED=false`); Paystack/Flutterwave still to wire before charged unlocks. Admin services must deploy with **root directory = `admin/`** (do not import sibling packages from admin).

---

## 1. Executive Summary

Casa is an **AI-powered housing platform for Rwanda** that runs primarily on **WhatsApp**, with a public marketing site and a React admin dashboard. Landlords list residential or commercial properties via chat (with mandatory ID verification and video walkthrough); tenants search by category, location, or natural language and unlock landlord contact details.

This handover covers everything built to date:

| Area | Status |
|------|--------|
| WhatsApp webhook + conversation engine | ✅ Built |
| Tappable WhatsApp menus (list/button replies) | ✅ Built |
| User registration (English, landlord/tenant, referrals) | ✅ Built |
| Landlord ID verification (Claude Vision) | ✅ Built |
| Landlord listing flows (AI + step-by-step) | ✅ Built |
| Landlord “My listings” (mark rented / reactivate) | ✅ Built |
| Property taxonomy (residential/commercial, subtypes, regions) | ✅ Built |
| Electricity meter type (none / prepaid / postpaid) | ✅ Built |
| Mandatory property video (Verified+) | ✅ Built |
| Tenant search + category/facility filters | ✅ Built |
| Tenant “already rented” report (auto-hide listing) | ✅ Built |
| Unlock flow + unlock history + referral credits | ✅ Built (free when payments off) |
| Landlord unlock notifications | ✅ Built |
| Tenant features (alerts, compare, diaspora, concierge) | ✅ Built |
| Landlord features (performance, lease, bulk) | ✅ Built |
| USSD stub (search only) | ✅ Built |
| Scheduled jobs (weekly pings, price suggestions, trends) | ✅ Built |
| PostgreSQL data layer (9 migrations) | ✅ Built |
| PostGIS proximity search (optional; Haversine SQL fallback) | ✅ Built |
| Redis session state + durable webhook queue (retry/DLQ) | ✅ Built |
| Cloudinary photo/video persist | ✅ Wired (falls back to `wa-media:{id}`) |
| Meta webhook signature validation | ✅ Built (`WHATSAPP_APP_SECRET`) |
| Zod HTTP request validation + security headers | ✅ Built |
| Fail-closed rate limits (admin/webhook/USSD) | ✅ Built |
| Structured JSON logging | ✅ Built (`lib/logger.ts`) |
| Public API for marketing site | ✅ Built |
| Marketing landing page (React/Vite) | ✅ Built |
| Admin dashboard v2 (React; self-contained types) | ✅ Built |
| Admin sessions, audit log, AI review, payments UI | ✅ Built |
| Railway deploy (web + optional worker) | ✅ Configured |
| GitHub Actions CI | ✅ Built |
| Quality attributes map | ✅ `Docs/QUALITY_ATTRIBUTES.md` |
| Sentry monitoring | ✅ Optional (`SENTRY_DSN`) |
| Claude AI (listing/search/ID/lease/compare) | ✅ Built (requires API key) |
| Mobile Money / Paystack Rwanda payments | 🔜 Env + honour-system path; `PAYMENTS_ENABLED=false` at launch |

**Production domain:** `casahomesrwanda.com` (`api.` / `admin.` / apex + `www`)  
**Source of truth for product requirements:** `Docs/Casa_Product_Plan (1).docx`  
**Deploy guides:** `Docs/DOMAIN_SETUP.md`, `Docs/RAILWAY_DEPLOY.md`, `Docs/MARKETING_RAILWAY.md`, `Docs/SCALING.md`, `Docs/DEPLOY.md`  
**Quality / ops map:** `Docs/QUALITY_ATTRIBUTES.md`

---

## 2. Product Overview

### 2.1 Two User Types

| User | Journey |
|------|---------|
| **Landlord** | Registers → verifies ID (National ID/passport) → lists property (AI or step-by-step) → selects category & subtype → region/town/quarter → GPS pin → facilities → photos → **required video** → listing live → manages via **My listings** (mark rented / reactivate) |
| **Tenant** | Registers → chooses residential/commercial/either → sends location or describes needs → browses results → sees move-in cost → unlocks contact (free while payments off; otherwise pays unlock fee) → Google Maps link + concierge tips; can report **already rented** |

### 2.2 Property Categories

Listings are **residential** or **commercial**. Subtype menus are defined in `backend/src/constants/property-taxonomy.ts`.

**Residential subtypes:** `single_room`, `double_room`, `bedsitter`, `studio`, `one_bedroom`, `two_bedroom`, `three_bedroom_plus`, `maisonette`, `bungalow`, `servant_quarter`

**Commercial subtypes:** `shop`, `office`, `warehouse`, `restaurant`, `salon`, `workshop`, `showroom`, `commercial_space`

**Location capture order:** state → city (free text) → neighbourhood (free text) → WhatsApp GPS pin.

**Electricity:** `electricity_meter` is `none`, `prepaid`, or `postpaid` (replaces legacy boolean `electricity` flag).

### 2.3 Business Model (from product plan)

- **Primary revenue:** 5,000 RWF per landlord contact unlock (when `PAYMENTS_ENABLED=true`)
- **Launch mode:** unlocks are free (`PAYMENTS_ENABLED=false`); fee UI/admin settings still exist for when payments go live
- **Future:** Featured listings, landlord subscriptions, API access, rent data insights

### 2.4 Brand Assets (repo root)

- `casa_logo_lockup_horizontal.png`
- `casa_logo_mark_master_1024.png`
- `casa_feature_graphic_1024x500.png`

---

## 3. Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────────────┐
│  WhatsApp User  │────▶│  Meta Cloud API  │────▶│  Backend (Express)          │
│  (Landlord /    │     │  (Webhook)       │     │  Railway web (PROCESS_ROLE) │
│   Tenant)       │◀────│                  │◀────│  :3000 / $PORT              │
└─────────────────┘     └──────────────────┘     └──────────────┬──────────────┘
                                                                │
        ┌───────────────────────────────┬───────────────────────┼───────────────────────┐
        ▼                               ▼                       ▼                       ▼
 ┌─────────────┐               ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
 │ PostgreSQL  │               │    Redis    │         │ Claude API  │         │ Cloudinary  │
 │ (+ PostGIS  │               │  sessions + │         │ (optional)  │         │ (optional)  │
 │  when avail)│               │  job queue  │         └─────────────┘         └─────────────┘
 └─────────────┘               └─────────────┘
        ▲                               ▲
        │                               │
 ┌──────┴──────┐               ┌────────┴────────┐
 │ Admin (React│───────────────│ Marketing site  │
 │  :5173)     │  /api/admin/* │  (Vite :5174)   │
 └─────────────┘               │  /api/public/*  │
                               └─────────────────┘
```

### 3.1 Design Decisions

1. **WhatsApp-first** — Primary UX is Meta WhatsApp Cloud API; marketing site is discovery + CTA into WhatsApp.
2. **Tappable menus** — Most choices use WhatsApp interactive list/button messages (`sendMenuMessage`); users can still type numbers.
3. **Stateful conversations** — Each user's position in a multi-step flow is stored in Redis (24h TTL).
4. **Flow router pattern** — `flows/router.ts` dispatches messages based on `session.flow` and `session.step`.
5. **Mock mode** — If WhatsApp credentials are missing, outbound messages are logged to console instead of sent.
6. **Separate deployable apps** — `backend/`, `admin/`, and `marketing/` are separate Node projects sharing one root `.env`. They are **not** an npm workspace; Railway root-directory builds only see that package’s tree.
7. **Admin is self-contained** — Domain types live in `admin/src/types.ts`. Do **not** import from `../packages/shared` or other sibling packages in admin/marketing (Railway admin builds fail with `TS2307` if they resolve outside `/admin`).
8. **Admin auth** — Login exchanges `ADMIN_API_KEY` for a Redis-backed session token; API calls use Bearer session (or key).
9. **Process roles** — `PROCESS_ROLE=all|web|worker` splits HTTP from webhook queue / scheduled jobs (see `Docs/SCALING.md`). Web always starts the webhook queue consumer so replies work without a worker.
10. **Durable webhook queue** — Redis list + processing list + up to 3 retries + DLQ (`casa:webhook:dlq`); orphans recovered on startup.
11. **Payments flag** — `PAYMENTS_ENABLED=false` delivers unlocks immediately (amount 0); set `true` to require the PAID honour path until Paystack/Flutterwave are wired.
12. **Request validation** — Zod schemas in `backend/src/schemas/http.ts` via `middleware/validate.ts` on admin/public/USSD/simulate inputs.

---

## 4. Repository Structure

```
Casa Rwanda/
├── package.json                    # Root scripts: quality:check, dev:*, test
├── packages/
│   └── shared/                     # Optional shared TS contracts (NOT imported by admin builds)
│
├── admin/                          # React admin dashboard (Vite) — Railway root = admin/
│   ├── src/
│   │   ├── api/client.ts           # API client + session token storage
│   │   ├── components/             # Layout, ErrorBanner, StatCard, GlobalSearch, MediaImage, …
│   │   ├── context/AppContext.tsx
│   │   ├── i18n/strings.ts
│   │   ├── pages/                  # Login, Dashboard, Users, Listings, Moderation,
│   │   │                           # Verifications, Payments, Insights, Settings, AuditLog
│   │   ├── types.ts                # Self-contained domain types (no @casa/shared)
│   │   └── styles.css
│   ├── railway.toml
│   └── package.json
│
├── backend/                        # Node.js + Express API
│   ├── Dockerfile                  # Node 22 Alpine
│   ├── src/
│   │   ├── index.ts                # Web (or all) process entry
│   │   ├── worker.ts               # Worker-only entry
│   │   ├── app.ts                  # Express app, CORS, security headers, health
│   │   ├── background.ts           # Redis connect + queue recovery/scheduler start
│   │   ├── monitoring.ts           # Sentry init
│   │   ├── lib/logger.ts           # Structured JSON logging
│   │   ├── config/env.ts           # Zod-validated environment
│   │   ├── schemas/http.ts         # Zod HTTP body/query schemas
│   │   ├── constants/
│   │   │   └── property-taxonomy.ts
│   │   ├── db/
│   │   │   ├── pool.ts
│   │   │   └── migrate.ts
│   │   ├── redis/client.ts
│   │   ├── middleware/             # admin-auth, rate-limit, validate, security-headers
│   │   ├── routes/
│   │   │   ├── webhook.ts          # Verify + receive + /simulate
│   │   │   ├── admin.ts            # Protected admin API (+ Zod validation)
│   │   │   ├── public.ts           # Marketing public API
│   │   │   └── ussd.ts
│   │   ├── flows/
│   │   │   ├── router.ts
│   │   │   ├── registration.ts
│   │   │   ├── main-menu.ts
│   │   │   ├── menu-options.ts     # Interactive menu option builders
│   │   │   ├── landlord-listing.ts
│   │   │   ├── landlord-listings.ts # My listings / mark rented
│   │   │   ├── landlord-verify-id.ts
│   │   │   ├── landlord-features.ts
│   │   │   ├── tenant-search.ts
│   │   │   └── tenant-features.ts
│   │   ├── services/
│   │   │   ├── whatsapp.ts
│   │   │   ├── houses.ts / house-search.ts
│   │   │   ├── geocoding.ts        # Reverse + forward Nominatim (Redis cache)
│   │   │   ├── claude.ts
│   │   │   ├── admin-stats.ts
│   │   │   ├── public-listings.ts / public-stats.ts
│   │   │   ├── webhook-security.ts / webhook-queue.ts  # retry + DLQ
│   │   │   ├── admin/              # platform, audit, AI review, risk, sessions, ops
│   │   │   └── features/           # unlocks, media, cloudinary, flags, scheduler, …
│   │   └── i18n/
│   └── package.json
│
├── marketing/                      # Public landing page (Vite) — Railway root = marketing/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── api.ts                  # Calls /api/public/*
│   │   ├── i18n.ts
│   │   └── components/             # LiveStats, LiveShowcase, SocialLinks
│   ├── railway.toml
│   └── package.json
│
├── db/migrations/
│   ├── 001_initial.sql
│   ├── 002_features.sql
│   ├── 003_landlord_id_verification.sql
│   ├── 004_property_taxonomy.sql
│   ├── 005_electricity_meter.sql
│   ├── 006_admin_platform.sql      # Suspend, disputes, audit, platform_settings
│   ├── 007_postgis.sql             # Optional PostGIS (no-op if unavailable)
│   ├── 008_performance_indexes.sql
│   └── 009_backfill_display_names.sql
│
├── Docs/
│   ├── Casa_Product_Plan (1).docx
│   ├── Casa_Explained_Simply.md
│   ├── Feature_Backlog.md
│   ├── Developer_Handover.md       # This document
│   ├── QUALITY_ATTRIBUTES.md       # Reliability/security/maintainability map
│   ├── DOMAIN_SETUP.md             # casahomesrwanda.com + Railway DNS clicks
│   ├── RAILWAY_DEPLOY.md
│   ├── MARKETING_RAILWAY.md
│   ├── SCALING.md
│   └── DEPLOY.md
│
├── .github/workflows/ci.yml        # Backend test/typecheck + admin/marketing build
├── docker-compose.yml              # PostGIS 16 + Redis 7 (healthchecks)
├── railway.toml                    # Web service (2 replicas)
├── railway.worker.toml             # Worker service
├── railway.env.example
├── .env.example
└── README.md
```

---

## 5. Tech Stack

| Layer | Technology | Version / Notes |
|-------|------------|-----------------|
| WhatsApp | Meta WhatsApp Cloud API | Graph API v21.0; interactive lists/buttons |
| Backend runtime | Node.js 22 + Express | ESM (`"type": "module"`); Docker + CI on Node 22 |
| Backend language | TypeScript | Strict mode; Zod for env + HTTP inputs |
| Database | PostgreSQL | 16 via Docker (`postgis/postgis:16-3.4-alpine`) or Railway Postgres |
| Spatial search | PostGIS when available | Else Haversine in SQL (`house-search.ts`) |
| Session / queue | Redis | 7 (Docker) or Railway Redis; ioredis; webhook retry/DLQ |
| AI | Anthropic Claude | `claude-sonnet-4-6` |
| Geocoding | OpenStreetMap Nominatim | Reverse + forward; Redis-cached |
| Admin UI | React + React Router | Vite, React 19; self-contained types |
| Marketing UI | React + Vite | Port 5174; public API consumer |
| Photo storage | Cloudinary | Wired via `persistWhatsAppMedia()` |
| Payments | Paystack + Flutterwave | Env vars + `PAYMENTS_ENABLED` gate; not verified yet |
| Monitoring | Sentry + structured logs | Optional `SENTRY_DSN`; JSON logs via `lib/logger.ts` |
| Hosting | Railway.app | Backend, worker, admin, marketing, Postgres, Redis |
| CI | GitHub Actions | `.github/workflows/ci.yml` |

---

## 6. Environment Variables

All backend services read from the **root** `.env` file (`backend/src/config/env.ts` loads `../../../.env`).

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `PORT` | No | `3000` | Backend HTTP port (Railway sets this) |
| `NODE_ENV` | No | `development` | Environment |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `DATABASE_POOL_URL` | No | — | Optional pooler URL (e.g. Supabase) |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection |
| `WHATSAPP_TOKEN` | For live WA | — | Meta permanent access token |
| `WHATSAPP_PHONE_NUMBER_ID` | For live WA | — | WhatsApp phone number ID |
| `WHATSAPP_VERIFY_TOKEN` | No | `casa_verify_token` | Webhook verification string |
| `WHATSAPP_APP_SECRET` | **Prod yes** | — | `X-Hub-Signature-256` validation |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | No | — | Meta business account |
| `ANTHROPIC_API_KEY` | For AI flows | — | Claude API key |
| `CLOUDINARY_CLOUD_NAME` | No | — | Permanent media (fallback: `wa-media:`) |
| `CLOUDINARY_API_KEY` | No | — | |
| `CLOUDINARY_API_SECRET` | No | — | |
| `PAYMENTS_ENABLED` | No | `false` | When false, unlocks are free / immediate |
| `PAYSTACK_SECRET_KEY` | No | — | Paystack (not verified yet) |
| `FLUTTERWAVE_SECRET_KEY` | No | — | Flutterwave (not verified yet) |
| `UNLOCK_FEE_RWF` | No | `5000` | Contact unlock price (when payments on) |
| `DEFAULT_SEARCH_RADIUS_KM` | No | `5` | Tenant search radius (prod often `100`) |
| `DAILY_UNLOCK_LIMIT` | No | `10` | Per-tenant daily unlock cap |
| `ALLOW_WEBHOOK_SIMULATE` | No | `false` | Allow `/webhook/simulate` in production |
| `ADMIN_API_KEY` | For admin | — | Login secret for admin dashboard |
| `ADMIN_ORIGIN` | No | `http://localhost:5173` | CORS (comma-separated OK) |
| `MARKETING_ORIGIN` | No | `http://localhost:5174` | CORS for marketing site |
| `SENTRY_DSN` | No | — | Error monitoring |
| `PROCESS_ROLE` | No | `all` | `all` \| `web` \| `worker` |

**Marketing (Vite build-time):** `VITE_WHATSAPP_PHONE`, `VITE_API_URL`, `VITE_CONTACT_EMAIL`

**Security note:** Change `ADMIN_API_KEY` and `WHATSAPP_VERIFY_TOKEN` before production. Set `WHATSAPP_APP_SECRET` in production (signature checks fail closed without it). Never commit `.env` to git.

---

## 7. Local Development Setup

### 7.1 Prerequisites

- Node.js 20+ (CI and Docker use **22**)
- Docker Desktop (for PostGIS Postgres + Redis)
- ngrok (optional, for WhatsApp webhook testing)

### 7.2 First-Time Setup

```bash
# 1. Clone / open project
cd "Casa Rwanda"

# 2. Environment
cp .env.example .env
# Edit .env with your keys

# 3. Start databases
docker compose up -d
# or from root: npm run dev:db

# 4. Backend
cd backend
npm install
npm run db:migrate
npm run dev
# → http://localhost:3000
# or from root: npm run dev:backend

# 5. Admin dashboard (separate terminal)
cd admin
npm install
npm run dev
# → http://localhost:5173
# or from root: npm run dev:admin

# 6. Marketing site (optional)
cd marketing
npm install
npm run dev
# → http://localhost:5174
```

### 7.3 NPM Scripts

**Root (`package.json`):**

| Script | Description |
|--------|-------------|
| `dev:db` | `docker compose up -d postgres redis` |
| `dev:backend` / `dev:admin` / `dev:marketing` | Start each app |
| `test` | Backend Vitest suite |
| `quality:check` | Backend tests + typecheck |
| `db:migrate` | Run migrations via backend |

**Backend (`backend/`):**

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `tsx watch src/index.ts` | Hot-reload dev server |
| `build` | `tsc` | Compile to `dist/` |
| `start` | `node dist/index.js` | Production start |
| `start:prod` | migrate then `index.js` | Deploy start (web/all) |
| `start:worker` | migrate then `worker.js` | Worker process |
| `db:migrate` | `tsx src/db/migrate.ts` | Run SQL migrations |
| `typecheck` | `tsc --noEmit` | Type check only |
| `test` | `vitest run` | Unit + integration tests |
| `test:watch` | `vitest` | Watch mode |
| `test:coverage` | `vitest run --coverage` | Coverage report |
| `loadtest` | `node scripts/load-test.mjs` | Simple load test |

**Admin (`admin/`):** `dev`, `build`, `preview` — build must succeed with **only** `admin/` on disk (Railway root directory).

**Marketing (`marketing/`):** `dev` (:5174), `build`, `start` (serve `dist/`)

### 7.4 Automated Tests

**Backend:** Vitest + Supertest (`backend/src/**/*.test.ts`) — ~85 tests across 17 files.

```bash
npm test                 # from repo root
# or
cd backend && npm test
```

| Suite | What it covers |
|-------|----------------|
| `property-taxonomy.test.ts` | Regions, subtypes, electricity meter |
| `houses.test.ts` | Search, filters, summaries, createHouse |
| `house-search` / geocoding tests | Proximity + Nominatim helpers |
| `saved-searches.test.ts` | Alert matching |
| `cost.test.ts` | Move-in cost calculator |
| `community-flag.test.ts` | Flag + already-rented report |
| `whatsapp.test.ts` | Webhook parsing + interactive replies |
| `webhook-security.test.ts` | Signature + simulate gate |
| `webhook-queue.test.ts` | Fallback, queue depths, orphan recovery |
| `schemas/http.test.ts` | Zod request schemas |
| `public-*.test.ts` | Public stats/listings |
| `app.test.ts` | Health, headers, validation, webhook, admin, public API |

Tests mock PostgreSQL and Redis — **no Docker required** to run `npm test`.

### 7.5 Health Check

```bash
curl http://localhost:3000/health
```

Expected (healthy):
```json
{
  "status": "ok",
  "postgres": true,
  "redis": true,
  "whatsapp": false,
  "queue": { "queued": 0, "processing": 0, "dlq": 0 },
  "timestamp": "2026-07-14T..."
}
```

- Postgres down → HTTP `503` / `"error"`.
- Redis down → HTTP `200` with `"status": "degraded"` (process stays discoverable; WhatsApp queue/sessions will fail until Redis recovers).
- Security headers present on responses (`X-Content-Type-Options: nosniff`, etc.).

---

## 8. Database Schema

Migrations: `db/migrations/001_initial.sql` through `009_backfill_display_names.sql`  
Tracked in `schema_migrations`. Run: `cd backend && npm run db:migrate`

### 8.1 Core Tables

#### `users`
| Column | Type | Notes |
|--------|------|-------|
| `phone` | VARCHAR(20) PK | WhatsApp number |
| `role` | ENUM | `landlord`, `tenant`, `admin` |
| `language` | ENUM | `en`, `fr` |
| `display_name` | VARCHAR(100) | Optional |
| `verified` | BOOLEAN | Tenant trust badge |
| `verified_at`, `verification_method` | | Tenant verification |
| `referred_by` | VARCHAR(20) | Referral tracking |
| `id_full_name`, `id_expiry_date` | | From landlord ID verification |
| `suspended`, `suspended_at`, `suspended_reason` | | Admin suspend (migration 006) |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

#### `houses`
| Column | Type | Notes |
|--------|------|-------|
| `house_id` | VARCHAR(20) PK | Auto-generated `CASA-XXXX` |
| `landlord_phone` | FK → users | |
| `type` | ENUM | Legacy: mapped from subtype |
| `property_category` | VARCHAR(20) | `residential` or `commercial` |
| `property_subtype` | VARCHAR(50) | See `property-taxonomy.ts` |
| `region` | VARCHAR(80) | Rwanda region id |
| `town` | VARCHAR(80) | City name (user-entered) |
| `rent` | INTEGER | Monthly RWF |
| `months_upfront` | INTEGER | Caution/deposit months |
| `latitude`, `longitude` | DOUBLE | GPS from WhatsApp pin |
| `location` | geography | PostGIS point when extension available |
| `neighbourhood` | VARCHAR(120) | Quarter |
| `city` | VARCHAR(80) | Usually same as `town` |
| Facility booleans | | `fenced`, `water`, `borehole`, `parking`, `furnished`, `security`, `standby_generator` |
| `electricity` | BOOLEAN | Legacy mirror of meter ≠ `none` |
| `electricity_meter` | VARCHAR(20) | `none`, `prepaid`, `postpaid` |
| `photos` | TEXT[] | `cloudinary:…` or `wa-media:{id}` |
| `videos` | TEXT[] | **Required** for publish; Verified+ |
| `trust_tier` | VARCHAR(20) | `verified_plus` when video present |
| `ai_description` | TEXT | Claude-generated description |
| `status` | ENUM | `active`, `inactive` (rented/off-market), `flagged`, `under_review` |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

**House ID generation:** trigger `trg_house_id` → `CASA-1000`, `CASA-1001`, …

#### `unlocks`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `tenant_phone` | FK → users | |
| `house_id` | FK → houses | |
| `amount_paid` | INTEGER | 0 when payments disabled |
| `payment_method` | ENUM | `paystack`, `flutterwave`, `bank_transfer` |
| `payment_reference` | VARCHAR(100) | |
| `beneficiary_phone` / `payer_phone` | | Diaspora mode |
| `disputed`, `dispute_reason`, `dispute_resolved_at`, `refund_flagged` | | Admin disputes (006) |
| `paid_at` | TIMESTAMPTZ | |
| UNIQUE | `(tenant_phone, house_id)` | |

#### `payments`
Tracks payment attempts (for future Paystack/Flutterwave). Not populated by current honour flow.

#### `listing_reviews`
Community flags, already-rented reports, moderation alerts.

### 8.2 Feature & Admin Tables

| Table | Purpose |
|-------|---------|
| `saved_searches` | Tenant alert subscriptions |
| `shortlists` | Compare shortlist |
| `listing_views` | Landlord performance |
| `referrals` / `credits` | Referral unlock credits |
| `ussd_sessions` | USSD session state |
| `landlord_id_verifications` | ID scan audit trail |
| `admin_audit_log` | Admin action log (006) |
| `platform_settings` | e.g. `unlock_fee_rwf` (006) |

### 8.3 Legacy Fields

- `houses.type` — derived from `property_subtype` via `legacyTypeFromSubtype()`
- `houses.electricity` — boolean mirror of `electricity_meter !== 'none'`

---

## 9. WhatsApp Integration

### 9.1 Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/webhook` | Verify token query param | Meta webhook verification |
| POST | `/webhook` | `X-Hub-Signature-256` when secret set | Receive messages (enqueued) |
| POST | `/webhook/simulate` | Dev / `ALLOW_WEBHOOK_SIMULATE` | Simulate inbound messages |
| POST | `/ussd` | None | USSD stub — search only |

### 9.2 Webhook Security & Queue

- **Signature:** `services/webhook-security.ts` validates HMAC-SHA256 with `WHATSAPP_APP_SECRET`.
- Production without secret → requests rejected.
- Local/dev without secret → allowed (logged).
- Simulate endpoint disabled in production unless `ALLOW_WEBHOOK_SIMULATE=true`; body validated with Zod.
- **Fail-closed rate limits** on webhook, USSD, and admin login/API when Redis is unavailable (`middleware/rate-limit.ts`).
- **Queue keys:** `casa:webhook:queue` → `casa:webhook:processing` → success / requeue / `casa:webhook:dlq` (max 3 attempts).
- Depths exposed on `GET /health` and admin `GET /health-detail`.

### 9.3 Simulate Endpoint (Development)

```bash
curl -X POST http://localhost:3000/webhook/simulate \
  -H "Content-Type: application/json" \
  -d '{"phone":"254800000001","text":"hello"}'

curl -X POST http://localhost:3000/webhook/simulate \
  -H "Content-Type: application/json" \
  -d '{"phone":"254800000001","text":"1"}'

curl -X POST http://localhost:3000/webhook/simulate \
  -H "Content-Type: application/json" \
  -d '{"phone":"254800000001","latitude":6.5244,"longitude":3.3792}'
```

### 9.4 Supported Inbound Message Types

Parsed in `services/whatsapp.ts`:

- `text`, `location`, `image`, `video`, `audio`
- `interactive` — button/list replies (`choiceId` used by flows)
- `button` — quick reply buttons

Outbound helpers include `sendTextMessage`, `sendMenuMessage` (list), and button/image/video link sends.

### 9.5 Meta Setup Checklist

1. Create app at [developers.facebook.com](https://developers.facebook.com/)
2. Add **WhatsApp** product
3. Get Phone Number ID + permanent access token + **App Secret**
4. Set webhook URL: `https://<backend-domain>/webhook`
5. Match `WHATSAPP_VERIFY_TOKEN`; set `WHATSAPP_APP_SECRET`
6. Subscribe to `messages`
7. Local: `ngrok http 3000`

---

## 10. Conversation Flows

### 10.1 Session State (Redis)

Key: `casa:session:{phone}` — TTL 24h

```typescript
interface FlowState {
  flow: string;
  step: string;
  data: Record<string, unknown>;
  language?: "en" | "fr";
}
```

### 10.2 Global Commands

`menu`, `start`, `hi`, `hello` → main menu or registration.

### 10.3 Registration

**File:** `flows/registration.ts`  
`welcome → role (landlord/tenant/referred) → main menu` — English-only for Rwanda.  
Menus are tappable (`menu-options.ts`).

### 10.4 Main Menu

**File:** `flows/main-menu.ts` + `menu-options.ts`

**Landlord:** List property · My listings · More options · Help  
**Tenant:** Search · Unlocked contacts · More options · Help

### 10.5 Landlord ID Verification

**File:** `flows/landlord-verify-id.ts`  
Required before publishing (`requireLandlordVerification()`). Claude Vision → auto-approve / reject / pending admin review.

### 10.6 Landlord Listing

**File:** `flows/landlord-listing.ts`  
AI or step-by-step → category/subtype → rent → location → facilities → photos → **required video** → create.  
Media persisted via `persistWhatsAppMedia()` → `cloudinary:…` when configured.

### 10.7 Landlord My Listings

**File:** `flows/landlord-listings.ts`  
Pick listing → **Mark as rented** (`inactive`) or **Put back on market** (`active`).

### 10.8 Tenant Search & Unlock

**File:** `flows/tenant-search.ts`

```
category → await_query (GPS or text)
  → searchNearbyHouses() (PostGIS or Haversine SQL)
  → select listing → media + move-in cost
  → if PAYMENTS_ENABLED=false: deliverUnlock() immediately
  → else: pay fee → PAID → recordUnlock()
  → landlord notified (unlock-notifications.ts)
  → house actions: SAVE / FLAG / already rented / menu
```

**Search:** GPS Haversine/PostGIS; text via Claude filters + **forward geocoding** (`geocoding.ts`) with Redis cache. Hardcoded Westlands/Nairobi fallbacks remain as last resort.

**Already rented:** tenant report sets listing `inactive` and logs a review (`community-flag.ts`).

### 10.9 Feature Flows

| File | Features |
|------|----------|
| `tenant-features.ts` | Alerts, compare, diaspora, referrals, verify, unlock history, flag / rented report |
| `landlord-features.ts` | Performance, AI lease, bulk, referrals, trends |

### 10.10 Scheduled Jobs

**File:** `services/features/scheduler.ts` — via `background.ts` / worker process (leader lock).

| Job | Schedule | Action |
|-----|----------|--------|
| Weekly performance ping | Weekly | View/unlock stats |
| Price suggestions | Daily | AI rent advice for stale listings |
| Market trends | Monthly | Neighbourhood averages |

### 10.11 Claude AI

**File:** `services/claude.ts` — listing/search parse, compare, price suggest, lease template, voice stub.  
ID scan lives in `landlord-id-verification.ts`. Model: `claude-sonnet-4-6`.

---

## 11. Admin API Reference

**Base URL:** `http://localhost:3000/api/admin`  
**Auth:** `POST /session` with API key → Bearer session token; or `Authorization: Bearer <ADMIN_API_KEY>` / `x-admin-key`.

### Core

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/session` | Create admin session |
| DELETE | `/session` | Revoke session |
| GET | `/stats` | Dashboard + charts + ops + badges |
| GET | `/health-detail` | DB/Redis/WhatsApp/ops + webhook queue depths |
| POST | `/test-whatsapp` | Probe outbound WhatsApp send |
| GET | `/search?q=` | Global user/house search |
| GET | `/users` | Paginated users (role/verified/suspended filters) |
| GET | `/users/:phone` | User detail |
| PATCH | `/users/:phone/verify` | Approve tenant verification |
| PATCH | `/users/:phone/suspend` | Suspend / unsuspend |
| GET | `/users/:phone/risk` | Landlord risk signals |
| GET | `/houses` | Paginated listings (status/city/region/rent/category) |
| GET | `/houses/:houseId` | Listing detail |
| PATCH | `/houses/:houseId/status` | Change status |
| POST | `/houses/:houseId/ai-review` | Claude listing review |
| GET | `/reviews` | Moderation queue |
| PATCH | `/reviews/:reviewId/resolve` | Resolve flag |
| GET | `/inbox` | Unified moderation inbox |
| GET | `/id-verifications` | Pending ID reviews |
| PATCH | `/id-verifications/:id/approve` \| `/reject` | Manual ID decision |
| POST | `/id-verifications/:id/ai-review` | AI re-check one |
| POST | `/id-verifications/ai-review-all` | Batch AI review |
| GET | `/payments` | Unlock/payment list |
| GET | `/payments/failed` | Failed payments |
| PATCH | `/payments/:id/dispute` | Dispute unlock |
| GET | `/settings` | Unlock fee |
| PATCH | `/settings/unlock-fee` | Update fee |
| GET | `/charts` / `/insights` / `/duplicates` | Analytics |
| GET | `/audit-log` | Admin audit trail |
| GET | `/export/:type` | CSV: `users` \| `houses` \| `unlocks` |
| GET | `/media?ref=` | Resolve Cloudinary or WhatsApp media |

---

## 12. Public API (Marketing)

**Base URL:** `/api/public` — no auth; rate-limited.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/stats` | Public counts for landing page |
| GET | `/listings` | Active listings carousel payload |
| GET | `/media?ref=&kind=` | Redirect Cloudinary or stream `wa-media` |

CORS: `MARKETING_ORIGIN` (+ localhost:5174, `*.up.railway.app`).

---

## 13. Admin Dashboard

**URL:** `http://localhost:5173`  
**Login:** `ADMIN_API_KEY` → session token stored in the browser.

### Pages

| Route | File | Features |
|-------|------|----------|
| `/login` | `Login.tsx` | API key → session |
| `/` | `Dashboard.tsx` | Stats, charts, ops health |
| `/users` | `Users.tsx` | Users, verify, suspend, risk |
| `/listings` | `Listings.tsx` | Listings + AI review + status |
| `/moderation` | `Moderation.tsx` | Flag queue / inbox |
| `/verifications` | `Verifications.tsx` | Landlord ID queue + AI |
| `/payments` | `Payments.tsx` | Unlocks, disputes |
| `/insights` | `Insights.tsx` | Market insights |
| `/settings` | `Settings.tsx` | Unlock fee |
| `/audit` | `AuditLog.tsx` | Admin audit log |

Vite proxies `/api` → backend in development. Production: bake `VITE_API_URL` and set `ADMIN_ORIGIN` on the backend.

### Railway / admin build constraint

Admin Railway service must use **Root Directory = `admin`**. The package must build in isolation:

```bash
cd admin && npm ci && npm run build   # tsc -b && vite build
```

Do **not** add imports or path aliases from admin into `packages/shared` or `../backend` — that path is outside the Railway build context and fails with `TS2307: Cannot find module '@casa/shared'`. Keep types in `admin/src/types.ts`.

---

## 14. Marketing Site

**Local:** `http://localhost:5174`  
**Code:** `marketing/` — English landing with live stats + listings showcase; WhatsApp CTA.

Deploy: Railway (`Docs/MARKETING_RAILWAY.md`) or Vercel (`marketing/README.md`).  
Requires backend public API + `MARKETING_ORIGIN` CORS.

---

## 15. What's Complete vs. Stubbed

### ✅ Fully Implemented

- Backend + admin + marketing + Docker + 9 migrations
- WhatsApp webhook (verify, signature, queue) + simulator
- Tappable interactive menus across main flows
- English i18n
- Registration, referrals, Redis state machine
- Landlord ID verification + admin AI review queue
- Property taxonomy + electricity meter types
- Listing with mandatory video; Cloudinary persist when configured
- Landlord mark rented / reactivate; tenant already-rented report
- Region → town → quarter → GPS; reverse + forward geocoding
- PostGIS or SQL Haversine search
- Unlock (free or honour PAID), credits, diaspora, landlord notify
- Saved alerts, compare, flagging, performance jobs, heat map
- Admin dashboard v2 (sessions, audit, payments, insights, settings, error retry UX)
- Public API + marketing site
- Railway configs (web replicas + worker), CI, optional Sentry
- Fail-closed rate limiting, Zod HTTP validation, security headers, structured logs
- Durable webhook queue (retry / DLQ / orphan recovery)
- Daily unlock limits, CORS for Railway origins

### ⚠️ Partially Implemented / Launch Gaps

| Feature | Current behavior | What's missing |
|---------|------------------|----------------|
| **Payments** | Off by default; honour “PAID” when enabled | Paystack/Flutterwave verification before unlock |
| **Cloudinary** | Wired; falls back to `wa-media:` | Ensure prod credentials always set for permanent media |
| **Voice notes** | Received; stub transcription | Full audio → text |
| **USSD** | In-app handler | Telco partnership for live `*code#` |
| **Admin accounts** | Shared API key + sessions | Per-admin users / RBAC |
| **`packages/shared`** | Present for optional reuse | Not wired into Railway admin/marketing builds |

### ❌ Not Started / Still Planned

- Automated listing photo fraud detection on every upload
- Listing expiry / renewal automation
- Featured listings (paid promotion)
- End-to-end WhatsApp flow tests (full Redis conversation paths)
- Admin/marketing Playwright smoke tests

---

## 16. Known Limitations & Technical Debt

1. **Limited E2E coverage** — Strong unit/API tests (~85); full multi-step WhatsApp paths not E2E tested.
2. **Payment provider not wired** — Launch uses free unlocks; charged mode is honour-system until Paystack/Flutterwave.
3. **Single admin API key** — Sessions exist, but no per-admin identities or RBAC.
4. **Media without Cloudinary** — Temporary WhatsApp media IDs expire; public/admin media endpoints re-fetch while valid.
5. **Nominatim rate limits** — Mitigated by Redis cache; not a commercial geocoder.
6. **Railway Postgres may lack PostGIS** — Migration 007 no-ops; Haversine SQL fallback is automatic.
7. **Legacy `houses.type` / `houses.electricity`** — Keep using subtype + meter fields in new code.
8. **No npm workspaces** — Treat packages as deployable units; do not cross-import across Railway root directories.
9. **DLQ needs ops attention** — Failed webhooks land in `casa:webhook:dlq`; monitor via `/health` queue depths.

---

## 17. Deployment (Railway)

Canonical steps: **`Docs/DOMAIN_SETUP.md`**, **`Docs/RAILWAY_DEPLOY.md`**, **`Docs/MARKETING_RAILWAY.md`**, **`Docs/SCALING.md`**.

### Production hostnames (`casahomesrwanda.com`)

| Hostname | Service |
|----------|---------|
| `https://casahomesrwanda.com` / `www` | Marketing |
| `https://api.casahomesrwanda.com` | Backend (webhook + APIs) |
| `https://admin.casahomesrwanda.com` | Admin dashboard |

Contact email default: `hello@casahomesrwanda.com`

### Services

| Service | Config | Role |
|---------|--------|------|
| Backend web | `railway.toml` | HTTP API + webhook enqueue; `PROCESS_ROLE=web`; 2 replicas |
| Worker | `railway.worker.toml` | Queue consumer + scheduler; `PROCESS_ROLE=worker` |
| Postgres | Railway plugin | `DATABASE_URL` |
| Redis | Railway plugin | `REDIS_URL` |
| Admin | `admin/railway.toml` | Static/admin UI — **Root Directory must be `admin`** |
| Marketing | `marketing/railway.toml` | Landing page — **Root Directory must be `marketing`** |

Template vars: `railway.env.example`.

### Scaling

Local/dev: `PROCESS_ROLE=all`.  
Production: web replicas enqueue and also **consume the webhook queue** (safe via message claim); a dedicated worker is still recommended for scheduled jobs (Redis leader lock). See `Docs/SCALING.md`.

### WhatsApp in Production

Webhook: `https://api.casahomesrwanda.com/webhook`  
Set `WHATSAPP_APP_SECRET`, strong verify token, and Cloudinary for durable media.

---

## 18. Product Roadmap & Feature Backlog

**Guides:** `Docs/Casa_Explained_Simply.md`, `Docs/Feature_Backlog.md`

Most Wave 1–4 backlog features are implemented. Remaining work is **payment verification**, **ops hardening**, and growth features.

### 18.1 Near-term priorities

1. Wire Paystack + Flutterwave; set `PAYMENTS_ENABLED=true` only after verification works
2. Confirm Cloudinary in all production envs
3. Keep webhook signature + simulate gate + fail-closed rate limits enforced
4. Monitor webhook DLQ depth in production (`/health` → `queue.dlq`)
5. Seed/demo data script for staging
6. Automated E2E conversation tests / Playwright smoke for admin login

### 18.2 Already built (backlog highlights)

| Feature | Status |
|---------|--------|
| Total cost calculator | ✅ |
| Post-unlock concierge | ✅ |
| Listing performance pings | ✅ |
| Community flagging + already-rented | ✅ |
| Saved search alerts / compare | ✅ |
| Dynamic price suggestions / trends | ✅ |
| Required video (Verified+) | ✅ |
| Landlord ID verification | ✅ |
| Referral credits / diaspora | ✅ |
| Tappable WhatsApp menus | ✅ |
| Marketing site + public API | ✅ |
| PostGIS / SQL proximity | ✅ |
| Cloudinary media pipeline | ✅ (config-dependent) |
| USSD / voice | ⚠️ Stub |

---

## 19. Key Files Quick Reference

| Task | Start here |
|------|------------|
| Add a bot flow step | `backend/src/flows/` + `router.ts` + `menu-options.ts` |
| Change bot copy (English) | `backend/src/i18n/messages.ts` |
| Add property type or region | `backend/src/constants/property-taxonomy.ts` |
| Modify database | New file in `db/migrations/`, `npm run db:migrate` |
| Admin API / page | `routes/admin.ts` + `services/admin/` + `admin/src/pages/` |
| Admin types (Railway-safe) | `admin/src/types.ts` only — never `@casa/shared` from admin |
| Validate HTTP input | `schemas/http.ts` + `middleware/validate.ts` |
| Rate limits / security headers | `middleware/rate-limit.ts`, `middleware/security-headers.ts` |
| Webhook queue / DLQ | `services/webhook-queue.ts` |
| Structured logs | `lib/logger.ts` |
| Public marketing data | `routes/public.ts` + `marketing/src/` |
| Unlock / payment gate | `PAYMENTS_ENABLED` + `flows/tenant-search.ts` + `features/unlocks.ts` |
| Media persist | `features/cloudinary-media.ts` |
| Change unlock price | `.env` / admin Settings / `platform_settings` |
| Debug WhatsApp locally | `POST /webhook/simulate` |
| Add env variable | `.env.example` + `config/env.ts` |
| Scale web/worker | `Docs/SCALING.md`, `PROCESS_ROLE` |
| Quality attributes | `Docs/QUALITY_ATTRIBUTES.md` |

---

## 20. Contact & Handover Notes

- **Domain / DNS:** `Docs/DOMAIN_SETUP.md` (`casahomesrwanda.com`)
- **Plain-language guide:** `Docs/Casa_Explained_Simply.md`
- **Product spec:** `Docs/Casa_Product_Plan (1).docx`
- **Feature backlog:** `Docs/Feature_Backlog.md`
- **Quality map:** `Docs/QUALITY_ATTRIBUTES.md`
- **Railway:** `Docs/RAILWAY_DEPLOY.md`, `Docs/MARKETING_RAILWAY.md`, `Docs/SCALING.md`
- **Quick start:** `README.md`
- **This document:** `Docs/Developer_Handover.md`

The codebase is a **production-ready MVP** on Railway: WhatsApp flows (including tappable menus), trust features (ID + video), taxonomy, Cloudinary-ready media, admin v2, marketing site, CI, durable webhook processing, Zod request validation, and optional web/worker scaling. Admin and marketing deploy as isolated roots — keep them free of cross-package imports. **Turn on paid unlocks only after Paystack/Flutterwave verification is implemented and tested.**

---

*Casa Rwanda — Find Your Home on WhatsApp*  
*Confidential — Internal developer handover*

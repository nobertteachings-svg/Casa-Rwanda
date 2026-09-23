# Software Quality Attributes — Casa

This document maps how Casa meets **operational**, **maintenance**, and **transitional**
software qualities. Keep it updated when architecture changes.

## Operational

| Quality | How Casa delivers it |
|---------|----------------------|
| **Reliability** | `/health` probes Postgres + Redis; Railway restart-on-failure; webhook queue with processing list, retry (3×), DLQ, orphan recovery; structured JSON logs + Sentry |
| **Security** | Zod env + request validation; WhatsApp HMAC; admin sessions + timing-safe keys; CORS allowlist; fail-closed rate limits on auth/webhook/USSD; security headers (CSP, HSTS, nosniff, frame deny); parameterized SQL |
| **Efficiency** | Redis caches (geocode, media); CDN/Cloudinary transforms; DB indexes + pool limits; listing/search caps; lazy images in admin/marketing |
| **Usability** | WhatsApp EN/FR flows; marketing + admin i18n; loading/error/retry UI patterns; responsive admin shell with labeled controls |

## Maintenance

| Quality | How Casa delivers it |
|---------|----------------------|
| **Maintainability** | Clear `flows/` / `services/` / `routes/` layout; strict TypeScript; `Docs/` handover + scaling guides; root npm scripts |
| **Scalability** | Multi-replica web + optional worker (`PROCESS_ROLE`); Redis queue + message claim; leader-locked jobs; paginated admin APIs |
| **Testability** | Vitest + Supertest; schema/queue/API tests; CI typecheck + test + frontend builds; `createApp()` for isolation |

## Transitional

| Quality | How Casa delivers it |
|---------|----------------------|
| **Portability** | Dockerfile (Node 22 Alpine); `docker-compose` for Postgres/Redis; env-driven config (Railway/Vercel); cross-platform Node |
| **Reusability** | Shared middleware (`validate`, `createRateLimiter`); taxonomy/i18n modules; feature services under `services/features/`; optional `packages/shared` for cross-app contracts (admin keeps local copies for Railway root builds) |

## Cross-cutting

| Quality | Notes |
|---------|-------|
| **Functionality** | Landlord list, tenant search, unlocks, admin moderation, public marketing API, USSD stub |
| **Correctness** | Strict TS, Zod on HTTP inputs, DB constraints, webhook signature tests |
| **Flexibility** | Env feature flags (`PAYMENTS_ENABLED`, `PROCESS_ROLE`, Cloudinary optional, PostGIS optional) |

## Verification

```bash
npm run quality:check          # from repo root
npm --prefix backend test
curl -s localhost:3000/health  # expect status ok|degraded + queue depths
```

## Remaining stretch goals

- Admin/marketing component + e2e (Playwright) coverage
- Cursor pagination on public listings
- Pluggable payment adapter interface when payments go live
- ESLint/Prettier once npm workspace bootstrap is standardized

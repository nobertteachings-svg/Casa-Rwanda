# Casa Rwanda — setup rules

Casa Rwanda is a **separate codebase and deployment** from Casa Nigeria, Kenya, Uganda, Cameroon, and Côte d'Ivoire.

| | Casa Uganda | Casa Rwanda |
|---|---|---|
| Directory | `Desktop/Casa Uganda` | `Desktop/Casa Rwanda` |
| Currency | UGX | **RWF** |
| Phone country | +256 | **+250** |
| Locations | Major districts | **30 districts** (Gasabo, Kicukiro, Nyarugenge, …) |
| WhatsApp | Uganda WABA | **Separate Rwanda WABA number** |
| Domain | casahomesuganda.com | **casahomesrwanda.com** |
| Mobile package | com.casahomesuganda.app | **com.casahomesrwanda.app** |
| Unlock fee env | `UNLOCK_FEE_UGX` | **`UNLOCK_FEE_RWF`** (default 2000) |

## Hard rules

1. **Never share** `DATABASE_URL`, `REDIS_URL`, WhatsApp tokens, or payment keys with other country forks.
2. New Railway project: **Casa-Rwanda** (Backend, Worker, Postgres, Redis, Marketing, Admin).
3. New Meta WhatsApp Business number (**+250**) → webhook `https://api.casahomesrwanda.com/webhook`.
4. DNS: `casahomesrwanda.com`, `www`, `api`, `admin`.
5. Do **not** reuse Expo project, App Store app, or Play listing from other countries.
6. Keep `PAYMENTS_ENABLED=false` until MTN MoMo (*182#) / Airtel Money is wired and tested.

## Product defaults

- Language: **English-only** at launch (Kinyarwanda later)
- Payments: off; future **MTN MoMo (*182#)** / Airtel Money
- Landlord ID: **Rwandan National ID (NID)** or passport
- Electricity: **REG** token / postpaid wording
- Water: **WASAC** where relevant
- Housing types: single/double room, bedsitter, **self-contained**, studio, 1/2/3+ BR, maisonette, bungalow, servant quarter

## Local smoke

```bash
cd "Desktop/Casa Rwanda"
docker compose up -d
cd backend && npm install && DATABASE_URL=postgresql://casa:casa_dev@localhost:5432/casa npm test
```

Replace `mobile/app.json` → `extra.eas.projectId` after `eas init`.

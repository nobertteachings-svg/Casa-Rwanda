# Casa Rwanda

WhatsApp-first housing marketplace for **Rwanda** (separate from Casa Nigeria, Kenya, Uganda, Cameroon, and Côte d'Ivoire).

> Sibling projects: `../Casa Uganda`, `../Casa Kenya`, etc. — do not mix env secrets or databases.

## Stack

- Backend: WhatsApp Cloud API + Express + Postgres/PostGIS + Redis
- Admin + Marketing: Vite/React on Railway
- Mobile: Expo (`com.casahomesrwanda.app`)

## Country defaults

- Currency: **RWF** (`UNLOCK_FEE_RWF`, default 2,000)
- Phone: **+250**
- Locations: **30 districts** (Gasabo, Kicukiro, Nyarugenge, …)
- Language: **English-only** (Kinyarwanda later)
- Payments: **off** until MoMo / Airtel Money
- Domains: `casahomesrwanda.com` / `api` / `admin`
- Utilities: **REG** electricity · **WASAC** water

See [Docs/CASA_RWANDA_SETUP.md](Docs/CASA_RWANDA_SETUP.md).

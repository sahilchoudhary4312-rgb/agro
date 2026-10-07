# AgriMitra — Deployment Guide

## Option A — Docker Compose (recommended)

Prereqs: Docker Engine 24+ with Compose v2.

```bash
cd docker
cp .env.example .env
# edit .env — REQUIRED: SECRET_KEY (python -c "import secrets; print(secrets.token_hex(32))")
#                          POSTGRES_PASSWORD
docker compose --env-file .env up --build -d
```

Services:

| Service | Image | Port | Notes |
|---|---|---|---|
| frontend | built from `frontend/Dockerfile` (node build → nginx) | **8080** → 80 | serves SPA, proxies `/api` + `/uploads` to backend |
| backend | built from `backend/Dockerfile` (python 3.12-slim, non-root) | internal 8000 | runs migrations via `create_all`, seeds DEMO DATA if `SEED_ON_STARTUP=true` |
| db | postgres:16-alpine | internal 5432 | named volume `pgdata` |

Verify:

```bash
curl http://localhost:8080/api/health     # {"status":"ok", ...}
open http://localhost:8080                # one-tap demo logins
```

Logs / shell:

```bash
docker compose logs -f backend
docker compose exec db psql -U agrimitra
```

Teardown (keeps data): `docker compose down` · with data: `docker compose down -v`.

## Option B — Manual (bare metal / VM)

```bash
# backend
cd backend
python -m venv .venv && source .venv/bin/activate  (Windows: .venv\Scripts\activate)
pip install -r requirements.txt
cp .env.example .env      # set SECRET_KEY, DATABASE_URL=postgresql+psycopg://...
uvicorn app.main:app --host 0.0.0.0 --port 8000

# frontend
cd ../frontend
npm ci && npm run build   # dist/
# serve dist/ with nginx/caddy; proxy /api and /uploads → 127.0.0.1:8000
# (a ready nginx config is at frontend/nginx.conf — adjust proxy target)
```

## Environment variables

Backend (`backend/.env.example`) — all optional for local dev, **SECRET_KEY must be
set for any shared deployment**:

| Var | Default | Purpose |
|---|---|---|
| DATABASE_URL | `sqlite:///./agrimitra.db` | SQLite dev / `postgresql+psycopg://...` prod |
| SECRET_KEY | dev-only placeholder | JWT signing — generate 32+ random bytes |
| ACCESS_TOKEN_EXPIRE_MINUTES | 1440 | access token life |
| REFRESH_TOKEN_EXPIRE_DAYS | 30 | refresh token life |
| CORS_ORIGINS | localhost dev origins | comma-separated allowlist |
| SEED_ON_STARTUP | true | seed DEMO DATA on empty DB |
| MARKET_DATA_PROVIDER | demo | `demo` now, `live` reserved for AGMARKNET/eNAM |
| WEIGHT_* | see config | default engine weights (runtime-editable via Admin) |

Docker (`docker/.env.example`): `SECRET_KEY`, `POSTGRES_PASSWORD` (required),
`POSTGRES_DB/USER`, `FRONTEND_PORT`, `CORS_ORIGINS`, `SEED_ON_STARTUP`.

**Never commit real `.env` files or secrets.**

## Production checklist

- [ ] `SECRET_KEY` set to a generated random value (both backend + docker env)
- [ ] PostgreSQL (not SQLite) with the `pgdata` volume on persistent storage
- [ ] `DEBUG=false`, `ENV=production`
- [ ] `CORS_ORIGINS` limited to the real frontend origin(s); serve over HTTPS
- [ ] `SEED_ON_STARTUP=false` once real data loading begins (demo seed is for judges/demos)
- [ ] Uploads volume mounted (`/app/uploads` in the backend container)
- [ ] Reverse proxy (nginx/Caddy/Traefik) terminating TLS in front of the frontend
- [ ] `docker compose logs` shipped to a log drain; `/api/health` wired to uptime checks
- [ ] Database backups: `docker compose exec db pg_dump -U agrimitra agrimitra > backup.sql`

## PWA notes

- The service worker registers **only in production builds** (`import.meta.env.PROD`).
- App shell + icons are precached; hashed assets stale-while-revalidate.
- `/api/` and `/uploads/` are **never cached** — offline users see the shell, an
  offline banner, and no stale prices.
- Bump `VERSION` in `frontend/public/sw.js` when shipping shell changes.

## Scaling notes (beyond prototype)

- Backend is stateless (JWT) — run N replicas behind the proxy; only Postgres and
  the uploads volume are shared.
- Add alembic migrations before the first real schema change.
- Move forecasts to a scheduled job writing `price_forecasts` rows once datasets grow.

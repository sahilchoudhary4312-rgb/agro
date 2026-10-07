# AgriMitra — Sell Smarter

**Know the Best Price. Find the Right Buyer. Sell Smarter.**

A market-linkage and price-discovery platform for Indian farmers.
Smart India Hackathon 2026 — Problem Statement **26132**: *Strengthening market linkages and price discovery for farmers* (Govt. of Maharashtra, Agriculture / FoodTech).

## The core idea: Net Realization

The best **gross** price is not always the best **net** return. AgriMitra computes what the
farmer actually takes home for every selling option:

```
net = gross price − transport − handling − market fee (₹15/qtl for mandi sales)
```

The recommendation engine can therefore suggest a **lower-gross buyer** when transport
savings make its **net realization** higher — with a full, explainable cost breakdown
shown for every option.

## Features

| Area | What it does |
|---|---|
| **Price discovery** | Latest mandi prices per crop/market, trends, nearest-market ranking (DEMO DATA — clearly labelled) |
| **Selling recommendation** | Ranks buyer offers + nearby mandis by net realization with plain-language reasons |
| **Buyer ↔ farmer matching** | Transparent weighted scores (price 30, quality 20, quantity 20, distance 15, payment 15) — weights admin-configurable |
| **FPO aggregation** | Aggregates smallholder listings to fulfil bulk buyer requirements |
| **Transaction lifecycle** | Forward-only: accepted → pickup → in transit → delivered → payment → paid, with net-realization breakdown |
| **Trust scores** | Explainable buyer trust (verification 20%, success 25%, on-time payment 25%, rating 15%, disputes 10%, age 5%) — no private data exposed |
| **Price forecast** | Baseline linear-trend model (scikit-learn), always labelled **PREDICTED / ESTIMATE** with confidence % |
| **Roles** | Farmer, Buyer, FPO, Admin — separate apps per role |
| **Languages** | English, हिन्दी, मराठी |
| **PWA** | Installable, offline app shell (API data is **never** cached stale) |
| **Logistics estimator** | Road distance + per-qtl transport/handling/time estimates |

## Data honesty

All seeded information is **DEMO DATA** and is labelled as such throughout the UI and API
(`"source": "DEMO DATA"`, badges on every price card). Demo data is never presented as
live government data. No live prices are fabricated; a `live` provider mode exists as an
integration point for AGMARKNET/eNAM.

## Quick start (local development)

Prerequisites: **Python 3.12+**, **Node 20+**.

```bash
# Backend (SQLite, auto-seeds DEMO DATA on first run)
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (proxies /api to :8000)
cd ../frontend
npm install
npm run dev            # http://localhost:5173
```

Open **http://localhost:5173** — use the one-tap demo login buttons.

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Farmer | `farmer@demo.com` | `Farmer@123` |
| Buyer | `buyer@demo.com` | `Buyer@123` |
| FPO | `fpo@demo.com` | `Fpo@123` |
| Admin | `admin@demo.com` | `Admin@123` |

### Run tests

```bash
cd backend
python -m pytest tests/ -q
```

### Production build

```bash
cd frontend
npm run build          # outputs dist/
npx vite preview       # serves the PWA build on :4173 (proxies /api)
```

## Docker deployment

```bash
cd docker
cp .env.example .env        # then set SECRET_KEY and POSTGRES_PASSWORD
docker compose --env-file .env up --build
```

App on **http://localhost:8080** (PostgreSQL + FastAPI + nginx). Details:
[docs/deployment.md](docs/deployment.md).

## Documentation

- [docs/architecture.md](docs/architecture.md) — system design and engines
- [docs/database.md](docs/database.md) — schema reference
- [docs/api.md](docs/api.md) — REST API reference
- [docs/ai-model.md](docs/ai-model.md) — forecast + scoring models
- [docs/deployment.md](docs/deployment.md) — deployment guide
- [docs/demo-script.md](docs/demo-script.md) — 5-minute judging walkthrough

## Repository layout

```
backend/    FastAPI app (app/api, app/services/engines, app/ml, app/seed, tests/)
frontend/   React + TypeScript + Tailwind PWA (src/pages per role, src/i18n)
docker/     docker-compose.yml + .env.example
docs/       architecture, database, api, ai-model, deployment, demo-script
ml/         datasets/, models/, training/ (future model iteration workspace)
```

## Security notes

- No secrets in source: all configuration via environment variables (see `backend/.env.example`, `docker/.env.example`).
- Passwords hashed with bcrypt; JWT access + refresh tokens.
- Only meaningful trust indicators are exposed — no private user data.

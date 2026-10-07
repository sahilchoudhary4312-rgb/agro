# AgriMitra — Architecture

## System overview

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│  React PWA (frontend/)      │  /api  │  FastAPI (backend/)          │
│  React Router per role      │──────▶ │  auth · farmers · buyers ·   │
│  Recharts · Leaflet · i18n  │ nginx/ │  fpos · matching · offers ·  │
│  Zustand + SW app shell     │ vite   │  transactions · forecast ·   │
└─────────────────────────────┘ proxy  │  admin · public · assistant  │
                                       └──────────┬───────────────────┘
                                                  │ SQLAlchemy 2.0
                                       ┌──────────▼───────────┐
                                       │ PostgreSQL (prod)    │
                                       │ SQLite (local dev)   │
                                       └──────────────────────┘
```

- **Frontend → Backend**: the frontend never talks to a database; it only calls the
  JSON REST API under `/api`. In dev, Vite proxies `/api` and `/uploads` to `:8000`.
  In Docker, nginx proxies them to the backend service.
- **Auth**: JWT access token (24 h) + refresh token (30 d), bcrypt-hashed passwords,
  role guards via `require_roles(...)` dependency. Frontend axios interceptor attaches
  the Bearer token and redirects to `/login` on 401.

## Backend structure

```
backend/app/
├── main.py               FastAPI app, CORS, static uploads, /api/health
├── core/
│   ├── config.py         pydantic-settings (env-driven, no secrets in code)
│   └── security.py       bcrypt hashing, JWT create/decode
├── database/session.py   engine + SessionLocal + Base
├── models/               SQLAlchemy 2.0 typed models (user, catalog, marketplace, transaction, mixins)
├── schemas/              Pydantic request/response models
├── api/
│   ├── deps.py           get_db, get_current_user, require_roles, get_farmer_profile
│   └── v1/               15 routers (auth, farmers, buyers, fpos, matching, offers,
│                          transactions, logistics, forecast, markets, notifications,
│                          disputes, admin, assistant, public)
├── services/
│   ├── geo.py            haversine + road-distance approximation (×1.25 factor)
│   ├── providers/        market data provider ("demo" now, "live" later)
│   └── engines/          the scoring brains (below)
├── ml/forecast.py        baseline price forecasting + sell-now/wait advisor
└── seed/seed.py          deterministic DEMO DATA seeding (idempotent)
```

## The engines (`app/services/engines/`)

### 1. Net realization — `net_realization.py`

The central metric. `net = gross − transport − handling − mandi fee (₹15/qtl)`,
floored at 0. Every option surfaced to the farmer carries this breakdown.

### 2. Selling recommendation — `recommendation.py`

`get_selling_options(db, listing)` builds every viable option:

1. Open buyer requirements compatible with the listing → transport estimated from
   pickup preference (farm-gate pickup ≈ ₹0 for farmer; drop-off estimated by road km)
2. Buyer direct offers on that listing
3. Nearby mandis with today's modal price (mandi fee applies)

Each option gets a weighted score — default
`net_realization 35 · buyer_reliability 20 · quality 15 · quantity 10 · distance 10 ·
price outlook 10` (weights stored in `SystemSetting`, editable by admin at runtime) —
sorted by net realization, and a **best_option** plus a plain-language
**sell now / wait** call combined with the price forecast.

### 3. Buyer matching — `matching.py`

`score_pair(listing, requirement, buyer)` → five explainable sub-scores
(price vs latest modal/expected price, grade + moisture fit, quantity fit,
road-distance vs delivery radius, payment trust) combined with admin-configurable
weights (default price 30 · quality 20 · quantity 20 · distance 15 · payment 15).
`aggregate_supply` greedily selects compatible smallholder listings to fulfil a bulk
requirement (used by the FPO app).

### 4. Buyer trust — `trust.py`

Fully explainable: verification 20% · success rate 25% · on-time payment 25% ·
farmer rating 15% · dispute penalty 10% · account age 5%. Only aggregate indicators
are ever exposed — no private data.

### 5. Logistics — `logistics.py`

Per-qtl transport + handling estimates and duration from road distance and load size.

## Price forecasting — `app/ml/forecast.py`

Baseline, honest, explainable:

- Linear trend (scikit-learn `LinearRegression`) over recent daily modal prices,
  with weekly-weekday sin/cos seasonality features; pure-numpy least-squares fallback.
- Horizons: +3, +7, +15, +30 days, each with predicted price and % change;
  trend classified on the 7-day change (±1% band).
- Confidence = R² of the fit × 100.
- **Fewer than 5 points → `available: false`** — the platform never invents data.
- Every forecast is labelled **PREDICTED / ESTIMATE** in the API and UI.
- `sell_now_or_wait()` turns trend + storage availability into advice (e.g. rising
  prices with no storage → sell now; crop spoils, it earns nothing).

`ml/` (repo root) is the workspace for future model iteration (SARIMA / gradient
boosting on real AGMARKNET history).

## Data honesty model

- Market data provider is configured via `MARKET_DATA_PROVIDER` (`demo` today).
- All market-facing endpoints return `"source": "DEMO DATA"`; the UI shows DEMO badges
  and a "not live prices" disclaimer. Predictions show a PREDICTED label.
- The service worker **never caches `/api/` responses** — an offline farmer sees the
  app shell and an offline banner, never stale prices presented as fresh.

## Frontend structure

```
frontend/src/
├── App.tsx                 router: public pages + /app/* per role (lazy-loaded)
├── components/             Icon (inline SVG set), ui.tsx (Badge, Stat, TrustBadges…),
│                           ErrorBoundary, layout/ (AppShell, MoreMenu, OfflineBanner)
├── i18n/                   en / hi / mr dictionaries + LANGS + setLang
├── lib/                    api.ts (axios + interceptors), useApi.ts (fetch hook),
│                           format.ts, geo helpers
├── pages/                  public/ (landing, login, register, market-prices),
│                           farmer/ buyer/ fpo/ admin/ (one file per screen)
└── store/                  zustand: auth (me/token/role), moreMenu
```

Mobile-first: bottom tab bar (first 4 routes + "More") under `lg`, sidebar above.

## PWA / offline

- `manifest.webmanifest` + maskable icons; registered **only in production builds**.
- `sw.js`: precached app shell, navigation falls back to `/`, stale-while-revalidate
  for hashed assets, **`/api/` and `/uploads/` always bypass the cache**.
- `OfflineBanner` listens to `online`/`offline` events and shows a translated notice.

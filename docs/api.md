# AgriMitra — REST API Reference

Base URL: **`/api`** (dev: Vite proxies to `http://127.0.0.1:8000`; Docker: nginx → backend).
Interactive docs: `GET /api/docs` (Swagger UI), `GET /api/redoc`.

Auth: `Authorization: Bearer <access_token>` (JWT). Roles enforced server-side via
`require_roles(...)`. Errors return `{"detail": "..."}` with proper HTTP status codes.

## Health

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | status, app name, environment, `data_provider` (`demo`) |

## Auth (`/api/auth`)

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/register` | `{email, password, full_name, phone?, role, preferred_language, district?, village?, pincode?, land_size_acres?, business_name?, fpo_name?}` → tokens + role (201) |
| POST | `/auth/login` | `{email, password}` → `{access_token, refresh_token, role, full_name, id}` |
| GET | `/auth/me` | current profile |
| PUT | `/auth/me/language` | `{ "language": "en"\|"hi"\|"mr" }` |

Demo accounts (seeded DEMO DATA): `farmer@demo.com/Farmer@123`, `buyer@demo.com/Buyer@123`,
`fpo@demo.com/Fpo@123`, `admin@demo.com/Admin@123`.

## Public (`/api/public`) — no auth

| Method | Path | Notes |
|---|---|---|
| GET | `/public/stats` | platform counters for the landing page |
| GET | `/public/crops` | crop catalog (en/hi/mr names, base price) |

## Markets & price discovery (`/api/markets`)

| Method | Path | Notes |
|---|---|---|
| GET | `/markets` | all markets (id, name, district, lat/lon) |
| GET | `/markets/prices` | `?crop_id&district&lat&lon` → `{source: "DEMO DATA", prices[]}`; lat/lon adds distance + sorts nearest |
| GET | `/markets/prices/trend` | `?crop_id&market_id?&days(7-180)` → `{source: "DEMO DATA", series[]}` |
| GET | `/markets/map` | map entities: markets + crops → `{source: "DEMO DATA", ...}` |

## Farmer (`/api/farmers`) — role: farmer

| Method | Path | Notes |
|---|---|---|
| GET/PUT | `/farmers/profile` | read / update profile fields |
| GET | `/farmers/produce` | `?status_filter` own listings |
| POST | `/farmers/produce` | create listing (201) |
| PUT/DELETE | `/farmers/produce/{listing_id}` | update / withdraw own listing |

## Buyer (`/api/buyers`) — role: buyer

| Method | Path | Notes |
|---|---|---|
| GET | `/buyers` | buyer directory (public info + trust indicators) |
| GET | `/buyers/me/dashboard` | dashboard counters |
| GET/POST | `/buyers/requirements` | browse / create requirements |
| GET | `/buyers/requirements/mine` | own requirements |
| PUT/DELETE | `/buyers/requirements/{id}` | update / close |
| GET | `/buyers/requirements/{id}/matching-farmers` | ranked compatible listings (explainable sub-scores) |
| GET | `/buyers/browse-listings` | `?crop_id&district&grade&min_qty...` |
| GET | `/buyers/{buyer_id}` | public buyer profile |
| POST/GET/PUT | `/buyers/disputes` | raise / list / update disputes |
| POST/GET | `/buyers/ratings` | post-transaction ratings; `/ratings/buyer/{buyer_id}` |

## FPO (`/api/fpos`) — role: fpo

| Method | Path | Notes |
|---|---|---|
| GET | `/fpos/me` | profile + member list |
| GET | `/fpos/me/stock` | aggregated member stock by crop |
| GET | `/fpos/me/match-bulk` | `?crop_id` — bulk-requirement matches across member listings |

## Matching & recommendation (`/api/matching`) — the core engines

| Method | Path | Notes |
|---|---|---|
| GET | `/matching/recommendations?listing_id=` | all selling options (buyer reqs + offers + mandis), each with full net-realization breakdown; returns `{options[], best_option, forecast}` ranked by net |
| POST | `/matching/find-buyers?listing_id=` | scored buyer requirements for a listing |
| GET | `/matching/farmer-buyers?listing_id=` | buyer directory variant for a listing |
| GET | `/matching/aggregation/{requirement_id}` | FPO supply aggregation for a requirement |

## Offers (`/api/offers`)

| Method | Path | Notes |
|---|---|---|
| POST | `/offers` | buyer sends offer on a listing (201) |
| POST | `/offers/to-requirement` | farmer responds to a requirement with a listing |
| GET | `/offers` | inbox (role-aware: farmer sees offers on own listings; buyer sees sent) |
| GET | `/offers/{offer_id}` | detail incl. message thread |
| POST | `/offers/{offer_id}/action` | `{action: "accept"\|"decline"\|"counter", counter_price?}` — accept creates a Transaction |
| POST | `/offers/{offer_id}/messages` | negotiation message |

## Transactions (`/api/transactions`)

| Method | Path | Notes |
|---|---|---|
| GET | `/transactions` | role-aware list |
| GET | `/transactions/{tx_id}` | detail with net-realization breakdown |
| PUT | `/transactions/{tx_id}/status` | forward-only lifecycle step |
| POST | `/transactions/{tx_id}/payment` | record payment (method: upi/neft/rtgs/cash) |
| POST | `/transactions/{tx_id}/logistics` | attach logistics booking |

Lifecycle: `matched → accepted → pickup_scheduled → in_transit → delivered →
payment_pending → paid` (forward-only; invalid jumps rejected with 400).

## Logistics & forecast

| Method | Path | Notes |
|---|---|---|
| POST | `/logistics/estimate` | `{distance_km?, from/to coords, quantity_qtl}` → per-qtl transport/handling/time |
| GET | `/logistics/providers` | demo logistics partners |
| GET | `/logistics/storage` | nearby storage facilities |
| GET | `/forecast/{crop_id}` | `?storage_available=true` → `{available, confidence, trend, horizons{3,7,15,30}, chart[], sell_recommendation}` — all **PREDICTED**, confidence from R²; `available:false` when history < 5 points |

## Notifications (`/api/notifications`)

| Method | Path | Notes |
|---|---|---|
| GET | `/notifications` | own notifications |
| POST | `/notifications/read-all` | mark all read |
| POST | `/notifications/{id}/read` | mark one read |

## Assistant (`/api/assistant`)

| Method | Path | Notes |
|---|---|---|
| POST | `/assistant` | rule-based Q&A (price lookup, best-option, scheme info) — deterministic, no LLM keys |

## Admin (`/api/admin`) — role: admin (router-level guard)

| Method | Path | Notes |
|---|---|---|
| GET | `/admin/dashboard` | platform stats + chart series |
| GET | `/admin/users` | `?role&search&status` directory |
| PUT | `/admin/users/{user_id}/active` | enable/disable login |
| PUT | `/admin/buyers/{buyer_id}/verification` | `{status: "verified"\|"rejected"}` → recomputes trust |
| GET | `/admin/disputes` | dispute queue |
| GET/POST | `/admin/markets` | list / add market |
| POST | `/admin/prices` | record a market price row |
| GET | `/admin/listings` | `?status` all listings |
| GET/PUT | `/admin/settings` | engine weight settings (`matching_weights`, `recommendation_weights`) |
| GET | `/admin/audit` | audit log |

## Conventions

- All market-derived responses carry `"source": "DEMO DATA"`.
- All forecasts carry model + confidence and are labelled estimates.
- Scores are 0–100 with named sub-scores — every recommendation is explainable.
- Net realization math: `net = gross − transport − handling − (₹15/qtl if mandi)`.

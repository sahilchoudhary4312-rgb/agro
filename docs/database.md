# AgriMitra — Database Schema

SQLAlchemy 2.0 typed models, PostgreSQL in production, SQLite for local dev.
All primary keys are UUID strings (36 chars); all tables carry `created_at` / `updated_at`
via `IdMixin` / `TimestampMixin` (`app/models/mixins.py`).

## Identity & roles (`models/user.py`)

### users
| Column | Type | Notes |
|---|---|---|
| email | String(255) | unique, indexed |
| phone | String(20) | nullable, indexed |
| password_hash | String(255) | bcrypt |
| full_name | String(255) | |
| role | String(20) | `farmer` \| `buyer` \| `fpo` \| `admin` |
| preferred_language | String(10) | `en` \| `hi` \| `mr` |
| is_active | Boolean | disable-login switch (admin) |

Role profiles (all 1:1 with `users` via unique `user_id`):

### farmers
village, district, state (default Maharashtra), pincode, latitude/longitude,
land_size_acres, irrigation, bank_upi.

### buyers
business_name, business_type (`processor|trader|exporter|retail_chain|mill`), gstin,
license_no, **verification_status** (`pending|verified|rejected`, default pending),
city, district, lat/lon, about — plus aggregate trust fields maintained by the engine:
trust_score (default 70), total_transactions, successful_transactions,
on_time_payment_pct, farmer_rating, dispute_count.
**Only these aggregate indicators are ever exposed — never private data.**

### fpos
name, registration_no, verification_status, village, district, lat/lon, member_count,
about, trust_score (default 80).

### farmer_fpo
Membership join: `fpo_id` + `farmer_id`.

## Catalog (`models/catalog.py`)

### crops
name, name_hi, name_mr (multilingual), category (`cereal|oilseed|vegetable|pulse|cash`),
icon, unit (default quintal), base_price (demo reference ₹/qtl), suitable_storage_days.

### markets
name, market_type (`mandi|terminal|collection_center`), district, lat/lon,
plus market metadata.

### market_prices
crop_id, market_id, price_date, modal_price / min_price / max_price (₹/qtl).
Seeded as **DEMO DATA** — flagged `"source": "DEMO DATA"` at the API layer; the provider
layer (`services/providers/market_data.py`) is the swap point for a live AGMARKNET feed.

## Marketplace (`models/marketplace.py`)

### produce_listings
owner_user_id, farmer_id (nullable), fpo_id (nullable — FPO-aggregated stock),
crop_id, title, quantity_qtl, quality_grade (`A|B|C`), moisture_pct, price_expectation,
village, district, lat/lon, images (comma-separated upload paths), harvest_date,
status (`available|...`).

### buyer_requirements
buyer_id, crop_id, quantity_min/max_qtl, quality_grade, max_moisture_pct,
price_per_qtl (offered), price_negotiable, pickup_preference
(`farm_gate|mandi|collection_center`), payment_terms, delivery_radius_km, lat/lon,
notes, valid_until, status (`open|...`).

### buyer_offers
requirement_id (nullable), listing_id, buyer_id, farmer_user_id, price_per_qtl,
quantity_qtl, message, status (`sent|accepted|declined|countered|withdrawn`).

### offer_messages
offer_id, sender_user_id, message, counter_price — negotiation thread.

### matches
Materialized match results: listing_id, requirement_id, farmer_user_id, buyer_id,
crop_id, the five sub-scores (price_match, quality_match, quantity_match,
distance_match, payment_trust), overall_score, distance_km.

## Transactions (`models/transaction.py`)

### transactions
code (human-readable, unique, e.g. `TX-2609CD05`), listing_id, offer_id,
farmer_user_id, buyer_id, fpo_id, crop_id, quantity_qtl, quality_grade,
agreed_price (₹/qtl), **logistics_cost_per_qtl, handling_cost_per_qtl,
net_realization_per_qtl, total_value, net_total** (the net-realization ledger),
status (forward-only lifecycle: `matched → accepted → pickup_scheduled →
in_transit → delivered → payment_pending → paid`), scheduled_pickup_at, delivered_at,
payment_due_date, distance_km.

### payments
transaction_id, amount, method (`upi|neft|rtgs|cash`), reference, status
(`pending|completed|failed`), paid_at.

### logistics_bookings
transaction_id, provider_id, vehicle_type, distance_km, cost_per_qtl,
estimated_hours, status (`requested|confirmed|in_transit|delivered`).

### notifications
user_id, type (`offer_received|price_alert|match|payment|system`), payload fields,
read flag.

### ratings
Post-transaction farmer↔buyer ratings feeding the trust engine.

### disputes
transaction_id, raised_by, reason, status — each dispute costs 10 trust points
(capped) in the trust model.

### price_forecasts
Cached forecast rows (crop, market, horizon, predicted price, confidence, model tag).

### audit_logs
actor_user_id, action, entity, entity_id, detail — written by admin mutations.

### system_settings
key/value JSON rows consumed at runtime by the engines:
- `matching_weights` — `{"price":30,"quality":20,"quantity":20,"distance":15,"payment":15}`
- `recommendation_weights` — `{"net_realization":35,"buyer_reliability":20,
  "quality_match":15,"quantity_match":10,"distance":10,"price_outlook":10}`

Admin UI (System settings) edits these live; engines merge them over safe defaults.

## Relationships (core flow)

```
User 1:1 Farmer/Buyer/FPO
Farmer N:M FPO (farmer_fpo)
Crop 1:N ProduceListing, BuyerRequirement, MarketPrice
Market 1:N MarketPrice
ProduceListing 1:N BuyerOffer N:1 BuyerRequirement
BuyerOffer 1:1 Transaction 1:N Payment, 1:N LogisticsBooking
Transaction 1:N Rating, Dispute
```

## Seeding

`app/seed/seed.py::seed_if_empty` runs on startup when the DB is empty and
`SEED_ON_STARTUP=true`. It creates a deterministic Maharashtra-wide dataset
(50 farmers, 15 buyers, 5 FPOs, 10 markets, 12 crops, ~5,400 daily price rows,
requirements, offers, transactions) — all **DEMO DATA**, labelled as such in the
UI/API. Demo logins: `farmer@demo.com` / `buyer@demo.com` / `fpo@demo.com` /
`admin@demo.com` (passwords in README).

# AgriMitra — AI / ML Models

Design principle: **transparent, explainable, honest**. Every score shown to a user can
be decomposed into named, weighted sub-scores; every prediction is labelled as an
estimate; nothing is fabricated when data is missing.

## 1. Price forecasting — `backend/app/ml/forecast.py`

**Model**: baseline linear trend + weekly seasonality proxy.

- Features: day index (from series start), `sin(2π·weekday/7)`, `cos(2π·weekday/7)`.
- Estimator: scikit-learn `LinearRegression`; pure-numpy least-squares fallback if
  sklearn is unavailable.
- Prediction targets: +3, +7, +15, +30 days beyond the **last observation**
  (features always measured from the same origin as training).
- Trend classification: 7-day predicted change — `> +1%` upward, `< −1%` downward,
  else stable.
- Confidence: fit R² clamped to [0, 100].

**Guardrails**

- < 5 historical points → `{available: false, reason: "insufficient_historical_data"}`.
  The UI shows "not enough data" instead of a fake forecast.
- Model string self-describes: *"baseline_linear (prototype — estimated prices, not
  guaranteed)"*.
- Every chart point and horizon value is rendered with a **PREDICTED** label.

**Advisor** — `sell_now_or_wait(forecast, storage_available)`:

| Trend | Storage | Advice |
|---|---|---|
| upward | yes | wait (prices rising ~x% in 7 days) |
| upward | no | sell now (a spoiled crop earns nothing) |
| downward | any | sell soon at best net price |
| stable / none | any | sell now at best current option |

**Upgrade path** (`ml/` workspace): SARIMA / Prophet seasonality, gradient boosting
with monsoon + festival features, retraining on real AGMARKNET history, per-market
models, backtesting harness. The provider/engine interface (`history: [(date, price)]`
in → forecast dict out) is unchanged by the swap.

## 2. Net realization engine — `services/engines/net_realization.py`

Not learned — deterministic domain math, the platform's core innovation:

```
net = gross − transport − handling − mandi_fee(₹15/qtl if APMC sale)   [floored at 0]
```

Transport/handling come from the logistics estimator (road distance × 1.25 factor,
per-qtl rates by load size). This turns "best gross price" into "best take-home",
which frequently reorders options — a lower-gross farm-gate buyer often beats a
distant mandi.

## 3. Selling recommendation — `services/engines/recommendation.py`

Weighted ranking over all viable options (open requirements, direct offers, nearby
mandis):

| Factor | Default weight |
|---|---|
| net_realization | 35 |
| buyer_reliability (trust + on-time payment) | 20 |
| quality_match | 15 |
| quantity_match | 10 |
| distance | 10 |
| price_outlook (forecast trend) | 10 |

Weights live in `system_settings.recommendation_weights` (admin-editable at runtime;
engines merge over safe defaults). Output: sorted options + `best_option` +
plain-language reasons. The **best option is chosen by net realization**, so the
engine can recommend a lower-gross buyer when net is better — always with the full
cost breakdown displayed.

## 4. Buyer ↔ listing matching — `services/engines/matching.py`

Five explainable sub-scores (0–100):

| Sub-score | Function | Highlights |
|---|---|---|
| price_match | offer vs latest modal/expected price | ≥ ref → 100; ≤ 70% of ref → 0; linear between |
| quality_match | grade (A>B>C) + moisture cap | exact 100; better 95; one grade low 55; moisture over limit caps at 50 |
| quantity_match | lot vs [min,max] range | in range 100; short lot = partial-fill score (aggregation can top up); over-sized still ≥ 60 |
| distance_match | road km vs delivery radius | ≤ 20 km → 100; ≥ radius → 0; linear between; unknown → 55 |
| payment_trust | `0.5·on_time_payment_pct + 0.5·trust_score` | |

Overall = weighted mean with `matching_weights` (default price 30 · quality 20 ·
quantity 20 · distance 15 · payment 15). Verification-pending/rejected buyers are
excluded from matching entirely.

## 5. Buyer trust score — `services/engines/trust.py`

Fully explainable weighted model:

```
trust = 0.20·verification + 0.25·success_rate + 0.25·on_time_payment
      + 0.15·rating_score + 0.10·dispute_score + 0.05·account_age
```

- new buyer success_rate neutral at 50
- each dispute −10 points (floored at 0)
- only the aggregate score and sub-scores are exposed — no private data

## 6. Assistant — `api/v1/assistant.py`

Deterministic, rule-based Q&A over platform data (prices, best options, storage,
schemes). No external LLM, no API keys, works offline-first by design. Intent
matching is transparent and localized (en/hi/mr).

## Evaluation

- `backend/tests/test_engines.py` — unit tests for every engine (64 tests total suite).
- `backend/tests/test_api.py` — integration tests incl. recommendation ordering:
  the returned `best_option` must have the maximum `net_realization_per_qtl`.
- The forecast direction bug class (predictions referencing the wrong origin) is
  covered by `TestForecast::test_upward_series_forecasts_higher` and the downward
  mirror.

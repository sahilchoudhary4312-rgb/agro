"""Baseline price forecasting — explainable linear-trend model (scikit-learn).

This is a prototype model: it fits a linear trend on recent daily prices with
a weekly seasonal feature and reports confidence from R². It is clearly
labelled as an ESTIMATE everywhere in the UI and API. Replace with a
production-grade model (e.g., SARIMA / gradient boosting / LSTM) when real
historical data is available.
"""

from datetime import date, timedelta

import numpy as np

MIN_POINTS = 5


def forecast_prices(
    history: list[tuple[date, float]],
    horizons: tuple[int, ...] = (3, 7, 15, 30),
    chart_days: int = 15,
) -> dict:
    """history: oldest-first (date, modal_price) tuples."""
    if len(history) < MIN_POINTS:
        return {
            "available": False,
            "reason": "insufficient_historical_data",
            "model": "baseline_linear",
            "horizons": {},
            "chart": [],
        }

    ds = np.array([(d - history[0][0]).days for d, _ in history], dtype=float)
    ys = np.array([p for _, p in history], dtype=float)

    # weekly seasonality proxy via weekday index (cyclic, simple one-hot-ish)
    weekday = np.array([d.weekday() for d, _ in history], dtype=float)
    x = np.column_stack([ds, np.sin(2 * np.pi * weekday / 7), np.cos(2 * np.pi * weekday / 7)])

    try:
        from sklearn.linear_model import LinearRegression

        model = LinearRegression()
        model.fit(x, ys)
        pred = model.predict(x)
        ss_res = float(np.sum((ys - pred) ** 2))
        ss_tot = float(np.sum((ys - np.mean(ys)) ** 2))
        r2 = 1 - ss_res / ss_tot if ss_tot > 0 else 0.0
        confidence = round(max(0.0, min(1.0, r2)) * 100, 1)
    except Exception:  # sklearn unavailable — pure numpy least squares fallback
        A = np.column_stack([np.ones(len(ds)), ds])
        coef, *_ = np.linalg.lstsq(A, ys, rcond=None)
        model = None
        confidence = 60.0

    def predict(day_offset: float) -> float:
        d0 = history[-1][0] + timedelta(days=int(day_offset))
        wd = np.array([np.sin(2 * np.pi * d0.weekday() / 7), np.cos(2 * np.pi * d0.weekday() / 7)])
        # Features use day indexes measured from history[0], so a horizon that
        # is day_offset days after the last point must map to ds[-1] + day_offset.
        x_day = float(ds[-1]) + float(day_offset)
        if model is not None:
            return float(model.predict(np.array([[x_day, wd[0], wd[1]]]))[0])
        return float(coef[0] + coef[1] * x_day)

    horizons_out = {}
    for h in horizons:
        p = predict(h)
        base = ys[-1]
        change_pct = (p - base) / base * 100 if base else 0
        if change_pct > 1.0:
            trend = "upward"
        elif change_pct < -1.0:
            trend = "downward"
        else:
            trend = "stable"
        horizons_out[str(h)] = {
            "predicted_price": round(p, 2),
            "change_pct": round(change_pct, 2),
            "trend": trend,
        }

    chart = []
    for i in range(1, chart_days + 1):
        chart.append({
            "day": i,
            "date": (history[-1][0] + timedelta(days=i)).isoformat(),
            "estimated_price": round(predict(i), 2),
        })

    overall_trend = horizons_out[str(7)]["trend"] if "7" in horizons_out else "stable"
    return {
        "available": True,
        "reason": "ok",
        "model": "baseline_linear (prototype — estimated prices, not guaranteed)",
        "confidence": confidence,
        "current_price": round(float(ys[-1]), 2),
        "horizons": horizons_out,
        "trend": overall_trend,
        "chart": chart,
    }


def sell_now_or_wait(forecast: dict, storage_available: bool) -> dict:
    """Combine forecast with storage availability into a plain recommendation."""
    if not forecast.get("available"):
        return {
            "recommendation": "sell_now",
            "reason_code": "no_forecast",
            "message": "No reliable forecast available. Selling at the best current option is safer.",
        }
    trend = forecast.get("trend", "stable")
    change = forecast.get("horizons", {}).get("7", {}).get("change_pct", 0)
    if trend == "upward":
        if storage_available:
            return {
                "recommendation": "wait",
                "reason_code": "upward_trend_with_storage",
                "message": f"Prices are rising (~{change:+.1f}% in 7 days). Consider waiting if storage is available.",
            }
        return {
            "recommendation": "sell_now",
            "reason_code": "upward_trend_no_storage",
            "message": "Prices are rising, but you have no storage — a spoiled crop earns nothing. Sell now.",
        }
    if trend == "downward":
        return {
            "recommendation": "sell_now",
            "reason_code": "downward_trend",
            "message": f"Prices are falling (~{change:+.1f}% in 7 days). Sell soon at the best net price.",
        }
    return {
        "recommendation": "sell_now",
        "reason_code": "stable_trend",
        "message": "Prices are stable. Selling now at the best net option is reasonable.",
    }

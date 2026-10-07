"""Unit tests for AgriMitra scoring engines — the core innovation logic."""
from datetime import date, timedelta

from app.ml.forecast import forecast_prices, sell_now_or_wait
from app.services.engines.matching import (
    DEFAULT_MATCHING_WEIGHTS,
    distance_match_score,
    payment_trust_score,
    price_match_score,
    quality_match_score,
    quantity_match_score,
)
from app.services.engines.net_realization import compute_net_realization
from app.services.engines.trust import compute_trust_score
from app.services.geo import haversine_km, road_distance_km


class TestNetRealization:
    def test_deducts_transport_handling_and_mandi_fee(self):
        out = compute_net_realization(2000, transport_per_qtl=100, handling_per_qtl=50, is_mandi=True)
        assert out["gross_price_per_qtl"] == 2000
        assert out["market_fees_per_qtl"] == 15
        assert out["net_realization_per_qtl"] == 1835

    def test_direct_sale_has_no_mandi_fee(self):
        out = compute_net_realization(2000, transport_per_qtl=100, is_mandi=False)
        assert out["market_fees_per_qtl"] == 0
        assert out["net_realization_per_qtl"] == 1900

    def test_zero_transport_is_treated_as_none(self):
        out = compute_net_realization(1000, transport_per_qtl=None)
        assert out["transport_per_qtl"] == 0
        assert out["net_realization_per_qtl"] == 1000

    def test_net_is_floored_at_zero(self):
        out = compute_net_realization(100, transport_per_qtl=500)
        assert out["net_realization_per_qtl"] == 0

    def test_low_gross_nearby_beats_high_gross_far_mandi(self):
        """The central AgriMitra insight: best gross ≠ best net."""
        mandi = compute_net_realization(2200, transport_per_qtl=250, is_mandi=True)
        direct = compute_net_realization(2050, transport_per_qtl=30, is_mandi=False)
        assert direct["net_realization_per_qtl"] > mandi["net_realization_per_qtl"]


class TestPriceMatch:
    def test_at_or_above_reference_is_perfect(self):
        assert price_match_score(2000, 2000) == 100.0
        assert price_match_score(2100, 2000) == 100.0

    def test_far_below_reference_is_zero(self):
        assert price_match_score(1300, 2000) == 0.0

    def test_linear_between_70_and_100_percent(self):
        # 85% of reference → (0.85-0.7)/0.3*100 = 50
        assert price_match_score(1700, 2000) == 50.0

    def test_no_reference_defaults_to_neutral(self):
        assert price_match_score(1500, None) == 70.0
        assert price_match_score(1500, 0) == 70.0


class TestQualityMatch:
    def test_exact_grade_is_perfect(self):
        assert quality_match_score("A", "A", 10, 12) == 100.0

    def test_better_than_required_scores_95(self):
        assert quality_match_score("A", "B", 10, 12) == 95.0

    def test_one_grade_below_scores_55(self):
        assert quality_match_score("C", "B", 10, 12) == 55.0

    def test_moisture_above_limit_caps_score(self):
        assert quality_match_score("A", "A", 16, 12) == 50.0


class TestQuantityMatch:
    def test_within_range_is_perfect(self):
        assert quantity_match_score(50, 20, 100) == 100.0

    def test_below_minimum_is_partial_fill(self):
        s = quantity_match_score(10, 20, 100)
        assert 40.0 <= s < 100.0

    def test_above_maximum_still_usable(self):
        s = quantity_match_score(150, 20, 100)
        assert 60.0 <= s < 100.0


class TestDistanceMatch:
    def test_none_distance_is_neutral(self):
        assert distance_match_score(None, 100) == 55.0

    def test_within_20km_is_perfect(self):
        assert distance_match_score(10, 100) == 100.0

    def test_beyond_radius_is_zero(self):
        assert distance_match_score(150, 100) == 0.0


class TestTrustScore:
    def _score(self, **overrides):
        base = dict(
            verification_status="verified", total_transactions=50,
            successful_transactions=48, on_time_payment_pct=96.0,
            farmer_rating=4.6, dispute_count=1, account_age_days=730,
        )
        base.update(overrides)
        return compute_trust_score(**base)

    def test_verified_good_buyer_scores_high(self):
        assert self._score()["trust_score"] > 85

    def test_pending_verification_scores_lower(self):
        assert self._score(verification_status="pending")["trust_score"] < \
            self._score()["trust_score"]

    def test_rejected_buyer_loses_verification_points(self):
        out = self._score(verification_status="rejected")
        assert out["verification_score"] == 0
        assert out["trust_score"] < self._score()["trust_score"]

    def test_more_disputes_reduce_score(self):
        assert self._score(dispute_count=8)["trust_score"] < \
            self._score(dispute_count=1)["trust_score"]

    def test_new_buyer_gets_neutral_success_rate(self):
        out = self._score(total_transactions=0, successful_transactions=0)
        assert out["success_rate"] == 50.0


class TestGeo:
    def test_haversine_none_coords(self):
        assert haversine_km(None, 73.86, 18.52, 72.88) is None

    def test_pune_mumbai_sanity(self):
        d = haversine_km(18.52, 73.86, 19.076, 72.8777)
        assert 100 < d < 150  # actual ~120 km

    def test_road_distance_applies_factor(self):
        straight = haversine_km(18.52, 73.86, 19.076, 72.8777)
        road = road_distance_km(18.52, 73.86, 19.076, 72.8777)
        assert road == round(straight * 1.25, 1)


class TestForecast:
    def _series(self, n, slope):
        start = date(2026, 1, 1)
        return [(start + timedelta(days=i), 2000 + slope * i) for i in range(n)]

    def test_insufficient_data_is_unavailable(self):
        out = forecast_prices([(date(2026, 1, 1), 2000)] * 3)
        assert out["available"] is False
        assert out["reason"] == "insufficient_historical_data"

    def test_upward_series_forecasts_higher(self):
        out = forecast_prices(self._series(60, 5))
        assert out["available"] is True
        assert out["trend"] == "upward"
        h30 = out["horizons"]["30"]
        assert h30["predicted_price"] > out["current_price"]

    def test_downward_series_forecasts_lower(self):
        out = forecast_prices(self._series(60, -5))
        assert out["trend"] == "downward"
        assert out["horizons"]["7"]["predicted_price"] < out["current_price"]

    def test_confidence_within_bounds(self):
        out = forecast_prices(self._series(30, 2))
        assert 0 <= out["confidence"] <= 100


class TestSellNowOrWait:
    def test_no_forecast_means_sell_now(self):
        out = sell_now_or_wait({"available": False}, storage_available=True)
        assert out["recommendation"] == "sell_now"

    def test_upward_trend_with_storage_waits(self):
        fc = {"available": True, "trend": "upward",
              "horizons": {"7": {"change_pct": 4.2}}}
        assert sell_now_or_wait(fc, True)["recommendation"] == "wait"

    def test_upward_trend_without_storage_sells(self):
        fc = {"available": True, "trend": "upward",
              "horizons": {"7": {"change_pct": 4.2}}}
        out = sell_now_or_wait(fc, False)
        assert out["recommendation"] == "sell_now"
        assert out["reason_code"] == "upward_trend_no_storage"

    def test_downward_trend_sells(self):
        fc = {"available": True, "trend": "downward",
              "horizons": {"7": {"change_pct": -3.0}}}
        assert sell_now_or_wait(fc, True)["recommendation"] == "sell_now"


def test_default_weights_sum_reasonably():
    assert abs(sum(DEFAULT_MATCHING_WEIGHTS.values()) - 100) <= 25

"""Selling recommendation engine.

Ranks every viable selling option (direct buyer offers + nearby mandis) by
configurable weights and returns the BEST option by NET REALIZATION with
plain-language reasons. All scoring happens here on the backend — never in
the frontend.
"""

import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Buyer, BuyerOffer, BuyerRequirement, Crop, Market, MarketPrice,
    ProduceListing, StorageFacility, SystemSetting,
)
from app.services.geo import road_distance_km
from app.services.engines.logistics import estimate_logistics
from app.services.engines.net_realization import compute_net_realization
from app.services.engines.matching import (
    quality_match_score, quantity_match_score, reference_price_for,
    get_matching_weights,
)
from app.ml.forecast import forecast_prices, sell_now_or_wait

DEFAULT_REC_WEIGHTS = {
    "net_realization": 35,
    "buyer_reliability": 20,
    "quality_match": 15,
    "quantity_match": 10,
    "distance": 10,
    "price_outlook": 10,
}


def get_recommendation_weights(db: Session) -> dict:
    row = db.scalar(select(SystemSetting).where(SystemSetting.key == "recommendation_weights"))
    if not row or not row.value:
        return dict(DEFAULT_REC_WEIGHTS)
    try:
        w = json.loads(row.value)
        return {**DEFAULT_REC_WEIGHTS, **w}
    except (ValueError, TypeError):
        return dict(DEFAULT_REC_WEIGHTS)


def _crop_forecast(db: Session, crop_id: str) -> dict:
    since_date = None
    prices = db.execute(
        select(MarketPrice)
        .where(MarketPrice.crop_id == crop_id)
        .order_by(MarketPrice.price_date.desc())
        .limit(400)
    ).scalars().all()
    if not prices:
        return forecast_prices([])
    by_date: dict = {}
    for p in prices:
        by_date.setdefault(p.price_date, []).append(p.modal_price)
    history = [(d, sum(v) / len(v)) for d, v in sorted(by_date.items())]
    since_date = history[-1][0]
    return forecast_prices(history, horizons=(3, 7, 15, 30))


def _storage_available(db: Session, listing: ProduceListing, crop: Crop) -> bool:
    facilities = db.execute(select(StorageFacility)).scalars().all()
    for f in facilities:
        if f.available_qtl <= 0:
            continue
        suitable = [c.strip().lower() for c in (f.suitable_crops or "").split(",") if c.strip()]
        if suitable and crop.name.lower() not in suitable and crop.name_hi not in suitable:
            continue
        d = road_distance_km(listing.latitude, listing.longitude, f.latitude, f.longitude)
        if d is not None and d <= 30:
            return True
    return False


def _min_max_normalize(options: list[dict], key: str) -> None:
    values = [o[key] for o in options]
    lo, hi = min(values), max(values)
    for o in options:
        if hi > lo:
            o[f"_{key}_norm"] = 100.0 * (o[key] - lo) / (hi - lo)
        else:
            o[f"_{key}_norm"] = 75.0


def get_selling_options(db: Session, listing: ProduceListing) -> dict:
    crop = db.get(Crop, listing.crop_id)
    requirements = db.execute(
        select(BuyerRequirement).where(
            BuyerRequirement.crop_id == listing.crop_id,
            BuyerRequirement.status == "open",
        )
    ).scalars().all()

    options: list[dict] = []

    # direct offers received on this listing (strongest buyer signal)
    direct_offers = db.execute(
        select(BuyerOffer).where(
            BuyerOffer.listing_id == listing.id,
            BuyerOffer.status.in_(["sent", "negotiating"]),
        )
    ).scalars().all()
    offer_buyer_ids = {off.buyer_id for off in direct_offers}

    # 1a) Open buyer requirements (broadcast demand) — buyers already making a
    # direct offer on this listing are skipped to avoid duplicate options
    for req in requirements:
        if req.buyer_id in offer_buyer_ids:
            continue
        buyer = db.get(Buyer, req.buyer_id)
        if not buyer or buyer.verification_status != "verified":
            continue
        distance = road_distance_km(listing.latitude, listing.longitude, req.latitude, req.longitude)
        logi = estimate_logistics(distance, listing.quantity_qtl)
        net = compute_net_realization(req.price_per_qtl, logi["total_per_qtl"] or 0)
        options.append({
            "type": "buyer",
            "buyer_id": buyer.id,
            "buyer_name": buyer.business_name,
            "requirement_id": req.id,
            "verification_status": buyer.verification_status,
            "gross_price_per_qtl": req.price_per_qtl,
            "transport_per_qtl": logi["total_per_qtl"] or 0,
            "handling_per_qtl": 0,
            "net_realization_per_qtl": net["net_realization_per_qtl"],
            "net_total": round(net["net_realization_per_qtl"] * listing.quantity_qtl, 2),
            "distance_km": distance,
            "estimated_hours": logi["estimated_hours"],
            "trust_score": buyer.trust_score,
            "on_time_payment_pct": buyer.on_time_payment_pct,
            "farmer_rating": buyer.farmer_rating,
            "payment_terms": req.payment_terms,
            "pickup_preference": req.pickup_preference,
            "quantity_min_qtl": req.quantity_min_qtl,
            "quantity_max_qtl": req.quantity_max_qtl,
            "quality_match": quality_match_score(
                listing.quality_grade, req.quality_grade,
                listing.moisture_pct, req.max_moisture_pct,
            ),
            "quantity_match": quantity_match_score(
                listing.quantity_qtl, req.quantity_min_qtl, req.quantity_max_qtl,
            ),
        })

    # 1b) direct offers (query above); a direct offer replaces the buyer's
    # broadcast requirement as the option shown to the farmer
    for off in direct_offers:
        buyer = db.get(Buyer, off.buyer_id)
        if not buyer:
            continue
        distance = road_distance_km(listing.latitude, listing.longitude, buyer.latitude, buyer.longitude)
        qty = off.quantity_qtl or listing.quantity_qtl
        logi = estimate_logistics(distance, qty)
        net = compute_net_realization(off.price_per_qtl, logi["total_per_qtl"] or 0)
        options.append({
            "type": "buyer",
            "buyer_id": buyer.id,
            "buyer_name": buyer.business_name,
            "offer_id": off.id,
            "direct_offer": True,
            "verification_status": buyer.verification_status,
            "gross_price_per_qtl": off.price_per_qtl,
            "transport_per_qtl": logi["total_per_qtl"] or 0,
            "handling_per_qtl": 0,
            "net_realization_per_qtl": net["net_realization_per_qtl"],
            "net_total": round(net["net_realization_per_qtl"] * qty, 2),
            "distance_km": distance,
            "estimated_hours": logi["estimated_hours"],
            "trust_score": buyer.trust_score,
            "on_time_payment_pct": buyer.on_time_payment_pct,
            "farmer_rating": buyer.farmer_rating,
            "payment_terms": None,
            "pickup_preference": "farm_gate",
            "quantity_qtl": qty,
            "quality_match": 100.0,
            "quantity_match": 100.0,
        })

    # 2) Nearby mandi prices (latest per market)
    markets = db.execute(select(Market)).scalars().all()
    for m in markets:
        price = db.scalar(
            select(MarketPrice)
            .where(MarketPrice.market_id == m.id, MarketPrice.crop_id == listing.crop_id)
            .order_by(MarketPrice.price_date.desc())
            .limit(1)
        )
        if not price:
            continue
        distance = road_distance_km(listing.latitude, listing.longitude, m.latitude, m.longitude)
        logi = estimate_logistics(distance, listing.quantity_qtl)
        net = compute_net_realization(price.modal_price, logi["total_per_qtl"] or 0, is_mandi=True)
        options.append({
            "type": "mandi",
            "market_id": m.id,
            "buyer_name": m.name,
            "verification_status": "mandi",
            "gross_price_per_qtl": price.modal_price,
            "max_price_per_qtl": price.max_price,
            "min_price_per_qtl": price.min_price,
            "price_date": price.price_date.isoformat(),
            "transport_per_qtl": logi["total_per_qtl"] or 0,
            "handling_per_qtl": 0,
            "net_realization_per_qtl": net["net_realization_per_qtl"],
            "net_total": round(net["net_realization_per_qtl"] * listing.quantity_qtl, 2),
            "distance_km": distance,
            "estimated_hours": logi["estimated_hours"],
            "trust_score": 75.0,  # regulated APMC market — baseline trust
            "on_time_payment_pct": 90.0,
            "farmer_rating": None,
            "payment_terms": "same_day",
            "pickup_preference": "drop_at_mandi",
            "quantity_min_qtl": 0,
            "quantity_max_qtl": 9999,
            "quality_match": 80.0,
            "quantity_match": 100.0,
        })

    if not options:
        return {
            "listing_id": listing.id,
            "options": [],
            "best_option": None,
            "forecast": _crop_forecast(db, listing.crop_id),
        }

    # ---- scoring with configurable weights ----
    _min_max_normalize(options, "net_realization_per_qtl")
    _min_max_normalize(options, "distance_km")
    weights = get_recommendation_weights(db)
    match_w = get_matching_weights(db)
    total_w = sum(weights.values()) or 1

    forecast = _crop_forecast(db, listing.crop_id)
    storage = _storage_available(db, listing, crop)
    sell_rec = sell_now_or_wait(forecast, storage)

    outlook_score = {"upward": 100.0, "stable": 60.0, "downward": 20.0}.get(forecast.get("trend", "stable"), 60.0)

    net_values = [o["net_realization_per_qtl"] for o in options]
    avg_net = sum(net_values) / len(net_values)

    for o in options:
        reliability = o.get("trust_score", 60.0)
        score = (
            weights["net_realization"] * o["_net_realization_per_qtl_norm"]
            + weights["buyer_reliability"] * reliability
            + weights["quality_match"] * o["quality_match"]
            + weights["quantity_match"] * o["quantity_match"]
            + weights["distance"] * o["_distance_km_norm"]
            + weights["price_outlook"] * outlook_score
        ) / total_w
        o["score"] = round(score, 1)

        # ---- explainable reasons ----
        reasons = []
        if o["net_realization_per_qtl"] >= avg_net:
            reasons.append(f"+ Higher net price (₹{o['net_realization_per_qtl']:,.0f}/qtl after transport)")
        else:
            reasons.append(f"- Lower net price (₹{o['net_realization_per_qtl']:,.0f}/qtl after transport)")
        if o["type"] == "buyer":
            if o["trust_score"] >= 85:
                reasons.append(f"+ Reliable buyer (trust {o['trust_score']:.0f}/100, on-time payment {o['on_time_payment_pct']:.0f}%)")
            elif o["trust_score"] < 70:
                reasons.append(f"- Buyer trust is low ({o['trust_score']:.0f}/100)")
            if o["quality_match"] >= 95:
                reasons.append("+ Quality fully matches buyer requirement")
            elif o["quality_match"] < 60:
                reasons.append("- Quality only partially matches requirement")
            if o["quantity_match"] < 90:
                reasons.append("- Your quantity is below buyer's minimum (aggregation possible)")
        else:
            reasons.append("+ Regulated APMC mandi — transparent, same-day payment")
        if o["distance_km"] is not None:
            if o["distance_km"] <= 40:
                reasons.append(f"+ Shorter distance ({o['distance_km']:.0f} km)")
            elif o["distance_km"] > 80:
                reasons.append(f"- Longer distance ({o['distance_km']:.0f} km) raises transport cost")
        if forecast.get("trend") == "upward" and o["type"] == "buyer":
            reasons.append("- Prices trending up: mandi prices may improve if you can wait")
        o["reasons"] = reasons

    options.sort(key=lambda o: o["score"], reverse=True)
    for rank, o in enumerate(options, 1):
        o["rank"] = rank

    best = options[0] if options else None
    return {
        "listing_id": listing.id,
        "crop": crop.name if crop else None,
        "quantity_qtl": listing.quantity_qtl,
        "storage_available": storage,
        "forecast": forecast,
        "sell_recommendation": sell_rec,
        "options": options,
        "best_option": best,
    }

"""Buyer matching engine — transparent, weighted, explainable.

Component scores are 0-100. Weights come from the admin-configurable
SystemSetting 'matching_weights' (JSON), with sensible defaults.
"""

import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Buyer, BuyerRequirement, Crop, MarketPrice, ProduceListing
from app.services.geo import road_distance_km

DEFAULT_MATCHING_WEIGHTS = {
    "price": 30,
    "quality": 20,
    "quantity": 20,
    "distance": 15,
    "payment": 15,
}

GRADE_ORDER = {"A": 3, "B": 2, "C": 1}


def get_matching_weights(db: Session) -> dict:
    from app.models import SystemSetting

    row = db.scalar(select(SystemSetting).where(SystemSetting.key == "matching_weights"))
    if not row or not row.value:
        return dict(DEFAULT_MATCHING_WEIGHTS)
    try:
        w = json.loads(row.value)
        return {**DEFAULT_MATCHING_WEIGHTS, **w}
    except (ValueError, TypeError):
        return dict(DEFAULT_MATCHING_WEIGHTS)


def price_match_score(offer_price: float, reference_price: float | None) -> float:
    if not reference_price or reference_price <= 0:
        return 70.0
    ratio = offer_price / reference_price
    if ratio >= 1.0:
        return 100.0
    if ratio <= 0.7:
        return 0.0
    return round((ratio - 0.7) / 0.3 * 100, 1)


def quality_match_score(listing_grade: str, required_grade: str,
                        listing_moisture: float | None, max_moisture: float | None) -> float:
    lg = GRADE_ORDER.get(listing_grade, 2)
    rg = GRADE_ORDER.get(required_grade, 2)
    if lg == rg:
        base = 100.0
    elif lg > rg:  # better than required
        base = 95.0
    elif lg == rg - 1:
        base = 55.0
    else:
        base = 20.0
    if max_moisture is not None and listing_moisture is not None and listing_moisture > max_moisture:
        base = min(base, 50.0)
    return base


def quantity_match_score(listing_qty: float, req_min: float, req_max: float) -> float:
    if req_min <= listing_qty <= req_max:
        return 100.0
    if listing_qty < req_min:
        # partial fill — aggregation can complete it
        return round(max(40.0, 90.0 * listing_qty / max(req_min, 1e-9)), 1)
    # more than buyer wants — buyer can still take a partial lot
    return round(max(60.0, 100.0 - 10.0 * (listing_qty / max(req_max, 1e-9) - 1) * 10), 1)


def distance_match_score(distance_km: float | None, radius_km: float) -> float:
    if distance_km is None:
        return 55.0
    if distance_km <= 20:
        return 100.0
    if distance_km >= radius_km:
        return 0.0
    return round(100.0 * (1 - (distance_km - 20) / max(radius_km - 20, 1)), 1)


def payment_trust_score(buyer: Buyer) -> float:
    return round(0.5 * buyer.on_time_payment_pct + 0.5 * buyer.trust_score, 1)


def score_pair(
    listing: ProduceListing,
    requirement: BuyerRequirement,
    buyer: Buyer,
    reference_price: float | None,
    distance_km: float | None,
    weights: dict | None = None,
) -> dict:
    w = weights or dict(DEFAULT_MATCHING_WEIGHTS)
    price = price_match_score(requirement.price_per_qtl, reference_price)
    quality = quality_match_score(
        listing.quality_grade, requirement.quality_grade,
        listing.moisture_pct, requirement.max_moisture_pct,
    )
    quantity = quantity_match_score(listing.quantity_qtl, requirement.quantity_min_qtl, requirement.quantity_max_qtl)
    distance = distance_match_score(distance_km, requirement.delivery_radius_km)
    payment = payment_trust_score(buyer)

    total_w = sum(w.values()) or 1
    overall = round(
        (price * w["price"] + quality * w["quality"] + quantity * w["quantity"]
         + distance * w["distance"] + payment * w["payment"]) / total_w, 1
    )
    return {
        "price_match": price,
        "quality_match": quality,
        "quantity_match": quantity,
        "distance_match": distance,
        "payment_trust": payment,
        "overall_score": overall,
        "distance_km": distance_km,
    }


def reference_price_for(db: Session, crop_id: str, listing: ProduceListing | None = None) -> float | None:
    """Latest average modal price of the crop across markets; fallback to expectation."""
    if listing and listing.price_expectation:
        return float(listing.price_expectation)
    rows = db.execute(
        select(MarketPrice.modal_price)
        .where(MarketPrice.crop_id == crop_id)
        .order_by(MarketPrice.price_date.desc())
        .limit(20)
    ).scalars().all()
    if rows:
        return round(sum(rows) / len(rows), 2)
    crop = db.get(Crop, crop_id)
    return crop.base_price if crop else None


def find_requirements_for_listing(db: Session, listing: ProduceListing) -> list[dict]:
    """All open buyer requirements compatible with a listing, scored and ranked."""
    from app.services.engines.trust import compute_trust_score  # noqa: F401

    requirements = db.execute(
        select(BuyerRequirement).where(
            BuyerRequirement.crop_id == listing.crop_id,
            BuyerRequirement.status == "open",
        )
    ).scalars().all()
    weights = get_matching_weights(db)
    ref_price = reference_price_for(db, listing.crop_id, listing)
    results = []
    for req in requirements:
        buyer = db.get(Buyer, req.buyer_id)
        if not buyer or buyer.verification_status == "rejected":
            continue
        if buyer.verification_status == "pending":
            continue  # unverified buyers are hidden from matching
        distance = road_distance_km(listing.latitude, listing.longitude, req.latitude, req.longitude)
        scores = score_pair(listing, req, buyer, ref_price, distance, weights)
        scores.update({
            "requirement_id": req.id,
            "buyer_id": buyer.id,
            "buyer_name": buyer.business_name,
            "quality_grade": req.quality_grade,
            "district": buyer.district,
            "valid_until": req.valid_until.isoformat() if req.valid_until else None,
            "offer_price_per_qtl": req.price_per_qtl,
            "payment_terms": req.payment_terms,
            "pickup_preference": req.pickup_preference,
            "quantity_min_qtl": req.quantity_min_qtl,
            "quantity_max_qtl": req.quantity_max_qtl,
        })
        results.append(scores)
    results.sort(key=lambda r: r["overall_score"], reverse=True)
    return results


def aggregate_supply(db: Session, requirement: BuyerRequirement) -> dict:
    """Find compatible farmers/FPO listings that together can fulfil a requirement."""
    listings = db.execute(
        select(ProduceListing).where(
            ProduceListing.crop_id == requirement.crop_id,
            ProduceListing.status == "available",
        )
    ).scalars().all()
    compatible = []
    total = 0.0
    buyer = db.get(Buyer, requirement.buyer_id)
    ref_price = reference_price_for(db, requirement.crop_id)
    weights = get_matching_weights(db)
    for lst in listings:
        if GRADE_ORDER.get(lst.quality_grade, 2) < GRADE_ORDER.get(requirement.quality_grade, 2) - 1:
            continue
        distance = road_distance_km(lst.latitude, lst.longitude, requirement.latitude, requirement.longitude)
        if distance is not None and distance > requirement.delivery_radius_km * 1.5:
            continue
        scores = score_pair(lst, requirement, buyer, ref_price, distance, weights)
        if scores["overall_score"] < 45:
            continue
        owner_farmer = lst.farmer_id
        compatible.append({
            "listing_id": lst.id,
            "farmer_user_id": lst.owner_user_id,
            "farmer_id": owner_farmer,
            "fpo_id": lst.fpo_id,
            "quantity_qtl": lst.quantity_qtl,
            "quality_grade": lst.quality_grade,
            "village": lst.village,
            "district": lst.district,
            "distance_km": distance,
            "scores": scores,
        })
        total += lst.quantity_qtl
    compatible.sort(key=lambda c: c["scores"]["overall_score"], reverse=True)

    selected, selected_qty = [], 0.0
    for c in compatible:
        if selected_qty >= requirement.quantity_max_qtl:
            break
        selected.append(c)
        selected_qty += c["quantity_qtl"]

    return {
        "requirement_id": requirement.id,
        "crop_id": requirement.crop_id,
        "required_max_qtl": requirement.quantity_max_qtl,
        "compatible_farmer_count": len(compatible),
        "compatible_total_qtl": round(total, 1),
        "fulfilled": selected_qty >= requirement.quantity_min_qtl,
        "selected_quantity_qtl": round(selected_qty, 1),
        "selected": selected,
    }

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models import (
    Buyer, BuyerRequirement, Crop, Farmer, FarmerFPO, FPO, ProduceListing, Transaction, User,
    LISTING_AVAILABLE,
)
from app.services.engines.matching import aggregate_supply

router = APIRouter(prefix="/fpos", tags=["fpo"])


def _require_fpo(user: User, db: Session) -> FPO:
    fpo = db.scalar(select(FPO).where(FPO.user_id == user.id))
    if not fpo:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "FPO profile required")
    return fpo


@router.get("/me")
def fpo_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    fpo = _require_fpo(user, db)
    members = db.execute(
        select(Farmer, User)
        .join(FarmerFPO, FarmerFPO.farmer_id == Farmer.id)
        .join(User, User.id == Farmer.user_id)
        .where(FarmerFPO.fpo_id == fpo.id)
    ).all()
    return {
        "fpo": {
            "id": fpo.id, "name": fpo.name, "district": fpo.district,
            "village": fpo.village, "member_count": fpo.member_count,
            "registration_no": fpo.registration_no, "trust_score": fpo.trust_score,
        },
        "members": [
            {
                "farmer_id": f.id, "user_id": u.id, "name": u.full_name,
                "village": f.village, "district": f.district, "land_size_acres": f.land_size_acres,
                "phone": u.phone,
            } for f, u in members
        ],
    }


@router.get("/me/stock")
def aggregated_stock(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Aggregated available produce across all member farmers, crop-wise."""
    fpo = _require_fpo(user, db)
    member_ids = db.execute(
        select(FarmerFPO.farmer_id).where(FarmerFPO.fpo_id == fpo.id)
    ).scalars().all()
    listings = db.execute(
        select(ProduceListing).where(
            ProduceListing.status == LISTING_AVAILABLE,
            ProduceListing.farmer_id.in_(member_ids),
        )
    ).scalars().all()
    by_crop: dict = {}
    for lst in listings:
        crop = db.get(Crop, lst.crop_id)
        key = lst.crop_id
        entry = by_crop.setdefault(key, {
            "crop_id": key, "crop_name": crop.name if crop else None,
            "crop_icon": crop.icon if crop else None,
            "total_qtl": 0.0, "farmer_count": set(), "grades": set(),
            "listings": [],
        })
        entry["total_qtl"] += lst.quantity_qtl
        entry["farmer_count"].add(lst.farmer_id)
        entry["grades"].add(lst.quality_grade)
        entry["listings"].append({
            "listing_id": lst.id, "farmer_id": lst.farmer_id,
            "quantity_qtl": lst.quantity_qtl, "quality_grade": lst.quality_grade,
            "village": lst.village,
        })
    out = []
    for e in by_crop.values():
        out.append({
            "crop_id": e["crop_id"], "crop_name": e["crop_name"], "crop_icon": e["crop_icon"],
            "total_qtl": round(e["total_qtl"], 1),
            "farmer_count": len(e["farmer_count"]),
            "grades": sorted(e["grades"]),
            "listings": e["listings"],
        })
    out.sort(key=lambda x: -x["total_qtl"])
    return out


@router.get("/me/match-bulk")
def match_bulk(
    crop_id: str,
    quantity_qtl: float,
    quality_grade: str = "A",
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Find open buyer requirements that a collective FPO quantity can fulfil."""
    _require_fpo(user, db)
    reqs = db.execute(
        select(BuyerRequirement).where(
            BuyerRequirement.crop_id == crop_id, BuyerRequirement.status == "open"
        )
    ).scalars().all()
    results = []
    for req in reqs:
        buyer = db.get(Buyer, req.buyer_id)
        if not buyer or buyer.verification_status != "verified":
            continue
        fits = req.quantity_min_qtl <= quantity_qtl <= req.quantity_max_qtl * 1.5
        qty_score = 100.0 if fits else min(100.0, max(40.0, 90.0 * min(quantity_qtl, req.quantity_max_qtl) / max(req.quantity_min_qtl, 1)))
        grade_fit = 100.0 if quality_grade == req.quality_grade else 60.0
        overall = round(0.4 * qty_score + 0.4 * grade_fit + 0.2 * float(buyer.trust_score), 1)
        results.append({
            "requirement_id": req.id,
            "buyer_id": req.buyer_id,
            "buyer_name": buyer.business_name,
            "buyer_trust": buyer.trust_score,
            "crop_name": db.get(Crop, req.crop_id).name,
            "quantity_min_qtl": req.quantity_min_qtl,
            "quantity_max_qtl": req.quantity_max_qtl,
            "quality_grade": req.quality_grade,
            "price_per_qtl": req.price_per_qtl,
            "payment_terms": req.payment_terms,
            "gross_value": round(req.price_per_qtl * min(quantity_qtl, req.quantity_max_qtl), 2),
            "quantity_fit": round(qty_score, 1),
            "grade_fit": grade_fit,
            "overall": overall,
        })
    results.sort(key=lambda r: -r["overall"])
    return {"matches": results}

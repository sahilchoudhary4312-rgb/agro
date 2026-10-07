from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models import Buyer, BuyerRequirement, Crop, User, REQ_OPEN, REQ_CLOSED, Match, ProduceListing
from app.services.engines.matching import find_requirements_for_listing
from app.services.geo import road_distance_km
from app.schemas import RequirementIn

router = APIRouter(prefix="/buyers", tags=["buyers"])


def _require_buyer(user: User, db: Session) -> Buyer:
    buyer = db.scalar(select(Buyer).where(Buyer.user_id == user.id))
    if not buyer:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Buyer profile required")
    return buyer


def _buyer_public(buyer: Buyer, include_contact: bool = False) -> dict:
    d = {
        "id": buyer.id,
        "business_name": buyer.business_name,
        "business_type": buyer.business_type,
        "verification_status": buyer.verification_status,
        "city": buyer.city,
        "district": buyer.district,
        "about": buyer.about,
        "trust_score": buyer.trust_score,
        "total_transactions": buyer.total_transactions,
        "successful_transactions": buyer.successful_transactions,
        "on_time_payment_pct": buyer.on_time_payment_pct,
        "farmer_rating": buyer.farmer_rating,
        "dispute_count": buyer.dispute_count,
        "latitude": buyer.latitude,
        "longitude": buyer.longitude,
    }
    if include_contact:
        user = buyer.user
        d["contact_email"] = user.email if user else None
        d["contact_phone"] = user.phone if user else None
    return d


@router.get("")
def list_buyers(
    district: str | None = None,
    verified_only: bool = False,
    db: Session = Depends(get_db),
):
    q = select(Buyer).order_by(Buyer.trust_score.desc())
    if district:
        q = q.where(Buyer.district.ilike(f"%{district}%"))
    if verified_only:
        q = q.where(Buyer.verification_status == "verified")
    buyers = db.execute(q).scalars().all()
    return [_buyer_public(b) for b in buyers]


@router.get("/me/dashboard")
def buyer_dashboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    buyer = _require_buyer(user, db)
    open_reqs = db.execute(
        select(func.count(BuyerRequirement.id)).where(
            BuyerRequirement.buyer_id == buyer.id, BuyerRequirement.status == REQ_OPEN)
    ).scalar() or 0
    matches = db.execute(
        select(func.count(Match.id)).where(Match.buyer_id == buyer.id)
    ).scalar() or 0
    return {
        "buyer": _buyer_public(buyer, include_contact=True),
        "open_requirements": open_reqs,
        "total_matches": matches,
    }


@router.post("/requirements", status_code=201)
def create_requirement(data: RequirementIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    buyer = _require_buyer(user, db)
    crop = db.get(Crop, data.crop_id)
    if not crop:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Crop not found")
    req = BuyerRequirement(
        buyer_id=buyer.id,
        crop_id=data.crop_id,
        quantity_min_qtl=data.quantity_min_qtl,
        quantity_max_qtl=data.quantity_max_qtl,
        quality_grade=data.quality_grade,
        max_moisture_pct=data.max_moisture_pct,
        price_per_qtl=data.price_per_qtl,
        price_negotiable=data.price_negotiable,
        pickup_preference=data.pickup_preference,
        payment_terms=data.payment_terms,
        delivery_radius_km=data.delivery_radius_km,
        latitude=data.latitude or buyer.latitude,
        longitude=data.longitude or buyer.longitude,
        notes=data.notes,
        valid_until=data.valid_until,
        status=REQ_OPEN,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return _requirement_dict(req, crop)


def _requirement_dict(req: BuyerRequirement, crop: Crop | None, buyer: Buyer | None = None) -> dict:
    return {
        "id": req.id,
        "crop_id": req.crop_id,
        "crop_name": crop.name if crop else None,
        "crop_icon": crop.icon if crop else None,
        "quantity_min_qtl": req.quantity_min_qtl,
        "quantity_max_qtl": req.quantity_max_qtl,
        "quality_grade": req.quality_grade,
        "max_moisture_pct": req.max_moisture_pct,
        "price_per_qtl": req.price_per_qtl,
        "price_negotiable": req.price_negotiable,
        "pickup_preference": req.pickup_preference,
        "payment_terms": req.payment_terms,
        "delivery_radius_km": req.delivery_radius_km,
        "notes": req.notes,
        "valid_until": req.valid_until.isoformat() if req.valid_until else None,
        "status": req.status,
        "created_at": req.created_at.isoformat() if req.created_at else None,
        "buyer": _buyer_public(buyer) if buyer else None,
    }


@router.get("/requirements")
def list_requirements(
    crop_id: str | None = None,
    db: Session = Depends(get_db),
):
    q = select(BuyerRequirement).where(BuyerRequirement.status == REQ_OPEN).order_by(BuyerRequirement.created_at.desc())
    if crop_id:
        q = q.where(BuyerRequirement.crop_id == crop_id)
    reqs = db.execute(q).scalars().all()
    out = []
    for req in reqs:
        crop = db.get(Crop, req.crop_id)
        buyer = db.get(Buyer, req.buyer_id)
        out.append(_requirement_dict(req, crop, buyer))
    return out


@router.get("/browse-listings")
def browse_listings(
    crop_id: str | None = None,
    district: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """All available farmer/FPO listings for the buyer to browse and offer on."""
    buyer = _require_buyer(user, db)
    q = (
        select(ProduceListing)
        .where(ProduceListing.status == "available")
        .order_by(ProduceListing.created_at.desc())
        .limit(200)
    )
    if crop_id:
        q = q.where(ProduceListing.crop_id == crop_id)
    if district:
        q = q.where(ProduceListing.district.ilike(f"%{district}%"))
    listings = db.execute(q).scalars().all()
    out = []
    for lst in listings:
        crop = db.get(Crop, lst.crop_id)
        owner = db.get(User, lst.owner_user_id)
        out.append({
            "id": lst.id,
            "crop_id": lst.crop_id,
            "crop_name": crop.name if crop else None,
            "crop_icon": crop.icon if crop else None,
            "title": lst.title,
            "quantity_qtl": lst.quantity_qtl,
            "quality_grade": lst.quality_grade,
            "moisture_pct": lst.moisture_pct,
            "price_expectation": lst.price_expectation,
            "village": lst.village,
            "district": lst.district,
            "farmer_name": owner.full_name if owner else None,
            "distance_km": road_distance_km(lst.latitude, lst.longitude, buyer.latitude, buyer.longitude),
            "created_at": lst.created_at.isoformat() if lst.created_at else None,
        })
    return out


@router.get("/requirements/mine")
def my_requirements(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    buyer = _require_buyer(user, db)
    reqs = db.execute(
        select(BuyerRequirement).where(BuyerRequirement.buyer_id == buyer.id)
        .order_by(BuyerRequirement.created_at.desc())
    ).scalars().all()
    out = []
    for req in reqs:
        crop = db.get(Crop, req.crop_id)
        out.append(_requirement_dict(req, crop))
    return out


@router.put("/requirements/{req_id}")
def update_requirement(req_id: str, data: RequirementIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    buyer = _require_buyer(user, db)
    req = db.get(BuyerRequirement, req_id)
    if not req or req.buyer_id != buyer.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Requirement not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(req, field, value)
    db.commit()
    crop = db.get(Crop, req.crop_id)
    return _requirement_dict(req, crop)


@router.delete("/requirements/{req_id}")
def close_requirement(req_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    buyer = _require_buyer(user, db)
    req = db.get(BuyerRequirement, req_id)
    if not req or req.buyer_id != buyer.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Requirement not found")
    req.status = REQ_CLOSED
    db.commit()
    return {"ok": True}


@router.get("/requirements/{req_id}/matching-farmers")
def matching_farmers(req_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """For a buyer requirement, show all compatible farmer/FPO listings with scores."""
    buyer = _require_buyer(user, db)
    req = db.get(BuyerRequirement, req_id)
    if not req or req.buyer_id != buyer.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Requirement not found")

    listings = db.execute(
        select(ProduceListing).where(
            ProduceListing.crop_id == req.crop_id,
            ProduceListing.status == "available",
        )
    ).scalars().all()
    from app.services.engines.matching import get_matching_weights, score_pair, reference_price_for
    weights = get_matching_weights(db)
    ref_price = reference_price_for(db, req.crop_id)
    results = []
    for lst in listings:
        distance = road_distance_km(lst.latitude, lst.longitude, req.latitude, req.longitude)
        scores = score_pair(lst, req, buyer, ref_price, distance, weights)
        owner = db.get(User, lst.owner_user_id)
        results.append({
            **scores,
            "listing_id": lst.id,
            "crop_name": db.get(Crop, lst.crop_id).name,
            "quantity_qtl": lst.quantity_qtl,
            "quality_grade": lst.quality_grade,
            "moisture_pct": lst.moisture_pct,
            "village": lst.village,
            "district": lst.district,
            "farmer_name": owner.full_name if owner else None,
            "owner_user_id": lst.owner_user_id,
            "listed_price_expectation": lst.price_expectation,
        })
    results.sort(key=lambda r: r["overall_score"], reverse=True)
    return {"requirement_id": req.id, "matches": results}


@router.get("/{buyer_id}")
def buyer_detail(buyer_id: str, db: Session = Depends(get_db)):
    buyer = db.get(Buyer, buyer_id)
    if not buyer:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Buyer not found")
    d = _buyer_public(buyer)
    # open requirements preview
    reqs = db.execute(
        select(BuyerRequirement).where(
            BuyerRequirement.buyer_id == buyer.id, BuyerRequirement.status == REQ_OPEN)
    ).scalars().all()
    d["open_requirements"] = [
        {
            "id": r.id,
            "crop_name": db.get(Crop, r.crop_id).name,
            "quantity_min_qtl": r.quantity_min_qtl,
            "quantity_max_qtl": r.quantity_max_qtl,
            "quality_grade": r.quality_grade,
            "price_per_qtl": r.price_per_qtl,
            "payment_terms": r.payment_terms,
        } for r in reqs
    ]
    return d

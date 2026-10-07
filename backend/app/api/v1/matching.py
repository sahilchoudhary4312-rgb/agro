"""Recommendation + matching endpoints — the heart of AgriMitra."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models import Buyer, Farmer, FPO, ProduceListing, User, BuyerRequirement, Crop
from app.services.engines.matching import aggregate_supply, find_requirements_for_listing
from app.services.engines.recommendation import get_selling_options
from app.schemas import RequirementIn

router = APIRouter(prefix="/matching", tags=["matching"])


@router.get("/recommendations")
def recommendations(
    listing_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Ranked selling options (buyers + mandis) for one listing, best by net realization."""
    listing = db.get(ProduceListing, listing_id)
    if not listing:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Listing not found")
    if listing.owner_user_id != user.id and user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your listing")
    return get_selling_options(db, listing)


@router.post("/find-buyers")
def find_buyers(
    listing_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Scored, ranked buyer requirements matching a listing."""
    listing = db.get(ProduceListing, listing_id)
    if not listing:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Listing not found")
    if listing.owner_user_id != user.id and user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your listing")
    results = find_requirements_for_listing(db, listing)
    if not results:
        return {"matches": [], "message": "No matching buyers found. Try changing quantity or quality."}
    return {"matches": results}


@router.get("/farmer-buyers")
def farmer_buyer_matches(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Buyer matches across all of a farmer's available listings."""
    listings = db.execute(
        select(ProduceListing).where(
            ProduceListing.owner_user_id == user.id,
            ProduceListing.status == "available",
        )
    ).scalars().all()
    out = []
    for lst in listings:
        crop = db.get(Crop, lst.crop_id)
        matches = find_requirements_for_listing(db, lst)
        for m in matches[:5]:
            m["listing_id"] = lst.id
            m["crop_name"] = crop.name if crop else None
            m["crop_icon"] = crop.icon if crop else None
            out.append(m)
    out.sort(key=lambda m: m["overall_score"], reverse=True)
    return {"matches": out[:25]}


@router.get("/aggregation/{requirement_id}")
def aggregation(requirement_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Aggregate multiple farmers' produce to satisfy one buyer requirement."""
    req = db.get(BuyerRequirement, requirement_id)
    if not req:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Requirement not found")
    # buyers see their own; farmers/fpos/admin may preview
    if user.role == "buyer":
        buyer = db.scalar(select(Buyer).where(Buyer.user_id == user.id))
        if not buyer or req.buyer_id != buyer.id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your requirement")
    return aggregate_supply(db, req)

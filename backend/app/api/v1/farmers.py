from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models import (
    LISTING_AVAILABLE, LISTING_WITHDRAWN, Crop, Farmer, ProduceListing, User,
)
from app.schemas import FarmerProfileIn, ProduceIn

router = APIRouter(prefix="/farmers", tags=["farmers"])


def _require_farmer(user: User, db: Session) -> Farmer:
    farmer = db.scalar(select(Farmer).where(Farmer.user_id == user.id))
    if not farmer:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Farmer profile required")
    return farmer


@router.get("/profile")
def get_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    farmer = _require_farmer(user, db)
    return {
        "user": {"id": user.id, "full_name": user.full_name, "email": user.email,
                 "phone": user.phone, "preferred_language": user.preferred_language},
        "farmer": {
            "village": farmer.village, "district": farmer.district, "state": farmer.state,
            "pincode": farmer.pincode, "latitude": farmer.latitude, "longitude": farmer.longitude,
            "land_size_acres": farmer.land_size_acres, "irrigation": farmer.irrigation,
        },
    }


@router.put("/profile")
def update_profile(data: FarmerProfileIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    farmer = _require_farmer(user, db)
    for field, value in data.model_dump(exclude_unset=True).items():
        if field == "preferred_language":
            user.preferred_language = value
        elif field in ("full_name", "phone"):
            setattr(user, field, value)
        else:
            setattr(farmer, field, value)
    db.commit()
    return {"ok": True}


@router.get("/produce")
def list_my_produce(
    status_filter: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    farmer = _require_farmer(user, db)
    q = (
        select(ProduceListing)
        .where(ProduceListing.owner_user_id == user.id)
        .order_by(ProduceListing.created_at.desc())
    )
    if status_filter:
        q = q.where(ProduceListing.status == status_filter)
    listings = db.execute(q).scalars().all()
    out = []
    for lst in listings:
        crop = db.get(Crop, lst.crop_id)
        out.append(_listing_dict(lst, crop))
    return out


def _listing_dict(lst: ProduceListing, crop: Crop | None) -> dict:
    return {
        "id": lst.id,
        "crop_id": lst.crop_id,
        "crop_name": crop.name if crop else None,
        "crop_name_hi": crop.name_hi if crop else None,
        "crop_name_mr": crop.name_mr if crop else None,
        "crop_icon": crop.icon if crop else None,
        "title": lst.title,
        "quantity_qtl": lst.quantity_qtl,
        "quality_grade": lst.quality_grade,
        "moisture_pct": lst.moisture_pct,
        "price_expectation": lst.price_expectation,
        "village": lst.village,
        "district": lst.district,
        "latitude": lst.latitude,
        "longitude": lst.longitude,
        "harvest_date": lst.harvest_date.isoformat() if lst.harvest_date else None,
        "status": lst.status,
        "images": (lst.images or "").split(",") if lst.images else [],
        "created_at": lst.created_at.isoformat() if lst.created_at else None,
    }


@router.post("/produce", status_code=201)
def add_produce(data: ProduceIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    farmer = _require_farmer(user, db)
    crop = db.get(Crop, data.crop_id)
    if not crop:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Crop not found")
    listing = ProduceListing(
        owner_user_id=user.id,
        farmer_id=farmer.id,
        crop_id=data.crop_id,
        title=data.title or f"{crop.name} — {data.quality_grade} grade",
        quantity_qtl=data.quantity_qtl,
        quality_grade=data.quality_grade,
        moisture_pct=data.moisture_pct,
        price_expectation=data.price_expectation,
        village=data.village or farmer.village,
        district=data.district or farmer.district,
        latitude=data.latitude or farmer.latitude,
        longitude=data.longitude or farmer.longitude,
        harvest_date=data.harvest_date,
        images=",".join(data.images) if data.images else None,
        status=LISTING_AVAILABLE,
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return _listing_dict(listing, crop)


@router.put("/produce/{listing_id}")
def update_produce(listing_id: str, data: ProduceIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    listing = db.get(ProduceListing, listing_id)
    if not listing or listing.owner_user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Listing not found")
    data_dump = data.model_dump(exclude_unset=True)
    if "images" in data_dump and data_dump["images"] is not None:
        data_dump["images"] = ",".join(data_dump.pop("images"))
    for field, value in data_dump.items():
        setattr(listing, field, value)
    db.commit()
    crop = db.get(Crop, listing.crop_id)
    return _listing_dict(listing, crop)


@router.delete("/produce/{listing_id}")
def withdraw_produce(listing_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    listing = db.get(ProduceListing, listing_id)
    if not listing or listing.owner_user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Listing not found")
    listing.status = LISTING_WITHDRAWN
    db.commit()
    return {"ok": True}

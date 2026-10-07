from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models import LogisticsProvider, StorageFacility, Crop
from app.schemas import LogisticsEstimateIn
from app.services.engines.logistics import estimate_logistics
from app.services.geo import road_distance_km

router = APIRouter(prefix="/logistics", tags=["logistics"])


@router.post("/estimate")
def estimate(data: LogisticsEstimateIn, db: Session = Depends(get_db)):
    distance = road_distance_km(data.from_lat, data.from_lon, data.to_lat, data.to_lon)
    return estimate_logistics(distance, data.quantity_qtl)


@router.get("/providers")
def providers(district: str | None = None, db: Session = Depends(get_db)):
    q = select(LogisticsProvider)
    if district:
        q = q.where(LogisticsProvider.district.ilike(f"%{district}%"))
    rows = db.execute(q).scalars().all()
    return [
        {
            "id": p.id, "name": p.name, "vehicle_types": (p.vehicle_types or "").split(","),
            "contact": p.contact, "district": p.district, "base_cost_per_km": p.base_cost_per_km,
            "cost_per_qtl_km": p.cost_per_qtl_km, "rating": p.rating,
        }
        for p in rows
    ]


@router.get("/storage")
def storage_facilities(
    lat: float | None = None, lon: float | None = None,
    crop: str | None = None, district: str | None = None,
    db: Session = Depends(get_db),
):
    q = select(StorageFacility)
    if district:
        q = q.where(StorageFacility.district.ilike(f"%{district}%"))
    facilities = db.execute(q).scalars().all()
    out = []
    for f in facilities:
        suitable = [c.strip().lower() for c in (f.suitable_crops or "").split(",") if c.strip()]
        if crop and suitable and crop.lower() not in suitable:
            continue
        d = road_distance_km(lat, lon, f.latitude, f.longitude)
        out.append({
            "id": f.id, "name": f.name, "facility_type": f.facility_type,
            "village": f.village, "district": f.district,
            "capacity_qtl": f.capacity_qtl, "available_qtl": f.available_qtl,
            "cost_per_qtl_month": f.cost_per_qtl_month,
            "suitable_crops": suitable, "contact": f.contact,
            "latitude": f.latitude, "longitude": f.longitude,
            "distance_km": d,
        })
    if lat is not None and lon is not None:
        out.sort(key=lambda x: (x["distance_km"] is None, x["distance_km"] or 0))
    return out

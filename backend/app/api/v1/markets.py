from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.services.providers.market_data import get_provider
from app.models import Crop, Market
from app.services.geo import haversine_km

router = APIRouter(prefix="/markets", tags=["markets"])


@router.get("")
def list_markets(db: Session = Depends(get_db)):
    markets = db.execute(select(Market).order_by(Market.district)).scalars().all()
    return [
        {
            "id": m.id, "name": m.name, "market_type": m.market_type,
            "district": m.district, "latitude": m.latitude, "longitude": m.longitude,
        }
        for m in markets
    ]


@router.get("/prices")
def latest_prices(
    crop_id: str | None = None,
    district: str | None = None,
    lat: float | None = None,
    lon: float | None = None,
    db: Session = Depends(get_db),
):
    provider = get_provider()
    rows = provider.latest_prices(db, crop_id=crop_id, district=district)
    if lat is not None and lon is not None:
        m_by_id = {m.id: m for m in db.execute(select(Market)).scalars().all()}
        for r in rows:
            m = m_by_id.get(r["market_id"])
            r["distance_km"] = haversine_km(lat, lon, m.latitude if m else None, m.longitude if m else None)
        rows.sort(key=lambda r: (r["distance_km"] is None, r["distance_km"] if r["distance_km"] is not None else 0))
    return {"source": "DEMO DATA", "prices": rows}


@router.get("/prices/trend")
def price_trend(
    crop_id: str,
    market_id: str | None = None,
    days: int = Query(default=30, ge=7, le=180),
    db: Session = Depends(get_db),
):
    provider = get_provider()
    series = provider.trend(db, crop_id, market_id, days)
    return {"source": "DEMO DATA", "crop_id": crop_id, "market_id": market_id, "series": series}


@router.get("/map")
def map_data(db: Session = Depends(get_db)):
    """All map entities for the interactive map view."""
    markets = db.execute(select(Market)).scalars().all()
    crops = db.execute(select(Crop)).scalars().all()
    return {
        "source": "DEMO DATA",
        "markets": [
            {"id": m.id, "name": m.name, "district": m.district, "type": m.market_type,
             "latitude": m.latitude, "longitude": m.longitude}
            for m in markets
        ],
        "crops": [{"id": c.id, "name": c.name, "name_hi": c.name_hi, "name_mr": c.name_mr,
                   "icon": c.icon, "base_price": c.base_price} for c in crops],
    }

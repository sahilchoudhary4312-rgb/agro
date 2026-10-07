from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models import Crop, Market, MarketPrice
from app.ml.forecast import forecast_prices, sell_now_or_wait

router = APIRouter(prefix="/forecast", tags=["forecast"])


@router.get("/{crop_id}")
def forecast(
    crop_id: str,
    storage_available: bool = Query(default=True),
    db: Session = Depends(get_db),
):
    """Estimated (not guaranteed) price forecast for a crop, averaged across markets."""
    crop = db.get(Crop, crop_id)
    if not crop:
        return {"available": False, "reason": "crop_not_found"}
    prices = db.execute(
        select(MarketPrice).where(MarketPrice.crop_id == crop_id).order_by(MarketPrice.price_date)
    ).scalars().all()
    by_date: dict = {}
    for p in prices:
        by_date.setdefault(p.price_date, []).append(p.modal_price)
    history = [(d, sum(v) / len(v)) for d, v in sorted(by_date.items())]
    result = forecast_prices(history, horizons=(3, 7, 15, 30))
    result["crop_id"] = crop_id
    result["crop_name"] = crop.name
    result["data_label"] = "ESTIMATED PRICE — baseline model on demo data. Not guaranteed."
    result["sell_recommendation"] = sell_now_or_wait(result, storage_available)
    return result

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models import Buyer, Crop, Farmer, FPO, Market, Transaction

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/stats")
def platform_stats(db: Session = Depends(get_db)):
    return {
        "farmers": db.scalar(select(func.count(Farmer.id))) or 0,
        "buyers": db.scalar(select(func.count(Buyer.id))) or 0,
        "fpos": db.scalar(select(func.count(FPO.id))) or 0,
        "markets": db.scalar(select(func.count(Market.id))) or 0,
        "crops": db.scalar(select(func.count(Crop.id))) or 0,
        "transactions": db.scalar(select(func.count(Transaction.id))) or 0,
        "label": "DEMO DATA",
    }


@router.get("/crops")
def list_crops(db: Session = Depends(get_db)):
    crops = db.execute(select(Crop).order_by(Crop.name)).scalars().all()
    return [
        {"id": c.id, "name": c.name, "name_hi": c.name_hi, "name_mr": c.name_mr,
         "icon": c.icon, "category": c.category, "base_price": c.base_price}
        for c in crops
    ]

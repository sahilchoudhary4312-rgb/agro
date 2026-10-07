from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.models import (
    Buyer, BuyerRequirement, Crop, Dispute, Farmer, FPO, Market, MarketPrice,
    Notification, ProduceListing, SystemSetting, Transaction, User, AuditLog,
)

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_roles("admin"))])


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    total_farmers = db.scalar(select(func.count(Farmer.id))) or 0
    active_farmers = db.scalar(
        select(func.count(func.distinct(ProduceListing.owner_user_id)))
        .where(ProduceListing.status == "available")
    ) or 0
    total_buyers = db.scalar(select(func.count(Buyer.id))) or 0
    verified_buyers = db.scalar(
        select(func.count(Buyer.id)).where(Buyer.verification_status == "verified")
    ) or 0
    total_fpos = db.scalar(select(func.count(FPO.id))) or 0
    produce_listed = db.scalar(select(func.coalesce(func.sum(ProduceListing.quantity_qtl), 0))
                               .where(ProduceListing.status != "withdrawn")) or 0
    total_tx = db.scalar(select(func.count(Transaction.id))) or 0
    tx_value = db.scalar(select(func.coalesce(func.sum(Transaction.total_value), 0))) or 0
    avg_net = db.scalar(select(func.coalesce(func.avg(Transaction.net_realization_per_qtl), 0))) or 0
    completed_tx = db.scalar(select(func.count(Transaction.id)).where(
        Transaction.status.in_(["payment_completed", "completed"]))) or 0
    pending_tx = db.scalar(select(func.count(Transaction.id)).where(
        Transaction.status.in_(["accepted", "pickup_scheduled", "in_transit", "delivered", "payment_pending"]))) or 0
    open_disputes = db.scalar(select(func.count(Dispute.id)).where(Dispute.status == "open")) or 0
    avg_buyer_rating = db.scalar(select(func.coalesce(func.avg(Buyer.farmer_rating), 0))) or 0

    crop_volume = db.execute(
        select(Crop.name, func.coalesce(func.sum(Transaction.quantity_qtl), 0))
        .join(Transaction, Transaction.crop_id == Crop.id)
        .group_by(Crop.name).order_by(func.sum(Transaction.quantity_qtl).desc())
    ).all()
    tx_over_time = db.execute(
        select(func.date(Transaction.created_at), func.count(Transaction.id))
        .group_by(func.date(Transaction.created_at)).order_by(func.date(Transaction.created_at))
    ).all()
    demand_vs_supply = db.execute(
        select(Crop.name,
               func.coalesce(func.sum(BuyerRequirement.quantity_max_qtl), 0),
               func.coalesce(func.sum(ProduceListing.quantity_qtl), 0))
        .select_from(Crop)
        .outerjoin(BuyerRequirement, BuyerRequirement.crop_id == Crop.id)
        .outerjoin(ProduceListing, ProduceListing.crop_id == Crop.id)
        .group_by(Crop.name)
    ).all()
    farmer_regs = db.execute(
        select(func.date(User.created_at), func.count(User.id))
        .where(User.role == "farmer").group_by(func.date(User.created_at))
        .order_by(func.date(User.created_at))
    ).all()
    regional = db.execute(
        select(ProduceListing.district, func.count(ProduceListing.id))
        .group_by(ProduceListing.district).order_by(func.count(ProduceListing.id).desc()).limit(10)
    ).all()

    return {
        "metrics": {
            "total_farmers": total_farmers,
            "active_farmers": active_farmers,
            "total_buyers": total_buyers,
            "verified_buyers": verified_buyers,
            "total_fpos": total_fpos,
            "produce_listed_qtl": round(float(produce_listed), 1),
            "total_transactions": total_tx,
            "transaction_value": round(float(tx_value), 2),
            "avg_net_realization": round(float(avg_net), 2),
            "completed_transactions": completed_tx,
            "pending_transactions": pending_tx,
            "open_disputes": open_disputes,
            "avg_buyer_rating": round(float(avg_buyer_rating), 2),
        },
        "charts": {
            "crop_volume": [{"name": n, "value": float(v or 0)} for n, v in crop_volume],
            "transactions_over_time": [{"date": str(d), "count": c} for d, c in tx_over_time],
            "demand_vs_supply": [
                {"crop": n, "demand_qtl": float(d or 0), "supply_qtl": float(s or 0)}
                for n, d, s in demand_vs_supply
            ],
            "farmer_registrations": [{"date": str(d), "count": c} for d, c in farmer_regs],
            "regional_activity": [{"district": n or "Unknown", "listings": c} for n, c in regional],
        },
    }


@router.get("/users")
def list_users(role: str | None = None, q: str | None = None, db: Session = Depends(get_db)):
    query = select(User).order_by(User.created_at.desc())
    if role:
        query = query.where(User.role == role)
    if q:
        like = f"%{q}%"
        query = query.where((User.full_name.ilike(like)) | (User.email.ilike(like)))
    users = db.execute(query.limit(200)).scalars().all()
    out = []
    for u in users:
        entry = {
            "id": u.id, "email": u.email, "full_name": u.full_name, "role": u.role,
            "phone": u.phone, "is_active": u.is_active, "language": u.preferred_language,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        if u.role == "buyer":
            buyer = db.scalar(select(Buyer).where(Buyer.user_id == u.id))
            if buyer:
                entry["buyer_id"] = buyer.id
                entry["business_name"] = buyer.business_name
                entry["verification_status"] = buyer.verification_status
                entry["trust_score"] = buyer.trust_score
        elif u.role == "farmer":
            farmer = db.scalar(select(Farmer).where(Farmer.user_id == u.id))
            if farmer:
                entry["district"] = farmer.district
                entry["village"] = farmer.village
        elif u.role == "fpo":
            fpo = db.scalar(select(FPO).where(FPO.user_id == u.id))
            if fpo:
                entry["fpo_name"] = fpo.name
        out.append(entry)
    return out


@router.put("/users/{user_id}/active")
def set_user_active(user_id: str, active: bool, db: Session = Depends(get_db)):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    u.is_active = active
    db.commit()
    return {"ok": True}


@router.put("/buyers/{buyer_id}/verification")
def verify_buyer(buyer_id: str, decision: str, db: Session = Depends(get_db)):
    if decision not in ("verified", "rejected", "pending"):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "decision must be verified|rejected|pending")
    buyer = db.get(Buyer, buyer_id)
    if not buyer:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Buyer not found")
    buyer.verification_status = decision
    user = db.get(User, buyer.user_id)
    if user:
        db.add(Notification(user_id=user.id, type="verification",
                            title=f"Your buyer account is {decision}",
                            ref_type="buyer", ref_id=buyer.id))
    db.add(AuditLog(user_id=None, action=f"buyer_verification:{decision}", entity="buyer", entity_id=buyer.id))
    db.commit()
    return {"ok": True, "verification_status": buyer.verification_status}


@router.get("/disputes")
def admin_disputes(db: Session = Depends(get_db)):
    rows = db.execute(select(Dispute).order_by(Dispute.created_at.desc())).scalars().all()
    out = []
    for d in rows:
        tx = db.get(Transaction, d.transaction_id) if d.transaction_id else None
        raiser = db.get(User, d.raised_by_user_id)
        out.append({
            "id": d.id, "transaction_code": tx.code if tx else None,
            "transaction_id": d.transaction_id,
            "category": d.category, "description": d.description,
            "status": d.status, "resolution": d.resolution,
            "raised_by": raiser.full_name if raiser else None,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        })
    return out


@router.get("/markets")
def admin_markets(db: Session = Depends(get_db)):
    markets = db.execute(select(Market).order_by(Market.district)).scalars().all()
    return [
        {"id": m.id, "name": m.name, "district": m.district, "market_type": m.market_type,
         "latitude": m.latitude, "longitude": m.longitude}
        for m in markets
    ]


@router.post("/markets")
def add_market(name: str, district: str, market_type: str = "mandi",
               latitude: float | None = None, longitude: float | None = None,
               db: Session = Depends(get_db)):
    m = Market(name=name, district=district, market_type=market_type,
               latitude=latitude, longitude=longitude)
    db.add(m)
    db.commit()
    return {"id": m.id}


@router.post("/prices")
def add_price(crop_id: str, market_id: str, price_date: date,
              min_price: float, max_price: float, modal_price: float,
              db: Session = Depends(get_db)):
    p = MarketPrice(crop_id=crop_id, market_id=market_id, price_date=price_date,
                    min_price=min_price, max_price=max_price, modal_price=modal_price,
                    source="admin")
    db.add(p)
    db.commit()
    return {"id": p.id}


@router.get("/listings")
def admin_listings(status: str | None = None, db: Session = Depends(get_db)):
    q = select(ProduceListing).order_by(ProduceListing.created_at.desc()).limit(300)
    if status:
        q = q.where(ProduceListing.status == status)
    listings = db.execute(q).scalars().all()
    out = []
    for lst in listings:
        crop = db.get(Crop, lst.crop_id)
        owner = db.get(User, lst.owner_user_id)
        out.append({
            "id": lst.id,
            "crop_name": crop.name if crop else None,
            "crop_icon": crop.icon if crop else None,
            "quantity_qtl": lst.quantity_qtl,
            "quality_grade": lst.quality_grade,
            "price_expectation": lst.price_expectation,
            "village": lst.village,
            "district": lst.district,
            "owner_name": owner.full_name if owner else None,
            "owner_role": owner.role if owner else None,
            "status": lst.status,
            "created_at": lst.created_at.isoformat() if lst.created_at else None,
        })
    return out


@router.get("/settings")
def get_settings_all(db: Session = Depends(get_db)):
    rows = db.execute(select(SystemSetting)).scalars().all()
    return [{"key": r.key, "value": r.value, "description": r.description} for r in rows]


@router.put("/settings")
def put_setting(key: str, value: str, description: str | None = None, db: Session = Depends(get_db)):
    row = db.scalar(select(SystemSetting).where(SystemSetting.key == key))
    if row:
        row.value = value
        if description:
            row.description = description
    else:
        db.add(SystemSetting(key=key, value=value, description=description))
    db.commit()
    return {"ok": True}


@router.get("/audit")
def audit_logs(db: Session = Depends(get_db)):
    rows = db.execute(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(100)).scalars().all()
    return [{"id": r.id, "action": r.action, "entity": r.entity, "entity_id": r.entity_id,
             "detail": r.detail, "created_at": r.created_at.isoformat() if r.created_at else None}
            for r in rows]

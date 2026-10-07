from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.models import (
    Buyer, BuyerOffer, Crop, Farmer, FPO, LogisticsBooking, Notification,
    Payment, Transaction, User, TX_STATUSES, LogisticsProvider,
)
from app.schemas import StatusIn

router = APIRouter(prefix="/transactions", tags=["transactions"])


def _tx_dict(db: Session, t: Transaction, include_payments: bool = True) -> dict:
    crop = db.get(Crop, t.crop_id)
    buyer = db.get(Buyer, t.buyer_id) if t.buyer_id else None
    farmer_user = db.get(User, t.farmer_user_id)
    fpo = db.get(FPO, t.fpo_id) if t.fpo_id else None
    booking = db.scalar(select(LogisticsBooking).where(LogisticsBooking.transaction_id == t.id))
    provider = db.get(LogisticsProvider, booking.provider_id) if booking and booking.provider_id else None
    d = {
        "id": t.id,
        "code": t.code,
        "listing_id": t.listing_id,
        "offer_id": t.offer_id,
        "farmer_user_id": t.farmer_user_id,
        "farmer_name": farmer_user.full_name if farmer_user else None,
        "buyer_id": t.buyer_id,
        "buyer_name": buyer.business_name if buyer else None,
        "buyer_trust": buyer.trust_score if buyer else None,
        "fpo_id": t.fpo_id,
        "fpo_name": fpo.name if fpo else None,
        "crop_name": crop.name if crop else None,
        "crop_icon": crop.icon if crop else None,
        "quantity_qtl": t.quantity_qtl,
        "quality_grade": t.quality_grade,
        "agreed_price": t.agreed_price,
        "logistics_cost_per_qtl": t.logistics_cost_per_qtl,
        "handling_cost_per_qtl": t.handling_cost_per_qtl,
        "net_realization_per_qtl": t.net_realization_per_qtl,
        "total_value": t.total_value,
        "net_total": t.net_total,
        "status": t.status,
        "scheduled_pickup_at": t.scheduled_pickup_at.isoformat() if t.scheduled_pickup_at else None,
        "delivered_at": t.delivered_at.isoformat() if t.delivered_at else None,
        "distance_km": t.distance_km,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "logistics": {
            "provider": provider.name if provider else None,
            "vehicle_type": booking.vehicle_type if booking else None,
            "status": booking.status if booking else None,
            "estimated_hours": booking.estimated_hours if booking else None,
        } if booking else None,
    }
    if include_payments:
        d["payments"] = [
            {"id": p.id, "amount": p.amount, "method": p.method, "reference": p.reference,
             "status": p.status, "paid_at": p.paid_at.isoformat() if p.paid_at else None}
            for p in t.payments
        ]
    return d


def _visible_tx(user: User, db: Session):
    q = select(Transaction)
    if user.role == "farmer":
        q = q.where(Transaction.farmer_user_id == user.id)
    elif user.role == "buyer":
        buyer = db.scalar(select(Buyer).where(Buyer.user_id == user.id))
        if not buyer:
            return select(Transaction).where(Transaction.id == "")
        q = q.where(Transaction.buyer_id == buyer.id)
    elif user.role == "fpo":
        fpo = db.scalar(select(FPO).where(FPO.user_id == user.id))
        if not fpo:
            return select(Transaction).where(Transaction.id == "")
        q = q.where(Transaction.fpo_id == fpo.id)
    return q


@router.get("")
def list_transactions(status_filter: str | None = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = _visible_tx(user, db).order_by(Transaction.created_at.desc())
    if status_filter:
        q = q.where(Transaction.status == status_filter)
    txs = db.execute(q).scalars().all()
    return [_tx_dict(db, t) for t in txs]


@router.get("/{tx_id}")
def tx_detail(tx_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    t = db.get(Transaction, tx_id)
    if not t:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Transaction not found")
    if user.role != "admin":
        visible = db.scalar(_visible_tx(user, db).where(Transaction.id == tx_id))
        if not visible:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your transaction")
    return _tx_dict(db, t)


@router.put("/{tx_id}/status")
def update_status(tx_id: str, data: StatusIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    t = db.get(Transaction, tx_id)
    if not t:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Transaction not found")
    buyer = db.scalar(select(Buyer).where(Buyer.user_id == user.id))
    allowed = (
        user.role == "admin"
        or t.farmer_user_id == user.id
        or (buyer and t.buyer_id == buyer.id)
    )
    if not allowed:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your transaction")
    if data.status not in TX_STATUSES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            f"Invalid status. Allowed: {', '.join(TX_STATUSES)}")

    # lifecycle sanity: only forward movement
    old_idx = TX_STATUSES.index(t.status)
    new_idx = TX_STATUSES.index(data.status)
    if new_idx < old_idx:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Transaction status can only move forward")

    t.status = data.status
    now = datetime.now(timezone.utc)
    if data.status == "pickup_scheduled":
        t.scheduled_pickup_at = data.scheduled_pickup_at or now
    if data.status == "delivered":
        t.delivered_at = now
    if data.status == "in_transit" and t.scheduled_pickup_at is None:
        t.scheduled_pickup_at = now

    # auto-create payment record when entering payment_pending
    if data.status == "payment_pending":
        existing = db.scalar(select(Payment).where(Payment.transaction_id == t.id))
        if not existing:
            db.add(Payment(transaction_id=t.id, amount=t.total_value, status="pending"))

    # side effects
    label = STATUS_LABELS.get(data.status, data.status)
    notify_user_ids = set()
    if t.farmer_user_id and t.farmer_user_id != user.id:
        notify_user_ids.add(t.farmer_user_id)
    if t.buyer_id:
        buyer_user = db.scalar(select(User.id).join(Buyer, Buyer.user_id == User.id).where(Buyer.id == t.buyer_id))
        if buyer_user and buyer_user != user.id:
            notify_user_ids.add(buyer_user)
    for uid in notify_user_ids:
        db.add(Notification(user_id=uid, type="transaction",
                            title=f"Transaction {t.code}: {label}",
                            ref_type="transaction", ref_id=t.id))
    db.commit()
    return _tx_dict(db, t)


STATUS_LABELS = {
    "listed": "Listed", "matched": "Matched", "offer_sent": "Offer sent",
    "negotiation": "In negotiation", "accepted": "Accepted",
    "pickup_scheduled": "Pickup scheduled", "in_transit": "In transit",
    "delivered": "Delivered", "payment_pending": "Payment pending",
    "payment_completed": "Payment completed", "completed": "Completed",
}


class PaymentConfirmIn(BaseModel):
    method: str = "upi"
    reference: str | None = None


@router.post("/{tx_id}/payment")
def confirm_payment(tx_id: str, data: PaymentConfirmIn, user: User = Depends(require_roles("buyer", "admin")), db: Session = Depends(get_db)):
    t = db.get(Transaction, tx_id)
    if not t:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Transaction not found")
    buyer = db.scalar(select(Buyer).where(Buyer.user_id == user.id))
    if user.role != "admin" and (not buyer or t.buyer_id != buyer.id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the buyer can confirm payment")
    payment = db.scalar(select(Payment).where(Payment.transaction_id == t.id))
    if not payment:
        payment = Payment(transaction_id=t.id, amount=t.total_value, status="pending")
        db.add(payment)
        db.flush()
    payment.status = "completed"
    payment.method = data.method
    payment.reference = data.reference or f"REF{t.code}"
    payment.paid_at = datetime.now(timezone.utc)
    t.status = "payment_completed"

    # update buyer payment stats
    if buyer:
        buyer.total_transactions += 1
        buyer.successful_transactions += 1
        buyer.on_time_payment_pct = round(min(100.0, buyer.on_time_payment_pct * 0.9 + 10.0), 1)
        from app.services.engines.trust import compute_trust_score
        trust = compute_trust_score(
            buyer.verification_status, buyer.total_transactions,
            buyer.successful_transactions, buyer.on_time_payment_pct,
            buyer.farmer_rating, buyer.dispute_count,
            account_age_days=(datetime.now(timezone.utc) - buyer.created_at.replace(tzinfo=timezone.utc)).days,
        )
        buyer.trust_score = trust["trust_score"]

    db.add(Notification(user_id=t.farmer_user_id, type="payment",
                        title=f"Payment received for {t.code}: ₹{t.total_value:,.0f}",
                        ref_type="transaction", ref_id=t.id))
    db.commit()
    return _tx_dict(db, t)


class LogisticsScheduleIn(BaseModel):
    provider_id: str | None = None
    vehicle_type: str = "truck"


@router.post("/{tx_id}/logistics")
def schedule_logistics(tx_id: str, data: LogisticsScheduleIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    t = db.get(Transaction, tx_id)
    if not t:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Transaction not found")
    buyer = db.scalar(select(Buyer).where(Buyer.user_id == user.id))
    if not (user.role == "admin" or t.farmer_user_id == user.id or (buyer and t.buyer_id == buyer.id)):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your transaction")
    booking = db.scalar(select(LogisticsBooking).where(LogisticsBooking.transaction_id == t.id))
    if not booking:
        booking = LogisticsBooking(transaction_id=t.id, distance_km=t.distance_km or 0)
        db.add(booking)
    booking.provider_id = data.provider_id
    booking.vehicle_type = data.vehicle_type
    booking.cost_per_qtl = t.logistics_cost_per_qtl
    booking.status = "confirmed"
    if t.distance_km:
        booking.estimated_hours = round(t.distance_km / 35 + 2, 1)
    if t.status in ("accepted", "pickup_scheduled"):
        t.status = "pickup_scheduled"
        t.scheduled_pickup_at = t.scheduled_pickup_at or datetime.now(timezone.utc)
    db.commit()
    return {"ok": True, "booking": {"provider_id": booking.provider_id, "vehicle_type": booking.vehicle_type,
                                    "status": booking.status, "estimated_hours": booking.estimated_hours}}

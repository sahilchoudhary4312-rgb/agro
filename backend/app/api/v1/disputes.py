from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.models import (
    Buyer, Dispute, Notification, Rating, Transaction, User,
    DISPUTE_IN_REVIEW, DISPUTE_OPEN, DISPUTE_REJECTED, DISPUTE_RESOLVED,
)
from app.schemas import DisputeIn, DisputeResolveIn, RatingIn
from datetime import datetime, timezone

router = APIRouter(tags=["disputes", "ratings"])


@router.post("/disputes", status_code=201)
def create_dispute(data: DisputeIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tx = db.get(Transaction, data.transaction_id)
    if not tx:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Transaction not found")
    buyer = db.scalar(select(Buyer).where(Buyer.user_id == user.id))
    involved = (tx.farmer_user_id == user.id or (buyer and tx.buyer_id == buyer.id) or user.role == "admin")
    if not involved:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your transaction")
    dispute = Dispute(
        transaction_id=tx.id, raised_by_user_id=user.id,
        category=data.category, description=data.description, status=DISPUTE_OPEN,
    )
    if buyer and tx.buyer_id == buyer.id:
        buyer.dispute_count += 1
    db.add(dispute)
    # notify admins
    admins = db.execute(select(User).where(User.role == "admin")).scalars().all()
    for admin in admins:
        db.add(Notification(user_id=admin.id, type="dispute",
                            title=f"New {data.category.replace('_', ' ')} dispute on {tx.code}",
                            ref_type="dispute", ref_id=dispute.id))
    db.commit()
    return {"id": dispute.id, "status": dispute.status}


@router.get("/disputes")
def list_disputes(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role == "admin":
        rows = db.execute(select(Dispute).order_by(Dispute.created_at.desc())).scalars().all()
    else:
        rows = db.execute(
            select(Dispute).where(Dispute.raised_by_user_id == user.id)
            .order_by(Dispute.created_at.desc())
        ).scalars().all()
    out = []
    for d in rows:
        tx = db.get(Transaction, d.transaction_id) if d.transaction_id else None
        raiser = db.get(User, d.raised_by_user_id)
        out.append({
            "id": d.id, "transaction_id": d.transaction_id,
            "transaction_code": tx.code if tx else None,
            "category": d.category, "description": d.description,
            "status": d.status, "resolution": d.resolution,
            "raised_by": raiser.full_name if raiser else None,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        })
    return out


@router.put("/disputes/{dispute_id}")
def resolve_dispute(dispute_id: str, data: DisputeResolveIn, user: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    d = db.get(Dispute, dispute_id)
    if not d:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Dispute not found")
    d.status = data.status
    d.resolution = data.resolution
    db.add(Notification(user_id=d.raised_by_user_id, type="dispute",
                        title=f"Your dispute was {data.status.replace('_', ' ')}",
                        ref_type="dispute", ref_id=d.id))
    db.commit()
    return {"id": d.id, "status": d.status}


@router.post("/ratings", status_code=201)
def create_rating(data: RatingIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tx = db.get(Transaction, data.transaction_id)
    if not tx:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Transaction not found")
    buyer = db.scalar(select(Buyer).where(Buyer.user_id == user.id))
    involved = (tx.farmer_user_id == user.id or (buyer and tx.buyer_id == buyer.id))
    if not involved:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only transaction participants can rate")

    rating = Rating(transaction_id=tx.id, rater_user_id=user.id, stars=data.stars, comment=data.comment)
    if data.ratee == "buyer":
        if not tx.buyer_id:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "No buyer on this transaction")
        rating.ratee_buyer_id = tx.buyer_id
        buyer_obj = db.get(Buyer, tx.buyer_id)
        # running average
        prev_count = buyer_obj.total_transactions or 1
        buyer_obj.farmer_rating = round(
            ((buyer_obj.farmer_rating or 0) * (prev_count - 1) + data.stars) / prev_count, 2
        ) if prev_count > 0 else float(data.stars)
    else:
        rating.ratee_farmer_user_id = tx.farmer_user_id
    db.add(rating)
    db.commit()
    return {"ok": True, "id": rating.id}


@router.get("/ratings/buyer/{buyer_id}")
def buyer_ratings(buyer_id: str, db: Session = Depends(get_db)):
    rows = db.execute(
        select(Rating).where(Rating.ratee_buyer_id == buyer_id).order_by(Rating.created_at.desc()).limit(20)
    ).scalars().all()
    out = []
    for r in rows:
        rater = db.get(User, r.rater_user_id)
        out.append({
            "id": r.id, "stars": r.stars, "comment": r.comment,
            "by": rater.full_name if rater else None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })
    return out

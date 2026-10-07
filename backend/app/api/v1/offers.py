import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models import (
    Buyer, BuyerOffer, BuyerRequirement, Crop, Farmer, Match, Notification,
    OfferMessage, ProduceListing, Transaction, User,
    LISTING_AVAILABLE, LISTING_MATCHED, LISTING_SOLD,
    OFFER_ACCEPTED, OFFER_NEGOTIATING, OFFER_REJECTED, OFFER_SENT, OFFER_WITHDRAWN,
    REQ_OPEN, REQ_FULFILLED,
)
from app.schemas import OfferActionIn, OfferIn
from app.services.engines.logistics import estimate_logistics
from app.services.engines.net_realization import compute_net_realization
from app.services.geo import road_distance_km

router = APIRouter(prefix="/offers", tags=["offers"])


def notify(db: Session, user_id: str, ntype: str, title: str, body: str | None = None,
           ref_type: str | None = None, ref_id: str | None = None):
    db.add(Notification(user_id=user_id, type=ntype, title=title, body=body,
                        ref_type=ref_type, ref_id=ref_id))


def _offer_dict(db: Session, o: BuyerOffer) -> dict:
    listing = db.get(ProduceListing, o.listing_id)
    buyer = db.get(Buyer, o.buyer_id)
    crop = db.get(Crop, listing.crop_id) if listing else None
    owner = db.get(User, o.farmer_user_id)
    msgs = db.execute(
        select(OfferMessage).where(OfferMessage.offer_id == o.id).order_by(OfferMessage.created_at)
    ).scalars().all()
    distance = None
    if listing and buyer:
        distance = road_distance_km(listing.latitude, listing.longitude, buyer.latitude, buyer.longitude)
    return {
        "id": o.id,
        "requirement_id": o.requirement_id,
        "listing_id": o.listing_id,
        "buyer_id": o.buyer_id,
        "buyer_name": buyer.business_name if buyer else None,
        "buyer_trust": buyer.trust_score if buyer else None,
        "farmer_user_id": o.farmer_user_id,
        "farmer_name": owner.full_name if owner else None,
        "crop_name": crop.name if crop else None,
        "crop_icon": crop.icon if crop else None,
        "quantity_qtl": o.quantity_qtl,
        "price_per_qtl": o.price_per_qtl,
        "message": o.message,
        "status": o.status,
        "distance_km": distance,
        "created_at": o.created_at.isoformat() if o.created_at else None,
        "messages": [
            {
                "id": m.id,
                "sender_user_id": m.sender_user_id,
                "message": m.message,
                "counter_price": m.counter_price,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            } for m in msgs
        ],
    }


@router.post("", status_code=201)
def create_offer(data: OfferIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Both directions:
    - farmer sends an offer against an open buyer requirement
    - buyer sends an offer against an available farmer listing
    The `user` role decides direction.
    """
    listing = db.get(ProduceListing, data.listing_id)
    if not listing or listing.status != LISTING_AVAILABLE:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Listing not found or not available")
    if data.quantity_qtl > listing.quantity_qtl:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            f"Requested quantity exceeds available {listing.quantity_qtl} qtl")

    if user.role == "farmer":
        farmer = db.scalar(select(Farmer).where(Farmer.user_id == user.id))
        if not farmer:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Farmer profile required")
        buyer = None
        # find requirement from listing? For simplicity, farmer offer needs a requirement context
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            "Farmers should use POST /offers/to-requirement to respond to a buyer requirement")

    elif user.role == "buyer":
        buyer = db.scalar(select(Buyer).where(Buyer.user_id == user.id))
        if not buyer:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Buyer profile required")
        offer = BuyerOffer(
            listing_id=listing.id,
            buyer_id=buyer.id,
            farmer_user_id=listing.owner_user_id,
            price_per_qtl=data.price_per_qtl,
            quantity_qtl=data.quantity_qtl,
            message=data.message,
            status=OFFER_SENT,
        )
        db.add(offer)
        db.flush()
        if data.message:
            db.add(OfferMessage(offer_id=offer.id, sender_user_id=user.id, message=data.message))
        notify(db, listing.owner_user_id, "offer_received",
               f"New offer: {crop.name if (crop := db.get(Crop, listing.crop_id)) else 'produce'} at ₹{data.price_per_qtl:,.0f}/qtl",
               ref_type="offer", ref_id=offer.id)
        db.commit()
        db.refresh(offer)
        return _offer_dict(db, offer)
    else:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Unsupported role for offers")


@router.post("/to-requirement", status_code=201)
def offer_to_requirement(
    requirement_id: str,
    data: OfferIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Farmer responds to a buyer requirement with their listing."""
    if user.role != "farmer":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only farmers can respond to requirements")
    req = db.get(BuyerRequirement, requirement_id)
    if not req or req.status != REQ_OPEN:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Requirement not found or closed")
    listing = db.get(ProduceListing, data.listing_id)
    if not listing or listing.owner_user_id != user.id or listing.status != LISTING_AVAILABLE:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Your available listing is required")
    if data.quantity_qtl > listing.quantity_qtl:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Quantity exceeds your available stock")
    if data.quantity_qtl > req.quantity_max_qtl:
        data.quantity_qtl = req.quantity_max_qtl  # cap at what buyer needs

    offer = BuyerOffer(
        requirement_id=req.id,
        listing_id=listing.id,
        buyer_id=req.buyer_id,
        farmer_user_id=user.id,
        price_per_qtl=data.price_per_qtl,
        quantity_qtl=data.quantity_qtl,
        message=data.message,
        status=OFFER_SENT,
    )
    db.add(offer)
    db.flush()
    if data.message:
        db.add(OfferMessage(offer_id=offer.id, sender_user_id=user.id, message=data.message))
    buyer_user = db.scalar(select(User).join(Buyer, Buyer.user_id == User.id).where(Buyer.id == req.buyer_id))
    if buyer_user:
        crop = db.get(Crop, listing.crop_id)
        notify(db, buyer_user.id, "offer_received",
               f"Farmer offer: {crop.name} {data.quantity_qtl} qtl at ₹{data.price_per_qtl:,.0f}/qtl",
               ref_type="offer", ref_id=offer.id)
    db.commit()
    db.refresh(offer)
    return _offer_dict(db, offer)


@router.get("")
def list_offers(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Offers visible to the current user (sent or received)."""
    q = select(BuyerOffer)
    if user.role == "farmer":
        q = q.where(BuyerOffer.farmer_user_id == user.id)
    elif user.role == "buyer":
        buyer = db.scalar(select(Buyer).where(Buyer.user_id == user.id))
        if not buyer:
            return []
        q = q.where(BuyerOffer.buyer_id == buyer.id)
    else:
        return []
    offers = db.execute(q.order_by(BuyerOffer.created_at.desc())).scalars().all()
    return [_offer_dict(db, o) for o in offers]


@router.get("/{offer_id}")
def offer_detail(offer_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    offer = db.get(BuyerOffer, offer_id)
    if not offer:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Offer not found")
    buyer = db.scalar(select(Buyer).where(Buyer.user_id == user.id))
    allowed = (offer.farmer_user_id == user.id) or (buyer and offer.buyer_id == buyer.id) or user.role == "admin"
    if not allowed:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your offer")
    return _offer_dict(db, offer)


@router.post("/{offer_id}/action")
def offer_action(offer_id: str, data: OfferActionIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    offer = db.get(BuyerOffer, offer_id)
    if not offer:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Offer not found")
    buyer = db.scalar(select(Buyer).where(Buyer.user_id == user.id))
    is_farmer_side = offer.farmer_user_id == user.id
    is_buyer_side = buyer and offer.buyer_id == buyer.id
    if not (is_farmer_side or is_buyer_side or user.role == "admin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your offer")

    if data.action == "withdraw":
        if not (is_buyer_side or (user.role == "farmer" and is_farmer_side)):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the sender can withdraw")
        if offer.status not in (OFFER_SENT, OFFER_NEGOTIATING):
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Offer can no longer be withdrawn")
        offer.status = OFFER_WITHDRAWN
        notify(db, offer.farmer_user_id if is_buyer_side else _buyer_user(db, offer), "offer_update",
               "An offer was withdrawn", ref_type="offer", ref_id=offer.id)
        db.commit()
        return _offer_dict(db, offer)

    if data.action == "reject":
        other = offer.farmer_user_id if is_buyer_side else (_buyer_user(db, offer) or "")
        offer.status = OFFER_REJECTED
        if data.message:
            db.add(OfferMessage(offer_id=offer.id, sender_user_id=user.id, message=data.message))
        notify(db, other, "offer_update", "An offer was rejected", ref_type="offer", ref_id=offer.id)
        db.commit()
        return _offer_dict(db, offer)

    if data.action == "counter":
        if not data.counter_price:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "counter_price is required")
        if offer.status not in (OFFER_SENT, OFFER_NEGOTIATING):
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Offer is not open for negotiation")
        offer.status = OFFER_NEGOTIATING
        db.add(OfferMessage(offer_id=offer.id, sender_user_id=user.id,
                            message=data.message, counter_price=data.counter_price))
        other = offer.farmer_user_id if is_buyer_side else (_buyer_user(db, offer) or "")
        notify(db, other, "offer_update", f"Counter offer: ₹{data.counter_price:,.0f}/qtl",
               ref_type="offer", ref_id=offer.id)
        db.commit()
        return _offer_dict(db, offer)

    if data.action == "accept":
        if offer.status not in (OFFER_SENT, OFFER_NEGOTIATING):
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Offer is not acceptable in current state")
        # negotiation: the last quoted counter price is the agreed price
        last_counter = db.scalar(
            select(OfferMessage.counter_price)
            .where(OfferMessage.offer_id == offer.id, OfferMessage.counter_price.is_not(None))
            .order_by(OfferMessage.created_at.desc())
            .limit(1)
        )
        if last_counter:
            offer.price_per_qtl = last_counter
        # create transaction
        listing = db.get(ProduceListing, offer.listing_id)
        buyer = db.get(Buyer, offer.buyer_id)
        crop = db.get(Crop, listing.crop_id)
        distance = road_distance_km(listing.latitude, listing.longitude,
                                    buyer.latitude, buyer.longitude)
        logi = estimate_logistics(distance, offer.quantity_qtl)
        net = compute_net_realization(offer.price_per_qtl, logi["total_per_qtl"] or 0)
        tx = Transaction(
            code=f"TX-{uuid.uuid4().hex[:8].upper()}",
            listing_id=listing.id,
            offer_id=offer.id,
            farmer_user_id=offer.farmer_user_id,
            buyer_id=offer.buyer_id,
            crop_id=crop.id,
            quantity_qtl=offer.quantity_qtl,
            quality_grade=listing.quality_grade,
            agreed_price=offer.price_per_qtl,
            logistics_cost_per_qtl=logi["total_per_qtl"] or 0,
            handling_cost_per_qtl=0,
            net_realization_per_qtl=net["net_realization_per_qtl"],
            total_value=round(offer.price_per_qtl * offer.quantity_qtl, 2),
            net_total=round(net["net_realization_per_qtl"] * offer.quantity_qtl, 2),
            status="accepted",
            distance_km=distance,
        )
        db.add(tx)
        offer.status = OFFER_ACCEPTED
        listing.quantity_qtl = round(max(listing.quantity_qtl - offer.quantity_qtl, 0), 2)
        if listing.quantity_qtl <= 0.01:
            listing.status = LISTING_SOLD
        else:
            listing.status = LISTING_AVAILABLE
        if offer.requirement_id:
            req = db.get(BuyerRequirement, offer.requirement_id)
            if req:
                # naive fulfilment tracking
                if listing.quantity_qtl <= 0.01:
                    req.status = REQ_FULFILLED
        buyer_user_id = _buyer_user(db, offer)
        notify(db, offer.farmer_user_id, "offer_accepted",
               f"Offer accepted! Transaction {tx.code} created", ref_type="transaction", ref_id=tx.id)
        if buyer_user_id:
            notify(db, buyer_user_id, "offer_accepted",
                   f"Your offer was accepted. Transaction {tx.code} created", ref_type="transaction", ref_id=tx.id)
        db.commit()
        db.refresh(tx)
        return {"offer": _offer_dict(db, offer), "transaction_id": tx.id, "code": tx.code}
    raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Unknown action")


def _buyer_user(db: Session, offer: BuyerOffer) -> str | None:
    row = db.execute(
        select(User.id).join(Buyer, Buyer.user_id == User.id).where(Buyer.id == offer.buyer_id)
    ).scalar()
    return row


@router.post("/{offer_id}/messages")
def add_message(offer_id: str, message: dict, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    offer = db.get(BuyerOffer, offer_id)
    if not offer:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Offer not found")
    buyer = db.scalar(select(Buyer).where(Buyer.user_id == user.id))
    if not (offer.farmer_user_id == user.id or (buyer and offer.buyer_id == buyer.id) or user.role == "admin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your offer")
    msg = OfferMessage(
        offer_id=offer.id,
        sender_user_id=user.id,
        message=(message.get("message") or "").strip()[:2000] or None,
        counter_price=message.get("counter_price"),
    )
    db.add(msg)
    other = offer.farmer_user_id if buyer and offer.buyer_id == buyer.id else _buyer_user(db, offer)
    if other:
        notify(db, other, "message", "New message on your offer", ref_type="offer", ref_id=offer.id)
    db.commit()
    return {"ok": True}

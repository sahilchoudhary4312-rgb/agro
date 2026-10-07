from datetime import datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.catalog import Crop
from app.models.mixins import IdMixin, TimestampMixin, utcnow
from app.database.session import Base

# Listing status
LISTING_AVAILABLE = "available"
LISTING_MATCHED = "matched"
LISTING_SOLD = "sold"
LISTING_WITHDRAWN = "withdrawn"

# Offer status
OFFER_SENT = "sent"
OFFER_NEGOTIATING = "negotiating"
OFFER_ACCEPTED = "accepted"
OFFER_REJECTED = "rejected"
OFFER_WITHDRAWN = "withdrawn"

# Requirement status
REQ_OPEN = "open"
REQ_FULFILLED = "fulfilled"
REQ_CLOSED = "closed"


class ProduceListing(Base, IdMixin, TimestampMixin):
    __tablename__ = "produce_listings"

    owner_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    farmer_id: Mapped[str | None] = mapped_column(ForeignKey("farmers.id"), index=True)
    fpo_id: Mapped[str | None] = mapped_column(ForeignKey("fpos.id"), index=True)
    crop_id: Mapped[str] = mapped_column(ForeignKey("crops.id"), index=True)
    title: Mapped[str | None] = mapped_column(String(200))
    quantity_qtl: Mapped[float] = mapped_column(Float)
    quality_grade: Mapped[str] = mapped_column(String(20), default="A")  # A|B|C
    moisture_pct: Mapped[float | None] = mapped_column(Float)
    price_expectation: Mapped[float | None] = mapped_column(Float)
    village: Mapped[str | None] = mapped_column(String(120))
    district: Mapped[str | None] = mapped_column(String(120), index=True)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    images: Mapped[str | None] = mapped_column(Text)  # comma-separated paths
    harvest_date: Mapped[datetime | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), default=LISTING_AVAILABLE, index=True)

    crop: Mapped[Crop] = relationship(back_populates="listings")
    owner: Mapped["User"] = relationship()  # noqa: F821
    farmer: Mapped["Farmer | None"] = relationship()  # noqa: F821


class BuyerRequirement(Base, IdMixin, TimestampMixin):
    __tablename__ = "buyer_requirements"

    buyer_id: Mapped[str] = mapped_column(ForeignKey("buyers.id"), index=True)
    crop_id: Mapped[str] = mapped_column(ForeignKey("crops.id"), index=True)
    quantity_min_qtl: Mapped[float] = mapped_column(Float, default=0)
    quantity_max_qtl: Mapped[float] = mapped_column(Float)
    quality_grade: Mapped[str] = mapped_column(String(20), default="A")
    max_moisture_pct: Mapped[float | None] = mapped_column(Float)
    price_per_qtl: Mapped[float] = mapped_column(Float)  # offered price
    price_negotiable: Mapped[bool] = mapped_column(default=True, server_default="1")
    pickup_preference: Mapped[str] = mapped_column(String(40), default="farm_gate")  # farm_gate|mandi|collection_center
    payment_terms: Mapped[str | None] = mapped_column(String(120))  # within_2_days|advance_50|on_delivery
    delivery_radius_km: Mapped[float] = mapped_column(Float, default=100)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    notes: Mapped[str | None] = mapped_column(Text)
    valid_until: Mapped[datetime | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), default=REQ_OPEN, index=True)

    buyer: Mapped["Buyer"] = relationship()  # noqa: F821
    crop: Mapped[Crop] = relationship()


class BuyerOffer(Base, IdMixin, TimestampMixin):
    __tablename__ = "buyer_offers"

    requirement_id: Mapped[str | None] = mapped_column(ForeignKey("buyer_requirements.id"), index=True)
    listing_id: Mapped[str] = mapped_column(ForeignKey("produce_listings.id"), index=True)
    buyer_id: Mapped[str] = mapped_column(ForeignKey("buyers.id"), index=True)
    farmer_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    price_per_qtl: Mapped[float] = mapped_column(Float)
    quantity_qtl: Mapped[float] = mapped_column(Float)
    message: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default=OFFER_SENT, index=True)

    listing: Mapped[ProduceListing] = relationship()
    buyer: Mapped["Buyer"] = relationship()  # noqa: F821


class OfferMessage(Base, IdMixin, TimestampMixin):
    __tablename__ = "offer_messages"

    offer_id: Mapped[str] = mapped_column(ForeignKey("buyer_offers.id"), index=True)
    sender_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    message: Mapped[str | None] = mapped_column(Text)
    counter_price: Mapped[float | None] = mapped_column(Float)


class Match(Base, IdMixin, TimestampMixin):
    __tablename__ = "matches"

    listing_id: Mapped[str | None] = mapped_column(ForeignKey("produce_listings.id"), index=True)
    requirement_id: Mapped[str | None] = mapped_column(ForeignKey("buyer_requirements.id"), index=True)
    farmer_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), index=True)
    buyer_id: Mapped[str] = mapped_column(ForeignKey("buyers.id"), index=True)
    crop_id: Mapped[str] = mapped_column(ForeignKey("crops.id"), index=True)
    price_match: Mapped[float] = mapped_column(Float, default=0)
    quality_match: Mapped[float] = mapped_column(Float, default=0)
    quantity_match: Mapped[float] = mapped_column(Float, default=0)
    distance_match: Mapped[float] = mapped_column(Float, default=0)
    payment_trust: Mapped[float] = mapped_column(Float, default=0)
    overall_score: Mapped[float] = mapped_column(Float, default=0, index=True)
    distance_km: Mapped[float | None] = mapped_column(Float)

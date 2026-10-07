from datetime import datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.mixins import IdMixin, TimestampMixin
from app.database.session import Base

# Transaction lifecycle statuses (ordered)
TX_STATUSES = [
    "listed", "matched", "offer_sent", "negotiation", "accepted",
    "pickup_scheduled", "in_transit", "delivered", "payment_pending",
    "payment_completed", "completed",
]

DISPUTE_OPEN = "open"
DISPUTE_IN_REVIEW = "in_review"
DISPUTE_RESOLVED = "resolved"
DISPUTE_REJECTED = "rejected"


class Transaction(Base, IdMixin, TimestampMixin):
    __tablename__ = "transactions"

    code: Mapped[str] = mapped_column(String(24), unique=True, index=True)
    listing_id: Mapped[str | None] = mapped_column(ForeignKey("produce_listings.id"), index=True)
    offer_id: Mapped[str | None] = mapped_column(ForeignKey("buyer_offers.id"), index=True)
    farmer_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    buyer_id: Mapped[str | None] = mapped_column(ForeignKey("buyers.id"), index=True)
    fpo_id: Mapped[str | None] = mapped_column(ForeignKey("fpos.id"), index=True)
    crop_id: Mapped[str] = mapped_column(ForeignKey("crops.id"), index=True)
    quantity_qtl: Mapped[float] = mapped_column(Float)
    quality_grade: Mapped[str] = mapped_column(String(20), default="A")
    agreed_price: Mapped[float] = mapped_column(Float)  # ₹/qtl
    logistics_cost_per_qtl: Mapped[float] = mapped_column(Float, default=0)
    handling_cost_per_qtl: Mapped[float] = mapped_column(Float, default=0)
    net_realization_per_qtl: Mapped[float] = mapped_column(Float, default=0)
    total_value: Mapped[float] = mapped_column(Float, default=0)
    net_total: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(24), default="matched", index=True)
    scheduled_pickup_at: Mapped[datetime | None] = mapped_column(DateTime)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime)
    payment_due_date: Mapped[datetime | None] = mapped_column(Date)
    distance_km: Mapped[float | None] = mapped_column(Float)

    crop: Mapped["Crop"] = relationship()  # noqa: F821
    buyer: Mapped["Buyer | None"] = relationship()  # noqa: F821
    payments: Mapped[list["Payment"]] = relationship(back_populates="transaction")


class Payment(Base, IdMixin, TimestampMixin):
    __tablename__ = "payments"

    transaction_id: Mapped[str] = mapped_column(ForeignKey("transactions.id"), index=True)
    amount: Mapped[float] = mapped_column(Float)
    method: Mapped[str | None] = mapped_column(String(40))  # upi|neft|rtgs|cash
    reference: Mapped[str | None] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(24), default="pending", index=True)  # pending|completed|failed
    paid_at: Mapped[datetime | None] = mapped_column(DateTime)

    transaction: Mapped[Transaction] = relationship(back_populates="payments")


class LogisticsBooking(Base, IdMixin, TimestampMixin):
    __tablename__ = "logistics_bookings"

    transaction_id: Mapped[str | None] = mapped_column(ForeignKey("transactions.id"), index=True)
    provider_id: Mapped[str | None] = mapped_column(ForeignKey("logistics_providers.id"))
    vehicle_type: Mapped[str | None] = mapped_column(String(60))
    distance_km: Mapped[float] = mapped_column(Float, default=0)
    cost_per_qtl: Mapped[float] = mapped_column(Float, default=0)
    estimated_hours: Mapped[float | None] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(24), default="requested", index=True)  # requested|confirmed|in_transit|delivered


class Notification(Base, IdMixin, TimestampMixin):
    __tablename__ = "notifications"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    type: Mapped[str] = mapped_column(String(40), index=True)  # offer_received|price_alert|match|payment|system
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[str | None] = mapped_column(Text)
    ref_type: Mapped[str | None] = mapped_column(String(40))
    ref_id: Mapped[str | None] = mapped_column(String(36))
    is_read: Mapped[bool] = mapped_column(default=False, index=True, server_default="0")


class Rating(Base, IdMixin, TimestampMixin):
    __tablename__ = "ratings"

    transaction_id: Mapped[str | None] = mapped_column(ForeignKey("transactions.id"), index=True)
    rater_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    ratee_buyer_id: Mapped[str | None] = mapped_column(ForeignKey("buyers.id"), index=True)
    ratee_farmer_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), index=True)
    stars: Mapped[int] = mapped_column(Integer)  # 1..5
    comment: Mapped[str | None] = mapped_column(Text)


class Dispute(Base, IdMixin, TimestampMixin):
    __tablename__ = "disputes"

    transaction_id: Mapped[str | None] = mapped_column(ForeignKey("transactions.id"), index=True)
    raised_by_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    category: Mapped[str] = mapped_column(String(60))  # payment|quantity|quality|buyer_issue|pickup|other
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(24), default="open", index=True)
    resolution: Mapped[str | None] = mapped_column(Text)


class PriceForecast(Base, IdMixin, TimestampMixin):
    __tablename__ = "price_forecasts"

    crop_id: Mapped[str] = mapped_column(ForeignKey("crops.id"), index=True)
    market_id: Mapped[str | None] = mapped_column(ForeignKey("markets.id"), index=True)
    horizon_days: Mapped[int] = mapped_column(Integer)  # 3|7|15|30
    generated_at: Mapped[datetime | None] = mapped_column(DateTime)
    model: Mapped[str] = mapped_column(String(60), default="baseline_linear")
    predicted_price: Mapped[float] = mapped_column(Float)
    trend: Mapped[str] = mapped_column(String(20), default="stable")  # upward|stable|downward
    confidence: Mapped[float | None] = mapped_column(Float)


class AuditLog(Base, IdMixin, TimestampMixin):
    __tablename__ = "audit_logs"

    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), index=True)
    action: Mapped[str] = mapped_column(String(120), index=True)
    entity: Mapped[str | None] = mapped_column(String(60))
    entity_id: Mapped[str | None] = mapped_column(String(36))
    detail: Mapped[str | None] = mapped_column(Text)
    ip: Mapped[str | None] = mapped_column(String(60))


class SystemSetting(Base, IdMixin):
    __tablename__ = "system_settings"

    key: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    value: Mapped[str | None] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(String(255))

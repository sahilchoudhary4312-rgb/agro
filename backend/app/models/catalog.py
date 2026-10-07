from datetime import date

from sqlalchemy import Float, ForeignKey, Integer, String, Text, UniqueConstraint, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.mixins import IdMixin, TimestampMixin
from app.database.session import Base


class Crop(Base, IdMixin, TimestampMixin):
    __tablename__ = "crops"

    name: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    name_hi: Mapped[str | None] = mapped_column(String(80))
    name_mr: Mapped[str | None] = mapped_column(String(80))
    category: Mapped[str | None] = mapped_column(String(50))  # cereal|oilseed|vegetable|pulse|cash
    icon: Mapped[str | None] = mapped_column(String(10))
    unit: Mapped[str] = mapped_column(String(20), default="quintal")
    base_price: Mapped[float | None] = mapped_column(Float)  # typical ₹/quintal for demo
    suitable_storage_days: Mapped[int | None] = mapped_column(Integer, default=90)

    listings: Mapped[list["ProduceListing"]] = relationship(back_populates="crop")


class Market(Base, IdMixin, TimestampMixin):
    __tablename__ = "markets"

    name: Mapped[str] = mapped_column(String(160), index=True)
    market_type: Mapped[str] = mapped_column(String(40), default="mandi")  # mandi|terminal|collection_center
    district: Mapped[str] = mapped_column(String(120), index=True)
    address: Mapped[str | None] = mapped_column(String(255))
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    contact: Mapped[str | None] = mapped_column(String(120))


class MarketPrice(Base, IdMixin, TimestampMixin):
    __tablename__ = "market_prices"
    __table_args__ = (UniqueConstraint("market_id", "crop_id", "price_date", name="uq_market_crop_date"),)

    market_id: Mapped[str] = mapped_column(ForeignKey("markets.id"), index=True)
    crop_id: Mapped[str] = mapped_column(ForeignKey("crops.id"), index=True)
    price_date: Mapped[date] = mapped_column(Date, index=True)
    min_price: Mapped[float] = mapped_column(Float)
    max_price: Mapped[float] = mapped_column(Float)
    modal_price: Mapped[float] = mapped_column(Float, index=True)
    source: Mapped[str] = mapped_column(String(40), default="demo")

    market: Mapped[Market] = relationship()
    crop: Mapped[Crop] = relationship()


class StorageFacility(Base, IdMixin, TimestampMixin):
    __tablename__ = "storage_facilities"

    name: Mapped[str] = mapped_column(String(200))
    facility_type: Mapped[str] = mapped_column(String(60), default="warehouse")  # warehouse|cold_storage|godown
    village: Mapped[str | None] = mapped_column(String(120))
    district: Mapped[str] = mapped_column(String(120), index=True)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    capacity_qtl: Mapped[float] = mapped_column(Float, default=1000)
    available_qtl: Mapped[float] = mapped_column(Float, default=500)
    cost_per_qtl_month: Mapped[float] = mapped_column(Float, default=25)
    suitable_crops: Mapped[str | None] = mapped_column(Text)  # comma separated names
    contact: Mapped[str | None] = mapped_column(String(120))


class LogisticsProvider(Base, IdMixin, TimestampMixin):
    __tablename__ = "logistics_providers"

    name: Mapped[str] = mapped_column(String(200))
    vehicle_types: Mapped[str | None] = mapped_column(String(200))  # comma separated
    contact: Mapped[str | None] = mapped_column(String(120))
    district: Mapped[str | None] = mapped_column(String(120), index=True)
    base_cost_per_km: Mapped[float] = mapped_column(Float, default=25)
    cost_per_qtl_km: Mapped[float] = mapped_column(Float, default=0.9)
    rating: Mapped[float] = mapped_column(Float, default=4.0)

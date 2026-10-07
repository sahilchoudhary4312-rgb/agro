from sqlalchemy import Boolean, ForeignKey, Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.mixins import IdMixin, TimestampMixin
from app.database.session import Base


class User(Base, IdMixin, TimestampMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(20), index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), index=True)  # farmer|buyer|fpo|admin
    preferred_language: Mapped[str] = mapped_column(String(10), default="en")  # en|hi|mr
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    farmer: Mapped["Farmer | None"] = relationship(back_populates="user", uselist=False)
    buyer: Mapped["Buyer | None"] = relationship(back_populates="user", uselist=False)
    fpo: Mapped["FPO | None"] = relationship(back_populates="user", uselist=False)


class Farmer(Base, IdMixin, TimestampMixin):
    __tablename__ = "farmers"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True)
    village: Mapped[str | None] = mapped_column(String(120))
    district: Mapped[str | None] = mapped_column(String(120), index=True)
    state: Mapped[str | None] = mapped_column(String(120), default="Maharashtra")
    pincode: Mapped[str | None] = mapped_column(String(10))
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    land_size_acres: Mapped[float | None] = mapped_column(Float)
    irrigation: Mapped[str | None] = mapped_column(String(50))
    bank_upi: Mapped[str | None] = mapped_column(String(120))

    user: Mapped[User] = relationship(back_populates="farmer")


class Buyer(Base, IdMixin, TimestampMixin):
    __tablename__ = "buyers"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True)
    business_name: Mapped[str] = mapped_column(String(255))
    business_type: Mapped[str | None] = mapped_column(String(80))  # processor|trader|exporter|retail_chain|mill
    gstin: Mapped[str | None] = mapped_column(String(20))
    license_no: Mapped[str | None] = mapped_column(String(50))
    verification_status: Mapped[str] = mapped_column(String(20), default="pending")  # pending|verified|rejected
    city: Mapped[str | None] = mapped_column(String(120))
    district: Mapped[str | None] = mapped_column(String(120), index=True)
    state: Mapped[str | None] = mapped_column(String(120), default="Maharashtra")
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    about: Mapped[str | None] = mapped_column(Text)

    # Aggregated trust metrics (recomputed from ratings/transactions)
    trust_score: Mapped[float] = mapped_column(Float, default=70.0)
    total_transactions: Mapped[int] = mapped_column(default=0)
    successful_transactions: Mapped[int] = mapped_column(default=0)
    on_time_payment_pct: Mapped[float] = mapped_column(Float, default=0.0)
    farmer_rating: Mapped[float] = mapped_column(Float, default=0.0)
    dispute_count: Mapped[int] = mapped_column(default=0)

    user: Mapped[User] = relationship(back_populates="buyer")


class FPO(Base, IdMixin, TimestampMixin):
    __tablename__ = "fpos"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True)
    name: Mapped[str] = mapped_column(String(255))
    registration_no: Mapped[str | None] = mapped_column(String(50))
    verification_status: Mapped[str] = mapped_column(String(20), default="verified")
    village: Mapped[str | None] = mapped_column(String(120))
    district: Mapped[str | None] = mapped_column(String(120), index=True)
    state: Mapped[str | None] = mapped_column(String(120), default="Maharashtra")
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    member_count: Mapped[int] = mapped_column(default=0)
    about: Mapped[str | None] = mapped_column(Text)
    trust_score: Mapped[float] = mapped_column(Float, default=80.0)

    user: Mapped[User] = relationship(back_populates="fpo")


class FarmerFPO(Base, IdMixin):
    __tablename__ = "farmer_fpo"

    fpo_id: Mapped[str] = mapped_column(ForeignKey("fpos.id"), index=True)
    farmer_id: Mapped[str] = mapped_column(ForeignKey("farmers.id"), index=True)

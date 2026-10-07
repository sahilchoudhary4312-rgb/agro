from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

Role = Literal["farmer", "buyer", "fpo", "admin"]
QualityGrade = Literal["A", "B", "C"]


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    full_name: str = Field(min_length=2, max_length=120)
    role: Role = "farmer"
    phone: str | None = Field(default=None, max_length=20)
    preferred_language: Literal["en", "hi", "mr"] = "en"
    # farmer-specific
    village: str | None = None
    district: str | None = None
    pincode: str | None = None
    land_size_acres: float | None = None
    # buyer-specific
    business_name: str | None = None
    business_type: str | None = None
    # fpo-specific
    fpo_name: str | None = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    full_name: str
    id: str


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    phone: str | None
    preferred_language: str
    is_active: bool

    class Config:
        from_attributes = True


class FarmerProfileIn(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    village: str | None = None
    district: str | None = None
    state: str | None = None
    pincode: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    land_size_acres: float | None = None
    irrigation: str | None = None
    preferred_language: str | None = None


class ProduceIn(BaseModel):
    crop_id: str
    quantity_qtl: float = Field(gt=0, le=100000)
    quality_grade: QualityGrade = "A"
    moisture_pct: float | None = Field(default=None, ge=0, le=60)
    price_expectation: float | None = Field(default=None, ge=0)
    village: str | None = None
    district: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    harvest_date: date | None = None
    title: str | None = Field(default=None, max_length=200)
    images: list[str] | None = None


class RequirementIn(BaseModel):
    crop_id: str
    quantity_min_qtl: float = Field(ge=0, le=1000000)
    quantity_max_qtl: float = Field(gt=0, le=1000000)
    quality_grade: QualityGrade = "A"
    max_moisture_pct: float | None = Field(default=None, ge=0, le=60)
    price_per_qtl: float = Field(gt=0)
    price_negotiable: bool = True
    pickup_preference: Literal["farm_gate", "mandi", "collection_center"] = "farm_gate"
    payment_terms: str | None = None
    delivery_radius_km: float = Field(default=100, gt=0, le=2000)
    latitude: float | None = None
    longitude: float | None = None
    notes: str | None = None
    valid_until: date | None = None

    @field_validator("quantity_max_qtl")
    @classmethod
    def max_gte_min(cls, v, info):
        min_v = info.data.get("quantity_min_qtl")
        if min_v is not None and v < min_v:
            raise ValueError("quantity_max_qtl must be >= quantity_min_qtl")
        return v


class OfferIn(BaseModel):
    listing_id: str
    price_per_qtl: float = Field(gt=0)
    quantity_qtl: float = Field(gt=0)
    message: str | None = None


class OfferActionIn(BaseModel):
    action: Literal["accept", "reject", "counter", "withdraw"]
    counter_price: float | None = Field(default=None, gt=0)
    message: str | None = None


class StatusIn(BaseModel):
    status: str
    scheduled_pickup_at: datetime | None = None


class DisputeIn(BaseModel):
    transaction_id: str
    category: Literal["payment", "quantity", "quality", "buyer_issue", "farmer_issue", "pickup", "other"]
    description: str = Field(min_length=5, max_length=2000)


class DisputeResolveIn(BaseModel):
    status: Literal["in_review", "resolved", "rejected"]
    resolution: str | None = None


class RatingIn(BaseModel):
    transaction_id: str
    stars: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=1000)
    ratee: Literal["buyer", "farmer"]


class LogisticsEstimateIn(BaseModel):
    from_lat: float
    from_lon: float
    to_lat: float
    to_lon: float
    quantity_qtl: float = Field(gt=0)


class AssistantIn(BaseModel):
    message: str = Field(min_length=1, max_length=500)

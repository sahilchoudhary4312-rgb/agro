from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from app.models import Buyer, FPO, Farmer, User
from app.schemas import LoginIn, RegisterIn, TokenOut, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

# Coordinates for major Maharashtra districts (demo default when not provided)
DISTRICT_COORDS = {
    "pune": (18.52, 73.86), "nashik": (20.00, 73.79), "nagpur": (21.15, 79.09),
    "kolhapur": (16.70, 74.24), "ahilyanagar": (19.09, 74.74), "ahmednagar": (19.09, 74.74),
    "chhatrapati sambhajinagar": (19.88, 75.34), "aurangabad": (19.88, 75.34),
    "solapur": (17.66, 75.91), "satara": (17.69, 74.00), "sangli": (16.85, 74.58),
    "amravati": (20.93, 77.75), "jalgaon": (21.01, 75.56), "latur": (18.40, 76.58),
    "wardha": (20.75, 78.60), "osmanabad": (18.19, 76.04), "buldhana": (20.53, 76.18),
    "yavatmal": (20.39, 78.13), "akola": (20.70, 77.00), "ratnagiri": (16.99, 73.31),
    "nanded": (19.15, 77.32), "jalna": (19.84, 75.88), "dhule": (20.90, 74.77),
    "beed": (18.99, 75.76), "raigad": (18.51, 73.19), "nashik_": (20.00, 73.79),
}


def coords_for_district(district: str | None) -> tuple[float, float] | None:
    if not district:
        return None
    return DISTRICT_COORDS.get(district.strip().lower())


@router.post("/register", response_model=TokenOut, status_code=201)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    existing = db.scalar(select(User).where(User.email == data.email.lower()))
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")

    user = User(
        email=data.email.lower(),
        phone=data.phone,
        password_hash=hash_password(data.password),
        full_name=data.full_name.strip(),
        role=data.role,
        preferred_language=data.preferred_language,
    )
    db.add(user)
    db.flush()

    coords = coords_for_district(data.district)
    lat, lon = (coords or (None, None))

    if data.role == "farmer":
        db.add(Farmer(
            user_id=user.id, village=data.village, district=data.district,
            pincode=data.pincode, land_size_acres=data.land_size_acres,
            latitude=lat, longitude=lon,
        ))
    elif data.role == "buyer":
        if not data.business_name:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "business_name is required for buyers")
        db.add(Buyer(
            user_id=user.id, business_name=data.business_name,
            business_type=data.business_type or "trader",
            district=data.district, city=data.district,
            latitude=lat, longitude=lon,
        ))
    elif data.role == "fpo":
        if not data.fpo_name:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "fpo_name is required for FPOs")
        db.add(FPO(
            user_id=user.id, name=data.fpo_name,
            district=data.district, village=data.village,
            latitude=lat, longitude=lon,
        ))

    db.commit()
    db.refresh(user)
    return TokenOut(
        access_token=create_access_token(user.id, user.role),
        refresh_token=create_refresh_token(user.id, user.role),
        role=user.role, full_name=user.full_name, id=user.id,
    )


@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == data.email.lower()))
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is disabled. Contact support.")
    return TokenOut(
        access_token=create_access_token(user.id, user.role),
        refresh_token=create_refresh_token(user.id, user.role),
        role=user.role, full_name=user.full_name, id=user.id,
    )


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.put("/me/language")
def set_language(language: Literal["en", "hi", "mr"], user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user.preferred_language = language
    db.commit()
    return {"ok": True, "preferred_language": language}

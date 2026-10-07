"""AgriMitra Assistant — rule-based assistant answering from live platform data.

Never fabricates prices: it queries the database and always shows the data
source. Designed so a real LLM can replace `generate_reply` later.
"""
import re

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models import Crop, Market, MarketPrice, User
from app.services.providers.market_data import get_provider

router = APIRouter(prefix="/assistant", tags=["assistant"])


CROP_ALIASES = {
    "gehun": "Wheat", "wheat": "Wheat", "गेहूं": "Wheat", "गेहूँ": "Wheat",
    "chawal": "Rice", "rice": "Rice", "चावल": "Rice", "dhan": "Rice", "धान": "Rice",
    "pyaj": "Onion", "onion": "Onion", "प्याज": "Onion", "कांदा": "Onion",
    "tamatar": "Tomato", "tomato": "Tomato", "टमाटर": "Tomato",
    "soybean": "Soybean", "soya": "Soybean", "सोयाबीन": "Soybean",
    "kapas": "Cotton", "cotton": "Cotton", "कपास": "Cotton",
    "ganna": "Sugarcane", "sugarcane": "Sugarcane", "गन्ना": "Sugarcane", "ऊस": "Sugarcane",
    "makka": "Maize", "maize": "Maize", "corn": "Maize", "मक्का": "Maize",
    "tur": "Tur", "arhar": "Tur", "तूर": "Tur",
    "chana": "Gram", "gram": "Gram", "चना": "Gram", "हरभरा": "Gram",
    "aloo": "Potato", "potato": "Potato", "आलू": "Potato", "बटाटा": "Potato",
    "moongphali": "Groundnut", "groundnut": "Groundnut", "मूंगफली": "Groundnut", "भुईमूग": "Groundnut",
}


def detect_crop(text: str, db: Session) -> Crop | None:
    low = text.lower()
    for alias, name in CROP_ALIASES.items():
        if alias in low or alias in text:
            return db.scalar(select(Crop).where(Crop.name == name))
    for crop in db.execute(select(Crop)).scalars().all():
        if crop.name.lower() in low:
            return crop
    return None


def latest_prices_text(db: Session, crop: Crop) -> tuple[str, bool]:
    provider = get_provider()
    rows = sorted(
        provider.latest_prices(db, crop_id=crop.id),
        key=lambda r: -(r["modal_price"] or 0),
    )
    if not rows:
        return f"No recent price data found for {crop.name}. Please check the market prices page.", True
    lines = [f"Latest {crop.name} prices ({rows[0]['price_date']}) — source: DEMO DATA:"]
    for r in rows[:5]:
        lines.append(f"• {r['market_name']} ({r['district']}): ₹{r['modal_price']:,.0f}/quintal "
                     f"(range ₹{r['min_price']:,.0f}–₹{r['max_price']:,.0f})")
    best = rows[0]
    lines.append(f"Best modal price today: ₹{best['modal_price']:,.0f}/quintal at {best['market_name']}.")
    return "\n".join(lines), False


def generate_reply(message: str, user: User, db: Session) -> str:
    low = message.lower()

    crop = detect_crop(message, db)

    if any(k in low for k in ["bhav", "price", "दाम", "भाव", "कीमत", "rate"]) and crop:
        text, _ = latest_prices_text(db, crop)
        return text

    if any(k in low for k in ["best", "achha", "sell", "bech", "bechna", "बेच", "kahan", "कहाँ", "कहां"]):
        if crop:
            text, _ = latest_prices_text(db, crop)
            return ("To get your best NET return (price minus transport and fees), open "
                    "'Best Selling Option' for your listing — AgriMitra ranks every buyer and mandi "
                    "for you. Meanwhile:\n" + text)
        return ("To find your best selling option: 1) List your produce from 'My Produce', "
                "2) Open 'Best Selling Option' — the system compares every buyer offer and nearby "
                "mandi on net realization, trust and distance.")

    if any(k in low for k in ["hello", "namaste", "नमस्ते", "hi", "hey", "नमस्कार"]):
        return ("Namaste! I am AgriMitra Assistant. Ask me things like:\n"
                "• 'Wheat ka bhav kya hai?'\n"
                "• 'Where should I sell my onion?'\n"
                "• 'Should I sell now or wait?'\n"
                "(Answers use DEMO DATA in this prototype.)")

    if any(k in low for k in ["wait", "storage", "इंतजार", "भंडारण"]):
        return ("Whether to wait depends on price outlook and storage. Open any listing's "
                "'Best Selling Option' — AgriMitra checks the 7-day price trend and nearby storage "
                "availability, then recommends SELL NOW or WAIT with the reason.")

    if crop:
        text, _ = latest_prices_text(db, crop)
        return text

    return ("I can help with market prices and selling options. Try asking:\n"
            "• 'Wheat ka bhav kya hai?'\n"
            "• 'Mujhe kise bechna chahiye?'\n"
            "(I use platform data only — labelled DEMO DATA in this prototype.)")


@router.post("")
def assistant(payload: dict, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    message = (payload.get("message") or "").strip()
    if not message:
        return {"reply": "Please type a question.", "source": "none"}
    reply = generate_reply(message, user, db)
    return {
        "reply": reply,
        "source": "DEMO DATA (seeded database)",
        "note": "Prototype assistant — answers come from platform data, never fabricated.",
    }

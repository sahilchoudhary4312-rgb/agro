"""Market data provider abstraction.

DemoMarketDataProvider serves the seeded database (labelled DEMO DATA).
LiveMarketDataProvider is the integration point for official APIs such as
AGMARKNET / eNAM (TODO: wire real credentials + mapping when available).
The application must always function without any external API.
"""

from abc import ABC, abstractmethod
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Market, MarketPrice


class MarketDataProvider(ABC):
    name = "abstract"
    is_live = False

    @abstractmethod
    def latest_prices(self, db: Session, crop_id: str | None = None,
                      district: str | None = None) -> list[dict]: ...

    @abstractmethod
    def trend(self, db: Session, crop_id: str, market_id: str | None,
              days: int = 30) -> list[dict]: ...


class DemoMarketDataProvider(MarketDataProvider):
    name = "demo"
    is_live = False

    def latest_prices(self, db: Session, crop_id=None, district=None) -> list[dict]:
        q = (
            select(MarketPrice, Market)
            .join(Market, MarketPrice.market_id == Market.id)
            .where(MarketPrice.price_date == select(MarketPrice.price_date).order_by(MarketPrice.price_date.desc()).limit(1).scalar_subquery())
            .order_by(Market.district)
        )
        if crop_id:
            q = q.where(MarketPrice.crop_id == crop_id)
        if district:
            q = q.where(Market.district.ilike(f"%{district}%"))
        rows = db.execute(q).all()
        out = []
        for price, market in rows:
            out.append(self._to_dict(price, market))
        # The scalar_subquery above returns only rows at the global max date;
        # fall back to per-market latest when that yields too few rows.
        if len(out) < 3:
            out = self._per_market_latest(db, crop_id, district)
        return out

    def _per_market_latest(self, db: Session, crop_id=None, district=None) -> list[dict]:
        markets = db.execute(select(Market)).scalars().all()
        out = []
        for m in markets:
            if district and district.lower() not in (m.district or "").lower():
                continue
            q = (
                select(MarketPrice)
                .where(MarketPrice.market_id == m.id)
                .order_by(MarketPrice.price_date.desc())
            )
            if crop_id:
                q = q.where(MarketPrice.crop_id == crop_id)
            price = db.scalar(q.limit(1))
            if price:
                out.append(self._to_dict(price, m))
        return out

    def trend(self, db: Session, crop_id: str, market_id: str | None, days: int = 30) -> list[dict]:
        since = date.today() - timedelta(days=days)
        q = (
            select(MarketPrice)
            .where(MarketPrice.crop_id == crop_id, MarketPrice.price_date >= since)
            .order_by(MarketPrice.price_date)
        )
        if market_id:
            q = q.where(MarketPrice.market_id == market_id)
        prices = db.execute(q).scalars().all()
        by_date: dict = {}
        for p in prices:
            by_date.setdefault(p.price_date, []).append(p.modal_price)
        return [
            {"date": d.isoformat(), "avg_modal_price": round(sum(v) / len(v), 2)}
            for d, v in sorted(by_date.items())
        ]

    @staticmethod
    def _to_dict(price: MarketPrice, market: Market) -> dict:
        return {
            "price_id": price.id,
            "crop_id": price.crop_id,
            "market_id": market.id,
            "market_name": market.name,
            "district": market.district,
            "price_date": price.price_date.isoformat(),
            "min_price": price.min_price,
            "max_price": price.max_price,
            "modal_price": price.modal_price,
            "source": "DEMO DATA",
        }


class LiveMarketDataProvider(DemoMarketDataProvider):
    """Placeholder for official data integration (e.g., AGMARKNET API).

    TODO: implement fetch + normalization, cache results into MarketPrice
    with source='live'. Until credentials are configured the system
    transparently falls back to the demo provider.
    """

    name = "live"
    is_live = True

    def __init__(self):
        self._configured = False  # set True when real API keys exist

    def latest_prices(self, db, crop_id=None, district=None):
        if not self._configured:
            return super().latest_prices(db, crop_id, district)
        raise NotImplementedError("Live provider not yet implemented — see TODO above")


def get_provider() -> MarketDataProvider:
    if settings.MARKET_DATA_PROVIDER == "live":
        return LiveMarketDataProvider()
    return DemoMarketDataProvider()

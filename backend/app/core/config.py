from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "AgriMitra"
    APP_TAGLINE: str = "Know the Best Price. Find the Right Buyer. Sell Smarter."
    ENV: str = "development"
    DEBUG: bool = True

    # SQLite works out of the box; use postgresql+psycopg://... for production
    DATABASE_URL: str = "sqlite:///./agrimitra.db"

    SECRET_KEY: str = "dev-only-secret-key-change-me-in-production-0123456789"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"

    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 5

    # Market data provider: "demo" (seeded) or "live" (external APIs, future)
    MARKET_DATA_PROVIDER: str = "demo"

    # Default recommendation weights (percent). Editable from admin settings.
    WEIGHT_NET_REALIZATION: float = 35
    WEIGHT_BUYER_RELIABILITY: float = 20
    WEIGHT_QUALITY_MATCH: float = 15
    WEIGHT_QUANTITY_MATCH: float = 10
    WEIGHT_DISTANCE: float = 10
    WEIGHT_PRICE_OUTLOOK: float = 10

    SEED_ON_STARTUP: bool = True

    model_config = {"env_file": ".env", "extra": "ignore"}

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

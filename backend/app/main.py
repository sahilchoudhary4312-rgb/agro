from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.database.session import Base, SessionLocal, engine
from app import models  # noqa: F401 — ensure all models are registered
from app.api.v1 import (
    admin, assistant, auth, buyers, disputes, farmers, forecast, fpos,
    logistics, markets, matching, notifications, offers, public, transactions,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    if settings.SEED_ON_STARTUP:
        from app.seed.seed import seed_if_empty
        db = SessionLocal()
        try:
            seed_if_empty(db)
        finally:
            db.close()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description=settings.APP_TAGLINE +
                " — Smart Agricultural Market Intelligence + Buyer Matching + Price Discovery platform. "
                "SIH 2026 Problem Statement 26132 (Govt. of Maharashtra).",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_prefix = "/api"
for router in (
    auth.router, farmers.router, markets.router, buyers.router, matching.router,
    offers.router, transactions.router, logistics.router, forecast.router,
    notifications.router, disputes.router, fpos.router, admin.router,
    assistant.router, public.router,
):
    app.include_router(router, prefix=api_prefix)

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    if settings.DEBUG:
        import traceback
        traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": "Something went wrong on our side. Please try again."},
    )


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "environment": settings.ENV,
        "data_provider": settings.MARKET_DATA_PROVIDER,
    }

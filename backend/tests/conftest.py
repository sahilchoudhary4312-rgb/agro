import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models  # noqa: F401 — register all models
from app.api.deps import get_db
from app.database.session import Base
from app.main import app
from app.seed.seed import seed_if_empty


@pytest.fixture(scope="session")
def db_engine():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    db = factory()
    try:
        assert seed_if_empty(db) is True
        db.commit()
    finally:
        db.close()
    yield factory
    engine.dispose()


@pytest.fixture(scope="session")
def client(db_engine):
    def override_get_db():
        db = db_engine()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    # No context manager: lifespan (which seeds the real dev DB) must not run.
    yield TestClient(app)
    app.dependency_overrides.clear()


def _login(client: TestClient, email: str, password: str) -> str:
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


@pytest.fixture(scope="session")
def farmer_headers(client):
    return {"Authorization": f"Bearer {_login(client, 'farmer@demo.com', 'Farmer@123')}"}


@pytest.fixture(scope="session")
def buyer_headers(client):
    return {"Authorization": f"Bearer {_login(client, 'buyer@demo.com', 'Buyer@123')}"}


@pytest.fixture(scope="session")
def fpo_headers(client):
    return {"Authorization": f"Bearer {_login(client, 'fpo@demo.com', 'Fpo@123')}"}


@pytest.fixture(scope="session")
def admin_headers(client):
    return {"Authorization": f"Bearer {_login(client, 'admin@demo.com', 'Admin@123')}"}

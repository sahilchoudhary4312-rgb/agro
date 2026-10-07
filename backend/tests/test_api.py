"""API integration tests against an isolated in-memory DB with seeded DEMO DATA."""
from tests.conftest import _login


class TestHealth:
    def test_health(self, client):
        res = client.get("/api/health")
        assert res.status_code == 200
        body = res.json()
        assert body["status"] == "ok"
        assert body["app"] == "AgriMitra"


class TestAuth:
    def test_login_demo_farmer(self, client):
        res = client.post("/api/auth/login", json={"email": "farmer@demo.com", "password": "Farmer@123"})
        assert res.status_code == 200
        body = res.json()
        assert body["role"] == "farmer"
        assert body["access_token"]

    def test_login_wrong_password_401(self, client):
        res = client.post("/api/auth/login", json={"email": "farmer@demo.com", "password": "nope"})
        assert res.status_code == 401

    def test_login_unknown_email_401(self, client):
        res = client.post("/api/auth/login", json={"email": "ghost@demo.com", "password": "x"})
        assert res.status_code == 401

    def test_me_requires_token(self, client):
        assert client.get("/api/auth/me").status_code == 401

    def test_me_returns_profile(self, client, farmer_headers):
        res = client.get("/api/auth/me", headers=farmer_headers)
        assert res.status_code == 200
        assert res.json()["email"] == "farmer@demo.com"

    def test_register_farmer_and_login(self, client):
        res = client.post("/api/auth/register", json={
            "email": "newfarmer@test.com", "password": "Test@1234",
            "full_name": "Test Farmer", "phone": "9800000001",
            "role": "farmer", "village": "Testwadi", "district": "Pune",
            "pincode": "411001", "land_size_acres": 3.5, "preferred_language": "en",
        })
        assert res.status_code == 201, res.text
        token = res.json()["access_token"]
        me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 200
        assert me.json()["role"] == "farmer"

    def test_register_duplicate_email_409(self, client):
        res = client.post("/api/auth/register", json={
            "email": "farmer@demo.com", "password": "Test@1234",
            "full_name": "Dup", "role": "farmer", "preferred_language": "en",
        })
        assert res.status_code == 409


class TestRoleGuards:
    def test_farmer_cannot_access_admin(self, client, farmer_headers):
        assert client.get("/api/admin/dashboard", headers=farmer_headers).status_code == 403

    def test_buyer_cannot_access_fpo_profile(self, client, buyer_headers):
        assert client.get("/api/fpos/me", headers=buyer_headers).status_code == 403

    def test_admin_can_access_dashboard(self, client, admin_headers):
        res = client.get("/api/admin/dashboard", headers=admin_headers)
        assert res.status_code == 200

    def test_garbage_token_401(self, client):
        res = client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-jwt"})
        assert res.status_code == 401


class TestMarketsAndPublic:
    def test_markets_seeded(self, client):
        res = client.get("/api/markets")
        assert res.status_code == 200
        markets = res.json()
        assert len(markets) >= 10
        assert all("name" in m and "district" in m for m in markets)

    def test_public_stats(self, client):
        res = client.get("/api/public/stats")
        assert res.status_code == 200
        stats = res.json()
        assert stats.get("farmers", 0) >= 50 or stats.get("total_farmers", 0) >= 50 or len(stats) > 0

    def test_public_crops(self, client):
        res = client.get("/api/public/crops")
        assert res.status_code == 200
        assert len(res.json()) >= 10

    def test_price_trend_returns_demo_source(self, client, farmer_headers):
        crops = client.get("/api/public/crops").json()
        res = client.get(f"/api/markets/prices/trend?crop_id={crops[0]['id']}&days=30")
        assert res.status_code == 200
        assert res.json()["source"] == "DEMO DATA"


class TestFarmerEndpoints:
    def test_farmer_profile(self, client, farmer_headers):
        res = client.get("/api/farmers/profile", headers=farmer_headers)
        assert res.status_code == 200
        assert "user" in res.json()

    def test_farmer_produce(self, client, farmer_headers):
        res = client.get("/api/farmers/produce", headers=farmer_headers)
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_recommendations_ranked_by_net(self, client, farmer_headers):
        produce = client.get("/api/farmers/produce", headers=farmer_headers).json()
        assert produce, "demo farmer must have listings"
        listing_id = produce[0]["id"]
        res = client.get(
            f"/api/matching/recommendations?listing_id={listing_id}", headers=farmer_headers
        )
        assert res.status_code == 200, res.text
        body = res.json()
        assert "options" in body and "best_option" in body
        assert isinstance(body["options"], list)
        for opt in body["options"]:
            assert "net_realization_per_qtl" in opt
            assert "gross_price_per_qtl" in opt
            assert "transport_per_qtl" in opt
        if body["best_option"]:
            nets = [o["net_realization_per_qtl"] for o in body["options"]]
            assert body["best_option"]["net_realization_per_qtl"] == max(nets)


class TestBuyerFlow:
    def test_buyer_requirements(self, client, buyer_headers):
        res = client.get("/api/buyers/requirements/mine", headers=buyer_headers)
        assert res.status_code == 200

    def test_buyer_cannot_use_farmer_endpoints(self, client, buyer_headers):
        assert client.get("/api/farmers/produce", headers=buyer_headers).status_code == 403


class TestAdminSettings:
    def test_settings_require_admin(self, client, farmer_headers):
        assert client.get("/api/admin/settings", headers=farmer_headers).status_code == 403

    def test_seeded_settings_present(self, client, admin_headers):
        res = client.get("/api/admin/settings", headers=admin_headers)
        assert res.status_code == 200
        keys = {s["key"] for s in res.json()}
        assert "matching_weights" in keys
        assert "recommendation_weights" in keys


class TestDataHonesty:
    """Platform must never present DEMO DATA as live government data."""

    def test_health_reports_demo_provider(self, client):
        assert client.get("/api/health").json()["data_provider"] == "demo"

    def test_market_prices_flagged_as_demo(self, client):
        res = client.get("/api/markets/prices")
        assert res.status_code == 200
        body = res.json()
        assert body.get("source") == "DEMO DATA"
        assert isinstance(body.get("prices"), list)

    def test_trend_flagged_as_demo(self, client):
        crops = client.get("/api/public/crops").json()
        res = client.get(f"/api/markets/prices/trend?crop_id={crops[0]['id']}")
        assert res.json()["source"] == "DEMO DATA"

    def test_map_flagged_as_demo(self, client):
        assert client.get("/api/markets/map").json()["source"] == "DEMO DATA"


def test_login_helper_reuses_conftest(client):
    """Register a user via API and immediately log in."""
    client.post("/api/auth/register", json={
        "email": "loginflow@test.com", "password": "Test@1234",
        "full_name": "Login Flow", "role": "farmer", "preferred_language": "en",
    })
    token = _login(client, "loginflow@test.com", "Test@1234")
    assert token

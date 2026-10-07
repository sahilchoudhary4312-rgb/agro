"""Realistic, Maharashtra-focused demo seed data.

All data is synthetic and labelled DEMO DATA — it must never be presented
as live government data. Seeding is idempotent: it runs only on an empty DB.
"""
import random
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import (
    Buyer, BuyerOffer, BuyerRequirement, Crop, Dispute, Farmer, FarmerFPO, FPO,
    LogisticsBooking, LogisticsProvider, Market, MarketPrice, Match,
    Notification, OfferMessage, Payment, ProduceListing, Rating,
    StorageFacility, SystemSetting, Transaction, User,
    LISTING_AVAILABLE, LISTING_SOLD, OFFER_ACCEPTED,
)

random.seed(42)

CROPS = [
    # name, hindi, marathi, category, icon, base ₹/qtl
    ("Wheat", "गेहूं", "गहू", "cereal", "🌾", 2500),
    ("Rice", "चावल", "तांदळ", "cereal", "🍚", 3100),
    ("Onion", "प्याज", "कांदा", "vegetable", "🧅", 2400),
    ("Tomato", "टमाटर", "टोमॅटो", "vegetable", "🍅", 1900),
    ("Soybean", "सोयाबीन", "सोयाबीन", "oilseed", "🌱", 4700),
    ("Cotton", "कपास", "कापूस", "cash", "☁️", 7000),
    ("Sugarcane", "गन्ना", "ऊस", "cash", "🎋", 3100),
    ("Maize", "मक्का", "मका", "cereal", "🌽", 2200),
    ("Tur", "तूर", "तूर", "pulse", "🫘", 7200),
    ("Gram", "चना", "हरभरा", "pulse", "🫛", 5500),
    ("Potato", "आलू", "बटाटा", "vegetable", "🥔", 1200),
    ("Groundnut", "मूंगफली", "भुईमूग", "oilseed", "🥜", 5900),
]

MARKETS = [
    ("Pune APMC (Gultekdi)", "Pune", 18.48, 73.85),
    ("Lasalgaon APMC", "Nashik", 20.15, 74.23),
    ("Nagpur APMC (Kalamna)", "Nagpur", 21.11, 79.12),
    ("Kolhapur APMC", "Kolhapur", 16.71, 74.23),
    ("Ahilyanagar APMC", "Ahilyanagar", 19.09, 74.74),
    ("Chhatrapati Sambhajinagar APMC", "Chhatrapati Sambhajinagar", 19.88, 75.33),
    ("Solapur APMC", "Solapur", 17.66, 75.91),
    ("Satara APMC", "Satara", 17.69, 74.00),
    ("Sangli APMC", "Sangli", 16.85, 74.58),
    ("Amravati APMC", "Amravati", 20.93, 77.76),
]

DISTRICT_VILLAGES = {
    "Pune": ["Kedgaon", "Uruli Kanchan", "Pabal", "Rajgurunagar", "Baramati"],
    "Nashik": ["Dindori", "Peth", "Sinnar", "Igatpuri", "Yeola"],
    "Nagpur": ["Katol", "Narkhed", "Ramtek", "Kalmeshwar", "Kamptee"],
    "Kolhapur": ["Panhala", "Gaganbawada", "Karvir", "Hatkanangale", "Shirol"],
    "Ahilyanagar": ["Pathardi", "Shrirampur", "Rahata", "Parner", "Sangamner"],
    "Chhatrapati Sambhajinagar": ["Kannad", "Sillod", "Paithan", "Vaijapur", "Gangapur"],
    "Solapur": ["Malshiras", "Pandharpur", "Mangalwedha", "Barshi", "Akalkot"],
    "Satara": ["Wai", "Karad", "Koregaon", "Phaltan", "Khatav"],
    "Sangli": ["Miraj", "Tasgaon", "Kavathe Mahankal", "Jat", "Walwa"],
    "Amravati": ["Chandur", "Dhamangaon", "Nandgaon Khandeshwar", "Tiwasa", "Bhatkuli"],
}

FARMER_NAMES = [
    "Ramesh Patil", "Sunita Deshmukh", "Vitthal Jadhav", "Shobha Kale", "Dnyaneshwar Mane",
    "Anita Pawar", "Bhaskar Shinde", "Manisha Gaikwad", "Sanjay More", "Kavita Bhosale",
    "Prakash Salunkhe", "Rekha Chavan", "Ganesh Kumbhar", "Sangita Nikam", "Mahesh Thorat",
    "Jayashree Wagh", "Nitin Raut", "Pooja Ingale", "Sachin Gholap", "Vaishali Sutar",
    "Rajendra Powar", "Meena Jagtap", "Ashok Dhole", "Sarika Khedkar", "Vikas Bandgar",
    "Sushama Kadam", "Tukaram Zende", "Nanda Bhalerao", "Kiran Magar", "Preetam Lonari",
    "Urmila Abhang", "Deepak Sasane", "Snehal Taru", "Balasaheb Pande", "Rupali Mate",
    "Hiralal Uikey", "Chaya Wankhede", "Sopan Bhoyar", "Asha Gedam", "Devanand Kawdu",
    "Mangal Tembhurne", "Rameshwar Dadhe", "Kalpana Rode", "Yogesh Ingle", "Shalini Damle",
    "Prabhakar Sawant", "Suvarna Dalvi", "Eknath Mhatre", "Lata Bhoir", "Sunil Tandel",
]

BUYERS = [
    # business, type, city, verified, trust, txs, ontime, rating, disputes
    ("ABC Agro Pvt Ltd", "processor", "Pune", "verified", 94, 124, 97, 4.7, 0),
    ("XYZ Foods Ltd", "processor", "Nashik", "verified", 88, 96, 92, 4.4, 1),
    ("Shree Balaji Traders", "trader", "Solapur", "verified", 81, 58, 90, 4.1, 1),
    ("Maharashtra Agro Exports", "exporter", "Mumbai", "verified", 91, 142, 95, 4.6, 2),
    ("Green Valley Foods", "retail_chain", "Pune", "verified", 85, 77, 93, 4.3, 0),
    ("Kisan Agro Mills", "mill", "Amravati", "verified", 78, 41, 87, 3.9, 2),
    ("Sai Food Processing", "processor", "Ahilyanagar", "verified", 90, 88, 96, 4.5, 0),
    ("Vidarbha Cotton Corp", "trader", "Nagpur", "verified", 83, 65, 88, 4.0, 1),
    ("Deshmukh Sugar Mills", "mill", "Kolhapur", "verified", 87, 110, 91, 4.2, 1),
    ("Fresh Harvest Solutions", "retail_chain", "Nashik", "pending", 62, 9, 78, 3.8, 0),
    ("Konkan Agri Enterprises", "exporter", "Ratnagiri", "verified", 89, 73, 94, 4.5, 0),
    ("Marathwada Pulse Traders", "trader", "Chhatrapati Sambhajinagar", "verified", 76, 52, 85, 3.8, 2),
    ("Shakti Oil Mills", "mill", "Sangli", "verified", 84, 69, 92, 4.2, 0),
    ("Bharat food Staples", "trader", "Satara", "pending", 58, 6, 75, 3.6, 0),
    ("Sahyadri Organics", "processor", "Nashik", "verified", 92, 103, 96, 4.8, 0),
]

FPO_ORGS = [
    ("Shetkari Krishi Utthan FPO", "Pune", 47),
    ("Godavari Farmer Producer Company", "Nashik", 63),
    ("Vidarbha Cotton Farmers FPO", "Nagpur", 52),
    ("Krishna Sangam FPO", "Kolhapur", 38),
    ("Marathwada Sheti FPO", "Chhatrapati Sambhajinagar", 41),
]

STORAGE = [
    ("Baramati Cold Storage", "cold_storage", "Baramati", "Pune", 18.15, 74.58, 5000, 2400, 35, "Potato,Onion,Tomato"),
    ("Nashik Warehouse Co", "warehouse", "Lasalgaon", "Nashik", 20.15, 74.23, 12000, 5600, 22, "Wheat,Rice,Gram,Tur"),
    ("Nagpur Godown Complex", "warehouse", "Kalmeshwar", "Nagpur", 21.23, 79.05, 8000, 4100, 20, "Cotton,Soybean,Gram"),
    ("Kolhapur Storage Hub", "warehouse", "Karvir", "Kolhapur", 16.75, 74.20, 6000, 3300, 21, "Sugarcane,Rice,Maize"),
    ("Ahilyanagar Grain Depot", "warehouse", "Shrirampur", "Ahilyanagar", 19.62, 74.66, 9000, 5200, 19, "Wheat,Gram,Tur,Onion"),
    ("Sambhajinagar Cold Chain", "cold_storage", "Paithan", "Chhatrapati Sambhajinagar", 19.48, 75.40, 4000, 1800, 38, "Onion,Tomato,Potato"),
    ("Solapur Farm Storage", "godown", "Pandharpur", "Solapur", 17.24, 75.33, 7000, 3900, 18, "Soybean,Gram,Maize"),
    ("Satara Agri Warehouse", "warehouse", "Wai", "Satara", 17.94, 73.88, 5000, 2900, 20, "Rice,Wheat,Groundnut"),
    ("Sangli Grape & Grain Store", "warehouse", "Tasgaon", "Sangli", 17.03, 74.60, 6500, 3100, 22, "Groundnut,Rice,Wheat"),
    ("Amravati Cotton Warehouse", "warehouse", "Chandur", "Amravati", 20.72, 77.83, 7500, 4800, 17, "Cotton,Soybean,Tur"),
]

LOGISTICS = [
    ("Shivam Transport", "Pune", "Truck,Tractor", 24, 0.85, 4.3),
    ("Ganesh Goods Carrier", "Nashik", "Truck,Mini Truck", 26, 0.9, 4.1),
    ("Vidarbha Logistics", "Nagpur", "Truck,Container", 23, 0.88, 4.4),
    ("Kolhapur Cargo Services", "Kolhapur", "Tractor,Mini Truck", 22, 0.8, 4.0),
    ("Nashik-Nagpur Freightlines", "Amravati", "Truck", 25, 0.92, 4.2),
    ("Sai Roadways", "Ahilyanagar", "Tractor,Truck", 21, 0.82, 4.5),
    ("Bhagyalaxmi Transport", "Solapur", "Truck", 27, 0.95, 3.9),
    ("QuickFarm Movers", "Satara", "Mini Truck,Tempo", 28, 1.0, 4.3),
    ("Krishna Transport Co", "Sangli", "Truck,Tractor", 24, 0.86, 4.1),
    ("Dhanshree Logistics", "Chhatrapati Sambhajinagar", "Truck", 25, 0.9, 4.0),
]

BUYER_NAMES = ["Amit Kulkarni", "Priya Nair", "Rohit Agarwal", "Sneha Firodia", "Vikram Joshi",
               "Neha Bhandari", "Sameer Shaikh", "Deepa Menon", "Arjun Reddy", "Falguni Shah",
               "Kunal Deshpande", "Meera Iyer", "Rahul Bansal", "Tanvi Kale", "Aditya Rao"]

FPO_NAMES = ["Gopal Itankar", "Sunita Wagh", "Prashant Nikam", "Anjali Bhosale", "Harshad Patil"]


def _mk_user(db, email, name, role, pw, phone=None, lang="en", created_days_ago=None):
    user = User(
        email=email, full_name=name, role=role, phone=phone,
        password_hash=hash_password(pw), preferred_language=lang,
    )
    if created_days_ago:
        user.created_at = datetime.now(timezone.utc) - timedelta(days=created_days_ago)
    db.add(user)
    db.flush()
    return user


def _district_for_city(city: str, markets: list) -> str:
    if city == "Mumbai":
        return "Pune"
    for mm in markets:
        if city.lower() in mm.district.lower() or mm.district.lower() in city.lower():
            return mm.district
    return "Pune"


def seed_if_empty(db: Session):
    count = db.scalar(select(func.count(User.id))) or 0
    if count > 0:
        return False
    print("[AgriMitra] Empty database detected — seeding DEMO DATA ...")
    seed(db)
    return True


def seed(db: Session):
    today = date.today()

    # ---------- crops ----------
    crops = {}
    for name, hi, mr, cat, icon, base in CROPS:
        c = Crop(name=name, name_hi=hi, name_mr=mr, category=cat, icon=icon,
                 base_price=base, suitable_storage_days=random.randint(30, 200))
        db.add(c)
        crops[name] = c
    db.flush()

    # ---------- markets ----------
    markets = []
    for name, district, lat, lon in MARKETS:
        m = Market(name=name, district=district, market_type="mandi",
                   latitude=lat, longitude=lon, address=f"{name}, {district}, Maharashtra")
        db.add(m)
        markets.append(m)
    db.flush()

    # ---------- market prices: 45 days history ----------
    price_rows = 0
    for crop in crops.values():
        base = crop.base_price
        for mi, m in enumerate(markets):
            # market bias makes some mandis consistently better for a crop
            bias = random.uniform(-0.06, 0.06)
            price = base * (1 + bias)
            day = today - timedelta(days=45)
            while day <= today:
                drift = random.uniform(-0.015, 0.016)
                price = max(base * 0.6, min(base * 1.5, price * (1 + drift)))
                modal = round(price, 0)
                mp = MarketPrice(
                    market_id=m.id, crop_id=crop.id, price_date=day,
                    min_price=round(modal * 0.93), max_price=round(modal * 1.07),
                    modal_price=modal, source="demo",
                )
                db.add(mp)
                price_rows += 1
                if price_rows % 1000 == 0:
                    db.flush()
                day += timedelta(days=1)
    db.flush()

    # pin today's Wheat prices so the demo listing's story is deterministic:
    # nearby buyer offers must beat mandi net realization (see offers below)
    wheat_crop = crops["Wheat"]
    latest = max(mp.price_date for mp in db.query(MarketPrice).filter(MarketPrice.crop_id == wheat_crop.id).all())
    for m in markets:
        row = db.query(MarketPrice).filter(
            MarketPrice.market_id == m.id, MarketPrice.crop_id == wheat_crop.id,
            MarketPrice.price_date == latest).one()
        row.modal_price = 2450 if m.district == "Pune" else round(random.uniform(2360, 2520))
        row.min_price = round(row.modal_price * 0.94)
        row.max_price = round(row.modal_price * 1.06)
    db.flush()
    print(f"[AgriMitra] seeded {price_rows} market price records")

    # ---------- demo accounts ----------
    farmer_user = _mk_user(db, "farmer@demo.com", "Ramesh Patil", "farmer", "Farmer@123",
                           phone="9822011223", lang="mr", created_days_ago=200)
    buyer_user = _mk_user(db, "buyer@demo.com", "Amit Kulkarni", "buyer", "Buyer@123",
                          phone="9822044556", lang="en", created_days_ago=400)
    fpo_user = _mk_user(db, "fpo@demo.com", "Gopal Itankar", "fpo", "Fpo@123",
                        phone="9822077889", lang="hi", created_days_ago=300)
    admin_user = _mk_user(db, "admin@demo.com", "Platform Admin", "admin", "Admin@123",
                          phone="9800000000", created_days_ago=365)

    farmer_demo = Farmer(
        user_id=farmer_user.id, village="Uruli Kanchan", district="Pune", state="Maharashtra",
        pincode="412202", latitude=18.58, longitude=74.03, land_size_acres=6.5,
        irrigation="borewell",
    )
    db.add(farmer_demo)

    # ---------- other farmers ----------
    farmers = [farmer_demo]
    districts = list(DISTRICT_VILLAGES.keys())
    for i, name in enumerate(FARMER_NAMES):
        if i == 0:
            continue
        district = districts[i % len(districts)]
        villages = DISTRICT_VILLAGES[district]
        village = villages[i % len(villages)]
        u = _mk_user(db, f"farmer{i}@demo.com", name, "farmer", "Farmer@123",
                     phone=f"98220{10000 + i:05d}", lang=random.choice(["hi", "mr", "en"]),
                     created_days_ago=random.randint(10, 300))
        m = next(mm for mm in markets if mm.district == district)
        f = Farmer(
            user_id=u.id, village=village, district=district,
            pincode=f"41{random.randint(1000, 5999)}",
            latitude=m.latitude + random.uniform(-0.35, 0.35),
            longitude=m.longitude + random.uniform(-0.35, 0.35),
            land_size_acres=round(random.uniform(1, 12), 1),
            irrigation=random.choice(["rainfed", "canal", "borewell", "well"]),
        )
        db.add(f)
        farmers.append(f)
    db.flush()

    # ---------- buyers ----------
    buyers = []
    for i, (biz, btype, city, verified, trust, txs, ontime, rating, disputes) in enumerate(BUYERS):
        if i == 0:
            u, name = buyer_user, BUYER_NAMES[0]
        else:
            u = _mk_user(db, f"buyer{i}@demo.com", BUYER_NAMES[i], "buyer", "Buyer@123",
                         phone=f"98221{20000 + i:05d}", created_days_ago=random.randint(60, 500))
            name = BUYER_NAMES[i]
        district = _district_for_city(city, markets)
        m = next(mm for mm in markets if mm.district == district)
        b = Buyer(
            user_id=u.id, business_name=biz, business_type=btype,
            gstin=f"27AABCU{random.randint(1000, 9999)}P1Z{random.randint(1, 9)}",
            license_no=f"APMC/{district[:3].upper()}/{random.randint(1000, 9999)}",
            verification_status=verified, city=city, district=district,
            latitude=m.latitude + random.uniform(-0.05, 0.05),
            longitude=m.longitude + random.uniform(-0.05, 0.05),
            about=f"{biz} — {btype.replace('_', ' ').title()} sourcing agricultural produce across Maharashtra.",
            trust_score=trust, total_transactions=txs,
            successful_transactions=int(txs * 0.97), on_time_payment_pct=ontime,
            farmer_rating=rating, dispute_count=disputes,
        )
        db.add(b)
        buyers.append(b)
    db.flush()

    # ---------- FPOs ----------
    fpos = []
    for i, (name, district, members) in enumerate(FPO_ORGS):
        u = fpo_user if i == 0 else _mk_user(
            db, f"fpo{i}@demo.com", FPO_NAMES[i], "fpo", "Fpo@123",
            phone=f"98222{30000 + i:05d}", created_days_ago=random.randint(90, 400))
        m = next(mm for mm in markets if mm.district == district)
        f = FPO(
            user_id=u.id, name=name,
            registration_no=f"FPO/{random.randint(2015, 2022)}/{random.randint(100, 999)}",
            verification_status="verified", district=district,
            village=DISTRICT_VILLAGES[district][0],
            latitude=m.latitude, longitude=m.longitude,
            member_count=members, trust_score=random.uniform(78, 92),
            about=f"{name} — collective marketing of member produce.",
        )
        db.add(f)
        db.flush()
        fpos.append(f)
        # attach member farmers
        candidates = [fm for fm in farmers if fm.district == district][:12]
        for fm in candidates:
            db.add(FarmerFPO(fpo_id=f.id, farmer_id=fm.id))
    db.flush()

    # ---------- storage + logistics ----------
    for name, ftype, village, district, lat, lon, cap, avail, cost, crops_csv in STORAGE:
        db.add(StorageFacility(
            name=name, facility_type=ftype, village=village, district=district,
            latitude=lat, longitude=lon, capacity_qtl=cap, available_qtl=avail,
            cost_per_qtl_month=cost, suitable_crops=crops_csv,
            contact=f"98{random.randint(10000000, 99999999)}",
        ))
    for name, district, vehicles, per_km, per_qtl_km, rating in LOGISTICS:
        db.add(LogisticsProvider(
            name=name, district=district, vehicle_types=vehicles,
            base_cost_per_km=per_km, cost_per_qtl_km=per_qtl_km, rating=rating,
            contact=f"98{random.randint(10000000, 99999999)}",
        ))

    # ---------- produce listings ----------
    crop_list = list(crops.values())
    listings = []
    # demo farmer: the SIH-demo listing (Wheat 18q Grade A 12%)
    wheat = crops["Wheat"]
    demo_listing = ProduceListing(
        owner_user_id=farmer_user.id, farmer_id=farmer_demo.id, crop_id=wheat.id,
        title="Wheat — Grade A", quantity_qtl=18, quality_grade="A", moisture_pct=12,
        price_expectation=2550, village="Uruli Kanchan", district="Pune",
        latitude=18.58, longitude=74.03, harvest_date=today - timedelta(days=10),
        status=LISTING_AVAILABLE,
    )
    db.add(demo_listing)
    listings.append(demo_listing)

    for i, f in enumerate(farmers[1:], start=1):
        n_listings = random.choices([1, 2, 3], weights=[55, 30, 15])[0]
        u = db.get(User, f.user_id)
        for _ in range(n_listings):
            crop = random.choice(crop_list)
            qty = round(random.uniform(5, 150), 1)
            grade = random.choices(["A", "B", "C"], weights=[55, 33, 12])[0]
            lst = ProduceListing(
                owner_user_id=u.id, farmer_id=f.id, crop_id=crop.id,
                title=f"{crop.name} — Grade {grade}",
                quantity_qtl=qty, quality_grade=grade,
                moisture_pct=round(random.uniform(8, 16), 1),
                price_expectation=round(crop.base_price * random.uniform(0.9, 1.08)),
                village=f.village, district=f.district,
                latitude=f.latitude, longitude=f.longitude,
                harvest_date=today - timedelta(days=random.randint(1, 40)),
                status=LISTING_AVAILABLE,
            )
            db.add(lst)
            listings.append(lst)
    db.flush()
    print(f"[AgriMitra] seeded {len(listings)} produce listings")

    # ---------- buyer requirements (30+) ----------
    requirements = []
    verified_buyers = [b for b in buyers if b.verification_status == "verified"]
    # the demo buyer (ABC Agro) always owns these requirements so the buyer demo
    # dashboard has content; the wheat one mirrors the SIH matching example
    abc = buyers[0]
    for crop_name, qmin, qmax, price, grade, moist in (
        ("Wheat", 100, 500, 2580, "A", 13.0),
        ("Onion", 200, 800, 1450, "A", None),
        ("Tomato", 100, 400, 1200, "B", None),
    ):
        c = crops[crop_name]
        req = BuyerRequirement(
            buyer_id=abc.id, crop_id=c.id,
            quantity_min_qtl=qmin, quantity_max_qtl=qmax,
            quality_grade=grade, max_moisture_pct=moist,
            price_per_qtl=price, price_negotiable=True,
            pickup_preference="farm_gate", payment_terms="within_2_days",
            delivery_radius_km=100,
            latitude=abc.latitude, longitude=abc.longitude,
            notes=f"Regular requirement of {crop_name} for our processing plant.",
            valid_until=today + timedelta(days=45),
        )
        db.add(req)
        requirements.append(req)
    db.flush()
    for i in range(34):
        buyer = random.choice(verified_buyers)
        crop = random.choice(crop_list)
        qmax = round(random.choice([50, 100, 200, 300, 500]), 0)
        qmin = round(qmax * random.uniform(0.2, 0.5), 0)
        req = BuyerRequirement(
            buyer_id=buyer.id, crop_id=crop.id,
            quantity_min_qtl=qmin, quantity_max_qtl=qmax,
            quality_grade=random.choices(["A", "B"], weights=[70, 30])[0],
            max_moisture_pct=round(random.uniform(11, 15), 1),
            price_per_qtl=round(crop.base_price * random.uniform(0.98, 1.08)),
            price_negotiable=random.random() > 0.3,
            pickup_preference=random.choices(["farm_gate", "mandi", "collection_center"], weights=[60, 25, 15])[0],
            payment_terms=random.choice(["within_2_days", "advance_50", "on_delivery"]),
            delivery_radius_km=random.choice([75, 100, 150, 200]),
            latitude=buyer.latitude, longitude=buyer.longitude,
            notes=f"Regular requirement of {crop.name} for our {buyer.business_type.replace('_', ' ')}.",
            valid_until=today + timedelta(days=random.randint(10, 60)),
        )
        db.add(req)
        requirements.append(req)
    db.flush()
    print(f"[AgriMitra] seeded {len(requirements)} buyer requirements")

    # ---------- historical transactions (55) with payments/ratings ----------
    crop_ids = {c.id: c for c in crop_list}
    tx_count = 0
    for i in range(55):
        farmer = random.choice(farmers)
        buyer = random.choice(verified_buyers)
        crop = random.choice(crop_list)
        qty = round(random.uniform(8, 120), 1)
        agreed = round(crop.base_price * random.uniform(0.95, 1.05))
        logi = round(random.uniform(20, 120), 0)
        net = round(agreed - logi, 2)
        days_ago = random.randint(3, 160)
        status = random.choices(
            ["completed", "payment_completed", "payment_pending", "delivered",
             "in_transit", "pickup_scheduled", "accepted"],
            weights=[38, 12, 8, 8, 8, 8, 18])[0]
        created = datetime.now(timezone.utc) - timedelta(days=days_ago)
        tx = Transaction(
            code=f"TX-{random.getrandbits(32):08X}",
            farmer_user_id=farmer.user_id, buyer_id=buyer.id,
            crop_id=crop.id, quantity_qtl=qty, quality_grade=random.choice(["A", "B"]),
            agreed_price=agreed, logistics_cost_per_qtl=logi, handling_cost_per_qtl=15,
            net_realization_per_qtl=net,
            total_value=round(agreed * qty, 2), net_total=round(net * qty, 2),
            status=status, distance_km=round(random.uniform(8, 130), 1),
            created_at=created,
            updated_at=created,
        )
        if status in ("payment_completed", "completed", "delivered", "payment_pending"):
            tx.delivered_at = created + timedelta(days=2)
        if status in ("payment_completed", "completed"):
            tx.scheduled_pickup_at = created + timedelta(days=1)
            pay = Payment(amount=round(agreed * qty, 2),
                          method=random.choice(["upi", "neft", "rtgs"]),
                          reference=f"REF{random.getrandbits(24):06X}",
                          status="completed", paid_at=created + timedelta(days=3))
            tx.payments.append(pay)
            # farmer rates buyer
            tx_ratings = Rating(rater_user_id=farmer.user_id,
                                ratee_buyer_id=buyer.id, stars=random.choices([4, 5, 3], weights=[40, 45, 15])[0],
                                comment=random.choice(["Prompt payment, good weighing.",
                                                       "Fair price and quick payment.",
                                                       "Payment was a bit late but honest.",
                                                       "Good experience overall."]),
                                created_at=created + timedelta(days=4))
            db.add(tx_ratings)
        db.add(tx)
        db.flush()
        if status in ("payment_completed", "completed"):
            pay.transaction_id = tx.id
            tx_ratings.transaction_id = tx.id
            db.add(LogisticsBooking(transaction_id=tx.id, distance_km=tx.distance_km,
                                    vehicle_type="Truck", cost_per_qtl=logi,
                                    estimated_hours=round((tx.distance_km or 30) / 35 + 2, 1),
                                    status="delivered"))
        # matches history
        if i % 2 == 0:
            db.add(Match(listing_id=None, requirement_id=random.choice(requirements).id,
                         farmer_user_id=farmer.user_id, buyer_id=buyer.id, crop_id=crop.id,
                         price_match=random.uniform(60, 100), quality_match=random.uniform(60, 100),
                         quantity_match=random.uniform(50, 100), distance_match=random.uniform(40, 100),
                         payment_trust=buyer.on_time_payment_pct,
                         overall_score=random.uniform(55, 95), distance_km=tx.distance_km))
        tx_count += 1
    db.flush()
    print(f"[AgriMitra] seeded {tx_count} transactions")

    # ---------- sample offers on the demo listing ----------
    # net realization demo: Sai Food offers a HIGHER gross price but is ~100 km away,
    # so ABC Agro (closer, lower gross) wins on estimated net realization.
    wheat_reqs = [r for r in requirements if r.crop_id == wheat.id]
    if wheat_reqs:
        buyer_a = buyers[0]   # ABC Agro (Pune) — lower gross, near → better net → recommended
        buyer_b = buyers[6]   # Sai Food (Ahilyanagar) — higher gross, far → worse net
        for buyer, price in ((buyer_a, 2580), (buyer_b, 2650)):
            offer = BuyerOffer(
                requirement_id=None, listing_id=demo_listing.id, buyer_id=buyer.id,
                farmer_user_id=farmer_user.id, price_per_qtl=price,
                quantity_qtl=18, status="sent",
                message=f"We can pick up from your farm. Payment {buyer.on_time_payment_pct:.0f}% on-time record.",
            )
            db.add(offer)
        db.add(Notification(user_id=farmer_user.id, type="offer_received",
                            title=f"2 new offers on your Wheat (18 qtl)",
                            body=f"₹2,650/qtl from {buyers[6].business_name} and ₹2,580/qtl from {buyers[0].business_name}"))

    # ---------- notifications for demo farmer ----------
    for n in [
        ("price_alert", "Onion prices rising in Pune APMC", "Modal price up 4.2% this week (DEMO DATA)."),
        ("match", "3 new buyers match your wheat listing", "Open Best Selling Option to compare."),
        ("system", "Welcome to AgriMitra", "Know the Best Price. Find the Right Buyer. Sell Smarter."),
    ]:
        db.add(Notification(user_id=farmer_user.id, type=n[0], title=n[1], body=n[2]))

    # ---------- a resolved dispute for admin demo ----------
    sample_tx = db.scalar(select(Transaction).limit(1))
    if sample_tx:
        db.add(Dispute(transaction_id=sample_tx.id, raised_by_user_id=sample_tx.farmer_user_id,
                       category="payment", description="Payment was made 3 days late, need follow-up.",
                       status="resolved", resolution="Buyer advised; late-payment noted on buyer record."))

    # ---------- admin-configurable engine settings ----------
    db.add(SystemSetting(
        key="matching_weights",
        value='{"price": 30, "quality": 20, "quantity": 20, "distance": 15, "payment": 15}',
        description="Buyer↔listing matching score weights (0-100 each)",
    ))
    db.add(SystemSetting(
        key="recommendation_weights",
        value='{"net_realization": 35, "buyer_reliability": 20, "quality_match": 15, '
              '"quantity_match": 10, "distance": 10, "price_outlook": 10}',
        description="Best selling option recommendation weights",
    ))

    db.commit()
    print(f"[AgriMitra] seed complete. Demo logins: farmer@demo.com / Farmer@123, "
          f"buyer@demo.com / Buyer@123, fpo@demo.com / Fpo@123, admin@demo.com / Admin@123")

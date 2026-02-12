"""
Seed script — registers a mandi owner (ritvik2) and populates sample items + mandi-farmer orders.

Usage (with venv activated, server running on port 8001):
    python seed_mandi.py
"""

import requests
from datetime import datetime, timedelta
import random

BASE_URL = "http://localhost:8001"

# ── 1. Register a mandi owner ────────────────────────────────────────────────
print("=== Registering mandi owner ===")
register_resp = requests.post(f"{BASE_URL}/api/register", json={
    "username": "ritvik2",
    "password": "12345678",
    "role": "mandi_owner",
    "contact": "+919876500002",
    "latitude": 13.1245,
    "longitude": 77.6543,
    "language": "Kannada",
})

if register_resp.status_code == 201:
    print(f"✅ Registered: {register_resp.json()}")
elif "already registered" in register_resp.text.lower():
    print("ℹ️  User already exists, skipping registration.")
else:
    print(f"❌ Registration failed: {register_resp.text}")

# ── 2. Login to get JWT ─────────────────────────────────────────────────────
print("\n=== Logging in ===")
login_resp = requests.post(f"{BASE_URL}/api/login", json={
    "username": "ritvik2",
    "password": "12345678",
})

if login_resp.status_code != 200:
    print(f"❌ Login failed: {login_resp.text}")
    exit(1)

token_data = login_resp.json()
TOKEN = token_data["access_token"]
HEADERS = {"Authorization": f"Bearer {TOKEN}"}
print(f"✅ Logged in as {token_data['username']} (role={token_data['role']}, id={token_data['user_id']})")

# ── 3. Populate mandi items (4 items) ───────────────────────────────────────
print("\n=== Creating mandi items ===")
items_to_create = [
    {"item_name": "Tomato Bulk",     "current_qty": 5000.0},
    {"item_name": "Onion Sack",      "current_qty": 4500.0},
    {"item_name": "Potato Quintal",  "current_qty": 8000.0},
    {"item_name": "Sona Masoori Rice", "current_qty": 2000.0},
]

for item in items_to_create:
    resp = requests.post(f"{BASE_URL}/api/mandi/items", json=item, headers=HEADERS)
    if resp.status_code == 201:
        print(f"  ✅ Created item: {item['item_name']} ({item['current_qty']} kg)")
    else:
        print(f"  ❌ Failed: {item['item_name']} — {resp.text}")

# ── 4. Populate 3 months of mandi-farmer orders ─────────────────────────────
print("\n=== Creating 3 months of orders ===")

ITEMS = ["tomato", "onion", "potato", "rice"]

# Price ranges per item (₹/kg) - generally lower than retail
PRICE_RANGES = {
    "tomato": (10.0, 40.0),
    "onion":  (8.0, 35.0),
    "potato": (12.0, 25.0),
    "rice":   (25.0, 80.0),
}

TODAY = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
START_DATE = TODAY - timedelta(days=90)  # 3 months back

# Generate 5-10 orders per day for 90 days (mandis handle more volume)
orders_to_create = []
current_date = START_DATE
while current_date <= TODAY:
    num_orders = random.randint(5, 10)
    for _ in range(num_orders):
        item = random.choice(ITEMS)
        low, high = PRICE_RANGES[item]
        # Random lat/lng for source (farmer) and destination (mandi owner location)
        orders_to_create.append({
            "src_lat": round(random.uniform(12.0, 14.0), 4),
            "src_long": round(random.uniform(76.0, 78.0), 4),
            "dest_lat": 13.1245,      # ritvik2 location
            "dest_long": 77.6543,
            "item": item,
            "start_time": (current_date + timedelta(hours=random.randint(4, 11), minutes=random.randint(0, 59))).isoformat(),
            "price_per_kg": round(random.uniform(low, high), 2),
            "order_date": current_date.strftime("%Y-%m-%dT00:00:00"),
        })
    current_date += timedelta(days=1)

print(f"  Generating {len(orders_to_create)} orders across 90 days...")

success = 0
failed = 0
for order in orders_to_create:
    resp = requests.post(f"{BASE_URL}/api/mandi/orders", json=order, headers=HEADERS)
    if resp.status_code == 201:
        success += 1
    else:
        failed += 1

print(f"  ✅ Created: {success}  |  ❌ Failed: {failed}")

# ── 5. Verify ───────────────────────────────────────────────────────────────
print("\n=== Verification ===")
items_resp = requests.get(f"{BASE_URL}/api/mandi/items", headers=HEADERS)
orders_resp = requests.get(f"{BASE_URL}/api/mandi/orders", headers=HEADERS)
print(f"Total items  in DB: {len(items_resp.json())}")
print(f"Total orders in DB: {len(orders_resp.json())}")
print("\n🎉 Done! Mandi data seeded successfully.")

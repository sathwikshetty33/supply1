from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import random

from farmer.ai_advisor import get_ai_recommendation, parse_voice_command
from farmer.weather import get_weather_data, search_market_info
from farmer.alerts import categorize_alerts

router = APIRouter(tags=["farmer"])


# ─── Request / Response Models ───
class FarmSetup(BaseModel):
    location: str = ""
    lat: float
    lng: float
    hectares: float = 1.0
    crop: str = "tomato"

class VoiceCommand(BaseModel):
    text: str
    lat: float = 12.97
    lng: float = 77.59
    location: str = ""

class AnalyzeRequest(BaseModel):
    crop: str
    quantity: float
    lat: float
    lng: float
    location: str = ""

class WeatherRequest(BaseModel):
    lat: float
    lng: float
    location: str = ""


# ─── Mock Mandi Data ───
MOCK_MANDIS = [
    {"id": 1, "name": "APMC Yeshwanthpur", "lat": 13.0220, "lng": 77.5513, "district": "Bangalore Urban"},
    {"id": 2, "name": "KR Market", "lat": 12.9634, "lng": 77.5779, "district": "Bangalore Urban"},
    {"id": 3, "name": "Bangalore APMC Binny Mill", "lat": 12.9780, "lng": 77.5726, "district": "Bangalore Urban"},
    {"id": 4, "name": "Chikkaballapur Mandi", "lat": 13.4355, "lng": 77.7270, "district": "Chikkaballapur"},
    {"id": 5, "name": "Kolar Mandi", "lat": 13.1362, "lng": 78.1296, "district": "Kolar"},
    {"id": 6, "name": "Tumkur APMC", "lat": 13.3392, "lng": 77.1010, "district": "Tumkur"},
    {"id": 7, "name": "Mysore Mandi", "lat": 12.3051, "lng": 76.6551, "district": "Mysore"},
    {"id": 8, "name": "Mandya APMC", "lat": 12.5218, "lng": 76.8951, "district": "Mandya"},
]

CROP_PRICE_RANGES = {
    "tomato": (15, 55), "onion": (20, 60), "potato": (18, 40),
    "wheat": (22, 35), "rice": (30, 50), "chilli": (80, 200),
    "carrot": (25, 50), "brinjal": (20, 45), "cabbage": (12, 30),
    "cauliflower": (25, 60), "banana": (20, 45), "mango": (40, 120),
    "grape": (50, 150), "apple": (80, 200), "sugarcane": (3, 5),
}

import math

def haversine_distance(lat1, lng1, lat2, lng2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def get_mandis_with_prices(lat: float, lng: float, crop: str):
    """Returns mandis sorted by distance with simulated prices"""
    price_range = CROP_PRICE_RANGES.get(crop.lower(), (20, 50))
    
    mandis = []
    for m in MOCK_MANDIS:
        dist = haversine_distance(lat, lng, m["lat"], m["lng"])
        price = round(random.uniform(*price_range), 2)
        transport_cost = round(dist * 2.5 + random.uniform(100, 500), 2)  # ₹/trip
        mandis.append({
            **m,
            "distance_km": round(dist, 1),
            "price_per_kg": price,
            "transport_cost": transport_cost,
            "travel_time_min": round(dist * 1.8 + random.uniform(10, 30)),
        })
    
    mandis.sort(key=lambda x: x["distance_km"])
    return mandis


# ─── Endpoints ───

@router.get("/mandis")
async def get_nearby_mandis(lat: float = 12.97, lng: float = 77.59, crop: str = "tomato"):
    """Get nearby mandis with current prices for a crop"""
    mandis = get_mandis_with_prices(lat, lng, crop)
    return {"mandis": mandis, "crop": crop, "total": len(mandis)}


@router.post("/analyze")
async def analyze_sell(req: AnalyzeRequest):
    """AI-powered analysis: when & where to sell for best profit"""
    # Get mandi prices
    mandis = get_mandis_with_prices(req.lat, req.lng, req.crop)
    mandi_data = [{"name": m["name"], "price_per_kg": m["price_per_kg"], "distance_km": m["distance_km"], "transport_cost": m["transport_cost"]} for m in mandis[:5]]
    
    # Get weather
    weather = await get_weather_data(req.lat, req.lng, req.location)
    
    # Get market info from Tavily
    market_info = await search_market_info(req.crop, req.location or "Karnataka")
    
    # Get AI recommendation
    ai_result = await get_ai_recommendation(
        crop=req.crop,
        quantity=req.quantity,
        lat=req.lat,
        lng=req.lng,
        weather_data=weather,
        mandi_data=mandi_data
    )
    
    # Generate alerts
    alerts = categorize_alerts(ai_result) if isinstance(ai_result, dict) else []
    
    return {
        "ai_recommendation": ai_result,
        "mandis": mandis[:5],
        "weather": weather,
        "market_info": market_info,
        "alerts": alerts,
        "request": {"crop": req.crop, "quantity": req.quantity}
    }


@router.post("/voice")
async def process_voice(cmd: VoiceCommand):
    """Parse voice command and trigger appropriate action"""
    parsed = await parse_voice_command(cmd.text)
    
    if parsed.get("action") == "sell" and parsed.get("crop") and parsed.get("quantity"):
        # Auto-trigger analysis
        analysis = await analyze_sell(AnalyzeRequest(
            crop=parsed["crop"],
            quantity=parsed["quantity"],
            lat=cmd.lat,
            lng=cmd.lng,
            location=cmd.location
        ))
        return {
            "parsed_command": parsed,
            "analysis": analysis
        }
    elif parsed.get("action") == "check_weather":
        weather = await get_weather_data(cmd.lat, cmd.lng, cmd.location)
        return {"parsed_command": parsed, "weather": weather}
    elif parsed.get("action") == "check_price":
        crop = parsed.get("crop", "tomato")
        mandis = get_mandis_with_prices(cmd.lat, cmd.lng, crop)
        return {"parsed_command": parsed, "mandis": mandis[:5], "crop": crop}
    else:
        return {"parsed_command": parsed, "message": "Command not fully understood. Try: 'sell 100kg tomato' or 'check weather'"}


@router.post("/weather")
async def get_weather(req: WeatherRequest):
    """Get weather for farmer's location"""
    weather = await get_weather_data(req.lat, req.lng, req.location)
    return weather

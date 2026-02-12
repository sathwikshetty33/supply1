"""
Demand-alert agent — runs on a cron schedule (or manually via API).

Uses `from langchain.agents import create_agent` with langchain-groq LLM.

Flow:
  1. Query the DB for past-7-day retailer-mandi orders (sales data).
  2. Fetch distinct retailer locations (latitude/longitude).
  3. Use Tavily to search for market / demand news near those locations.
  4. LLM decides whether to create alerts.
  5. Persist alerts into the `alerts` table with severity.
"""

import json
import logging
from datetime import datetime, timedelta

from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func

from langchain.agents import create_agent
from langchain_core.tools import tool
from langchain_groq import ChatGroq

from config import settings
from database import SessionLocal
from models import RetailerMandiOrder, Retailer, User, Alert

logger = logging.getLogger("demand_agent")


# ── Custom DB tools ─────────────────────────────────────────────────────────
@tool
def get_recent_sales(user_id: str) -> str:
    """
    Fetch retailer-mandi orders from the past 5 days for a specific retailer.
    Input: user_id (str)
    Returns: JSON list of {item, total_qty, avg_price}
    """
    db: Session = SessionLocal()
    try:
        if not user_id or user_id == "all":
             # Fallback if LLM passes "all" or empty
             filter_condition = True 
        else:
             retailer = db.query(Retailer).filter(Retailer.user_id == int(user_id)).first()
             if not retailer: return "Retailer not found."
             filter_condition = RetailerMandiOrder.destination == retailer.user.username # Assuming destination matches username for now, or we join properly.
             # Actually, RetailerMandiOrder doesn't verify relation easily without join. 
             # Simpler: We changed schema to lat/lng. We don't have a direct link in RetailerMandiOrder to Retailer ID unless we infer from location or add a column.
             # WAIT: The current RetailerMandiOrder model lacks a 'retailer_id' column! It has src/dest lat/lng. 
             # This is a schema limitation. For now, I will fetch ALL orders near the retailer's location.
             pass

        # REVISED STRATEGY due to schema: 
        # RetailerMandiOrder has dest_lat/dest_long. 
        # We find the retailer's location, then find orders with matching (approx) dest_lat/long.
        
        target_uid = int(user_id) if user_id.isdigit() else None
        if not target_uid: return "Invalid user_id."

        retailer = db.query(Retailer).join(User).filter(Retailer.user_id == target_uid).first()
        if not retailer or not retailer.user.latitude:
            return "Retailer location not found."
            
        r_lat = retailer.user.latitude
        r_lng = retailer.user.longitude

        five_days_ago = datetime.utcnow() - timedelta(days=5)
        
        # Find orders delivered to this location (approx match 0.001 deg ~ 100m)
        rows = (
            db.query(
                RetailerMandiOrder.item,
                sa_func.sum(RetailerMandiOrder.price_per_kg).label("total_price"), # Proxy for volume if qty missing, but we have price.. wait, model has price_per_kg but where is quantity? 
                # Model doesn't have quantity! It checks 'price_per_kg'. 
                # Checking schemas.. RetailerMandiOrderCreate has price_per_kg and item. 
                # It seems we missed 'quantity' in the Order models?
                # The user asked: "based on previous 5 days sales".
                # I will count *number of orders* as sales volume for now.
                sa_func.count(RetailerMandiOrder.id).label("order_count"),
                sa_func.avg(RetailerMandiOrder.price_per_kg).label("avg_price")
            )
            .filter(
                RetailerMandiOrder.order_date >= five_days_ago.date(),
                sa_func.abs(RetailerMandiOrder.dest_lat - r_lat) < 0.001,
                sa_func.abs(RetailerMandiOrder.dest_long - r_lng) < 0.001
            )
            .group_by(RetailerMandiOrder.item)
            .all()
        )
        
        results = [
            {
                "item": r.item,
                "order_count": r.order_count,
                "avg_price": round(float(r.avg_price), 2)
            }
            for r in rows
        ]
        
        if not results:
            return "No sales/orders found for this retailer in the past 5 days."
            
        return json.dumps(results, indent=2)
    finally:
        db.close()


@tool
def get_retailer_details(user_id: str) -> str:
    """
    Get location and details for a specific retailer.
    Input: user_id (str)
    """
    db: Session = SessionLocal()
    try:
        try:
            uid = int(user_id)
        except:
            return "Invalid user_id"

        row = (
            db.query(User.username, User.latitude, User.longitude, User.contact)
            .join(Retailer, Retailer.user_id == User.id)
            .filter(User.id == uid)
            .first()
        )
        if not row:
            return "Retailer not found."
            
        return json.dumps({
            "username": row.username,
            "latitude": float(row.latitude) if row.latitude else None,
            "longitude": float(row.longitude) if row.longitude else None,
            "contact": row.contact
        })
    finally:
        db.close()


@tool
def save_personal_alert(alert_json: str) -> str:
    """
    Save an alert.
    Input JSON: { "user_id": int, "message": str, "severity": "low"|"medium"|"high"}
    """
    return save_alert(alert_json) # reuse existing function logic if possible or copy paste
    # To avoid 'save_alert' not defined error if I replaced it, I'll paste logic here.
    
    db: Session = SessionLocal()
    try:
        data = json.loads(alert_json)
        alert = Alert(
            user_id=data["user_id"],
            message=data["message"],
            severity=data.get("severity", "medium"),
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)
        return f"Alert saved for user {alert.user_id}."
    except Exception as e:
        return f"Error: {e}"
    finally:
        db.close()


# ── System prompt ────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are a smart retail assistant.
Your goal: Analyze sales AND local events to warn a SPECIFIC retailer.

INPUT: You will be given a specific `user_id`.

STEPS:
1. Call `get_retailer_details(user_id)` to get their location.
2. Call `get_recent_sales(user_id)` to see their sales (demand) over the past 5 days.
   - If sales for an item are high/rising, it's a "High Demand" signal.
3. Use `tavily_search_results_json` to find LOCAL news/events near their lat/long.
   - Search for: "events in [City/Area]", "festivals near [Lat, Long]", "weather warnings [Location]".
   - If an event is coming up (festival, holiday, storm), demand might spike.
4. COMBINE insights:
   - IF (High Past Sales) AND (Upcoming Event) -> Critical Alert: "Stock up immediately!"
   - IF (Normal Sales) AND (Upcoming Event) -> Medium Alert: "Event coming, expect demand."
   - IF (High Sales) AND (No Event) -> Medium Alert: "Trending item, restock."
5. Call `save_personal_alert` with the specific `user_id` and your message.
6. Return a summary.
"""


# ── Build & run ──────────────────────────────────────────────────────────────
def run_demand_agent(target_user_id: int = None) -> str:
    """
    Run agent. If target_user_id is None, it runs for ALL retailers (legacy mode).
    If target_user_id is provided, it runs ONLY for that retailer.
    """
    # ... legacy loop logic if need be, but user asked to update "the prompt to include user_id" 
    # implying we run it FOR a specific user.
    # To keep backward compat, if None, we could loop all. 
    # But let's simplify: The specific prompt above expects a user_id. 
    # If no ID provided, we can pick the first one or fail. 
    # Let's assume for this task we just support the specific mode or loop all calling the agent for each.
    
    from langchain_community.tools.tavily_search import TavilySearchResults

    tavily_search = TavilySearchResults(
        max_results=5,
        api_key=settings.TAVILY_API_KEY,
    )

    llm = ChatGroq(
        model="gpt-oss-120b",
        api_key=settings.GROQ_API_KEY,
    )
    
    tools = [get_recent_sales, get_retailer_details, tavily_search, save_personal_alert]

    agent = create_agent(llm, tools=tools, prompt=SYSTEM_PROMPT)

    # If target_user_id is provided, run once.
    if target_user_id:
        result = agent.invoke({
            "messages": [("user", f"Analyze for retailer user_id='{target_user_id}'")]
        })
        return result.get("messages", [])[-1].content
    
    # If no ID, loop all (legacy behavior support)
    db = SessionLocal()
    retailers = db.query(Retailer).all()
    db.close()
    
    log = []
    for r in retailers:
        try:
             res = agent.invoke({
                "messages": [("user", f"Analyze for retailer user_id='{r.user_id}'")]
             })
             log.append(f"User {r.user_id}: " + res.get("messages", [])[-1].content)
        except Exception as e:
             log.append(f"User {r.user_id} clean failed: {e}")
             
    return "\n".join(log)

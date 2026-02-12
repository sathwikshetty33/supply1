from datetime import datetime


def create_alert(message: str, priority: str = "info"):
    """
    Creates an alert object. Alerts are categorized into 3 tiers:
    - critical: Urgent issues (price crash, severe weather)
    - warning: Important but not urgent (price dropping, rain expected)
    - info: General information (market update, tip)
    """
    return {
        "message": message,
        "priority": priority,  # critical | warning | info
        "timestamp": datetime.utcnow().isoformat(),
        "seen": False
    }


def categorize_alerts(ai_response: dict):
    """
    Takes AI response and extracts categorized alerts from it.
    """
    alerts = []
    
    # Check for urgent alerts from AI
    urgent = ai_response.get("urgent_alerts", [])
    for msg in urgent:
        alerts.append(create_alert(msg, "critical"))
    
    # Check price trend
    price_trend = ai_response.get("price_trend", "")
    if "DOWN" in str(price_trend).upper():
        alerts.append(create_alert(f"Price Alert: {price_trend}", "warning"))
    
    # Check weather impact
    weather = ai_response.get("weather_impact", "")
    if any(word in str(weather).lower() for word in ["rain", "storm", "flood", "drought", "cyclone"]):
        alerts.append(create_alert(f"Weather Alert: {weather}", "warning"))
    
    # General recommendation
    rec = ai_response.get("recommendation", "")
    if rec:
        alerts.append(create_alert(f"Recommendation: {rec}", "info"))
    
    return alerts

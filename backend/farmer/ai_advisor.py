import os
import json
import httpx
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

async def get_ai_recommendation(crop: str, quantity: float, lat: float, lng: float, weather_data: dict = None, mandi_data: list = None):
    """
    Uses Groq LLM to analyze market conditions and recommend best sell strategy.
    Returns trade-off analysis with multiple scenarios.
    """
    context = f"""You are an expert agricultural market advisor in India. A farmer wants to sell {quantity} kg of {crop}.
    
Farm Location: lat {lat}, lng {lng}

Weather Data: {json.dumps(weather_data) if weather_data else 'Not available'}

Nearby Mandi Prices: {json.dumps(mandi_data) if mandi_data else 'Not available'}

Analyze and provide a JSON response with this exact structure:
{{
    "recommendation": "SELL_NOW" or "WAIT",
    "best_mandi": {{
        "name": "mandi name",
        "price_per_kg": number,
        "distance_km": number,
        "reason": "why this mandi"
    }},
    "scenarios": [
        {{
            "action": "Sell Now at [Mandi]",
            "expected_revenue": number,
            "transport_cost": number,
            "net_profit": number,
            "risk_level": "LOW/MEDIUM/HIGH",
            "factors": ["factor1", "factor2"]
        }}
    ],
    "weather_impact": "brief weather assessment",
    "price_trend": "UP/DOWN/STABLE with explanation",
    "urgent_alerts": ["any urgent issues"],
    "spoken_summary": "A simple 2-sentence summary in Hindi that can be read aloud to the farmer"
}}"""

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": "You are an Indian agricultural market expert. Always respond with valid JSON only. No markdown."},
            {"role": "user", "content": context}
        ],
        "temperature": 0.3,
        "max_tokens": 2000
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(GROQ_URL, headers=headers, json=payload)
        response.raise_for_status()
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        
        # Try to parse JSON
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            # Try to extract JSON from the response
            start = content.find('{')
            end = content.rfind('}') + 1
            if start != -1 and end > start:
                return json.loads(content[start:end])
            return {"error": "Could not parse AI response", "raw": content}


async def parse_voice_command(text: str):
    """
    Uses Groq to parse farmer's voice command into structured data.
    e.g., "I want to sell 100kg tomato" -> {"action": "sell", "crop": "tomato", "quantity": 100}
    """
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": """You parse farmer voice commands into structured JSON. 
Extract: action (sell/buy/check_price/check_weather), crop name, quantity in kg.
If the command is in Hindi or Hinglish, still parse it correctly.
Always respond with valid JSON only: {"action": "sell", "crop": "tomato", "quantity": 100, "unit": "kg"}
If you can't parse, return: {"action": "unknown", "original_text": "..."}"""},
            {"role": "user", "content": text}
        ],
        "temperature": 0.1,
        "max_tokens": 200
    }
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(GROQ_URL, headers=headers, json=payload)
        response.raise_for_status()
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            start = content.find('{')
            end = content.rfind('}') + 1
            if start != -1 and end > start:
                return json.loads(content[start:end])
            return {"action": "unknown", "original_text": text}

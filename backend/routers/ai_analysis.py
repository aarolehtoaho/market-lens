from fastapi import APIRouter, HTTPException
from backend.database import Database
from backend.services.prompt_builder import build_prompt
from backend.services.llm.openai_service import OpenAIService
from backend.services.llm.claude_service import ClaudeService
from backend.services.llm.gemini_service import GeminiService
from backend.services.llm.ollama_service import OllamaService

router = APIRouter()
db = Database()

@router.post("/generate")
async def generate_analysis() -> dict:
    tickers: list[dict[str, str]] = db.list_tickers()
    interest_list: list[str] = [interest["interest"] for interest in db.list_interests()]
    ohlcv_data: dict[str, list[dict]] = {}
    indicator_data: dict[str, list[dict[str, float]]] = {}
    periods: dict[str, str] = {}
    intervals: dict[str, str] = {}

    for ticker in tickers:
        symbol = ticker["symbol"]
        data = db.get_cached_ohlcv_data(symbol)
        if data:
            ohlcv_data[symbol] = data["data"]
        else:
            raise HTTPException(status_code=404, detail=f"No cached data found for symbol: {symbol}")
        
        data = db.get_cached_indicator_data(symbol)
        if data:
            indicator_data[symbol] = data["data"]
        else:
            raise HTTPException(status_code=404, detail=f"No cached indicator data found for symbol: {symbol}")
        
        chart_options = db.getChartOptions(symbol)
        periods[symbol] = chart_options.get("period", "1d")
        intervals[symbol] = chart_options.get("interval", "5m")
        
    prompt = build_prompt(tickers, ohlcv_data, indicator_data, interest_list, periods, intervals)

    llm_configurations = db.get_llm_configurations()
    if not llm_configurations:
        raise HTTPException(status_code=400, detail="No LLM configuration found. Please set up a valid configuration in the settings.")
    newest_config = llm_configurations[0]
    provider = newest_config["provider"].lower()
    model = newest_config["model"].strip()
    api_key = newest_config["api_key"]

    llm_service = None
    if "openai" in provider:
        llm_service = OpenAIService(api_key)
    elif "claude" in provider:
        llm_service = ClaudeService(api_key)
    elif "gemini" in provider:
        if model.startswith("models/"):
            model = model.replace("models/", "", 1)
        llm_service = GeminiService(api_key)
    elif "ollama" in provider:
        llm_service = OllamaService(api_key)
    else:
        raise HTTPException(status_code=400, detail="Unsupported LLM model configured. Please check your settings.")
    
    analysis = ""
    try:
        analysis = llm_service.generate_response(model, prompt)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate analysis: {str(e)}")
    
    db.save_llm_response(provider, model, prompt, analysis)

    return {"analysis": analysis}

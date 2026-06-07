from fastapi import APIRouter
from backend.services.fetcher import fetch_ohlcv_data

router = APIRouter()

@router.get("/{symbol}")
async def get_ohlcv(symbol: str, period: str = "1mo", interval: str = "1d") -> dict[str, list[dict] | str]:
    """Fetch OHLCV data for a given symbol and time range."""
    try:
        ohlcv_data = fetch_ohlcv_data(symbol, period, interval)
        return {"data": ohlcv_data}
    except ValueError as e:
        return {"error": str(e)}

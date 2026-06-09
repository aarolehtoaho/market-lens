from fastapi import APIRouter
from backend.services.fetcher import fetch_ohlcv_data

router = APIRouter()

@router.get("/")
async def get_ohlcv(symbol: str, period: str = "1mo", interval: str = "1d", prepost: bool = False) -> dict[str, list[dict] | str]:
    """Fetch OHLCV data for a given symbol and time range."""
    try:
        ohlcv_data = fetch_ohlcv_data(symbol, period, interval, prepost)
        ohlcv_data = addSMA(ohlcv_data)
        ohlcv_data = addVWAP(ohlcv_data)
        return {"data": ohlcv_data}
    except ValueError as e:
        return {"error": str(e)}

def addSMA(ohlcv_data):
    """Add SMA20, SMA50, and SMA200 to the OHLCV data."""
    closes = [entry['Close'] for entry in ohlcv_data]

    for i in range(len(ohlcv_data)):
        if i >= 19:
            ohlcv_data[i]['SMA20'] = sum(closes[i-19:i+1]) / 20
        else:
            ohlcv_data[i]['SMA20'] = None
        
        if i >= 49:
            ohlcv_data[i]['SMA50'] = sum(closes[i-49:i+1]) / 50
        else:
            ohlcv_data[i]['SMA50'] = None
        
        if i >= 199:
            ohlcv_data[i]['SMA200'] = sum(closes[i-199:i+1]) / 200
        else:
            ohlcv_data[i]['SMA200'] = None

    return ohlcv_data

def addVWAP(ohlcv_data):
    """
       Calculate Volume Weighted Average Price (VWAP) for the given data.
       VWAP is calculated only for regular market hours. All volume outside regular hours is 0.
    """
    cumulative_pv = 0
    cumulative_volume = 0
    last_date = None

    for entry in ohlcv_data:
        current_date = entry['Datetime'][:10] if isinstance(entry['Datetime'], str) else entry['Datetime'].date()

        if current_date != last_date and last_date is not None:
            cumulative_pv = 0
            cumulative_volume = 0
            last_date = current_date

        regularMarketHours = entry['Volume'] > 0
        if regularMarketHours:
            typical_price = (entry['High'] + entry['Low'] + entry['Close']) / 3
            
            cumulative_pv += typical_price * entry['Volume']
            cumulative_volume += entry['Volume']
            
            entry['VWAP'] = cumulative_pv / cumulative_volume
        else:
            entry['VWAP'] = None

    return ohlcv_data

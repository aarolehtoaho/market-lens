from fastapi import APIRouter
from backend.services.fetcher import fetch_ohlcv_data

router = APIRouter()

@router.get("/")
async def get_data(symbol: str, period: str = "1mo", interval: str = "1d", prepost: bool = False) -> dict[str, list[dict] | str]:
    """Fetch OHLCV and indicator data for a given symbol and time range."""
    try:
        ohlcv_data = fetch_ohlcv_data(symbol, period, interval, prepost)
        data = addSMA(ohlcv_data)
        data = addVWAP(data)
        data = addRSI(data)
        data = addBollingerBands(data)
        return {"data": data}
    except ValueError as e:
        return {"error": str(e)}

def addSMA(data):
    """Add SMA20, SMA50, and SMA200 to the OHLCV data."""
    closes = [entry['Close'] for entry in data]

    for i in range(len(data)):
        if i >= 19:
            data[i]['SMA20'] = sum(closes[i-19:i+1]) / 20
        else:
            data[i]['SMA20'] = None
        
        if i >= 49:
            data[i]['SMA50'] = sum(closes[i-49:i+1]) / 50
        else:
            data[i]['SMA50'] = None
        
        if i >= 199:
            data[i]['SMA200'] = sum(closes[i-199:i+1]) / 200
        else:
            data[i]['SMA200'] = None

    return data

def addVWAP(data):
    """
       Calculate Volume Weighted Average Price (VWAP) for the given data.
       VWAP is calculated only for regular market hours. All volume outside regular hours is 0.
    """
    cumulative_pv = 0
    cumulative_volume = 0
    last_date = None

    for entry in data:
        datetype = 'Datetime' if 'Datetime' in entry else 'Date' if 'Date' in entry else None
        current_date = entry[datetype][:10] if datetype and isinstance(entry[datetype], str) else entry[datetype].date() if datetype else None

        if datetype is None:
            entry['VWAP'] = None
            continue

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

    return data

def addRSI(data, period=14):
    """Add RSI to the OHLCV data."""
    regular_hours_data = [(idx, entry) for idx, entry in enumerate(data) if entry['Volume'] > 0]

    for entry in data:
        entry['RSI'] = None

    if len(regular_hours_data) <= period:
        return data

    gains = []
    losses = []
    
    for i in range(1, len(regular_hours_data)):
        current_close = regular_hours_data[i][1]['Close']
        prev_close = regular_hours_data[i-1][1]['Close']
        change = current_close - prev_close
        
        gains.append(max(change, 0))
        losses.append(max(-change, 0))

    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period

    first_target_idx = regular_hours_data[period][0]
    if avg_loss == 0:
        data[first_target_idx]['RSI'] = 100
    else:
        rs = avg_gain / avg_loss
        data[first_target_idx]['RSI'] = 100 - (100 / (1 + rs))

    for i in range(period, len(gains)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period
        
        target_idx = regular_hours_data[i + 1][0]
        
        if avg_loss == 0:
            data[target_idx]['RSI'] = 100
        else:
            rs = avg_gain / avg_loss
            data[target_idx]['RSI'] = 100 - (100 / (1 + rs))

    return data

def addBollingerBands(data, period=20):
    """Add Bollinger Bands to the OHLCV data."""
    closes = [entry['Close'] for entry in data]

    for i in range(len(data)):
        if i >= period - 1:
            sma = sum(closes[i-period+1:i+1]) / period
            stddev = (sum((closes[j] - sma) ** 2 for j in range(i-period+1, i+1)) / period) ** 0.5
            
            data[i]['BollingerUpper'] = sma + (2 * stddev)
            data[i]['BollingerLower'] = sma - (2 * stddev)
            data[i]['BollingerMiddle'] = sma
        else:
            data[i]['BollingerUpper'] = None
            data[i]['BollingerLower'] = None
            data[i]['BollingerMiddle'] = None

    return data

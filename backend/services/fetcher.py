import yfinance as yf

def search_tickers(query: str) -> list[dict]:
    search_results = yf.Search(query, max_results=8)
    tickers = []
    for result in search_results.quotes:
        tickers.append({
            "symbol": result.get("symbol"),
            "name": result.get("shortname") or result.get("longname"),
            "exchange": result.get("exchange"),
        })
    return tickers

# Function for fetching OHLCV data for a given ticker and time range
def fetch_ohlcv_data(symbol: str, period: str = "1mo", interval: str = "1d", prepost: bool = False) -> list[dict]:
    ticker = yf.Ticker(symbol)
    if ticker is None:
        raise ValueError(f"Ticker '{symbol}' not found.")
    
    ohlcv_data = ticker.history(period=period, interval=interval, prepost=prepost)
    if ohlcv_data.empty:
        raise ValueError(f"No OHLCV data found for ticker '{symbol}' with period '{period}' and interval '{interval}'.")
    
    return ohlcv_data.reset_index().to_dict(orient="records")

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

def fetch_ohlcv_data(symbol: str, period: str = "1mo", interval: str = "1d", prepost: bool = False) -> list[dict]:
    ticker = yf.Ticker(symbol)
    if ticker is None:
        raise ValueError(f"Ticker '{symbol}' not found.")
    
    ohlcv_data = ticker.history(period=period, interval=interval, prepost=prepost)
    if ohlcv_data.empty:
        raise ValueError(f"No OHLCV data found for ticker '{symbol}' with period '{period}' and interval '{interval}'.")
    
    return ohlcv_data.reset_index().to_dict(orient="records")

def get_watchlist_info(symbols: list[str]) -> dict[str, dict]:
    if not symbols:
        return {}
    
    tickers_str = " ".join(symbols)
    tickers = yf.Tickers(tickers_str)

    watchlist_data = {}

    for symbol in symbols:
        try:
            info = tickers.tickers[symbol].fast_info

            current_price = info.get("lastPrice")
            previous_close = info.get("previousClose")

            if current_price is not None and previous_close is not None:
                price_change = current_price - previous_close
                price_change_percent = (price_change / previous_close) * 100 if previous_close != 0 else 0
            else:
                price_change = None
                price_change_percent = None

            watchlist_data[symbol] = {
                "symbol": symbol,
                "current_price": current_price,
                "price_change": price_change,
                "price_change_percent": price_change_percent,
                "currency": info.get("currency", "USD"),
                "open": info.get("open"),
                "high": info.get("dayHigh"),
                "low": info.get("dayLow"),
            }
        except Exception as e:
            watchlist_data[symbol] = {"symbol": symbol, "error": str(e)}

    return watchlist_data

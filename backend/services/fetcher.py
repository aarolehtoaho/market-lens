import yfinance as yf

def search_tickers(query: str) -> list[dict]:
    search_results = yf.Search(query, max_results=8)
    tickers = []
    for result in search_results:
        tickers.append({
            "symbol": result.get("symbol"),
            "name": result.get("shortname") or result.get("longname"),
            "exchange": result.get("exchange"),
            "type": result.get("type"),
        })
    return tickers
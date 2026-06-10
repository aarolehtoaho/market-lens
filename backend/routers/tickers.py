from fastapi import APIRouter, Query
from pydantic import BaseModel
from backend.services.fetcher import search_tickers, get_watchlist_info
from backend.database import Database

router = APIRouter()
db = Database()

class TickerItem(BaseModel):
    symbol: str
    name: str
    exchange: str
    position: int

class ChartOptions(BaseModel):
    symbol: str
    period: str
    interval: str

@router.get("/")
async def list_tickers() -> list[dict]:
    return db.list_tickers()

@router.get("/search")
async def search(q: str = Query(min_length=1)) -> list[dict]:
    cached_tickers = db.search_cached_tickers(q)
    if cached_tickers is not None:
        return cached_tickers

    results = search_tickers(q)
    db.cache_ticker_search(q, results)

    return results

@router.get("/info")
async def get_ticker_info(symbols: list[str] = Query(...)) -> dict[str, dict]:
    return get_watchlist_info(symbols)

@router.post("/")
async def add_ticker(ticker_data: TickerItem):
    ticker = {
        "symbol": ticker_data.symbol, 
        "name": ticker_data.name, 
        "exchange": ticker_data.exchange
    }
    
    db.add_ticker(ticker, ticker_data.position)
    return {"message": f"Ticker {ticker_data.symbol} added to watchlist."}

@router.delete("/{symbol}")
async def remove_ticker(symbol: str):
    db.remove_ticker(symbol)
    return {"message": f"Ticker {symbol} removed from watchlist."}

@router.get("/chart-options")
async def get_chart_options(symbol: str) -> dict:
    return db.getChartOptions(symbol)

@router.post("/chart-options")
async def set_chart_options(chart_options: ChartOptions):
    db.setChartOptions(chart_options.symbol, chart_options.period, chart_options.interval)
    return {"message": f"Chart options for {chart_options.symbol} updated to period: {chart_options.period}, interval: {chart_options.interval}."}

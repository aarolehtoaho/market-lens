from fastapi import APIRouter, Query
from pydantic import BaseModel
from backend.services.fetcher import search_tickers
from backend.database import Database

router = APIRouter()
db = Database()

class TickerItem(BaseModel):
    symbol: str
    name: str
    exchange: str
    position: int

@router.get("/search")
async def search(q: str = Query(min_length=1)) -> list[dict]:
    cached_tickers = db.search_cached_tickers(q)
    if cached_tickers is not None:
        return cached_tickers

    results = search_tickers(q)
    db.cache_ticker_search(q, results)

    return results

@router.get("/")
async def list_tickers() -> list[dict]:
    return db.list_tickers()

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

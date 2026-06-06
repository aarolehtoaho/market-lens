from fastapi import APIRouter, Query
from backend.services.fetcher import search_tickers
from backend.database import Database

router = APIRouter()
db = Database()

@router.get("/search")
async def search(q: str = Query(min_length=1)) -> list[dict]:
    cached_tickers = db.search_cached_tickers(q)
    if cached_tickers is not None:
        return cached_tickers

    results = search_tickers(q)
    db.cache_ticker_search(q, results)

    return results
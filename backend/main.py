from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from backend.routers import tickers

app = FastAPI(
    title="MarketLens API",
    description="Backend API for watchlist, market data, and AI-assisted stock analysis.",
    version="0.1.0",
)

app.include_router(tickers.router, prefix="/api/tickers")

# Mount static files
static_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
app.mount("/css", StaticFiles(directory=os.path.join(static_dir, "css")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(static_dir, "js")), name="js")

@app.get("/")
async def root():
    """Serve the frontend home page (index.html)"""
    frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "index.html")
    return FileResponse(frontend_path)

@app.get("/api/home")
async def get_home_data() -> dict:
    """Return home page data as JSON."""
    return {
        "title": "MarketLens",
        "subtitle": "AI-powered stock market analysis",
    }

@app.get("/health")
async def health() -> dict:
    return {"ok": True}
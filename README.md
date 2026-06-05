# MarketLens 📈

> A personal stock market analysis tool with AI-powered pattern recognition and reporting.

---

## Table of Contents

- [Overview](#overview)
- [Core Features](#core-features)
- [How It Works](#how-it-works)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [LLM Integration](#llm-integration)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Roadmap](#roadmap)

---

## Overview

MarketLens is a self-hosted web application that lets you build a personal stock watchlist, visualize historical market data, and run AI-powered analysis reports tailored to your specific interests.

Instead of browsing generic financial news or relying on subscription screeners, MarketLens lets you define exactly what you care about, technical analysis patterns such as head and shoulders, sudden volume spikes, RSI divergence, price crossing a moving average — and then sends that context to an LLM of your choice to generate a focused, readable report across all your tracked stocks.

The LLM layer is fully swappable. You can point it at Claude, OpenAI, Google Gemini, or a locally-running Ollama instance (e.g. llama3, mistral) — all configurable from the settings page with no code changes required.

---

## Core Features

### 1. Watchlist Management
Add any publicly traded ticker symbol (e.g. `AAPL`, `TSLA`, `NVDA`) to your personal watchlist. Tickers can be grouped by sector or theme (e.g. "Tech", "Dividend", "Speculative"). Price cards on the dashboard show the latest close, daily change, and a sparkline.

### 2. Interactive Charts
For each ticker, view a full interactive candlestick chart with:
- Selectable time ranges: 1W, 1M, 3M, 6M, 1Y, 5Y
- Volume bars as a subplot
- Overlay toggles for SMA 20, SMA 50, SMA 200, VWAP

### 3. AI Analysis Reports
The most powerful feature. Configure your interests once by listing the patterns and phenomena you care about. Finally trigger an analysis run.

MarketLens:
1. Pulls the latest OHLCV data and pre-computed indicators for each stock in your watchlist
2. Formats them into a structured, concise prompt
3. Sends the prompt to your configured LLM provider
4. Renders the returned markdown report, with one section per ticker

Reports are stored in the database so you can browse historical runs.

### 4. LLM Provider Settings
A settings page lets you configure:
- Which LLM provider to use (Claude, OpenAI, Gemini, Ollama)
- API key (stored locally, never sent anywhere except the provider)
- Model name (e.g. `claude-sonnet-4-20250514`, `gpt-4o`, `llama3`)
- For local Ollama: the base URL (e.g. `http://localhost:11434`)

---

## How It Works

```
User adds tickers to watchlist
        │
        ▼
FastAPI fetches OHLCV data via yfinance
        │
        ▼
Data cached in SQLite (avoids repeat API calls)
        │
        ▼
Analysis engine computes indicators
        │
        ▼
Frontend renders candlestick charts
        │
        ▼
User configures analysis interests + triggers report
        │
        ▼
Backend assembles structured prompt (data + findings + interests)
        │
        ▼
LLM router sends prompt to chosen provider
        │
        ▼
Markdown report stored in DB + rendered in browser
```

---

## Project Structure

```
marketlens/
│
├── backend/
│   ├── main.py                  # FastAPI app entrypoint
│   ├── config.py
│   ├── database.py
│   │
│   ├── models/
│   │   ├── ticker.py            # Ticker / watchlist entries
│   │   ├── ohlcv.py             # Cached OHLCV price rows
│   │   ├── report.py            # Stored AI analysis reports
│   │   └── settings.py          # User preferences + LLM config
│   │
│   ├── routers/                 # FastAPI route handlers
│   │   ├── tickers.py           # GET/POST/DELETE watchlist endpoints
│   │   ├── market_data.py       # Fetch + return OHLCV data
│   │   ├── analysis.py          # Run indicator + pattern analysis
│   │   ├── reports.py           # Trigger + retrieve AI reports
│   │   └── settings.py          # Read/write user settings
│   │
│   ├── services/
│   │   ├── fetcher.py           # yfinance wrapper, cache logic
│   │   ├── indicators.py        # pandas-ta indicator computation
│   │   ├── prompt_builder.py    # Assembles LLM prompt from findings
│   │   └── llm.py
│   │
│   └── schemas/                 # Pydantic request/response schemas
│       ├── ticker.py
│       ├── market_data.py
│       ├── analysis.py
│       └── report.py
│
├── frontend/
│   ├── index.html               # Dashboard / watchlist overview
│   ├── chart.html               # Single-ticker chart view
│   ├── report.html              # AI report viewer
│   ├── settings.html            # LLM + analysis preference config
│   │
│   ├── css/
│   │   ├── main.css             # Global styles, CSS variables
│   │   ├── chart.css            # Chart page layout
│   │   └── report.css           # Report markdown rendering styles
│   │
│   └── js/
│       ├── api.js               # Fetch wrapper for backend calls
│       ├── dashboard.js         # Watchlist rendering, price cards
│       ├── chart.js             # Plotly.js candlestick chart setup
│       ├── report.js            # Report trigger + markdown rendering
│       └── settings.js          # Settings form handling
│
├── data/
│   └── marketlens.db            # SQLite database file (auto-created)
│
├── .env                         # API keys and local config (not committed)
├── .env.example                 # Template for required env vars
├── requirements.txt             # Python dependencies
└── README.md
```

---

## Tech Stack

### Backend

| Component | Technology | Notes |
|---|---|---|
| Language | Python 3.11+ | |
| Web framework | FastAPI | Async, automatic OpenAPI docs at `/docs` |
| ASGI server | Uvicorn | `uvicorn backend.main:app --reload` |
| ORM | SQLAlchemy 2.x | Declarative models, session management |
| Database | SQLite | File-based, zero-config, stored in `data/` |
| Market data | yfinance | Free, no API key required for basic use |
| Technical indicators | pandas-ta | 130+ indicators, built on pandas DataFrames |
| Data processing | pandas, numpy | OHLCV manipulation and indicator computation |
| Validation | Pydantic v2 | Request/response schema validation |
| LLM: Claude | anthropic SDK | `pip install anthropic` |
| LLM: OpenAI | openai SDK | `pip install openai` |
| LLM: Gemini | google-generativeai | `pip install google-generativeai` |
| LLM: Ollama | HTTP (requests) | Local endpoint, no extra SDK needed |

### Frontend

| Component | Technology | Notes |
|---|---|---|
| Language | Vanilla JavaScript (ES2022) | No build step, no framework |
| Markup | HTML5 | Semantic, accessible |
| Styles | CSS3 + custom properties | Dark/light theme via CSS variables |
| Charts | Plotly.js (CDN) | Candlestick, OHLCV, indicator overlays |
| Markdown rendering | marked.js (CDN) | For rendering AI report output |

### Why these choices?

**yfinance** is the fastest way to get started — no API key, no rate limit headaches for personal use, covers most global exchanges. If you need real-time data or higher reliability, swapping to Polygon.io or Alpha Vantage later requires only changing `fetcher.py`.

**pandas-ta** computes RSI, MACD, Bollinger Bands, and 130+ other indicators with a single `.ta` accessor on a pandas DataFrame. No manual formula implementation needed.

**Plotly.js via CDN** delivers professional-quality financial charts (candlestick, OHLCV, rangeslider) in vanilla JS with no build tooling. The chart configuration is pure JSON, making it easy to add or remove overlays dynamically.

**SQLite** is more than sufficient for a personal tool with one user and a few hundred cached tickers. All OHLCV data is keyed by ticker + date, so repeated fetches are served from the local cache rather than hitting the network.

---

## Database Schema

### `tickers`
Stores the user's watchlist entries.

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER PK | Auto-increment |
| `symbol` | TEXT UNIQUE | Ticker symbol e.g. `NVDA` |
| `display_name` | TEXT | e.g. `NVIDIA Corporation` |
| `group_name` | TEXT | Optional grouping label |
| `added_at` | DATETIME | When the ticker was added |

### `ohlcv_cache`
Cached daily price data fetched from yfinance.

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER PK | Auto-increment |
| `symbol` | TEXT | Foreign key to `tickers.symbol` |
| `date` | DATE | Trading date |
| `open` | REAL | Opening price |
| `high` | REAL | Daily high |
| `low` | REAL | Daily low |
| `close` | REAL | Closing price |
| `volume` | INTEGER | Daily volume |
| `fetched_at` | DATETIME | Cache timestamp |

### `findings`
Structured pattern detection results from the analysis engine.

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER PK | Auto-increment |
| `symbol` | TEXT | Related ticker |
| `date` | DATE | Date the finding occurred |
| `pattern` | TEXT | e.g. `rsi_oversold`, `volume_spike`, `macd_crossover` |
| `value` | REAL | Numeric context (e.g. RSI value = 28.4) |
| `magnitude` | REAL | Relative strength of the signal (optional) |
| `detected_at` | DATETIME | When the analysis engine produced this finding |

### `reports`
Stored AI analysis report runs.

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER PK | Auto-increment |
| `created_at` | DATETIME | When the report was generated |
| `provider` | TEXT | LLM used e.g. `claude`, `openai`, `ollama` |
| `model` | TEXT | Model name e.g. `claude-sonnet-4-20250514` |
| `interests` | TEXT | JSON array of user-selected analysis topics |
| `content` | TEXT | Full markdown report returned by the LLM |

### `settings`
User preferences and LLM configuration (single-row table).

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER PK | Always 1 |
| `llm_provider` | TEXT | Active provider: `claude`, `openai`, `gemini`, `ollama` |
| `llm_model` | TEXT | Model identifier string |
| `llm_api_key` | TEXT | Stored locally, never logged |
| `ollama_base_url` | TEXT | e.g. `http://localhost:11434` |
| `analysis_interests` | TEXT | JSON array of selected interest tags |
| `default_range` | TEXT | Default chart range e.g. `3M` |

---

## API Reference

All endpoints are served at `http://localhost:8000`. Interactive docs available at `/docs` (Swagger UI) and `/redoc`.

### Watchlist

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/tickers` | List all watchlist tickers |
| `POST` | `/tickers` | Add a ticker `{ symbol, group_name? }` |
| `DELETE` | `/tickers/{symbol}` | Remove a ticker |

### Market Data

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/market-data/{symbol}` | Fetch OHLCV history (uses cache) |
| `GET` | `/market-data/{symbol}?range=3M` | With time range filter |
| `POST` | `/market-data/refresh` | Force refresh all cached tickers |

### Analysis

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/analysis/{symbol}` | Get computed indicators + findings for a ticker |
| `POST` | `/analysis/run` | Run analysis engine across all tickers |

### Reports

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/reports` | List all stored reports |
| `GET` | `/reports/{id}` | Retrieve a single report |
| `POST` | `/reports/generate` | Trigger a new AI report run |

### Settings

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/settings` | Get current user settings |
| `PUT` | `/settings` | Update settings |

---

## LLM Integration

The LLM layer uses an adapter pattern so the analysis logic is completely decoupled from the provider. All adapters implement the same interface:

```python
# backend/services/llm/base.py
from abc import ABC, abstractmethod

class LLMAdapter(ABC):
    @abstractmethod
    def generate(self, system_prompt: str, user_prompt: str) -> str:
        """Send a prompt and return the response as a string."""
        ...
```

### Supported Providers

**Claude (Anthropic)**
```python
# Requires: pip install anthropic
# Set ANTHROPIC_API_KEY in .env
```

**OpenAI**
```python
# Requires: pip install openai
# Set OPENAI_API_KEY in .env
```

**Google Gemini**
```python
# Requires: pip install google-generativeai
# Set GOOGLE_API_KEY in .env
```

**Ollama (local)**
```python
# No extra dependencies — uses requests
# Requires Ollama running locally: https://ollama.com
# Set OLLAMA_BASE_URL=http://localhost:11434 in .env
# Pull a model first: ollama pull llama3
```

### How the Prompt is Built

`prompt_builder.py` assembles a structured prompt from:

1. **System context** — instructs the LLM to act as a quantitative analyst and to focus only on the user's stated interests
2. **Per-ticker data block** — recent OHLCV summary (last 30 days high/low/close/volume), current indicator values (RSI, MACD, BB position), and a list of detected findings with dates
3. **User interests** — the selected analysis topics, e.g. `["rsi_oversold", "volume_spike", "macd_crossover", "sudden_rally"]`
4. **Output instructions** — asks for a markdown report with one `##` section per ticker, a brief summary, and specific observations matching the stated interests

This keeps the prompt tight and focused rather than dumping raw CSV data into the context window.

---

## Getting Started

### Prerequisites

- Python 3.11+
- pip
- (Optional) Ollama installed locally for local LLM inference

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/yourname/marketlens.git
cd marketlens

# 2. Create a virtual environment
python -m venv venv
source venv/bin/activate        # macOS/Linux
venv\Scripts\activate           # Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. Copy environment config
cp .env.example .env
# Edit .env and add your API keys (see Configuration section)

# 5. Start the backend
uvicorn backend.main:app --reload

# 6. Open the frontend
# Open frontend/index.html in your browser
# Or serve with: python -m http.server 3000 --directory frontend
```

The API will be available at `http://localhost:8000`.  
Interactive API docs: `http://localhost:8000/docs`

---

## Configuration

Copy `.env.example` to `.env` and fill in the values you need. Only the keys for your chosen LLM provider are required.

```dotenv
# .env

# ── LLM Providers (fill in the one you want to use) ──────────────────────────
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
OLLAMA_BASE_URL=http://localhost:11434

# ── App ──────────────────────────────────────────────────────────────────────
DATABASE_URL=sqlite:///./data/marketlens.db
```

All other preferences (active LLM provider, model name, analysis interests, default chart range) are configured through the Settings page in the UI and stored in the database.

---

## Roadmap

### Phase 1 — Data & Visualization
- [ ] Watchlist CRUD (add/remove tickers, grouping)
- [ ] yfinance OHLCV fetching with SQLite cache
- [ ] Interactive candlestick chart with Plotly.js
- [ ] SMA / Bollinger Band overlays
- [ ] Volume subplot
- [ ] Price cards on dashboard with sparklines

### Phase 2 — Analysis Engine
- [ ] RSI, MACD, Bollinger Band computation via pandas-ta
- [ ] Volume spike detector
- [ ] Moving average crossover detector (golden/death cross)
- [ ] Large single-day move detector
- [ ] Findings stored in DB and shown as markers on chart
- [ ] Per-ticker analysis endpoint

### Phase 3 — LLM Integration
- [ ] LLM adapter pattern with Claude, OpenAI, Gemini, Ollama backends
- [ ] Settings page for provider + API key configuration
- [ ] Analysis interest checklist (RSI, MACD, volume spikes, etc.)
- [ ] Prompt builder combining OHLCV summary + findings + interests
- [ ] Report generation endpoint
- [ ] Markdown report renderer in frontend
- [ ] Report history page

### Future Ideas
- [ ] Email delivery of scheduled reports (daily/weekly)
- [ ] Export report as PDF
- [ ] Price alert system (notify when a pattern is detected)
- [ ] Support for crypto tickers via a secondary data source
- [ ] Head-and-shoulders pattern detection (more complex geometric analysis)
- [ ] Backtesting: run a strategy over historical data and see how it would have performed

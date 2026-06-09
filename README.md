# MarketLens 📈

> A personal stock market analysis tool with AI-powered pattern recognition and reporting.

---

MarketLens is a self-hosted web application that lets you build a personal stock watchlist, visualize historical market data, and run AI-powered analysis reports tailored to your specific interests.

MarketLens lets you define exactly what you care about, technical analysis patterns such as RSI divergence, price crossing a moving average, head and shoulders pattern, etc. The context is sent to an LLM of your choice to generate a focused, readable report across all your tracked stocks.

The LLM layer is fully swappable. You can point it at Claude, OpenAI, Google Gemini, or a locally-running Ollama instance (e.g. llama3, mistral), all configurable from the graphical user interface.

---

## Core Features

### 1. Watchlist Management
Add any publicly traded ticker symbol (e.g. `AAPL`, `TSLA`, `NVDA`) to your personal watchlist. Price cards on the dashboard show the latest close, daily change, and a sparkline.

### 2. Interactive Charts
For each ticker, view a full interactive candlestick chart with:
- Selectable time ranges: 1W, 1M, 3M, 6M, 1Y, 5Y
- Volume bars as a subplot
- Overlay toggles for SMA 20, SMA 50, SMA 200, VWAP, RSI, Bollinger Bands and MACD

### 3. AI Analysis Reports
The most powerful feature. Configure your interests once by listing the patterns and phenomena you care about. Finally trigger an analysis run.

MarketLens:
1. Pulls the latest OHLCV data and pre-computed indicators for each stock in your watchlist
2. Formats them into a structured, concise prompt
3. Sends the prompt to your configured LLM provider
4. Renders the returned report, with one section per ticker

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
User configures analysis interests
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

## Tech Stack

### Backend

| Component | Technology |
|---|---|
| Language | Python 3.11+ |
| Web framework | FastAPI |
| Database | SQLite |
| Market data | yfinance |

### Frontend

| Component | Technology |
|---|---|
| Language | JavaScript |
| Markup | HTML5 |
| Styles | CSS3 |
| Data visualization | plotly.js |

---

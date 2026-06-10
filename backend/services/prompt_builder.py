from datetime import datetime, timezone
import pandas as pd

SYSTEM_PROMPT = """You are a quantitative financial analyst specializing in technical analysis.
You will receive OHLCV summaries, pre-computed technical indicators, and a list of user interests.
Analyze each stock strictly through the lens of those interests.
Do NOT invent findings. If the data does not support a finding, omit it.
Respond with ONLY a valid JSON object — no markdown fences, no explanation outside the JSON.
"""

JSON_FORMAT = """
{
    "generated_at": "<ISO 8601 timestamp>",
    "overall_summary": "<2-3 sentences covering all stocks>",
    "stocks": [
        {
            "symbol": "<ticker>",
            "summary": "<2-3 sentences for this stock>",
            "key_findings": [
                {
                "interest": "<which user interest this relates to>",
                "finding": "<what the data shows>",
                "signal": "<bullish | bearish | neutral>",
                "confidence": "<high | medium | low>",
                "data_evidence": "<specific numbers from the data>"
                }
            ],
            "watchpoints": ["<thing to monitor 1>", "<thing to monitor 2>"]
        }
    ]
}"""

def summarize_ohlcv(ohlcv: list[dict], n: int = 10) -> dict:
    """
    Convert raw OHLCV dict (keyed by date string) into a compact summary of key stats and recent candles.
    """
    def detect_breakouts(rows: list[dict], dateKey: str, lookback: int = 5, tolerance: float = 0.02, n: int = 20) -> list[dict]:
        """
        Detect breakouts where price closes beyond a previously tested resistance or support level.
        
        A resistance level is a high that was tested (approached within tolerance) at least once
        before the price finally closed above it.
        A support level is a low that was tested at least once before price closed below it.
        
        tolerance: how close price needs to get to a level to count as a 'test' (2% default)
        lookback:  how many prior candles to look back when checking if a level was tested
        """
        breakouts = []

        for i in range(lookback + 1, len(rows)):
            current = rows[i]
            window   = rows[i - lookback: i]

            # Resistance breakout
            resistance = max(r["High"] for r in window)

            candle_tests = sum(
                1 for r in window
                if r["High"] >= resistance * (1 - tolerance)
            )

            breakout = current["Close"] > resistance and candle_tests >= 1
            if breakout:
                breakouts.append({
                    "type":       "resistance_breakout",
                    "date":       current[dateKey],
                    "level":      round(resistance, 2),
                    "close":      round(current["Close"], 2),
                    "breakout_pct": round((current["Close"] - resistance) / resistance * 100, 2),
                    "prior_tests":  candle_tests,
                })

            # Support breakout
            support = min(r["Low"] for r in window)

            candle_tests = sum(
                1 for r in window
                if r["Low"] <= support * (1 + tolerance)
            )

            breakout = current["Close"] < support and candle_tests >= 1
            if breakout:
                breakouts.append({
                    "type":       "support_breakout",
                    "date":       current[dateKey],
                    "level":      round(support, 2),
                    "close":      round(current["Close"], 2),
                    "breakout_pct": round((support - current["Close"]) / support * 100, 2),
                    "prior_tests":  candle_tests,
                })

        recent_n_breakouts = breakouts[-n:]
        return recent_n_breakouts
    
    def corporate_actions_in_period(rows, dateKey: str) -> list[dict]:
        """Extract any corporate actions (dividends, splits) that occurred."""
        actions = []
        for r in rows:
            if r.get("Dividends", 0) != 0:
                actions.append({"type": "dividend", "date": r[dateKey], "amount": r["Dividends"]})
            if r.get("Stock Splits", 0) != 0:
                actions.append({"type": "split", "date": r[dateKey], "ratio": r["Stock Splits"]})
        return actions

    if not ohlcv:
        return {}
    
    dateKey = "Datetime" if "Datetime" in ohlcv[0] else "Date"

    rows = sorted(ohlcv, key=lambda r: r[dateKey])

    closes  = [r["Close"] for r in rows]
    volumes = [r["Volume"] for r in rows]

    first_close = closes[0]
    last_close  = closes[-1]
    period_change_pct = ((last_close - first_close) / first_close) * 100

    avg_vol = sum(volumes) / len(volumes)

    recent_candles = []
    for r in rows[-n:]:
        recent_candles.append(
            f"  {r[dateKey]}: O={r['Open']:.2f} H={r['High']:.2f} "
            f"L={r['Low']:.2f} C={r['Close']:.2f} V={int(r['Volume']):,}"
        )

    corporate_actions = corporate_actions_in_period(rows, dateKey)

    summary = {
        "period_high":        round(max(r["High"] for r in rows), 2),
        "period_low":         round(min(r["Low"]  for r in rows), 2),
        "period_change_pct":  round(period_change_pct, 2),
        "avg_volume":         round(avg_vol),
        "latest_volume":      int(volumes[-1]),
        "volume_vs_avg":      round(volumes[-1] / avg_vol, 2),
        "latest_close":       round(last_close, 2),
        "recent_candles":     "\n".join(recent_candles),
        "breakouts":          detect_breakouts(rows, dateKey),
        "corporate_actions":  corporate_actions if corporate_actions else "None",
    }

    return summary

def summarize_indicators(indicators: list[dict[str, float]], n: int) -> dict:
    """
    Extract only what the LLM needs: Latest values, trends, and key flags
    """
    def latest(data: list[dict[str, float]], key: str) -> float | None:
        """Get the last value from a list/series, or return as-is if scalar."""
        if not data:
            return None
        if isinstance(data, list):
            for entry in reversed(data):
                if key in entry and entry[key] is not None:
                    return round(entry[key], 2) if isinstance(entry[key], (int, float)) else entry[key]
            return None
        return round(data[key], 2) if key in data and isinstance(data[key], (int, float)) else data.get(key)

    def trend(data: list[dict[str, float]], key: str, n=5):
        """
        Describe recent trend direction from last N values.
        'rising', 'falling', 'flat (change percentage)', or 'insufficient data'   
        """
        # data is list where each entry is dict like {"Date": "...", "SMA20": ..., "RSI": ..., etc.}
        # key is which indicator we want the trend for, e.g. "RSI"
        if len(data) < 2:
            return "insufficient data"
        values = [entry[key] for entry in data if key in entry and isinstance(entry[key], (int, float))]
        if len(values) < 2:
            return "insufficient data"
        recent_values = values[-n:]

        flat_threshold = 0.01

        if all(v is not None for v in recent_values):
            pct_change = (recent_values[-1] - recent_values[0]) / abs(recent_values[0]) if recent_values[0] != 0 else 0
            if pct_change > flat_threshold:
                return "rising"
            elif pct_change < -flat_threshold:
                return "falling"
            else:
                return f"flat ({round(pct_change * 100, 2)}% change)"

        return "insufficient data"

    rsi_val = latest(indicators, "RSI")
    macd_val = latest(indicators, "MACD")
    signal_val = latest(indicators, "MACDSignal")

    rsi_flag = None
    if rsi_val is not None:
        if rsi_val >= 70:
            rsi_flag = "overbought"
        elif rsi_val <= 30:
            rsi_flag = "oversold"
        else:
            rsi_flag = "neutral"

    macd_cross = None
    if macd_val is not None and signal_val is not None:
        if macd_val > signal_val:
            macd_cross = "MACD above signal (bullish)"
        else:
            macd_cross = "MACD below signal (bearish)"

    bb_upper = latest(indicators, "BollingerUpper")
    bb_lower = latest(indicators, "BollingerLower")
    bb_middle = latest(indicators, "BollingerMiddle")
    bb_width = None
    if bb_upper and bb_lower and bb_middle:
        bb_width = round(
            (bb_upper - bb_lower) /
            bb_middle * 100, 2
        )

    return {
        "SMA20":  latest(indicators, "SMA20"),
        "SMA50":  latest(indicators, "SMA50"),
        "SMA200": latest(indicators, "SMA200"),
        "VWAP":   latest(indicators, "VWAP"),
        "RSI": {
            "value": rsi_val,
            "trend": trend(indicators, "RSI", n),
            "flag":  rsi_flag,
        },
        "MACD": {
            "value":       macd_val,
            "signal_line": signal_val,
            "histogram":   latest(indicators, "MACD_HIST"),
            "cross_status": macd_cross,
            "trend":       trend(indicators, "MACD", n),
        },
        "BollingerBands": {
            "upper":  bb_upper,
            "middle": bb_middle,
            "lower":  bb_lower,
            "width":  bb_width,
        },
    }


def build_prompt(
    tickers: list[dict[str, str]],
    ohlcv_data: dict[str, list[dict]],
    indicator_data: dict[str, list[dict[str, float]]],
    interest_list: list[str],
    periods: dict[str, str],
    intervals: dict[str, str]
) -> str:
    summary_length = 10

    interests_str = "\n".join(f"- {i}" for i in interest_list)
    
    stocks_str = ""
    for ticker in tickers:
        symbol   = ticker["symbol"]
        name     = ticker["name"]
        exchange = ticker["exchange"]
        period = periods.get(symbol, "1d")
        interval = intervals.get(symbol, "5m")

        ohlcv_summary = summarize_ohlcv(ohlcv_data.get(symbol, []), n=summary_length)
        ind_summary   = summarize_indicators(indicator_data.get(symbol, []), n=summary_length)

        dateKey = "Datetime" if "Datetime" in ohlcv_data.get(symbol, [{}])[0] else "Date"

        breakouts = ohlcv_summary.get("breakouts", [])
        if breakouts:
            breakouts_str = "\n".join(
                f"  {b['date']}: {b['type']} at level {b['level']} with close {b['close']} ({b['breakout_pct']}% breakout, tested {b['prior_tests']} times before)"
                for b in breakouts
            )
        else:
            breakouts_str = "None"

        stocks_str += f"""
### {symbol} — {name} ({exchange})
Period: {period} | Interval: {interval}

Price summary:
    Latest close:       {ohlcv_summary.get('latest_close')}
    Period high/low:    {ohlcv_summary.get('period_high')} / {ohlcv_summary.get('period_low')}
    Period change:      {ohlcv_summary.get('period_change_pct')}%
    Latest volume:      {ohlcv_summary.get('latest_volume'):,}
    Volume vs avg:      {ohlcv_summary.get('volume_vs_avg')}x average

Recent breakouts:
{breakouts_str}

Corporate actions in period:
    {ohlcv_summary.get('corporate_actions')}

Recent candles (last {summary_length}):
{ohlcv_summary.get('recent_candles', 'N/A')}

Indicators:
    SMA20 / SMA50 / SMA200: {ind_summary['SMA20']} / {ind_summary['SMA50']} / {ind_summary['SMA200']}
    VWAP:    {ind_summary['VWAP']}
    RSI:     {ind_summary['RSI']['value']} ({ind_summary['RSI']['flag']}, {ind_summary['RSI']['trend']})
    MACD:    {ind_summary['MACD']['cross_status']}, histogram {ind_summary['MACD']['histogram']}, trend {ind_summary['MACD']['trend']}
    BB:      upper {ind_summary['BollingerBands']['upper']} / lower {ind_summary['BollingerBands']['lower']} / width {ind_summary['BollingerBands']['width']}%
"""

    return f"""{SYSTEM_PROMPT}
User interests:
{interests_str}

--- MARKET DATA ---
{stocks_str}
--- END MARKET DATA ---

Respond using this exact JSON structure:
{JSON_FORMAT}
    """.strip()

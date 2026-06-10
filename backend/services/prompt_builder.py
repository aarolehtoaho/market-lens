from datetime import datetime, timezone
import pandas as pd

def summarize_ohlcv(ohlcv: list[dict], n: int = 10) -> dict:
    """
    Convert raw OHLCV dict (keyed by date string) into a compact summary of key stats and recent candles.
    """
    def period_local_extremas(rows, n: int) -> dict[str, list[dict]]:
        """Identify local highs and lows within the period."""
        extremas = {"highs": [], "lows": []}
        last_high = float('-inf')
        last_low = float('inf')

        for r in rows:
            if r["High"] > last_high:
                extremas["highs"].append(r)
                last_high = r["High"]
            if r["Low"] < last_low:
                extremas["lows"].append(r)
                last_low = r["Low"]

        extremas["highs"] = extremas["highs"][-n:]
        extremas["lows"] = extremas["lows"][-n:]

        return extremas
    
    def corporate_actions_in_period(rows) -> list[dict]:
        """Extract any corporate actions (dividends, splits) that occurred."""
        actions = []
        for r in rows:
            if r.get("Dividends", 0) != 0:
                actions.append({"type": "dividend", "date": r["Date"], "amount": r["Dividends"]})
            if r.get("Stock Splits", 0) != 0:
                actions.append({"type": "split", "date": r["Date"], "ratio": r["Stock Splits"]})
        return actions

    if not ohlcv:
        return {}

    rows = sorted(ohlcv, key=lambda r: r["Date"])

    closes  = [r["Close"] for r in rows]
    volumes = [r["Volume"] for r in rows]

    first_close = closes[0]
    last_close  = closes[-1]
    period_change_pct = ((last_close - first_close) / first_close) * 100

    avg_vol = sum(volumes) / len(volumes)

    recent_candles = []
    for r in rows[-n:]:
        recent_candles.append(
            f"  {r['Date']}: O={r['Open']:.2f} H={r['High']:.2f} "
            f"L={r['Low']:.2f} C={r['Close']:.2f} V={int(r['Volume']):,}"
        )

    corporate_actions = corporate_actions_in_period(rows)

    summary = {
        "period_high":        round(max(r["High"] for r in rows), 2),
        "period_low":         round(min(r["Low"]  for r in rows), 2),
        "period_change_pct":  round(period_change_pct, 2),
        "avg_volume":         round(avg_vol),
        "latest_volume":      int(volumes[-1]),
        "volume_vs_avg":      round(volumes[-1] / avg_vol, 2),
        "latest_close":       round(last_close, 2),
        "recent_candles":     "\n".join(recent_candles),
        "local_extremas":     period_local_extremas(rows, n),
        "corporate_actions":  corporate_actions if corporate_actions else "None",
    }

    return summary

def summarize_indicators(indicators: dict, n: int) -> dict:
    """
    Extract only what the LLM needs: Latest values, trends, and key flags
    """
    def latest(series):
        """Get the last value from a list/series, or return as-is if scalar."""
        if isinstance(series, list):
            return round(series[-1], 4) if series else None
        return round(series, 4) if series is not None else None

    def trend(series, n=5):
        """
        Describe recent trend direction from last N values.
        'rising', 'falling', 'flat (change percentage)', or 'insufficient data'   
        """
        flat_threshold = 0.01
        if not isinstance(series, list) or len(series) < 2:
            return "insufficient data"
        recent = series[-n:]
        change_pct = (recent[-1] - recent[0]) / abs(recent[0]) if recent[0] != 0 else 0
        if change_pct > flat_threshold:
            return "rising"
        elif change_pct < -flat_threshold:
            return "falling"
        else:
            return f"flat ({round(change_pct * 100, 2)}%)"

    rsi_series = indicators.get("RSI", [])
    macd_series = indicators.get("MACD", [])
    signal_series = indicators.get("MACDSignal", [])
    bb = indicators.get("BollingerBands", {})

    rsi_val = latest(rsi_series)
    macd_val = latest(macd_series)
    signal_val = latest(signal_series)

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

    bb_upper = latest(bb.get("upper"))
    bb_lower = latest(bb.get("lower"))
    bb_middle = latest(bb.get("middle"))
    bb_width = None
    if bb_upper and bb_lower and bb_middle:
        bb_width = round(
            (bb_upper - bb_lower) /
            bb_middle * 100, 2
        )

    return {
        "SMA20":  latest(indicators.get("SMA20")),
        "SMA50":  latest(indicators.get("SMA50")),
        "SMA200": latest(indicators.get("SMA200")),
        "VWAP":   latest(indicators.get("VWAP")),
        "RSI": {
            "value": rsi_val,
            "trend": trend(rsi_series),
            "flag":  rsi_flag,
        },
        "MACD": {
            "value":       macd_val,
            "signal_line": signal_val,
            "histogram":   latest(indicators.get("MACDHist")),
            "cross_status": macd_cross,
            "trend":       trend(macd_series),
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
    indicator_data: dict[str, dict],
    interest_list: list[str],
    periods: dict[str, str],
    intervals: dict[str, str]
) -> str:
    summary_length = 10

    system_prompt = """You are a quantitative financial analyst specializing in technical analysis.
        You will receive OHLCV summaries, pre-computed technical indicators, and a list of user interests.
        Analyze each stock strictly through the lens of those interests.
        Do NOT invent findings. If the data does not support a finding, omit it.
        Respond with ONLY a valid JSON object — no markdown fences, no explanation outside the JSON.
    """

    interests_str = "\n".join(f"- {i}" for i in interest_list)
    
    stocks_str = ""
    for ticker in tickers:
        symbol   = ticker["symbol"]
        name     = ticker["name"]
        exchange = ticker["exchange"]
        period = periods.get(symbol, "1d")
        interval = intervals.get(symbol, "5m")

        ohlcv_summary = summarize_ohlcv(ohlcv_data.get(symbol, []), n=summary_length)
        ind_summary   = summarize_indicators(indicator_data.get(symbol, {}), n=summary_length)

        stocks_str += f"""
            ### {symbol} — {name} ({exchange})
            Period: {period} | Interval: {interval}

            Price summary:
                Latest close:       {ohlcv_summary.get('latest_close')}
                Period high/low:    {ohlcv_summary.get('period_high')} / {ohlcv_summary.get('period_low')}
                Period change:      {ohlcv_summary.get('period_change_pct')}%
                Latest volume:      {ohlcv_summary.get('latest_volume'):,}
                Volume vs avg:      {ohlcv_summary.get('volume_vs_avg')}x average
                Recent local highs:  {', '.join(r['Date'] for r in ohlcv_summary.get('local_extremas', {}).get('highs', [])) or 'N/A'}
                Recent local lows:   {', '.join(r['Date'] for r in ohlcv_summary.get('local_extremas', {}).get('lows', [])) or 'N/A'}

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

    json_format = """
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
            }]
    }"""

    return f"""{system_prompt}

        User interests:
        {interests_str}

        --- MARKET DATA ---
        {stocks_str}
        --- END MARKET DATA ---

        Respond using this exact JSON structure:
        {json_format}
    """.strip()

async function getHomeData() {
    const response = await fetch("/api/home");
    if (!response.ok) {
        throw new Error(`Home data request failed with status ${response.status}`);
    }
    return response.json();
}

async function searchTickers(query) {
    const response = await fetch(`/api/tickers/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
        return [];
    }
    tickers = await response.json();
    return tickers;
}

async function postTicker(ticker, position) {
    const response = await fetch("/api/tickers/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            symbol: ticker.symbol,
            name: ticker.name,
            exchange: ticker.exchange,
            position: position,
        }),
    });
}

async function listTickers() {
    const response = await fetch("/api/tickers/");
    if (!response.ok) {
        return [];
    }
    return response.json();
}

async function deleteTicker(symbol) {
    const response = await fetch(`/api/tickers/${encodeURIComponent(symbol)}`, {
        method: "DELETE",
    });
}

async function postInterest(position, interest) {
    const response = await fetch("/api/interests/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            position: position,
            interest: interest,
        }),
    });
}

async function listInterests() {
    const response = await fetch("/api/interests/");
    if (!response.ok) {
        return [];
    }
    return response.json();
}

async function deleteInterest(position) {
    const response = await fetch(`/api/interests/${position}`, {
        method: "DELETE",
    });
}

async function getOhlcv(symbol, period, interval) {
    const response = await fetch(`/api/market-data?
        symbol=${encodeURIComponent(symbol)}&
        period=${encodeURIComponent(period)}&
        interval=${encodeURIComponent(interval)}`);
    if (!response.ok) {
        throw new Error(`Market data request failed with status ${response.status}`);
    }
    return response.json();
}
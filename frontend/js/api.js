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
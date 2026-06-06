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
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

async function getMarketData(symbol, period, interval, prepost = false) {
    url = "/api/market-data/" +
        "?symbol=" + encodeURIComponent(symbol) +
        "&period=" + encodeURIComponent(period) +
        "&interval=" + encodeURIComponent(interval) +
        "&prepost=" + encodeURIComponent(prepost);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Market data request failed with status ${response.status}: ${await response.text()}`);
    }
    return response.json();
}

async function getChartOptions(symbol) {
    uri = `/api/tickers/chart-options?symbol=${encodeURIComponent(symbol)}`;
    const response = await fetch(uri);
    if (!response.ok) {
        return { period: "1d", interval: "5m" };
    }
    return response.json();
}

async function postChartOptions(symbol, period, interval) {
    const response = await fetch("/api/tickers/chart-options", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            symbol: symbol,
            period: period,
            interval: interval,
        }),
    });
}

async function getTickerInfo(symbols) {
    const url = "/api/tickers/info?" + symbols.map(s => "symbols=" + encodeURIComponent(s)).join("&");
    const response = await fetch(url);
    if (!response.ok) {
        return {};
    }
    return response.json();
}

async function fetchModels(provider, apiKey) {
    try {
        const response = await fetch("/api/settings/models", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                provider: provider,
                api_key: apiKey,
            }),
        });
        if (!response.ok) {
            message = await response.text();
            throw new Error(`${response.status} ${message}`);
        }

        data = await response.json();

        return data.models;
    } catch (error) {
        throw new Error(`${error.message}`);
    }
}

async function saveLLMConfiguration(provider, apiKey, model) {
    try {
        const response = await fetch("/api/settings/configuration", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                provider: provider,
                api_key: apiKey,
                model: model,
            }),
        });
        if (!response.ok) {
            throw new Error(`Failed to save configuration: ${response.status} ${await response.text()}`);
        }

        return response.json();
    } catch (error) {
        throw new Error(`Failed to save configuration: ${error.message}`);
    }
}

async function checkLLMConfiguration() {
    try {
        const response = await fetch("/api/settings/configuration");
        if (!response.ok) {
            throw new Error(`${response.status} ${await response.text()}`);
        }

        data = await response.json();

        return data.valid_configuration;
    } catch (error) {
        throw new Error(`Failed to check configuration: ${error.message}`);
    }
}

async function cacheMarketData(symbol, period, interval, prepost = false) {
    const url = "/api/market-data/fetch-and-cache" +
        "?symbol=" + encodeURIComponent(symbol) +
        "&period=" + encodeURIComponent(period) +
        "&interval=" + encodeURIComponent(interval) +
        "&prepost=" + encodeURIComponent(prepost);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Cache market data request failed with status ${response.status}: ${await response.text()}`);
    }
    return true;
}

async function getAiAnalysis() {
    try {
        const response = await fetch("/api/analysis/generate", {
            method: "POST",
        });
        if (!response.ok) {
            const message = await response.text();
            throw new Error(`${response.status}: ${message}`);
        }
        
        analysis = await response.json();
        analysis_str = analysis.analysis;
        return analysis_str;     
    } catch (error) {
        throw new Error(`${error.message}`);
    }
}
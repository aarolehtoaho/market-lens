const STOCK_LIMIT = 20;
const INTEREST_LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 1000;

let marketData = null;
let selectedStocks = [];
let debounceTimer = null;

let indicatorToggles = {
    'toggle-volume': false,
    'toggle-sma20': false,
    'toggle-sma50': false,
    'toggle-sma200': false,
    'toggle-vwap': false,
    'toggle-rsi': false,
    'toggle-bollinger': false,
    'toggle-macd': false,
}

function setUiStatus(message) {
    const status = document.getElementById("ui-status");
    if (status) {
        status.textContent = message;
    }
}

async function loadHomeData() {
    const data = await getHomeData();

    if (!data.title || !data.subtitle) {
        return;
    }

    document.getElementById("title").textContent = data.title;
    document.getElementById("subtitle").textContent = data.subtitle;
}

async function loadWatchlist() {
    const tickers = await listTickers();
    selectedStocks = tickers;
    renderStocks();
    fillTickerSelector();
    updatePriceCards();
}

async function loadInterests() {
    const interests = await listInterests();
    const interestList = document.getElementById("interest-list");
    const template = document.getElementById("interest-row-template");
    const interestListItems = interestList.querySelectorAll(".rule-input");

    interests.forEach((interest) => {
        const node = template.content.firstElementChild.cloneNode(true);
        node.querySelector(".rule-input").value = interest.interest;
        
        index = interests.indexOf(interest);
        if (interestListItems.length > index) {
            interestListItems[index].value = interest.interest;
        } else {
            interestList.appendChild(node);
        }
    });

    maybeAppendInterestInput();
}

function filterStocks(query, searchedStocks) {
    const q = query.trim().toLowerCase();
    if (!q) {
        return [];
    }

    return searchedStocks
        .filter((item) => {
            return (
                item.symbol.toLowerCase().includes(q) ||
                item.name.toLowerCase().includes(q)
            );
        })
        .slice(0, 8);
}

function renderStockDropdown(items) {
    const dropdown = document.getElementById("stock-dropdown");
    dropdown.innerHTML = "";

    if (!items.length) {
        dropdown.hidden = true;
        return;
    }

    items.forEach((item) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "stock-option";
        button.innerHTML =
            `<span class="stock-option-symbol">${item.symbol}</span>` +
            `<span class="stock-option-name">${item.name}</span>` + 
            `<span class="stock-option-exchange">${item.exchange}</span>`;
        button.addEventListener("click", () => addStock(item));
        dropdown.appendChild(button);
    });

    dropdown.hidden = false;
}

function renderStocks() {
    const list = document.getElementById("stock-list");
    const stockLimitNote = document.getElementById("stock-limit-note");
    const template = document.getElementById("stock-item-template");
    list.innerHTML = "";

    selectedStocks.forEach((stock, index) => {
        const node = template.content.firstElementChild.cloneNode(true);
        node.querySelector(".stock-pill-symbol").textContent = stock.symbol;
        node.querySelector(".stock-pill-exchange").textContent = stock.exchange;
        node.querySelector(".stock-pill-name").textContent = stock.name;
        node.querySelector(".stock-remove").addEventListener("click", () => {
            selectedStocks = selectedStocks.filter((_, i) => i !== index);
            renderStocks();
            setUiStatus(`${stock.symbol} removed`);
            deleteTicker(stock.symbol);
            fillTickerSelector();
        });
        list.appendChild(node);
    });

    stockLimitNote.hidden = selectedStocks.length < STOCK_LIMIT;
}

function addStock(stock) {
    if (selectedStocks.length >= STOCK_LIMIT) {
        setUiStatus("Stock limit reached");
        return;
    }

    const exists = selectedStocks.some((item) => item.symbol === stock.symbol);
    if (exists) {
        setUiStatus(`${stock.symbol} already added`);
        return;
    }

    selectedStocks.push(stock);
    updatePriceCards();

    listPosition = selectedStocks.length;
    postTicker(stock, listPosition);

    renderStocks();

    const input = document.getElementById("stock-search");
    const dropdown = document.getElementById("stock-dropdown");
    input.value = "";
    dropdown.hidden = true;
    dropdown.innerHTML = "";
    setUiStatus(`${stock.symbol} added`);

    fillTickerSelector();
}

function setupStockSearch() {
    const input = document.getElementById("stock-search");
    const dropdown = document.getElementById("stock-dropdown");

    input.addEventListener("input", (event) => {
        clearTimeout(debounceTimer);
        const query = event.target.value;

        if (!query.trim()) {
            dropdown.hidden = true;
            dropdown.innerHTML = "";
            return;
        }

        debounceTimer = setTimeout(async () => {
            const data = await searchTickers(query);
            const matches = filterStocks(query, data);
            renderStockDropdown(matches);
        }, SEARCH_DEBOUNCE_MS);
    });

    document.addEventListener("click", (event) => {
        if (!dropdown.contains(event.target) && event.target !== input) {
            dropdown.hidden = true;
        }
    });
}

function getInterestValues() {
    const inputs = Array.from(document.querySelectorAll(".rule-input"));
    return inputs
        .map((input) => input.value.trim())
        .filter(Boolean);
}

function maybeAppendInterestInput() {
    const interestList = document.getElementById("interest-list");
    const limitNote = document.getElementById("interest-limit-note");
    const inputs = Array.from(interestList.querySelectorAll(".rule-input"));
    const nonEmptyCount = getInterestValues().length;
    const lastInput = inputs[inputs.length - 1];

    const atLimit = nonEmptyCount >= INTEREST_LIMIT;
    limitNote.hidden = !atLimit;

    if (atLimit) {
        inputs.forEach((input) => {
            if (!input.value.trim()) {
                input.disabled = true;
            }
        });
        return;
    }

    inputs.forEach((input) => {
        input.disabled = false;
    });

    const hasTrailingEmpty = inputs.some((input) => !input.value.trim());
    if (!hasTrailingEmpty && lastInput && lastInput.value.trim()) {
        const template = document.getElementById("interest-row-template");
        interestList.appendChild(template.content.firstElementChild.cloneNode(true));
    }
}

function setupInterestInputs() {
    const interestList = document.getElementById("interest-list");

    interestList.addEventListener("input", (event) => {
        if (!event.target.classList.contains("rule-input")) {
            return;
        }
        maybeAppendInterestInput();
    });

    interestList.addEventListener("blur", (event) => {
        if (!event.target.classList.contains("rule-input")) {
            return;
        }

        const values = getInterestValues();
        const currentFieldIndex = Array.from(interestList.querySelectorAll(".rule-input")).indexOf(event.target);
        const value = event.target.value.trim();

        if (!value) {
            deleteInterest(currentFieldIndex);
            return;
        }

        postInterest(currentFieldIndex, value);
    }, true);
}

function setupChartOptions() {
    const tickerSelector = document.getElementById("ticker-dropdown");
    const periodSelector = document.getElementById("period-dropdown");
    const intervalSelector = document.getElementById("interval-dropdown");
    
    [tickerSelector, periodSelector, intervalSelector].forEach((selector) => {
        selector.addEventListener("change", async () => {
            result = isValidChartOptions();
            message = result.message;
            if (result.isValid) {
                postChartOptions(tickerSelector.value, periodSelector.value, intervalSelector.value);
                try {
                    marketData = await getMarketData(tickerSelector.value, periodSelector.value, intervalSelector.value, true);
                } catch (error) {
                    message = error.message || "Error fetching market data";
                }
                
                drawChart(marketData, indicatorToggles, intervalSelector.value);
                return;
            }
            marketData = null;
            drawEmptyChart(message);
        });
    });

    const indicatorCheckboxes = document.querySelectorAll(".toggle");
    indicatorCheckboxes.forEach((checkbox) => {
        checkbox.addEventListener("change", async () => {
            indicatorToggles[checkbox.id] = checkbox.checked;
            if (marketData) {
                drawChart(marketData, indicatorToggles, intervalSelector.value);
            }
        });
    });
}

function fillTickerSelector() {
    const selector = document.getElementById("ticker-dropdown");

    // Clear existing options except the placeholder
    while (selector.options.length > 1) {
        selector.remove(1);
    }

    selectedStocks.forEach((stock) => {
        const option = document.createElement("option");
        option.value = stock.symbol;
        option.textContent = `${stock.symbol} - ${stock.name}`;
        selector.appendChild(option);
    });
}

function isValidChartOptions() {
    const tickerSelector = document.getElementById("ticker-dropdown");
    const periodSelector = document.getElementById("period-dropdown");
    const intervalSelector = document.getElementById("interval-dropdown");

    ticker = tickerSelector.value;
    interval = intervalSelector.value;
    period = periodSelector.value;

    tickerSelected = ticker.trim() !== "";
    periodSelected = period.trim() !== "";
    intervalSelected = interval.trim() !== "";

    if (!tickerSelected || !periodSelected || !intervalSelected) {
        return {isValid: false, message: "Select a ticker, period, and interval to view the chart"};
    }

    // yfincance.Ticker.history() supports the following sets of period and interval values.
    const validPeriods = ["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max"];
    const validIntervals = ["1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h", "1d", "5d", "1wk", "1mo"];

    if (!validPeriods.includes(periodSelector.value) || !validIntervals.includes(intervalSelector.value)) {
        return {isValid: false, message: "Invalid period or interval selected"};
    }

    const isIntraday = interval.endsWith('m') || interval.endsWith('h');

    if (isIntraday) {
        const invalidIntradayPeriods = ["3mo", "6mo", "1y", "2y", "5y", "10y", "max"];
        if (invalidIntradayPeriods.includes(period)) {
            return {isValid: false, message: "Intraday intervals do not support periods longer than 60 days"};
        }

        if (period === "ytd") {
            const now = new Date();
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            const daysPassed = (now - startOfYear) / (1000 * 60 * 60 * 24);
            if (daysPassed > 60) {
                return {isValid: false, message: "YTD must be within 60 days, if interval is intraday"};
            }
        }

        if (interval === "1m") {
            const valid1mPeriods = ["1d", "5d"];
            if (!valid1mPeriods.includes(period)) {
                return {isValid: false, message: "1m interval only supports 1d and 5d periods"};
            }
        }
    }

    // Check that interval is smaller than period
    const intervalToMinutes = {
        "1m": 1,
        "2m": 2,
        "5m": 5,
        "15m": 15,
        "30m": 30,
        "60m": 60,
        "90m": 90,
        "1h": 60,
        "1d": 1440,
        "5d": 7200,
        "1wk": 10080,
        "1mo": 43200,
    };

    const periodToMinutes = {
        "1d": 1440,
        "5d": 7200,
        "1mo": 43200,
        "3mo": 129600,
        "6mo": 259200,
        "1y": 525600,
        "2y": 1051200,
        "5y": 2628000,
        "10y": 5256000,
        "ytd": (new Date() - new Date(new Date().getFullYear(), 0, 1)) / (1000 * 60),
        "max": Infinity,
    };

    if (intervalToMinutes[interval] >= periodToMinutes[period]) {
        return {isValid: false, message: "Interval must be smaller than period"};
    }

    return {isValid: true, message: ""};
}

async function updatePriceCards() {
    const priceCardContainer = document.querySelector(".price-card-container");

    const isWatchlistEmpty = selectedStocks.length === 0;
    if (isWatchlistEmpty) {
        priceCardContainer.style.display = "none";
        return;
    }
    
    const template = document.getElementById("price-card-template");

    const symbols = selectedStocks.map(stock => stock.symbol);
    const tickerInfo = await getTickerInfo(symbols);

    // Symbols ordered by price change percent in descending order
    symbols.sort((a, b) => {
        const changeA = tickerInfo[a]?.price_change_percent || 0;
        const changeB = tickerInfo[b]?.price_change_percent || 0;
        return changeB - changeA;
    });

    priceCardContainer.innerHTML = "";
    symbols.forEach(symbol => {
        const info = tickerInfo[symbol];
        if (!info) {
            return;
        }

        const priceChangeSign = info.price_change >= 0 ? "+" : "";

        const price = parseFloat(info.current_price).toFixed(2);
        const priceChange = parseFloat(info.price_change).toFixed(2);
        const priceChangePercent = parseFloat(info.price_change_percent).toFixed(2);
        const openPrice = parseFloat(info.open).toFixed(2);
        const lowPrice = parseFloat(info.low).toFixed(2);
        const highPrice = parseFloat(info.high).toFixed(2);

        const node = template.content.firstElementChild.cloneNode(true);
        node.querySelector(".price-card-symbol").textContent = symbol;
        node.querySelector(".price-card-price").textContent = `${price} ${info.currency}`;
        node.querySelector(".price-card-change").textContent = `${priceChangeSign}${priceChange} (${priceChangePercent}%)`;
        node.querySelector(".price-card-open").textContent = `Open: ${openPrice} ${info.currency}`;
        node.querySelector(".price-card-range").textContent = `Day's Range: ${lowPrice} - ${highPrice}`;

        if (info.price_change >= 0) {
            node.querySelector(".price-card-change").classList.add("positive");
        } else {
            node.querySelector(".price-card-change").classList.add("negative");
        }

        priceCardContainer.appendChild(node);
    });
    
    priceCardContainer.style.display = "grid";
}

function enableAnalysisButton() {
    const analyzeButton = document.getElementById("analyze-button");

    isWatchlistEmpty = selectedStocks.length === 0;
    isInterestListEmpty = getInterestValues().length === 0;

    if (isWatchlistEmpty || isInterestListEmpty) {
        analyzeButton.disabled = true;
        return;
    }

    analyzeButton.disabled = false;
    analyzeButton.addEventListener("click", () => {
        window.location.href = "/analysis";
    });
}

function setupAiConfiguration() {
    const providerSelect = document.getElementById("ai-provider-dropdown");
    const apiKeyInputContainer = document.getElementById("ai-api-key");
    const apiKeyInput = document.getElementById("ai-api-key-input");
    const modelSelectContainer = document.getElementById("ai-model-container");
    const modelSelect = document.getElementById("ai-model-dropdown");
    const saveButton = document.getElementById("save-api-key");
    const messageParagraph = document.getElementById("ai-configuration-error");

    providerSelect.addEventListener("change", async () => {
        messageParagraph.style.display = "none";
        modelSelectContainer.style.display = "none";
        noProviderSelected = providerSelect.value === "";
        if (noProviderSelected) {
            apiKeyInputContainer.style.display = "none";
            modelSelectContainer.style.display = "none";
            return;
        }
        if (providerSelect.value === "ollama") {
            apiKeyInputContainer.style.display = "none";
            // Fetch models for ollama immediately, since it doesn't require an API key
            try {
                const models = await fetchModels("ollama", "http://localhost:11434");
                console.log("Fetched models for Ollama:", models);
                modelSelect.innerHTML = "";
                const defaultOption = document.createElement("option");
                defaultOption.value = "";
                defaultOption.textContent = "-- Select a model --";
                modelSelect.appendChild(defaultOption);
                models.forEach(model => {
                    const option = document.createElement("option");
                    option.value = model;
                    option.textContent = model;
                    modelSelect.appendChild(option);
                });
                modelSelectContainer.style.display = "block";
            } catch (error) {
                messageParagraph.textContent = `Failed to fetch models for Ollama: ${error.message}`;
                messageParagraph.style.display = "block";
            }
        } else {
            apiKeyInputContainer.style.display = "block";
        }
    });

    saveButton.addEventListener("click", async () => {
        const provider = providerSelect.value;
        const apiKey = apiKeyInput.value.trim();
        messageParagraph.style.display = "none";

        if (!provider) {
            messageParagraph.textContent = "Please select a provider";
            messageParagraph.style.display = "block";
            return;
        }

        if (provider !== "ollama" && !apiKey) {
            messageParagraph.textContent = "Please enter an API key";
            messageParagraph.style.display = "block";
            return;
        }

        try {
            const models = await fetchModels(provider, apiKey);
            modelSelect.innerHTML = "";
            const defaultOption = document.createElement("option");
            defaultOption.value = "";
            defaultOption.textContent = "-- Select a model --";
            modelSelect.appendChild(defaultOption);
            models.forEach(model => {
                const option = document.createElement("option");
                option.value = model;
                option.textContent = model;
                modelSelect.appendChild(option);
            });
            modelSelectContainer.style.display = "block";
        } catch (error) {
            messageParagraph.textContent = error.message;
            messageParagraph.style.display = "block";
            modelSelectContainer.style.display = "none";
        }
    });

    modelSelect.addEventListener("change", async () => {
        messageParagraph.style.display = "none";
        const selectedModel = modelSelect.value;
        if (!selectedModel) {
            messageParagraph.textContent = "Please select a model";
            messageParagraph.style.display = "block";
            return;
        }

        try {
            const response = await saveLLMConfiguration(providerSelect.value, apiKeyInput.value.trim(), selectedModel);
            messageParagraph.textContent = "Configuration saved successfully";
            messageParagraph.style.display = "block";
            enableAnalysisButton();
        } catch (error) {
            messageParagraph.textContent = error.message;
            messageParagraph.style.display = "block";
        }
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    loadHomeData();
    loadWatchlist();
    loadInterests();
    setupStockSearch();
    setupInterestInputs();
    setupAiConfiguration();
    renderStocks();
    maybeAppendInterestInput();

    setInterval(updatePriceCards, 60000);

    try {
        await loadPlotlyScript();

        setupChartOptions();
        drawEmptyChart();
    } catch (error) {
        console.error("Error loading Plotly:", error);
    }
});

const STOCK_LIMIT = 20;
const INTEREST_LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 1000;

let ohlcvData = null;
let selectedStocks = [];
let debounceTimer = null;

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

    document.getElementById("home-title").textContent = data.title;
    document.getElementById("home-subtitle").textContent = data.subtitle;
}

async function loadWatchlist() {
    const tickers = await listTickers();
    selectedStocks = tickers;
    renderStocks();
    fillTickerSelector();
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
        selector.addEventListener("change", () => {
            if (isValidChartOptions()) {
                ohlcvData = getOhlcv(tickerSelector.value, periodSelector.value, intervalSelector.value);
                console.log("Received OHLCV data: ", ohlcvData);
            } else {
                ohlcvData = null;
            }
        });
    });
}

function fillTickerSelector() {
    const selector = document.getElementById("ticker-dropdown");
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
        return false;
    }

    // yfincance.Ticker.history() supports the following sets of period and interval values.
    const validPeriods = ["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max"];
    const validIntervals = ["1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h", "1d", "5d", "1wk", "1mo"];

    if (!validPeriods.includes(periodSelector.value) || !validIntervals.includes(intervalSelector.value)) {
        return false;
    }

    const isIntraday = interval.endsWith('m') || interval.endsWith('h');

    if (isIntraday) {
        // Intraday intervals have maximum period of 60 days
        const invalidIntradayPeriods = ["3mo", "6mo", "1y", "2y", "5y", "10y", "max"];
        if (invalidIntradayPeriods.includes(period)) {
            return false;
        }

        // YTD must be within 60 days
        if (period === "ytd") {
            const now = new Date();
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            const daysPassed = (now - startOfYear) / (1000 * 60 * 60 * 24);
            if (daysPassed > 60) {
                return false;
            }
        }

        // 1m interval has maximum period of 7 days
        if (interval === "1m") {
            const valid1mPeriods = ["1d", "5d"];
            if (!valid1mPeriods.includes(period)) {
                return false;
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
        return false;
    }

    return true;
}

document.addEventListener("DOMContentLoaded", () => {
    loadHomeData();
    loadWatchlist();
    loadInterests();
    setupStockSearch();
    setupInterestInputs();
    setupChartOptions();
    renderStocks();
    maybeAppendInterestInput();
});

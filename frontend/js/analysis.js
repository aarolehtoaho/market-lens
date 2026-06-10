async function checkStoredData() {
    const subtitle = document.getElementById("subtitle");

    tickers = [];
    subtitle.textContent = "Checking watchlist...";
    try {
        tickers = await listTickers();
        if (tickers.length === 0) {
            subtitle.textContent = "Your watchlist is empty. Please go to the main page to add some tickers to your watchlist.";
            return false;
        }
    } catch (error) {
        subtitle.textContent = error.message;
        return false;
    }

    subtitle.textContent = "Checking interest list...";
    try {
        const interests = await listInterests();
        if (interests.length === 0) {
            subtitle.textContent = "Your interest list is empty. Please go to the main page to add some interests.";
            return false;
        }
    } catch (error) {
        subtitle.textContent = error.message;
        return false;
    }

    subtitle.textContent = "Checking AI configuration...";
    try {
        const llmConfigured = await checkLLMConfiguration();
        if (!llmConfigured.valid_configuration) {
            subtitle.textContent = "No valid AI configuration found. Please go to the main page to configure your AI provider and model.";
            return false;
        }
    } catch (error) {
        subtitle.textContent = error.message;
        return false;
    }

    subtitle.textContent = "Fetching market data and generating indicators...";
    for (const ticker of tickers) {
        const symbol = ticker.symbol;
        subtitle.textContent = `Fetching data for ${symbol}...`;
        const chartOptions = await getChartOptions(symbol);
        try {
            await cacheMarketData(symbol, chartOptions.period, chartOptions.interval, true);
        } catch (error) {
            subtitle.textContent = `Error fetching data for ${symbol}: ${error.message}`;
            return false;
        }
    }
    return true;
}

async function createAnalysis() {
    const subtitle = document.getElementById("subtitle");
    subtitle.textContent = "Generating analysis...";

    try {
        const analysis_str = await getAiAnalysis();
        const analysis = JSON.parse(analysis_str);
        return analysis;
    } catch (error) {
        subtitle.textContent = `Error generating analysis: ${error.message}`;
        return null;
    }
}

async function displayAnalysis(analysis) {
    const analysisSummaryElem = document.getElementById("analysis-summary");
    const analysisResultsElem = document.getElementById("analysis-results");
    const tickerAnalysisTemplate = document.getElementById("ticker-analysis-template");

    analysisSummaryElem.textContent = analysis.overall_summary;

    for (const stock of analysis.stocks) {
        const tickerElem = tickerAnalysisTemplate.content.cloneNode(true);
        const tickerNameElem = tickerElem.querySelector(".ticker-name");
        const tickerSummaryElem = tickerElem.querySelector(".ticker-summary");
        const keyFindingsListElem = tickerElem.querySelector(".key-findings-list");
        const watchpointsListElem = tickerElem.querySelector(".watchpoints-list");

        tickerNameElem.textContent = stock.symbol;
        tickerSummaryElem.textContent = stock.summary;

        for (const finding of stock.key_findings) {
            const findingItem = document.createElement("li");
            findingItem.innerHTML = `<strong>${finding.interest}:</strong> ${finding.finding} <em>(Signal: ${finding.signal}, Confidence: ${finding.confidence}, Evidence: ${finding.data_evidence})</em>`;
            keyFindingsListElem.appendChild(findingItem);
        }

        for (const watchpoint of stock.watchpoints) {
            const watchpointItem = document.createElement("li");
            watchpointItem.textContent = watchpoint;
            watchpointsListElem.appendChild(watchpointItem);
        }

        analysisResultsElem.appendChild(tickerElem);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    validData = await checkStoredData();
    if (!validData) {
        return;
    }

    const analysis = await createAnalysis();
    if (!analysis) {
        return;
    }

    await displayAnalysis(analysis);
});
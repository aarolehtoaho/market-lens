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
        if (!llmConfigured) {
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

    analysis_str = "";
    try {
        analysis_str = await getAiAnalysis();
    } catch (error) {
        subtitle.textContent = `Error generating analysis: ${error.message}`;
        return null;
    }

    try {
        analysis_cleaned = cleanJsonString(analysis_str);
    } catch (error) {
        subtitle.textContent = 'Received invalid analysis format from AI. Raw response below.';
        displayRawAnalysis(analysis_str);
        throw new Error(`Error cleaning analysis string: ${error.message}`);
    }

    try {
        const analysis = JSON.parse(analysis_cleaned);
        subtitle.textContent = "Analysis generated successfully!";
        return analysis;
    } catch (error) {
        subtitle.textContent = `Received invalid JSON format from AI. Raw response below.`;
        displayRawAnalysis(analysis_cleaned);
        throw new Error(`Error parsing analysis JSON: ${error.message}`);
    }
}

function cleanJsonString(jsonString) {
    // Remove any characters before the first '{' and after the last '}'
    const firstBraceIndex = jsonString.indexOf('{');
    const lastBraceIndex = jsonString.lastIndexOf('}');
    
    if (firstBraceIndex === -1 || lastBraceIndex === -1 || lastBraceIndex < firstBraceIndex) {
        throw new Error("Invalid JSON format: No valid JSON object found.");
    }
    
    return jsonString.substring(firstBraceIndex, lastBraceIndex + 1);
}

async function displayAnalysis(analysis) {
    const analysisPanel = document.getElementById("panel-analysis");
    analysisPanel.style.display = "block";

    const analysisSummaryElem = document.getElementById("analysis-summary");
    const analysisResultsElem = document.getElementById("analysis-results");
    const tickerAnalysisTemplate = document.getElementById("ticker-analysis-template");

    analysisSummaryElem.textContent = analysis.overall_summary;

    for (const stock of analysis.stocks) {
        const tickerElem = tickerAnalysisTemplate.content.cloneNode(true);
        const tickerNameElem = tickerElem.querySelector(".ticker-name");
        const tickerSummaryElem = tickerElem.querySelector(".ticker-summary");
        const keyFindingsListElem = tickerElem.querySelector(".findings-list");
        const watchpointsListElem = tickerElem.querySelector(".watchpoints-list");

        tickerNameElem.textContent = stock.symbol;
        tickerSummaryElem.textContent = stock.summary;

        for (const finding of stock.key_findings) {
            const findingItem = document.createElement("li");
            
            const signalColor = finding.signal === "bearish" ? "red" : finding.signal === "bullish" ? "green" : "gray";
            const confidenceColor = finding.confidence === "high" ? "green" : finding.confidence === "low" ? "red" : "orange";
            const infoTextFontSize = "0.9em";

            findingText = `<strong>${finding.interest}:</strong>`;  
            findingText += `<br>${finding.finding}`;
            findingText += `<br><span style="color: ${signalColor}; font-size: ${infoTextFontSize};">Signal: ${finding.signal}</span>`;
            findingText += ` | <span style="color: ${confidenceColor}; font-size: ${infoTextFontSize};">Confidence: ${finding.confidence}</span>`;
            findingText += ` | <span style="font-size: ${infoTextFontSize};">Evidence: ${finding.data_evidence}</span>`;
            
            findingItem.innerHTML = findingText;
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

function displayRawAnalysis(rawAnalysis) {
    const analysisPanel = document.getElementById("panel-analysis");
    analysisPanel.style.display = "block";

    const analysisSummaryElem = document.getElementById("analysis-summary");
    analysisSummaryElem.textContent = rawAnalysis;

    const analysisHeadingElem = document.getElementById("analysis-heading");
    analysisHeadingElem.style.color = "red";

    const analysisResultsElem = document.getElementById("analysis-results");
    analysisResultsElem.style.display = "none";
}

document.addEventListener("DOMContentLoaded", async () => {
    validData = await checkStoredData();
    if (!validData) {
        return;
    }

    try {
        const analysis = await createAnalysis();
    } catch (error) {
        console.log(error.message);
        return;
    }
    
    if (!analysis) {
        return;
    }

    await displayAnalysis(analysis);
});
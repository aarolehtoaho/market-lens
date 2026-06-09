const { connect } = require("node:http2");

async function drawEmptyChart() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const data = [];

    const layout = {
        paper_bgcolor: 'rgba(255, 255, 255)',
        plot_bgcolor: 'rgba(255, 255, 255)',
        autosize: true,
        margin: {t: 20, r: 30, b: 20, l: 30},

        hovermode: 'closest',

        xaxis: {
            type: 'date',
            range: [oneDayAgo, now],
            dtick: 2 * 60 * 60 * 1000,
            tickformat: '%H:%M',
            gridcolor: 'rgba(200, 200, 200, 0.5)',
            color: 'rgba(0, 0, 0, 0.5)',
        },
        yaxis: {
            range: [0, 100],
            gridcolor: 'rgba(200, 200, 200, 0.5)',
            color: 'rgba(0, 0, 0, 0.5)',
        },
        annotations: [{
            text: "Select a ticker, period, and interval to view the chart",
            xref: 'paper',
            yref: 'paper',
            showarrow: false,
            font: {
                size: 16,
                color: 'rgba(0, 0, 0, 0.7)',
                style: 'italic',
            },
            x: 0.5,
            y: 0.5,
        }],
     };

    const config = {
        responsive: false,
        displayModeBar: false,
        displaylogo: false,
        modeBarButtonsToRemove: ['toImage', 'sendDataToCloud', 'editInChartStudio', 'zoom2d', 'select2d',
                                'pan2d', 'lasso2d', 'autoScale2d', 'resetScale2d', 'zoomIn2d', 'zoomOut2d',
                                'hoverClosestCartesian', 'hoverCompareCartesian', 'toggleHover', 'toggleSpikelines'],
    };
    
    await Plotly.newPlot('plotly-chart', data, layout, config);
}

async function drawChart(symbol, period, interval, sma20 = false, sma50 = false, sma200 = false, vwap = false) {
    ohlcvData = await getOhlcv(symbol, period, interval, true);

    const dateKey =
        ohlcvData.data[0].Datetime !== undefined
            ? 'Datetime'
            : 'Date';

    const timestamps = ohlcvData.data.map(entry => new Date(entry[dateKey]));
    const opens = ohlcvData.data.map(entry => entry.Open);
    const highs = ohlcvData.data.map(entry => entry.High);
    const lows = ohlcvData.data.map(entry => entry.Low);
    const closes = ohlcvData.data.map(entry => entry.Close);
    const volumes = ohlcvData.data.map(entry => entry.Volume);

    //const dividends = ohlcvData.data.map(entry => entry.Dividends);
    //const stockSplits = ohlcvData.data.map(entry => entry["Stock Splits"]);

    const candlesticks = {
        x: timestamps,
        open: opens,
        high: highs,
        low: lows,
        close: closes,
        type: 'candlestick',
        increasing: { line: { color: 'green' } },
        decreasing: { line: { color: 'red' } },
    };

    const data = [candlesticks];

    if (sma20) {
        const sma20Values = calculateSMA(closes, 20);
        const sma20Trace = {
            x: timestamps.slice(19),
            y: sma20Values,
            type: 'scatter',
            mode: 'lines',
            name: 'SMA 20',
            line: { color: 'blue', width: 1 },
        };
        data.push(sma20Trace);
    }

    if (sma50) {
        const sma50Values = calculateSMA(closes, 50);
        const sma50Trace = {
            x: timestamps.slice(49),
            y: sma50Values,
            type: 'scatter',
            mode: 'lines',
            name: 'SMA 50',
            line: { color: 'orange', width: 1 },
        };
        data.push(sma50Trace);
    }

    if (sma200) {
        const sma200Values = calculateSMA(closes, 200);
        const sma200Trace = {
            x: timestamps.slice(199),
            y: sma200Values,
            type: 'scatter',
            mode: 'lines',
            name: 'SMA 200',
            line: { color: 'purple', width: 1 },
        };
        data.push(sma200Trace);
    }

    if (vwap) {
        // VWAP is calculated only for regular market hours. Only regular market hours have volume != 0
        const filtered = ohlcvData.data
            .map(e => ({
                time: new Date(e[dateKey]),
                close: e.Close,
                volume: e.Volume
            }))
            .filter(e => e.volume > 0);

        if (filtered.length === 0) {
            return;
        }

        const vwapValues = calculateVWAP(filtered);

        const segmentedX = [];
        const segmentedY = [];
        let lastDateString = null;

        filtered.forEach((entry, index) => {
            const currentDateString = entry.time.toISOString().split('T')[0];

            if (lastDateString !== null && currentDateString !== lastDateString) {
                const gapTime1Min = new Date(filtered[index - 1].time.getTime() + 60 * 1000);
                segmentedX.push(gapTime1Min);
                segmentedY.push(null);
            }

            segmentedX.push(entry.time);
            segmentedY.push(vwapValues[index]);

            lastDateString = currentDateString;
        });

        const vwapTrace = {
            x: segmentedX,
            y: segmentedY,
            type: 'scatter',
            mode: 'lines',
            name: 'VWAP',
            line: { color: 'magenta', width: 1.5 },
            connectgaps: false,
        };
        data.push(vwapTrace);
    }

    const layout = {
        paper_bgcolor: 'rgba(255, 255, 255)',
        plot_bgcolor: 'rgba(255, 255, 255)',
        autosize: true,
        margin: {t: 20, r: 30, b: 20, l: 30},

        hovermode: 'closest',
        showlegend: false,

        xaxis: {
            type: 'date',
            range: [timestamps[0], timestamps[timestamps.length - 1]],
            nticks: 12,
            tickformat: getTickFormat(interval),
            gridcolor: 'rgba(200, 200, 200, 0.5)',
            color: 'rgba(0, 0, 0, 0.5)',
        },
        yaxis: {
            gridcolor: 'rgba(200, 200, 200, 0.5)',
            color: 'rgba(0, 0, 0, 0.5)',
        },
    };

    const config = {
        responsive: false,
        displayModeBar: false,
        displaylogo: false,
        modeBarButtonsToRemove: ['toImage', 'sendDataToCloud', 'editInChartStudio', 'zoom2d', 'select2d',
                                'pan2d', 'lasso2d', 'autoScale2d', 'resetScale2d', 'zoomIn2d', 'zoomOut2d',
                                'hoverClosestCartesian', 'hoverCompareCartesian', 'toggleHover', 'toggleSpikelines'],
    };
    
    await Plotly.newPlot('plotly-chart', data, layout, config);
}

function calculateSMA(values, period) {
    const smaValues = [];
    for (let i = 0; i <= values.length - period; i++) {
        const sum = values.slice(i, i + period).reduce((a, b) => a + b, 0);
        smaValues.push(sum / period);
    }
    return smaValues;
}

function calculateVWAP(data) {
let cumulativePV = 0;
    let cumulativeVolume = 0;
    const vwapValues = [];
    let lastDateString = null;

    data.forEach(entry => {
        const currentDateString = entry.time.toISOString().split('T')[0];

        if (lastDateString !== null && currentDateString !== lastDateString) {
            cumulativePV = 0;
            cumulativeVolume = 0;
        }
        lastDateString = currentDateString;

        if (entry.volume === 0 || !Number.isFinite(entry.close) || Number.isNaN(entry.close)) {
            vwapValues.push(null);
            return;
        }

        cumulativePV += entry.close * entry.volume;
        cumulativeVolume += entry.volume;
        
        vwapValues.push(cumulativePV / cumulativeVolume);
    });

    return vwapValues;
}

function getTickFormat(interval) {
    if (interval.endsWith('m')) {
        return '%H:%M';
    }

    if (interval.endsWith('h')) {
        return '%d.%m %H:%M';
    }

    if (interval.endsWith('d')) {
        return '%d.%m.%Y';
    }

    return '%d.%m.%Y';
}

function loadPlotlyScript() {
    const script = document.createElement('script');
    script.src = "https://cdn.plot.ly/plotly-3.6.0.min.js";
    document.head.appendChild(script);
}

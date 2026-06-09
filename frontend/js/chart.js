async function drawEmptyChart() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const data = [];

    const layout = {
        paper_bgcolor: 'rgba(255, 255, 255)',
        plot_bgcolor: 'rgba(255, 255, 255)',
        autosize: true,
        margin: {t: 20, r: 20, b: 20, l: 20},

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

async function drawChart(symbol, period, interval) {
    ohlcvData = await getOhlcv(symbol, period, interval);

    const dateKey =
        ohlcvData.data[0].Datetime !== undefined
            ? 'Datetime'
            : 'Date';

    const timestamps = ohlcvData.data.map(entry => new Date(entry[dateKey]));
    const opens = ohlcvData.data.map(entry => entry.Open);
    const highs = ohlcvData.data.map(entry => entry.High);
    const lows = ohlcvData.data.map(entry => entry.Low);
    const closes = ohlcvData.data.map(entry => entry.Close);

    //const volumes = ohlcvData.data.map(entry => entry.Volume);
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

    const layout = {
        paper_bgcolor: 'rgba(255, 255, 255)',
        plot_bgcolor: 'rgba(255, 255, 255)',
        autosize: true,
        margin: {t: 20, r: 20, b: 20, l: 20},

        hovermode: 'closest',

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

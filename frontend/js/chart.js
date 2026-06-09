async function drawEmptyChart(message) {
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
            text: message,
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

async function drawChart(ohlcvData, indicatorToggles) {
    const dateKey =
        ohlcvData.data[0].Datetime !== undefined
            ? 'Datetime'
            : 'Date';

    const timestamps = ohlcvData.data.map(entry => new Date(entry[dateKey]));
    const opens = ohlcvData.data.map(entry => entry.Open);
    const highs = ohlcvData.data.map(entry => entry.High);
    const lows = ohlcvData.data.map(entry => entry.Low);
    const closes = ohlcvData.data.map(entry => entry.Close);
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

    if (indicatorToggles['toggle-volume']) {
        const volumes = ohlcvData.data.map(entry => entry.Volume);
        const volumeTrace = {
            x: timestamps,
            y: volumes,
            type: 'bar',
            name: 'Volume',
            marker: {color: volumes.map((v, i) => volumeBarColor(opens[i], closes[i]))},
            yaxis: 'y2',
        };
        data.push(volumeTrace);
    }

    if (indicatorToggles['toggle-sma20']) {
        const sma20Values = ohlcvData.data.map(entry => entry.SMA20);
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

    if (indicatorToggles['toggle-sma50']) {
        const sma50Values = ohlcvData.data.map(entry => entry.SMA50);
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

    if (indicatorToggles['toggle-sma200']) {
        const sma200Values = ohlcvData.data.map(entry => entry.SMA200);
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

    if (indicatorToggles['toggle-vwap']) {
        // VWAP is calculated only for regular market hours. Only regular market hours have volume != 0
        const filtered = ohlcvData.data
            .map(e => ({
                time: new Date(e[dateKey]),
                vwap: e.VWAP,
                volume: e.Volume,
            }))
            .filter(e => e.volume > 0);

        if (filtered.length === 0) {
            return;
        }

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
            segmentedY.push(entry.vwap);

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

    if (indicatorToggles['toggle-rsi']) {
        const rsiValues = ohlcvData.data.map(entry => entry.RSI);
        const rsiTrace = {
            x: timestamps,
            y: rsiValues,
            type: 'scatter',
            mode: 'lines',
            name: 'RSI',
            line: { color: 'cyan', width: 1 },
        };
        data.push(rsiTrace);
    }

    if (indicatorToggles['toggle-bollinger']) {
        const upperValues = ohlcvData.data.map(entry => entry.BollingerUpper);
        const middleValues = ohlcvData.data.map(entry => entry.SMA20);
        const lowerValues = ohlcvData.data.map(entry => entry.BollingerLower);

        const upperTrace = {
            x: timestamps,
            y: upperValues,
            type: 'scatter',
            mode: 'lines',
            name: 'Bollinger Upper',
            line: { color: 'red', width: 1 },
        };
        data.push(upperTrace);

        const middleTrace = {
            x: timestamps,
            y: middleValues,
            type: 'scatter',
            mode: 'lines',
            name: 'Bollinger Middle',
            line: { color: 'blue', width: 1 },
        };
        data.push(middleTrace);

        const lowerTrace = {
            x: timestamps,
            y: lowerValues,
            type: 'scatter',
            mode: 'lines',
            name: 'Bollinger Lower',
            line: { color: 'green', width: 1 },
        };
        data.push(lowerTrace);
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
        yaxis2: {
            overlaying: 'y',
            layer: 'below',
            side: 'right',
            visible: indicatorToggles['toggle-volume'],
            showgrid: false,
            ticks: '',
            color: 'rgba(0, 0, 0, 0.5)',
            domain: [0, 0.2],
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

function volumeBarColor(open, close) {
    if (close > open) {
        return 'rgba(100, 255, 100, 0.5)';
    } else if (close < open) {
        return 'rgba(255, 100, 100, 0.5)';
    } else {
        return 'rgba(200, 200, 200, 0.5)';
    }
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
    return new Promise((resolve, reject) => {
        if (window.Plotly) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = "https://cdn.plot.ly/plotly-3.6.0.min.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Plotly.js"));
        document.head.appendChild(script);
    });
}

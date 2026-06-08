function drawEmptyChart() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const data = [];

    const layout = {
        paper_bgcolor: 'rgba(255, 255, 255)',
        plot_bgcolor: 'rgba(255, 255, 255)',
        autosize: true,
        margin: { t: 40, b: 60, l: 60, r: 40 },

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
    
    Plotly.newPlot('plotly-chart', data, layout, config);
}

function loadPlotlyScript() {
    const script = document.createElement('script');
    script.src = "https://cdn.plot.ly/plotly-3.6.0.min.js";
    document.head.appendChild(script);
}

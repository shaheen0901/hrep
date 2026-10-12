import { useMemo, useState } from 'react'
import createPlotlyComponent from 'react-plotly.js/factory'
import Plotly from 'plotly.js-dist-min'
import { datesBetween, inRange } from '../utils/data'

const Plot = createPlotlyComponent(Plotly)

// Trailing 7-day mean that skips missing days (needs at least 4 valid days).
function rolling7(y) {
  return y.map((_, i) => {
    const win = y.slice(Math.max(0, i - 6), i + 1).filter((v) => v != null)
    return win.length >= 4 ? win.reduce((a, b) => a + b, 0) / win.length : null
  })
}

export default function TimeSeriesChart({ series, start, end, units }) {
  const [smooth, setSmooth] = useState(false)

  const traces = useMemo(() => {
    const x = datesBetween(start, end)
    return series.map((s) => {
      const byDate = new Map(s.records.filter((r) => inRange(r.date, start, end)).map((r) => [r.date, r.no2]))
      let y = x.map((d) => byDate.get(d) ?? null) // null leaves a gap on cloudy / missing days
      if (smooth) y = rolling7(y)
      return {
        x,
        y,
        name: s.label,
        type: 'scatter',
        mode: 'lines',
        connectgaps: false,
        line: { color: s.color, width: 1.8 },
        hovertemplate: `%{y:.2f}<extra>${s.label}</extra>`,
      }
    })
  }, [series, start, end, smooth])

  if (!series.length) {
    return (
      <div className="chart-empty">
        <p>Click counties on the map to compare their daily NO₂. You can compare up to eight at once.</p>
      </div>
    )
  }

  return (
    <div className="chart">
      <label className="check">
        <input type="checkbox" checked={smooth} onChange={(e) => setSmooth(e.target.checked)} />
        Show 7-day average
      </label>
      <Plot
        data={traces}
        layout={{
          autosize: true,
          height: 380,
          margin: { l: 64, r: 16, t: 12, b: 48 },
          font: { family: 'Public Sans, system-ui, sans-serif', size: 13, color: '#461D7C' },
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          hovermode: 'x unified',
          xaxis: { type: 'date', gridcolor: '#ebe7f1' },
          yaxis: { title: { text: `NO₂ column (${units})` }, gridcolor: '#ebe7f1', zeroline: false, rangemode: 'tozero' },
          legend: { orientation: 'h', y: -0.18 },
        }}
        config={{
          displaylogo: false,
          responsive: true,
          modeBarButtonsToRemove: ['lasso2d', 'select2d'],
          toImageButtonOptions: { filename: 'hrep_no2_timeseries', scale: 2 },
        }}
        useResizeHandler
        style={{ width: '100%' }}
      />
    </div>
  )
}

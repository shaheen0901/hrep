import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { feature, mesh } from 'topojson-client'
import CountyMap from './components/CountyMap'
import SelectedTable from './components/SelectedTable'
import DateRange from './components/DateRange'
import DownloadPanel from './components/DownloadPanel'
import GeoSenseLogo from './components/GeoSenseLogo'
import { loadJSON, loadMonthly, loadStateDaily, mapValues, shiftDays } from './utils/data'
import { quantileBreaks, SERIES, MAX_SELECTED } from './utils/colors'
import { stateOf } from './utils/states'

// Plotly is large, so the chart loads separately and the map appears first.
const TimeSeriesChart = lazy(() => import('./components/TimeSeriesChart'))

export default function App() {
  const [manifest, setManifest] = useState(null)
  const [counties, setCounties] = useState(null)
  const [borders, setBorders] = useState(null) // county and state lines, each drawn once
  const [monthly, setMonthly] = useState(null)
  const [loadError, setLoadError] = useState(null)

  const [range, setRange] = useState(null) // { start, end }
  const [selected, setSelected] = useState([]) // [{ fips, label, color, state }]
  const [stateData, setStateData] = useState({}) // { LA: Map<fips, records> }
  const [notice, setNotice] = useState(null)

  // Initial load: manifest, county shapes, monthly means for the map.
  useEffect(() => {
    Promise.all([loadJSON('data/manifest.json'), loadJSON('data/counties-10m.json'), loadMonthly()])
      .then(([man, topo, mon]) => {
        setManifest(man)
        setCounties(feature(topo, topo.objects.counties))
        setBorders({
          counties: mesh(topo, topo.objects.counties, (a, b) => a !== b && a.id.slice(0, 2) === b.id.slice(0, 2)),
          states: mesh(topo, topo.objects.states, (a, b) => a !== b),
        })
        setMonthly(mon)
        const start = shiftDays(man.end_date, -89) < man.start_date ? man.start_date : shiftDays(man.end_date, -89)
        setRange({ start, end: man.end_date })
      })
      .catch((e) => setLoadError(e.message))
  }, [])

  // Fetch daily files for any state that has a selected county.
  useEffect(() => {
    for (const s of new Set(selected.map((x) => x.state))) {
      if (stateData[s]) continue
      loadStateDaily(s)
        .then((byFips) => setStateData((prev) => ({ ...prev, [s]: byFips })))
        .catch((e) => setNotice(e.message))
    }
  }, [selected, stateData])

  const countyNames = useMemo(
    () => new Map((counties?.features ?? []).map((f) => [f.id, f.properties.name])),
    [counties],
  )

  const values = useMemo(
    () => (monthly && range ? mapValues(monthly, range.start, range.end) : new Map()),
    [monthly, range],
  )
  const breaks = useMemo(() => quantileBreaks(values.values()), [values])

  const series = selected
    .filter((s) => stateData[s.state])
    .map((s) => ({ ...s, records: stateData[s.state].get(s.fips) ?? [] }))
  const waiting = selected.length > series.length

  function toggleCounty(f) {
    setNotice(null)
    const fips = f.id
    if (selected.some((s) => s.fips === fips)) {
      setSelected((sel) => sel.filter((s) => s.fips !== fips))
      return
    }
    const st = stateOf(fips)
    if (!st || !manifest.states.includes(st.abbr)) {
      setNotice(`No NO₂ data is available for ${f.properties.name}${st ? `, ${st.abbr}` : ''}.`)
      return
    }
    if (selected.length >= MAX_SELECTED) {
      setNotice(`You can compare up to ${MAX_SELECTED} counties. Remove one to add another.`)
      return
    }
    const used = new Set(selected.map((s) => s.color))
    const color = SERIES.find((c) => !used.has(c))
    setSelected((sel) => [...sel, { fips, label: `${f.properties.name}, ${st.abbr}`, color, state: st.abbr }])
  }

  if (loadError) {
    return (
      <main className="status">
        <h1>HREP could not load its data</h1>
        <p>{loadError}</p>
        <p>
          Check that <code>public/data/manifest.json</code>, <code>monthly_means.csv</code> and the state files exist.
          For test data, run <code>node pipeline/make_synthetic_data.mjs</code> and refresh.
        </p>
      </main>
    )
  }
  if (!manifest || !counties || !borders || !range) {
    return <main className="status">Loading county map…</main>
  }

  const units = manifest.units_short ?? '10¹⁵ molec/cm²'

  return (
    <div className="app">
      <header className="masthead">
        <div className="brand">
          <GeoSenseLogo />
          <span className="brand-divider" aria-hidden="true" />
          <div>
            <h1>HREP</h1>
            <p className="tagline">Health-Ready Exposure Platform: daily county NO₂ from NASA TEMPO</p>
          </div>
        </div>
        <p className="updated">
          Data {manifest.start_date} to {manifest.end_date}
          <br />
          Updated {manifest.last_updated}
        </p>
      </header>

      {manifest.synthetic && (
        <p className="banner" role="note">
          Sample data for testing the tool. These are not real TEMPO measurements.
        </p>
      )}

      <main className="layout">
        <section className="map-panel" aria-label="County map">
          <CountyMap
            counties={counties}
            borders={borders}
            values={values}
            breaks={breaks}
            selected={selected}
            onToggle={toggleCounty}
            units={units}
          />
          <p className="map-note">
            Map shows the mean over the months in your date range. Click a county to add or remove it.
          </p>
        </section>

        <aside className="side">
          <DateRange
            min={manifest.start_date}
            max={manifest.end_date}
            start={range.start}
            end={range.end}
            onChange={(start, end) => setRange({ start, end })}
          />
          <div>
            <h2>Selected counties</h2>
            {notice && <p className="notice">{notice}</p>}
            <SelectedTable
              series={series}
              start={range.start}
              end={range.end}
              loading={waiting}
              onRemove={(fips) => setSelected((sel) => sel.filter((s) => s.fips !== fips))}
              onClear={() => setSelected([])}
            />
          </div>
          <DownloadPanel
            series={series}
            start={range.start}
            end={range.end}
            availableStates={manifest.states}
            countyNames={countyNames}
          />
        </aside>

        <section className="chart-panel" aria-label="Daily time series">
          <h2>Daily NO₂</h2>
          <Suspense fallback={<p className="muted">Loading chart…</p>}>
            <TimeSeriesChart series={series} start={range.start} end={range.end} units={units} />
          </Suspense>
        </section>
      </main>

      <footer className="foot">
        <p>
          Values are tropospheric NO₂ column density from TEMPO Level 3, averaged to counties. They describe the
          whole air column, not ground-level concentration.
        </p>
        <p>
          Developed by the <a href="https://shaheen0901.github.io/geosense/">GeoSENSE Lab</a>, LSU Health Sciences
          Center New Orleans.
        </p>
      </footer>
    </div>
  )
}

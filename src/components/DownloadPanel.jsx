import { useState } from 'react'
import { inRange, loadStateDaily } from '../utils/data'
import { downloadCSV } from '../utils/download'
import { STATES } from '../utils/states'

const HEADER = ['fips', 'county', 'state', 'date', 'no2_trop_column_1e15_molec_cm2', 'n_obs']

export default function DownloadPanel({ series, start, end, availableStates, countyNames }) {
  const [state, setState] = useState(availableStates.includes('LA') ? 'LA' : availableStates[0])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  function rowsFor(fips, records) {
    const name = countyNames.get(fips) ?? ''
    const st = STATES[fips.slice(0, 2)]?.abbr ?? ''
    return records.filter((r) => inRange(r.date, start, end)).map((r) => [fips, name, st, r.date, r.no2, r.nObs])
  }

  function downloadSelected() {
    const rows = series.flatMap((s) => rowsFor(s.fips, s.records))
    downloadCSV(`hrep_no2_selected_${start}_${end}.csv`, HEADER, rows)
  }

  async function downloadState() {
    setBusy(true)
    setError(null)
    try {
      const byFips = await loadStateDaily(state)
      const rows = [...byFips.keys()].sort().flatMap((f) => rowsFor(f, byFips.get(f)))
      downloadCSV(`hrep_no2_${state}_${start}_${end}.csv`, HEADER, rows)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const stateOptions = Object.values(STATES)
    .filter((s) => availableStates.includes(s.abbr))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="download">
      <h2>Download data</h2>
      <p className="muted">Daily values for {start} to {end}, as CSV.</p>
      <button className="btn" onClick={downloadSelected} disabled={!series.length}>
        Download selected counties
      </button>
      <div className="state-dl">
        <label>
          <span className="sr-only">State</span>
          <select value={state} onChange={(e) => setState(e.target.value)}>
            {stateOptions.map((s) => (
              <option key={s.abbr} value={s.abbr}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <button className="btn secondary" onClick={downloadState} disabled={busy || !state}>
          {busy ? 'Preparing…' : 'Download State'}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  )
}

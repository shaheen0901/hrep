import { fmt, summarize } from '../utils/data'

export default function SelectedTable({ series, start, end, onRemove, onClear, loading }) {
  if (!series.length && !loading) {
    return <p className="muted">No counties selected yet. Click a county on the map to add it.</p>
  }
  return (
    <div className="selected">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">County</th>
              <th scope="col" className="num">Mean</th>
              <th scope="col" className="num">Max</th>
              <th scope="col" className="num" title="Days with a valid value / days in range">Days</th>
              <th scope="col"><span className="sr-only">Remove</span></th>
            </tr>
          </thead>
          <tbody>
            {series.map((s) => {
              const st = summarize(s.records, start, end)
              return (
                <tr key={s.fips}>
                  <td>
                    <span className="dot" style={{ background: s.color }} />
                    {s.label}
                  </td>
                  <td className="num">{fmt(st.mean)}</td>
                  <td className="num">{fmt(st.max)}</td>
                  <td className="num">
                    {st.daysWithData}/{st.totalDays}
                  </td>
                  <td>
                    <button className="icon-btn" onClick={() => onRemove(s.fips)} aria-label={`Remove ${s.label}`}>
                      ×
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {loading && <p className="muted">Loading county data…</p>}
      {series.length > 0 && (
        <button className="link-btn" onClick={onClear}>
          Clear selection
        </button>
      )}
    </div>
  )
}

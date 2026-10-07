import { shiftDays } from '../utils/data'

export default function DateRange({ min, max, start, end, onChange }) {
  const presets = [
    { label: 'Last 30 days', range: [shiftDays(max, -29), max] },
    { label: 'Last 90 days', range: [shiftDays(max, -89), max] },
    { label: 'Full record', range: [min, max] },
  ].map((p) => ({ ...p, range: [p.range[0] < min ? min : p.range[0], p.range[1]] }))

  return (
    <fieldset className="daterange">
      <legend>Date range</legend>
      <div className="date-inputs">
        <label>
          From
          <input
            type="date"
            value={start}
            min={min}
            max={end}
            onChange={(e) => e.target.value && onChange(e.target.value, end)}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={end}
            min={start}
            max={max}
            onChange={(e) => e.target.value && onChange(start, e.target.value)}
          />
        </label>
      </div>
      <div className="presets">
        {presets.map((p) => {
          const active = p.range[0] === start && p.range[1] === end
          return (
            <button key={p.label} className={active ? 'chip active' : 'chip'} aria-pressed={active} onClick={() => onChange(...p.range)}>
              {p.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

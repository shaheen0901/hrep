import Papa from 'papaparse'

// Every data path is built from BASE_URL so the app works locally (/hrep/),
// on GitHub Pages (/hrep/) and later on another server (change `base` in vite.config.js).
const BASE = import.meta.env.BASE_URL

async function fetchOk(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`Could not load ${path} (HTTP ${res.status}).`)
  return res
}

export async function loadJSON(path) {
  return (await fetchOk(path)).json()
}

async function loadCSV(path) {
  const text = await (await fetchOk(path)).text()
  // dynamicTyping stays off so FIPS codes keep their leading zeros ("01001").
  return Papa.parse(text, { header: true, skipEmptyLines: true }).data
}

const toNum = (v) => (v === '' || v == null ? null : Number(v))

// Monthly means for every county, used to color the national map.
// Returns Map<fips, Array<{ month: 'YYYY-MM', no2, nDays }>>
export async function loadMonthly() {
  const rows = await loadCSV('data/monthly_means.csv')
  const byFips = new Map()
  for (const r of rows) {
    if (!byFips.has(r.fips)) byFips.set(r.fips, [])
    byFips.get(r.fips).push({ month: r.month, no2: toNum(r.no2), nDays: Number(r.n_days) })
  }
  return byFips
}

// Daily values, one file per state, fetched on demand and cached.
// Returns Map<fips, Array<{ date: 'YYYY-MM-DD', no2, nObs }>>
const stateCache = new Map()
export function loadStateDaily(abbr) {
  if (!stateCache.has(abbr)) {
    const p = loadCSV(`data/no2/no2_${abbr}.csv`)
      .then((rows) => {
        const byFips = new Map()
        for (const r of rows) {
          if (!byFips.has(r.fips)) byFips.set(r.fips, [])
          byFips.get(r.fips).push({ date: r.date, no2: toNum(r.no2), nObs: Number(r.n_obs) })
        }
        return byFips
      })
      .catch((err) => {
        stateCache.delete(abbr) // allow a retry
        throw err
      })
    stateCache.set(abbr, p)
  }
  return stateCache.get(abbr)
}

// ---- small helpers -------------------------------------------------------

export function inRange(date, start, end) {
  return date >= start && date <= end // ISO strings compare correctly
}

// Every calendar day between start and end (inclusive), as YYYY-MM-DD.
export function datesBetween(start, end) {
  const out = []
  const d = new Date(`${start}T00:00:00Z`)
  const last = new Date(`${end}T00:00:00Z`)
  while (d <= last) {
    out.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return out
}

export function shiftDays(date, days) {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// Day-weighted mean of the monthly values whose month overlaps [start, end].
export function mapValues(monthly, start, end) {
  const m0 = start.slice(0, 7)
  const m1 = end.slice(0, 7)
  const out = new Map()
  for (const [fips, months] of monthly) {
    let sum = 0
    let n = 0
    for (const m of months) {
      if (m.month >= m0 && m.month <= m1 && m.no2 != null && m.nDays > 0) {
        sum += m.no2 * m.nDays
        n += m.nDays
      }
    }
    if (n > 0) out.set(fips, sum / n)
  }
  return out
}

// Summary statistics for one county's daily records within a date range.
export function summarize(records, start, end) {
  const vals = records.filter((r) => inRange(r.date, start, end) && r.no2 != null).map((r) => r.no2)
  const totalDays = datesBetween(start, end).length
  if (!vals.length) return { mean: null, max: null, daysWithData: 0, totalDays }
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length
  return { mean, max: Math.max(...vals), daysWithData: vals.length, totalDays }
}

export function fmt(v, digits = 2) {
  return v == null || Number.isNaN(v) ? '–' : v.toFixed(digits)
}

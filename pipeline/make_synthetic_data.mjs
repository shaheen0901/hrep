// Generates SYNTHETIC county NO2 data in the exact format HREP expects, so the
// tool can be built and tested before real TEMPO processing is ready.
//
//   node pipeline/make_synthetic_data.mjs
//
// Writes into public/data/:
//   manifest.json          dataset description (dates, units, states)
//   monthly_means.csv      fips,month,no2,n_days        (colors the national map)
//   no2/no2_<ST>.csv       fips,date,no2,n_obs           (one file per state)
//
// The real pipeline must write the same files with the same columns.

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA = join(ROOT, 'public', 'data')
const START = '2025-01-01'
const END = '2025-12-31'

// State FIPS -> abbreviation, CONUS + DC only (TEMPO does not observe AK/HI).
const STATES = {
  '01': 'AL', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC',
  '12': 'FL', '13': 'GA', '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY',
  '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS', '29': 'MO',
  '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH', '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC',
  '38': 'ND', '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD',
  '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI',
  '56': 'WY',
}

// A few large urban counties get higher baselines so the map looks plausible.
const URBAN = {
  '06037': 9, '17031': 9, '36047': 11, '36061': 12, '36081': 10, '48201': 8, '04013': 7, '22071': 6,
  '22033': 6, '13121': 7, '26163': 7, '42101': 8, '48113': 7, '12086': 6, '53033': 6, '11001': 8,
  '25025': 7, '06059': 8, '32003': 6, '48029': 5, '39035': 6, '29510': 6, '27053': 5, '08031': 6,
}

// Seeded random numbers so every run gives identical files.
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(20261007)
const gauss = () => Math.sqrt(-2 * Math.log(rand() || 1e-9)) * Math.cos(2 * Math.PI * rand())

function dates(start, end) {
  const out = []
  for (let d = new Date(`${start}T00:00:00Z`); d <= new Date(`${end}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(new Date(d))
  }
  return out
}

const topo = JSON.parse(readFileSync(join(DATA, 'counties-10m.json'), 'utf8'))
const counties = topo.objects.counties.geometries.map((g) => g.id).filter((id) => STATES[id.slice(0, 2)]).sort()
const days = dates(START, END)

// Shared day-to-day "weather" per state, so neighbouring counties move together.
const weather = {}
for (const st of Object.values(STATES)) {
  let w = 0
  weather[st] = days.map(() => (w = 0.7 * w + 0.3 * gauss()))
}

rmSync(join(DATA, 'no2'), { recursive: true, force: true })
mkdirSync(join(DATA, 'no2'), { recursive: true })

const byState = {}
const monthly = ['fips,month,no2,n_days']

for (const fips of counties) {
  const st = STATES[fips.slice(0, 2)]
  const base = URBAN[fips] ?? Math.exp(0.45 + 0.45 * gauss()) // ~1.6 typical rural/suburban
  const months = {}
  ;(byState[st] ??= ['fips,date,no2,n_obs'])

  days.forEach((d, i) => {
    const doy = i + 1
    const winter = Math.cos((2 * Math.PI * (doy - 15)) / 365) // +1 mid-Jan, -1 mid-Jul
    if (rand() < 0.14 + 0.08 * Math.max(0, winter)) return // cloudy / no valid retrieval
    const weekday = d.getUTCDay()
    const weekly = weekday === 0 ? 0.72 : weekday === 6 ? 0.82 : 1
    const v = base * (1 + 0.28 * winter) * weekly * Math.exp(0.22 * weather[st][i] + 0.18 * gauss())
    const no2 = Math.max(0.05, v).toFixed(3)
    const date = d.toISOString().slice(0, 10)
    byState[st].push(`${fips},${date},${no2},${3 + Math.floor(rand() * 40)}`)
    const m = date.slice(0, 7)
    ;(months[m] ??= []).push(Number(no2))
  })

  for (const [m, vals] of Object.entries(months)) {
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length
    monthly.push(`${fips},${m},${mean.toFixed(3)},${vals.length}`)
  }
}

for (const [st, lines] of Object.entries(byState)) {
  writeFileSync(join(DATA, 'no2', `no2_${st}.csv`), lines.join('\n') + '\n')
}
writeFileSync(join(DATA, 'monthly_means.csv'), monthly.join('\n') + '\n')

const manifest = {
  title: 'HREP county NO2',
  variable: 'Tropospheric NO2 vertical column, daily county mean (TEMPO L3)',
  units: '10^15 molecules/cm^2',
  units_short: '10¹⁵ molec/cm²',
  start_date: START,
  end_date: END,
  last_updated: new Date().toISOString().slice(0, 10),
  states: Object.keys(byState).sort(),
  synthetic: true,
  files: {
    monthly: 'monthly_means.csv',
    daily: 'no2/no2_<STATE>.csv',
  },
}
writeFileSync(join(DATA, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')

console.log(`Wrote ${counties.length} counties x ${days.length} days for ${manifest.states.length} states to ${DATA}`)

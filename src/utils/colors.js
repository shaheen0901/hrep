// NO2 is a reddish-brown gas, so the map ramps from pale haze to deep brown.
export const NO2_RAMP = ['#f6f0c8', '#efd48a', '#e5ae58', '#d4843a', '#b35a2b', '#843722', '#4f1e19']
export const NO_DATA = '#d3dade'

// Line colors for compared counties (kept clear of the brown map ramp).
export const SERIES = ['#1f5fa8', '#0f8a7e', '#7b3fa0', '#c2185b', '#2e7d32', '#5c6bc0', '#00838f', '#455a64']
export const MAX_SELECTED = SERIES.length

// Quantile class breaks so the map shows contrast for any date range.
export function quantileBreaks(values, classes = NO2_RAMP.length) {
  const v = [...values].filter((x) => x != null).sort((a, b) => a - b)
  if (!v.length) return []
  const breaks = []
  for (let i = 1; i < classes; i++) breaks.push(v[Math.floor((i / classes) * (v.length - 1))])
  return breaks
}

export function colorFor(value, breaks) {
  if (value == null) return NO_DATA
  let i = 0
  while (i < breaks.length && value > breaks[i]) i++
  return NO2_RAMP[i]
}

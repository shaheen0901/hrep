import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, GeoJSON, Pane } from 'react-leaflet'
import { colorFor, NO2_RAMP, NO_DATA } from '../utils/colors'
import { fmt } from '../utils/data'
import { stateOf } from '../utils/states'

const BASE_STYLE = { weight: 0.8, opacity: 1, fillOpacity: 1 }
const COUNTY_LINES = { weight: 0.2, color: '#ffffff', opacity: 0.55, interactive: false }
const STATE_LINES = { weight: 0.9, color: '#ffffff', opacity: 0.9, interactive: false }

export default function CountyMap({ counties, borders, values, breaks, selected, onToggle, units }) {
  const layerRef = useRef(null)
  // Leaflet handlers are bound once, so they read the latest props through refs.
  const latest = useRef({ values, breaks, selected, onToggle })
  useEffect(() => {
    latest.current = { values, breaks, selected, onToggle }
  })

  function styleFor(feature) {
    const { values, breaks, selected } = latest.current
    const fips = feature.id
    const sel = selected.find((s) => s.fips === fips)
    const fill = colorFor(values.get(fips), breaks)
    return {
      ...BASE_STYLE,
      fillColor: fill,
      color: fill, // outline in the county's own color closes slivers along rivers
      ...(sel ? { weight: 2.6, color: sel.color, fillOpacity: 0.9 } : {}),
    }
  }

  function onEachFeature(feature, layer) {
    layer.bindTooltip(
      () => {
        const st = stateOf(feature.id)
        const v = latest.current.values.get(feature.id)
        return `<strong>${feature.properties.name}${st ? `, ${st.abbr}` : ''}</strong><br/>${
          v == null ? 'No data' : `${fmt(v)} ${units}`
        }`
      },
      { sticky: true, className: 'county-tip' },
    )
    layer.on('click', () => latest.current.onToggle(feature))
  }

  // Restyle in place when the date range or selection changes (no re-render of 3,000 shapes).
  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    layer.eachLayer((l) => {
      l.setStyle(styleFor(l.feature))
      if (selected.some((s) => s.fips === l.feature.id)) l.bringToFront()
    })
  })

  return (
    <div className="map-wrap">
      <MapContainer center={[38.5, -96]} zoom={4} minZoom={3} preferCanvas className="map" worldCopyJump>
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles &copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors"
          maxZoom={16}
        />
        <GeoJSON ref={layerRef} data={counties} style={styleFor} onEachFeature={onEachFeature} />
        <GeoJSON data={borders.counties} style={COUNTY_LINES} interactive={false} />
        <GeoJSON data={borders.states} style={STATE_LINES} interactive={false} />
        <Pane name="labels" style={{ zIndex: 450, pointerEvents: 'none' }}>
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
            maxZoom={16}
          />
        </Pane>
      </MapContainer>
      <Legend breaks={breaks} units={units} />
    </div>
  )
}

function Legend({ breaks, units }) {
  if (!breaks.length) return null
  const labels = NO2_RAMP.map((_, i) => {
    if (i === 0) return `< ${fmt(breaks[0], 2)}`
    if (i === NO2_RAMP.length - 1) return `> ${fmt(breaks[i - 1], 2)}`
    return `${fmt(breaks[i - 1], 2)} to ${fmt(breaks[i], 2)}`
  })
  return (
    <div className="legend" aria-label="Map legend">
      <p className="legend-title">Mean NO₂ column ({units})</p>
      <ul>
        {NO2_RAMP.map((c, i) => (
          <li key={c}>
            <span className="swatch" style={{ background: c }} />
            {labels[i]}
          </li>
        ))}
        <li>
          <span className="swatch" style={{ background: NO_DATA }} />
          No data
        </li>
      </ul>
    </div>
  )
}

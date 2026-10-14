import GeoSenseLogo from './GeoSenseLogo'
import { toolsUrl } from './lab'

// Slim header used by every GeoSENSE tool: back link, lab logo, tool name, and an optional right-hand slot.
export default function ToolHeader({ name, tagline, children }) {
  return (
    <header className="masthead">
      <a className="back-link" href={toolsUrl()}>
        <span aria-hidden="true">←</span> Back to Tools
      </a>
      <div className="masthead-row">
        <div className="brand">
          <GeoSenseLogo />
          <span className="brand-divider" aria-hidden="true" />
          <div>
            <h1>{name}</h1>
            {tagline && <p className="tagline">{tagline}</p>}
          </div>
        </div>
        {children}
      </div>
    </header>
  )
}

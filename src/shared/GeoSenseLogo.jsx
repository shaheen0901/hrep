// GeoSENSE Lab wordmark, same markup as the lab website (globe "o" with satellite).
import { LAB_URL } from './lab'
export default function GeoSenseLogo() {
  return (
    <a
      className="gs-brand"
      href={LAB_URL}
      aria-label="GeoSENSE Lab website"
    >
      <span className="gs-word" aria-hidden="true">
        Ge
        <svg className="globe-o" viewBox="0 0 62 100" aria-hidden="true" focusable="false">
          <path d="M4 44 Q34 4 66 40" fill="none" stroke="currentColor" strokeWidth="2.2" strokeDasharray="3 4" opacity=".55" />
          <circle cx="31" cy="73" r="21.5" fill="#461D7C" stroke="currentColor" strokeWidth="11" />
          <ellipse cx="31" cy="73" rx="16" ry="6" fill="none" stroke="currentColor" strokeOpacity=".45" strokeWidth="2" />
          <ellipse cx="31" cy="73" rx="7" ry="16" fill="none" stroke="currentColor" strokeOpacity=".45" strokeWidth="2" />
          <circle cx="37" cy="67" r="3.2" fill="#FDD023" />
          <g transform="translate(50 26.7) rotate(28)">
            <rect x="-14" y="-2.6" width="9" height="5.2" fill="#999999" />
            <rect x="5" y="-2.6" width="9" height="5.2" fill="#999999" />
            <rect x="-4" y="-4" width="8" height="8" fill="currentColor" />
          </g>
        </svg>
        SENSE Lab
      </span>
      <small>School of Public Health</small>
    </a>
  )
}

import { contactUrl, LAB_FOOTER_NAME } from './lab'

// Shared footer for GeoSENSE tools.
// Top: tool-specific notes (children) and how to cite. Bottom: the same purple band as the lab website,
// with a Contact link to the website's contact section (no email address shown, to limit spam).
export default function ToolFooter({ citation, children }) {
  return (
    <>
      {(children || citation) && (
        <div className="foot">
          {children}
          {citation && (
            <p className="cite">
              <strong>How to cite:</strong> {citation}
            </p>
          )}
        </div>
      )}
      <footer className="site-foot">
        <div className="site-foot-inner">
          <span>
            &copy; {new Date().getFullYear()} {LAB_FOOTER_NAME}
          </span>
          <a href={contactUrl()}>Contact</a>
        </div>
      </footer>
    </>
  )
}

import { LAB_EMAIL, LAB_HOME, LAB_NAME, LAB_URL } from './lab'

// Shared footer: tool-specific notes (children), how to cite, lab name and contact.
export default function ToolFooter({ citation, children }) {
  return (
    <footer className="foot">
      {children}
      {citation && (
        <p className="cite">
          <strong>How to cite:</strong> {citation}
        </p>
      )}
      <p>
        <a href={LAB_URL}>{LAB_NAME}</a>, {LAB_HOME}. Contact:{' '}
        <a href={`mailto:${LAB_EMAIL}`}>{LAB_EMAIL}</a>
      </p>
    </footer>
  )
}

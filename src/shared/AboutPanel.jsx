// Collapsible "About and methods" panel shared by GeoSENSE tools.
// Pass the tool's own text as children.
export default function AboutPanel({ title = 'About this tool and methods', children }) {
  return (
    <details className="about">
      <summary>{title}</summary>
      <div className="about-body">{children}</div>
    </details>
  )
}

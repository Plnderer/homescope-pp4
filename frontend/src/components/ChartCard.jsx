export default function ChartCard({ title, note, children }) {
  return (
    <article className="chart-card">
      <h3>{title}</h3>
      <div className="chart-body">{children}</div>
      {note ? <p className="chart-note">{note}</p> : null}
    </article>
  );
}

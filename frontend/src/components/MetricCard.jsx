export default function MetricCard({ label, value, tone = 'teal' }) {
  return (
    <article className="metric-card">
      <p>{label}</p>
      <strong className={`metric-${tone}`}>{value}</strong>
    </article>
  );
}

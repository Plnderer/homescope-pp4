export default function MetricCard({ label, value, detail, tone = "teal" }) {
  return (
    <article className={`metric-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail || "\u00A0"}</small>
    </article>
  );
}

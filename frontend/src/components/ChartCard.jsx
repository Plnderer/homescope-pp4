export default function ChartCard({ title, description, children, wide = false }) {
  return (
    <section className={`panel chart-card ${wide ? "wide" : ""}`}>
      <div className="panel-heading">
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="chart-body">{children}</div>
    </section>
  );
}

export default function InfoCard({ title, copy, tone = 'teal' }) {
  return (
    <article className={`info-card accent-${tone}`}>
      <span className="card-accent" />
      <h3>{title}</h3>
      <p>{copy}</p>
    </article>
  );
}

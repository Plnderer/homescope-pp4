export default function PageHeader({ eyebrow, title, copy }) {
  return (
    <section className="page-header">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{copy}</p>
    </section>
  );
}

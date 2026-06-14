export default function PageHeader({ eyebrow, title, copy, aside }) {
  return (
    <section className="page-heading">
      <div>
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        {copy ? <p>{copy}</p> : null}
      </div>
      {aside ? <div className="heading-aside">{aside}</div> : null}
    </section>
  );
}

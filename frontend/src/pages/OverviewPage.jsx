import { useEffect, useState } from "react";
import MetricCard from "../components/MetricCard";
import { getSummary } from "../services/api";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const integer = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function pick(data, keys, fallback = 0) {
  for (const key of keys) {
    if (data && data[key] !== undefined && data[key] !== null) return data[key];
  }
  return fallback;
}

function countValue(value) {
  if (Array.isArray(value)) return value.length;
  return Number(value) || 0;
}

export default function OverviewPage({ setActivePage }) {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getSummary()
      .then(setSummary)
      .catch(() => setError("Live API is offline. Start the FastAPI backend on port 8000 to populate the landing metrics."));
  }, []);

  const totalRecords = pick(summary, ["record_count", "total_records", "count"]);
  const avgPrice = pick(summary, ["average_price", "avg_price"]);
  const medianPrice = pick(summary, ["median_price"]);
  const states = countValue(pick(summary, ["states_count", "state_count", "states"]));
  const cities = countValue(pick(summary, ["cities_count", "city_count", "cities"]));

  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="hero-content">
          <span className="hero-kicker">AI-powered housing market dashboard</span>
          <h2>Explore market context before trusting a home price estimate.</h2>
          <p>
            HomeScope turns cleaned U.S. housing records, market filters, model evidence,
            and fair-value predictions into a portfolio-ready analytics experience.
          </p>
          <div className="hero-actions">
            <button type="button" className="primary-button" onClick={() => setActivePage("market")}>Explore market</button>
            <button type="button" className="secondary-button" onClick={() => setActivePage("predict")}>Predict fair value</button>
          </div>
        </div>

        <div className="hero-preview" aria-label="HomeScope product preview">
          <div className="preview-toolbar">
            <span />
            <span />
            <span />
          </div>
          <div className="preview-grid">
            <div className="preview-card large">
              <span>Selected market</span>
              <strong>{currency.format(avgPrice || 591000)}</strong>
              <div className="mini-trend">
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>
            <div className="preview-card">
              <span>Model</span>
              <strong>Random Forest</strong>
            </div>
            <div className="preview-card">
              <span>Signal</span>
              <strong>Possible value</strong>
            </div>
            <div className="preview-chart">
              {[72, 46, 58, 35, 84, 63].map((height, index) => (
                <i key={height + index} style={{ height: `${height}%` }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {error ? <div className="error-panel">{error}</div> : null}

      <section className="metric-grid landing-metrics">
        <MetricCard label="Clean records" value={integer.format(totalRecords)} detail="Backend-powered dataset" />
        <MetricCard label="Average price" value={currency.format(avgPrice)} detail="Live summary value" tone="blue" />
        <MetricCard label="Median price" value={currency.format(medianPrice)} detail="Outlier-aware context" tone="gold" />
        <MetricCard label="Coverage" value={`${integer.format(states)} states`} detail={`${integer.format(cities)} cities`} tone="green" />
      </section>

      <section className="landing-section">
        <div className="section-intro">
          <span>How it works</span>
          <h3>One guided flow from market read to model-backed estimate.</h3>
        </div>
        <div className="landing-steps">
          {[
            ["01", "Filter the market", "Choose state, city, beds, baths, and living space to narrow comparable records."],
            ["02", "Read the evidence", "Review distributions, city averages, national trend context, and model error."],
            ["03", "Run the estimate", "Submit a sample listing and compare listing price against predicted fair value."],
          ].map(([step, title, body]) => (
            <article className="landing-step" key={step}>
              <span>{step}</span>
              <h4>{title}</h4>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-band">
        <div>
          <span>Portfolio MVP</span>
          <h3>Built to show the full product path, not just a notebook result.</h3>
          <p>The React interface calls the FastAPI backend, the backend reuses the Python cleaning and model utilities, and the saved artifact workflow keeps predictions repeatable.</p>
        </div>
        <button type="button" className="primary-button" onClick={() => setActivePage("model")}>Review model evidence</button>
      </section>
    </div>
  );
}

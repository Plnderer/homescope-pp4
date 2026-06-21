import { useEffect, useState } from "react";
import { getSummary } from "../services/api";
import { Reveal } from "../hooks/useScrollReveal";

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
      .catch(() => setError("Live summary is unavailable. The app still works once the FastAPI backend is running."));
  }, []);

  const totalRecords = pick(summary, ["record_count", "total_records", "count"]);
  const medianPrice = pick(summary, ["median_price"]);
  const states = countValue(pick(summary, ["states_count", "state_count", "states"]));
  const cities = countValue(pick(summary, ["cities_count", "city_count", "cities"]));

  return (
    <div className="landing-page">
      <section className="landing-hero editorial-hero">
        <Reveal className="hero-content">
          <span className="eyebrow">Home value intelligence</span>
          <h1>Understand the market before you trust the price.</h1>
          <p>
            HomeScope compares housing records, market context, and 
            model evidence so you can see whether a listing looks low, fair, or overpriced.
          </p>
          <div className="hero-actions">
            <button type="button" className="secondary-button" onClick={() => setActivePage("market")}>Explore Market</button>
            <button type="button" className="primary-button" onClick={() => setActivePage("predict")}>Generate Valuation Report</button>
          </div>
        </Reveal>

        <Reveal as="aside" className="hero-report-card" aria-label="Valuation report preview" delay="1">
          <span>Sample report</span>
          <strong>{medianPrice ? currency.format(medianPrice) : "$545,000"}</strong>
          <p>Estimated value range backed by market evidence, model context, and assumptions.</p>
          <dl>
            <div>
              <dt>Market records</dt>
              <dd>{totalRecords ? integer.format(totalRecords) : "Ready"}</dd>
            </div>
            <div>
              <dt>Coverage</dt>
              <dd>{states ? `${integer.format(states)} states` : `${integer.format(cities)} cities`}</dd>
            </div>
          </dl>
        </Reveal>
      </section>

      {error ? <div className="notice-panel">{error}</div> : null}

      <Reveal as="section" className="story-section problem-statement">
        <span className="eyebrow">The problem</span>
        <h2>A home price without context is misleading.</h2>
        <p>
          Asking price is only the starting point. 
          Similar homes, local price spread, living space, city patterns, 
          and model error can all change whether a price looks reasonable. 
          HomeScope keeps those signals visible before you trust the estimate.
        </p>
      </Reveal>

      <section className="story-section">
        <Reveal className="section-heading">
          <span className="eyebrow">Two paths</span>
          <h2>How can HomeScope help you?</h2>
        </Reveal>
        <div className="path-grid">
          <Reveal as="article" className="path-card">
            <span>01</span>
            <h3>Explore Market</h3>
            <p>Filter by location and property basics, then read the market snapshot and evidence charts.</p>
            <button type="button" className="text-button" onClick={() => setActivePage("market")}>Open Market</button>
          </Reveal>
          <Reveal as="article" className="path-card featured" delay="1">
            <span>02</span>
            <h3>Generate Valuation Report</h3>
            <p>Enter a listing and compare asking price with predicted fair value, range, assumptions, and limits.</p>
            <button type="button" className="text-button" onClick={() => setActivePage("predict")}>Create Report</button>
          </Reveal>
        </div>
      </section>

      <Reveal as="section" className="transparency-strip">
        <div>
          <span className="eyebrow">Model transparency</span>
          <h2>Evidence is available when you need it.</h2>
        </div>
        <p>
          The Model page explains the selected model, error metrics, residuals, and feature importance.
        </p>
        <button type="button" className="secondary-button" onClick={() => setActivePage("model")}>Review Model Evidence</button>
      </Reveal>

      <Reveal as="section" className="final-cta">
        <span className="eyebrow">Next step</span>
        <h2>Review the market, then generate the valuation report.</h2>
        <div className="hero-actions">
          <button type="button" className="secondary-button" onClick={() => setActivePage("market")}>Start with Market</button>
          <button type="button" className="primary-button" onClick={() => setActivePage("predict")}>Predict Fair Value</button>
        </div>
      </Reveal>
    </div>
  );
}

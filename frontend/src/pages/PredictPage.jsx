import { useEffect, useMemo, useState } from "react";
import BarChart from "../components/BarChart";
import ChartCard from "../components/ChartCard";
import PageHeader from "../components/PageHeader";
import { getFilters, predictListing } from "../services/api";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const integer = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

function pick(data, keys, fallback = undefined) {
  for (const key of keys) {
    if (data && data[key] !== undefined && data[key] !== null) return data[key];
  }
  return fallback;
}

function formatAssumption(item) {
  if (typeof item === "string") return item;
  if (Array.isArray(item)) return item.join(": ");
  if (item && typeof item === "object") {
    return Object.entries(item).map(([key, value]) => `${key}: ${value}`).join(", ");
  }
  return String(item);
}

const assumptionLabels = {
  county: "County",
  zip_population: "ZIP population",
  zip_density: "ZIP density",
  median_income: "Median income",
  latitude: "Latitude",
  longitude: "Longitude",
  source: "Default source",
};

function titleize(key) {
  return String(key).replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatAssumptionValue(key, value) {
  if (value === undefined || value === null || value === "") return "Not available";
  if (key === "median_income") return currency.format(Number(value) || 0);
  if (key === "zip_population") return integer.format(Number(value) || 0);
  if (key === "zip_density") return `${decimal.format(Number(value) || 0)} people / sq mi`;
  if (key === "latitude" || key === "longitude") return decimal.format(Number(value) || 0);
  return String(value);
}

function normalizeAssumptions(assumptions) {
  if (!assumptions) return [];
  if (Array.isArray(assumptions)) {
    return assumptions.map((item) => {
      if (Array.isArray(item)) {
        const [key, value] = item;
        return {
          key,
          label: assumptionLabels[key] || titleize(key),
          value: formatAssumptionValue(key, value),
        };
      }
      return { key: formatAssumption(item), label: "Assumption", value: formatAssumption(item) };
    });
  }

  return Object.entries(assumptions).map(([key, value]) => ({
    key,
    label: assumptionLabels[key] || titleize(key),
    value: formatAssumptionValue(key, value),
  }));
}

export default function PredictPage({ setActivePage }) {
  const [options, setOptions] = useState({ states: ["All"], cities: ["All"] });
  const [form, setForm] = useState({
    state: "New York",
    city: "New York",
    beds: 3,
    baths: 2,
    living_space: 1800,
    listing_price: 725000,
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getFilters(form.state)
      .then(setOptions)
      .catch(() => setError("Could not load prediction filters from the backend."));
  }, [form.state]);

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "state" ? { city: "All" } : {}),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (form.living_space === "" || Number(form.living_space) < 1 || form.listing_price === "" || Number(form.listing_price) < 1) {
      setError("Please enter a value of 1 or greater for Living space and Listing price.");
      return;
    }
    if (form.beds === "" || form.baths === "" || Number(form.beds) < 0 || Number(form.baths) < 0) {
      setError("Please ensure Beds and Baths are set to 0 or higher.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const payload = {
        ...form,
        beds: Math.max(0, Number(form.beds) || 0),
        baths: Math.max(0, Number(form.baths) || 0),
        living_space: Math.max(1, Number(form.living_space) || 1),
        listing_price: Math.max(1, Number(form.listing_price) || 1),
      };
      setResult(await predictListing(payload));
    } catch {
      setError("Prediction failed. Confirm the backend is running and the selected market has enough records.");
    } finally {
      setLoading(false);
    }
  }

  const predicted = pick(result, ["predicted_fair_value", "predicted_value", "prediction"], 0);
  const listing = pick(result, ["listing_price"], form.listing_price);
  const difference = result ? pick(result, ["difference"], listing - predicted) : 0;
  const marketLabel = pick(result, ["signal", "market_label", "label"], "Run a prediction");
  let signalTone = "neutral";
  const lbl = String(marketLabel).toLowerCase();
  if (lbl.includes("below") || lbl.includes("under")) {
    signalTone = "positive";
  } else if (lbl.includes("above") || lbl.includes("over")) {
    signalTone = "negative";
  }
  const modelName = pick(result, ["selected_model_name", "model_name"], "Model pending");
  const assumptions = pick(result, ["assumptions_used", "assumptions"], []);
  const fairValueRange = pick(result, ["fair_value_range"], null);
  const modelMae = pick(result, ["model_mae"], null);
  const resultExplanation = pick(result, ["result_explanation"], "Submit the form to generate a research estimate.");
  const errorContext = pick(result, ["model_error_context"], "");
  const limitations = pick(result, ["limitations"], []);
  const assumptionRows = useMemo(() => normalizeAssumptions(assumptions), [assumptions]);
  const comparisonBars = useMemo(() => result ? [
    { label: "Fair value estimate", value: Number(predicted) || 0 },
    { label: "Asking/listing price", value: Number(listing) || 0 },
  ] : [], [result, predicted, listing]);

  return (
    <div className="screen-stack prediction-page">
      <PageHeader
        eyebrow="Valuation Report"
        title="Generate a HomeScope Valuation Report."
        copy="Enter the visible listing details. HomeScope will compare the listing against market records and return a research estimate with a fair value range, price signal, and limitations."
        aside={<button type="button" className="secondary-button" onClick={() => setActivePage("model")}>Review Model Evidence</button>}
      />

      {error ? <div className="error-panel">{error}</div> : null}

      <section className="prediction-flow">
        {/* Step 1: Input */}
        <form className="panel prediction-card" onSubmit={handleSubmit} noValidate>
          <div className="panel-heading">
            <span>Listing inputs</span>
            <h2>Property details for the report</h2>
            <p>Use the core facts from the listing. If HomeScope needs background market details, they appear in a secondary assumptions section.</p>
          </div>
          <div className="form-grid">
            <label>
              <span>State</span>
              <select value={form.state} onChange={(event) => updateField("state", event.target.value)}>
                {(options.states || ["All"]).map((state) => <option key={state} value={state}>{state}</option>)}
              </select>
            </label>
            <label>
              <span>City</span>
              <select value={form.city} onChange={(event) => updateField("city", event.target.value)}>
                {(options.cities || ["All"]).map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
            </label>
            <label>
              <span>Beds</span>
              <input type="number" min="0" required value={form.beds} onChange={(event) => updateField("beds", event.target.value)} />
            </label>
            <label>
              <span>Baths</span>
              <input type="number" min="0" required value={form.baths} onChange={(event) => updateField("baths", event.target.value)} />
            </label>
            <label>
              <span>Living space</span>
              <input type="number" min="1" value={form.living_space} required onChange={(event) => updateField("living_space", event.target.value)} />
            </label>
            <label>
              <span>Listing price</span>
              <input type="number" min="1" value={form.listing_price} required onChange={(event) => updateField("listing_price", event.target.value)} />
            </label>
          </div>
          <button type="submit" className="primary-button prediction-submit" disabled={loading}>
            {loading ? "Generating report..." : "Generate Valuation Report"}
          </button>
        </form>

        {!result ? (
          <section className="panel prediction-hint-panel">
            <div className="panel-heading">
              <span>Before prediction</span>
              <h2>Your report will appear below.</h2>
              <p>The report will show fair value, range, asking price, price signal, and limitations after generation.</p>
            </div>
          </section>
        ) : (
          <>
            {/* Step 2: Primary Result */}
            <article className={`panel valuation-report ${result ? "ready" : "pending"}`}>
              <span>HomeScope Valuation Report</span>
              <h2>{result ? currency.format(predicted) : "Pending estimate"}</h2>
              <p className="range-line">
                {result && fairValueRange
                  ? `${currency.format(fairValueRange.low)} - ${currency.format(fairValueRange.high)} fair-value range`
                  : "Run a prediction to calculate a fair-value range."}
              </p>
              <p className="report-warning">
                Research estimate, not an appraisal. HomeScope uses past housing records and market patterns to estimate a fair value range.
              </p>
              <dl className="report-facts-grid">
                <div>
                  <dt>Fair value estimate</dt>
                  <dd>{result ? currency.format(predicted) : "Pending"}</dd>
                </div>
                <div>
                  <dt>Fair value range</dt>
                  <dd>{result && fairValueRange ? `${currency.format(fairValueRange.low)} - ${currency.format(fairValueRange.high)}` : "Pending"}</dd>
                </div>
                <div>
                  <dt>Asking/listing price</dt>
                  <dd>{currency.format(listing)}</dd>
                </div>
                <div>
                  <dt>Difference from fair value</dt>
                  <dd>{result ? currency.format(difference) : "Pending"}</dd>
                </div>
                <div>
                  <dt>Trust note</dt>
                  <dd>Use this as a research guide, not a final buying decision.</dd>
                </div>
              </dl>
            </article>

            {/* Step 3 & 4: Visual Evidence and Technical Details */}
            <div className="bento-grid">
              <div className="premium-bento span-2-col">
                <ChartCard title="Valuation comparison" description="A simple comparison between the entered listing price and the model's fair-value estimate.">
                  <BarChart data={comparisonBars} tone="mixed" layout="horizontal" />
                </ChartCard>
              </div>
              <div className="premium-bento span-2-col" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <article className="panel result-label" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div className="signal-band" style={{ marginBottom: '16px' }}>
                    <span>Price signal</span>
                    <strong className={`signal-badge ${signalTone}`}>{marketLabel}</strong>
                  </div>
                  <p>{resultExplanation}</p>
                </article>
                <article className="panel result-label" style={{ flex: 1 }}>
                  <span>Model used for this report</span>
                  <strong>{modelName}</strong>
                  <p>
                    {errorContext || `During testing, the model's predictions were off by about ${currency.format(modelMae || 0)} on average. This does not mean every estimate is wrong by exactly this amount.`}
                  </p>
                </article>
              </div>

              <div className="premium-bento span-2-col">
                <details className="panel assumptions-panel">
                  <summary>
                    <span>Assumptions</span>
                    Market context used by the model
                  </summary>
                  <p>These fields are filled from the selected city medians when the form does not collect them directly.</p>
                  <dl className="assumption-list">
                    {assumptionRows.map((item) => (
                      <div key={item.key}>
                        <dt>{item.label}</dt>
                        <dd>{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
              </div>
              <div className="premium-bento span-2-col">
                <section className="panel limitations-panel">
                  <div className="panel-heading">
                    <span>Report limits</span>
                    <h2>Research estimate, not an appraisal.</h2>
                    <p>HomeScope uses past housing records and market patterns to estimate a fair value range. Use this as a research guide, not a final buying decision.</p>
                  </div>
                  <ul>
                    {(limitations.length ? limitations : [
                      "This is a research estimate, not a real appraisal.",
                      "Outliers and local location effects can increase prediction error.",
                    ]).map((note) => <li key={note}>{note}</li>)}
                  </ul>
                </section>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

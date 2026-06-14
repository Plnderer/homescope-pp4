import { useEffect, useMemo, useState } from "react";
import BarChart from "../components/BarChart";
import ChartCard from "../components/ChartCard";
import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
import { getFilters, predictListing } from "../services/api";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

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
    setLoading(true);
    setError("");
    try {
      const payload = {
        ...form,
        beds: Number(form.beds),
        baths: Number(form.baths),
        living_space: Number(form.living_space),
        listing_price: Number(form.listing_price),
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
  const difference = result ? pick(result, ["difference"], predicted - listing) : 0;
  const percent = pick(result, ["percent_difference", "percentage_difference"], 0);
  const marketLabel = pick(result, ["market_label", "label"], "Run a prediction");
  const modelName = pick(result, ["selected_model_name", "model_name"], "Model pending");
  const assumptions = pick(result, ["assumptions_used", "assumptions"], []);
  const comparisonBars = useMemo(() => result ? [
    { label: "Predicted fair value", value: Number(predicted) || 0 },
    { label: "Listing price", value: Number(listing) || 0 },
  ] : [], [result, predicted, listing]);

  return (
    <div className="screen-stack">
      <PageHeader
        eyebrow="Prediction workspace"
        title="Compare a sample listing against the selected model."
        copy="The form fills hidden model inputs from the selected market and returns a fair-value estimate, comparison signal, assumptions, and limitation notes."
        aside={<button type="button" className="secondary-button" onClick={() => setActivePage("model")}>Review model first</button>}
      />

      {error ? <div className="error-panel">{error}</div> : null}

      <section className="prediction-layout">
        <form className="panel prediction-card" onSubmit={handleSubmit}>
          <div className="panel-heading">
            <span>Listing inputs</span>
            <h2>Sample property</h2>
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
              <input type="number" min="0" value={form.beds} onChange={(event) => updateField("beds", event.target.value)} />
            </label>
            <label>
              <span>Baths</span>
              <input type="number" min="0" value={form.baths} onChange={(event) => updateField("baths", event.target.value)} />
            </label>
            <label>
              <span>Living space</span>
              <input type="number" min="0" value={form.living_space} onChange={(event) => updateField("living_space", event.target.value)} />
            </label>
            <label>
              <span>Listing price</span>
              <input type="number" min="0" value={form.listing_price} onChange={(event) => updateField("listing_price", event.target.value)} />
            </label>
          </div>
          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? "Estimating..." : "Predict fair value"}
          </button>
        </form>

        <aside className="result-stack">
          <MetricCard label="Predicted fair value" value={result ? currency.format(predicted) : "Pending"} />
          <MetricCard label="Listing price" value={currency.format(listing)} tone="blue" />
          <MetricCard label="Difference" value={result ? currency.format(difference) : "Pending"} detail={result ? `${Number(percent || 0).toFixed(1)}% from estimate` : "Submit the form to compare"} tone="gold" />
          <article className="panel result-label">
            <span>Market label</span>
            <strong>{marketLabel}</strong>
            <p>Generated by {modelName}</p>
          </article>
        </aside>
      </section>

      <section className="chart-grid">
        <ChartCard title="Estimate comparison" description="A direct comparison between model value and entered listing price.">
          <BarChart data={comparisonBars} tone="mixed" layout="horizontal" />
        </ChartCard>
        <article className="panel assumptions-panel">
          <div className="panel-heading">
            <span>Assumptions</span>
            <h2>Hidden fields filled from market data</h2>
            <p>The backend uses selected market medians and common county values when fields are not entered directly.</p>
          </div>
          <ul>
            {(result ? (Array.isArray(assumptions) ? assumptions : Object.entries(assumptions || {}).map(([key, value]) => [key, value])) : ["Assumptions appear after a prediction is submitted."]).map((item) => (
              <li key={formatAssumption(item)}>{formatAssumption(item)}</li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}

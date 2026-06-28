import { useEffect, useMemo, useRef, useState } from "react";
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
    return Object.entries(item).map(([key, value]) => key + ": " + value).join(", ");
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
  if (key === "zip_density") return decimal.format(Number(value) || 0) + " people / sq mi";
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

function getPriceSignal(listing, predicted, fairValueRange) {
  const asking = Number(listing) || 0;
  const estimate = Number(predicted) || 0;
  if (!estimate) return { text: "Not enough confidence.", tone: "neutral" };

  if (fairValueRange?.low && fairValueRange?.high) {
    if (asking < Number(fairValueRange.low)) return { text: "This looks like a good price.", tone: "positive" };
    if (asking > Number(fairValueRange.high)) return { text: "This looks high.", tone: "negative" };
    return { text: "This looks fair.", tone: "neutral" };
  }

  const percentDifference = Math.abs(asking - estimate) / estimate;
  if (percentDifference <= 0.05) return { text: "This looks fair.", tone: "neutral" };
  if (asking < estimate) return { text: "This looks like a good price.", tone: "positive" };
  return { text: "This looks high.", tone: "negative" };
}

function describeDifference(listing, predicted) {
  const asking = Number(listing) || 0;
  const estimate = Number(predicted) || 0;
  if (!estimate) return "HomeScope needs more information before it can compare this price.";

  const amount = Math.abs(asking - estimate);
  if (amount < 1) return "This listing is about the same as the model estimate.";
  const direction = asking < estimate ? "below" : "above";
  return "This listing is about " + currency.format(amount) + " " + direction + " the model estimate.";
}

function marketFiltersFromForm(form) {
  const livingSpace = Math.max(1, Number(form.living_space) || 1);
  return {
    state: form.state || "All",
    city: form.city || "All",
    min_beds: Math.max(0, Number(form.beds) || 0),
    min_baths: Math.max(0, Number(form.baths) || 0),
    min_sqft: Math.max(0, Math.round(livingSpace * 0.75)),
    max_sqft: Math.round(livingSpace * 1.25),
  };
}

export default function PredictPage({ setActivePage, setMarketFilters }) {
  const formRef = useRef(null);
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
      .catch(() => setError("Could not load price-check filters from the backend."));
  }, [form.state]);

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "state" ? { city: "All" } : {}),
    }));
  }

  function handleEditDetails() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleSeeAreaPrices() {
    setMarketFilters?.(marketFiltersFromForm(form));
    setActivePage("market");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (form.living_space === "" || Number(form.living_space) < 1 || form.listing_price === "" || Number(form.listing_price) < 1) {
      setError("Please enter a value of 1 or greater for living space and asking price.");
      return;
    }
    if (form.beds === "" || form.baths === "" || Number(form.beds) < 0 || Number(form.baths) < 0) {
      setError("Please keep beds and baths at 0 or higher.");
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
      setError("Price check failed. Confirm the backend is running and the selected area has enough homes to compare.");
    } finally {
      setLoading(false);
    }
  }

  const predicted = pick(result, ["predicted_fair_value", "predicted_value", "prediction"], 0);
  const listing = pick(result, ["listing_price"], form.listing_price);
  const fairValueRange = pick(result, ["fair_value_range"], null);
  const modelName = pick(result, ["selected_model_name", "model_name"], "Random Forest Regressor");
  const assumptions = pick(result, ["assumptions_used", "assumptions"], []);
  const resultExplanation = pick(result, ["result_explanation"], "HomeScope compared the asking price with its estimate from similar housing records.");
  const assumptionRows = useMemo(() => normalizeAssumptions(assumptions), [assumptions]);
  const signal = result ? getPriceSignal(listing, predicted, fairValueRange) : { text: "Enter the home details first.", tone: "neutral" };
  const differenceText = result ? describeDifference(listing, predicted) : "Your plain-English price check will appear here.";
  const comparisonBars = useMemo(() => result ? [
    { label: "HomeScope estimate", value: Number(predicted) || 0 },
    { label: "Asking price", value: Number(listing) || 0 },
  ] : [], [result, predicted, listing]);

  return (
    <div className="screen-stack prediction-page">
      <PageHeader
        eyebrow="Check Price"
        title="Check whether this home price looks fair."
        copy="Start with the listing details. HomeScope will answer the main question first, then leave market context and method details optional."
        aside={<button type="button" className="secondary-button" onClick={() => setActivePage("model")}>How It Works</button>}
      />

      {error ? <div className="error-panel">{error}</div> : null}

      <section className="prediction-flow">
        <form className="panel prediction-card" onSubmit={handleSubmit} noValidate ref={formRef}>
          <div className="panel-heading">
            <span>Listing details</span>
            <h2>Tell HomeScope about the home.</h2>
            <p>Use the visible facts from the listing: location, beds, baths, home size, and asking price.</p>
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
              <span>Asking price</span>
              <input type="number" min="1" value={form.listing_price} required onChange={(event) => updateField("listing_price", event.target.value)} />
            </label>
          </div>
          <button type="submit" className="primary-button prediction-submit" disabled={loading}>
            {loading ? "Checking price..." : "Check This Price"}
          </button>
        </form>

        {!result ? (
          <section className="panel prediction-hint-panel">
            <div className="panel-heading">
              <span>What you will get</span>
              <h2>A simple answer first.</h2>
              <p>HomeScope will show whether the price looks good, fair, high, or too uncertain, followed by the key numbers behind that answer.</p>
            </div>
          </section>
        ) : (
          <>
            <article className="panel valuation-report ready">
              <span>HomeScope price check</span>
              <strong className={"result-signal " + signal.tone}>{signal.text}</strong>
              <p className="difference-line">{differenceText}</p>
              <p className="report-warning">This is a research estimate, not an appraisal.</p>

              <dl className="report-facts-grid simple-result-grid">
                <div>
                  <dt>Asking price</dt>
                  <dd>{currency.format(listing)}</dd>
                </div>
                <div>
                  <dt>HomeScope estimate</dt>
                  <dd>{currency.format(predicted)}</dd>
                </div>
                <div>
                  <dt>Estimate range</dt>
                  <dd>{fairValueRange ? currency.format(fairValueRange.low) + " - " + currency.format(fairValueRange.high) : "Not available"}</dd>
                </div>
                <div>
                  <dt>Plain-English difference</dt>
                  <dd>{differenceText}</dd>
                </div>
              </dl>

              <p className="checker-note">HomeScope used its best-performing price checker.</p>

              <div className="result-action-row">
                <button type="button" className="primary-button" onClick={handleSeeAreaPrices}>See Area Prices</button>
                <button type="button" className="secondary-button" onClick={() => setActivePage("model")}>How It Works</button>
                <button type="button" className="secondary-button" onClick={handleEditDetails}>Edit Details</button>
              </div>
            </article>

            <div className="bento-grid">
              <div className="premium-bento span-2-col">
                <ChartCard title="Price check comparison" description="A quick view of the asking price beside the HomeScope estimate.">
                  <BarChart data={comparisonBars} tone="mixed" layout="horizontal" />
                </ChartCard>
              </div>

              <div className="premium-bento span-2-col">
                <article className="panel result-label result-explanation-panel">
                  <span>Why HomeScope read it this way</span>
                  <p>{resultExplanation}</p>
                  <details className="technical-name-details">
                    <summary>Optional checker details</summary>
                    <p>Technical name: {modelName}.</p>
                  </details>
                </article>
              </div>

              <div className="premium-bento span-4-col">
                <details className="panel assumptions-panel">
                  <summary>
                    <span>Optional assumptions</span>
                    Area context HomeScope filled in
                  </summary>
                  <p>These fields come from the selected city when the form does not ask for them directly.</p>
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
            </div>
          </>
        )}
      </section>
    </div>
  );
}

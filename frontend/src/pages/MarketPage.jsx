import { useEffect, useMemo, useState } from "react";
import BarChart from "../components/BarChart";
import ChartCard from "../components/ChartCard";
import LineChart from "../components/LineChart";
import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
import ScatterChart from "../components/ScatterChart";
import { getFilters, getMarket } from "../services/api";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const integer = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function pick(data, keys, fallback = 0) {
  for (const key of keys) {
    if (data && data[key] !== undefined && data[key] !== null) return data[key];
  }
  return fallback;
}

function normalizeBars(rows, labelKeys, valueKeys) {
  return (rows || []).map((item) => ({
    label: pick(item, labelKeys, item.label),
    value: pick(item, valueKeys, item.value),
  }));
}

export default function MarketPage({ setActivePage }) {
  const [filters, setFilters] = useState({
    state: "All",
    city: "All",
    min_beds: 1,
    min_baths: 1,
    min_sqft: 500,
    max_sqft: "",
  });
  const [options, setOptions] = useState({ states: ["All"], cities: ["All"] });
  const [market, setMarket] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFilters(filters.state)
      .then(setOptions)
      .catch(() => setError("Could not load filter options from the backend."));
  }, [filters.state]);

  useEffect(() => {
    setLoading(true);
    const validFilters = {
      ...filters,
      min_beds: Math.max(0, Number(filters.min_beds) || 0),
      min_baths: Math.max(0, Number(filters.min_baths) || 0),
      min_sqft: Math.max(0, Number(filters.min_sqft) || 0),
    };
    if (filters.max_sqft && Number(filters.max_sqft) > 0) {
      validFilters.max_sqft = Number(filters.max_sqft);
    }
    getMarket(validFilters)
      .then((data) => {
        setMarket(data);
        setError("");
      })
      .catch(() => setError("Could not load market data. Confirm the backend is running on port 8000."))
      .finally(() => setLoading(false));
  }, [filters]);

  const histogram = useMemo(() => normalizeBars(pick(market, ["price_distribution", "histogram", "histogram_buckets"], []), ["label", "bucket"], ["value", "count"]), [market]);
  const cityAverages = useMemo(() => normalizeBars(pick(market, ["top_city_averages", "city_averages"], []), ["label", "city"], ["value", "average_price", "avg_price"]), [market]);
  const scatter = pick(market, ["scatter_points", "price_vs_living_space"], []);
  const trend = pick(market, ["aspus_trend", "trend"], []);

  function updateFilter(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === "state" ? { city: "All" } : {}),
    }));
  }

  return (
    <div className="screen-stack">
      <PageHeader
        eyebrow="Market report"
        title="A calmer read on comparable homes."
        copy="Choose a market and property profile, then review the summary and evidence charts before generating a valuation report."
        aside={<button type="button" className="primary-button" onClick={() => setActivePage("predict")}>Generate Report</button>}
      />

      <section className="panel control-panel market-filter-panel">
        <div className="panel-heading">
          <span>Market Filters</span>
          <h2>Define the comparison set</h2>
          <p>Start with location, then narrow the property profile. Leave maximum sq ft at 0 when no upper limit is needed.</p>
        </div>
        <div className="filter-groups">
          <div className="filter-group">
            <h3>Location</h3>
            <div className="filter-grid compact">
              <label>
                <span>State</span>
                <select value={filters.state} onChange={(event) => updateFilter("state", event.target.value)}>
                  {(options.states || ["All"]).map((state) => <option key={state} value={state}>{state}</option>)}
                </select>
              </label>
              <label>
                <span>City</span>
                <select value={filters.city} onChange={(event) => updateFilter("city", event.target.value)}>
                  {(options.cities || ["All"]).map((city) => <option key={city} value={city}>{city}</option>)}
                </select>
              </label>
            </div>
          </div>
          <div className="filter-group">
            <h3>Property profile</h3>
            <div className="filter-grid compact four">
              <label>
                <span>Minimum beds</span>
                <input type="number" min="1" value={filters.min_beds} onChange={(event) => updateFilter("min_beds", event.target.value)} />
              </label>
              <label>
                <span>Minimum baths</span>
                <input type="number" min="1" value={filters.min_baths} onChange={(event) => updateFilter("min_baths", event.target.value)} />
              </label>
              <label>
                <span>Minimum sq ft</span>
                <input type="number" min="0" value={filters.min_sqft} onChange={(event) => updateFilter("min_sqft", event.target.value)} />
              </label>
              <label>
                <span>Maximum sq ft</span>
                <input type="number" min="0" value={filters.max_sqft} onChange={(event) => updateFilter("max_sqft", event.target.value)} />
              </label>
            </div>
          </div>
        </div>
        <div className="filter-summary" aria-label="Current filter summary">
          <span>{filters.state === "All" ? "All states" : filters.state}</span>
          <span>{filters.city === "All" ? "All cities" : filters.city}</span>
          <span>{filters.min_beds}+ beds</span>
          <span>{filters.min_baths}+ baths</span>
          <span>{integer.format(filters.min_sqft)}+ sq ft</span>
        </div>
      </section>

      {error ? <div className="error-panel">{error}</div> : null}
      {loading ? <div className="loading-panel">Loading market data...</div> : null}

      <section className="section-stack">
        <div className="section-label">
          <span>Market Snapshot</span>
          <p>A simple read of the selected comparison set.</p>
        </div>
        <div className="metric-grid">
          <MetricCard label="Matching listings" value={integer.format(pick(market, ["matching_count", "count"]))} detail="Comparable records in scope" />
          <MetricCard label="Average price" value={currency.format(pick(market, ["average_price", "avg_price"]))} detail="Mean across selected records" />
          <MetricCard label="Median price" value={currency.format(pick(market, ["median_price"]))} detail="Less sensitive to outliers" tone="gold" />
          <MetricCard label="Average $ / sq ft" value={currency.format(pick(market, ["average_price_per_sqft", "avg_price_per_sqft"]))} detail="Size-adjusted market context" />
        </div>
      </section>

      <section className="section-stack">
        <div className="section-label">
          <span>Market Evidence</span>
          <p>Use these views together: distribution for price spread, city averages for location context, scatter for size relationship, and ASPUS for broad national movement.</p>
        </div>
        <div className="chart-grid">
          <ChartCard title="Price distribution" description="Shows whether selected listings cluster in a narrow band or spread across several price ranges.">
            <BarChart data={histogram} tone="mixed" format="number" />
          </ChartCard>
          <ChartCard title="Price vs. living space" description="Compares square footage against price so unusually high or low records are easier to spot.">
            <ScatterChart data={scatter} />
          </ChartCard>
          <ChartCard title="Top city averages" description="Ranks cities inside the current filter, making local price differences easier to compare.">
            <BarChart data={cityAverages} tone="mixed" layout="horizontal" />
          </ChartCard>
          <ChartCard title="National trend context" description="ASPUS adds broad U.S. sales price movement as context, not as a listing-level prediction input.">
            <LineChart data={trend} />
          </ChartCard>
        </div>
      </section>

      <div className="action-row">
        <button type="button" className="primary-button" onClick={() => setActivePage("predict")}>Generate Valuation Report</button>
        <button type="button" className="secondary-button" onClick={() => setActivePage("model")}>Review model evidence</button>
      </div>
    </div>
  );
}

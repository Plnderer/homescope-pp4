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
    max_sqft: 0,
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
    getMarket(filters)
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
    const nextValue = ["min_beds", "min_baths"].includes(key) ? Math.max(1, Number(value) || 1) : value;

    setFilters((current) => ({
      ...current,
      [key]: nextValue,
      ...(key === "state" ? { city: "All" } : {}),
    }));
  }

  return (
    <div className="screen-stack">
      <PageHeader
        eyebrow="Market workspace"
        title="Filter the housing records and read the selected market at a glance."
        copy="Use the controls to narrow the dataset, then compare price distribution, city averages, size-price relationship, and national sales price context."
        aside={<button type="button" className="primary-button" onClick={() => setActivePage("predict")}>Predict from this context</button>}
      />

      <section className="panel control-panel">
        <div className="panel-heading">
          <span>Filters</span>
          <h2>Market selection</h2>
        </div>
        <div className="filter-grid">
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
      </section>

      {error ? <div className="error-panel">{error}</div> : null}
      {loading ? <div className="loading-panel">Loading market data...</div> : null}

      <section className="metric-grid">
        <MetricCard label="Matching listings" value={integer.format(pick(market, ["matching_count", "count"]))} />
        <MetricCard label="Average price" value={currency.format(pick(market, ["average_price", "avg_price"]))} tone="blue" />
        <MetricCard label="Median price" value={currency.format(pick(market, ["median_price"]))} tone="gold" />
        <MetricCard label="Average $ / sq ft" value={currency.format(pick(market, ["average_price_per_sqft", "avg_price_per_sqft"]))} tone="green" />
      </section>

      <section className="chart-grid">
        <ChartCard title="Price distribution" description="Shows how selected listings are grouped by price bucket.">
          <BarChart data={histogram} tone="mixed" format="number" />
        </ChartCard>
        <ChartCard title="Price vs. living space" description="Checks whether larger homes generally command higher prices.">
          <ScatterChart data={scatter} />
        </ChartCard>
        <ChartCard title="Top city averages" description="Ranks cities inside the current filter by average price.">
          <BarChart data={cityAverages} tone="mixed" layout="horizontal" />
        </ChartCard>
        <ChartCard title="National trend context" description="ASPUS gives broad U.S. average sales price movement.">
          <LineChart data={trend} />
        </ChartCard>
      </section>

      <div className="action-row">
        <button type="button" className="secondary-button" onClick={() => setActivePage("model")}>Review model evidence</button>
        <button type="button" className="primary-button" onClick={() => setActivePage("predict")}>Open prediction form</button>
      </div>
    </div>
  );
}

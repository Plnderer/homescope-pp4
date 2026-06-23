import { useEffect, useMemo, useState } from "react";
import BarChart from "../components/BarChart";
import ChartCard from "../components/ChartCard";
import LineChart from "../components/LineChart";
import MetricCard from "../components/MetricCard";
import PriceDistributionChart from "../components/PriceDistributionChart";
import ScatterChart from "../components/ScatterChart";
import { getFilters, getMarket } from "../services/api";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const integer = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function compactCurrency(value) {
  const number = Number(value) || 0;
  if (Math.abs(number) >= 1000000) return `$${(number / 1000000).toFixed(1)}M`;
  if (Math.abs(number) >= 1000) return `$${Math.round(number / 1000)}K`;
  return currency.format(number);
}

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

function readablePriceBucket(label) {
  const text = String(label || "");
  const numbers = text.replace(/,/g, "").match(/\d+(?:\.\d+)?/g);
  if (!numbers || numbers.length < 2) return text;
  const [low, high] = numbers.map(Number);
  if (!Number.isFinite(low) || !Number.isFinite(high)) return text;
  return `${compactCurrency(low)}-${compactCurrency(high)}`;
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

  const histogram = useMemo(() => normalizeBars(
    pick(market, ["price_distribution", "histogram", "histogram_buckets"], []),
    ["label", "bucket"],
    ["value", "count"],
  ).map((item) => ({ ...item, label: readablePriceBucket(item.label) })), [market]);
  const scatter = pick(market, ["scatter_points", "price_vs_living_space"], []);
  const trend = pick(market, ["aspus_trend", "trend"], []);
  const matchingCount = pick(market, ["matching_count", "count"]);

  function updateFilter(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === "state" ? { city: "All" } : {}),
    }));
  }

  return (
    <div className="screen-stack">
      <section className="market-hero">
        <div className="market-hero-glow"></div>
        <div className="market-hero-content text-center">
          <span className="eyebrow" style={{justifyContent: 'center'}}>Market report</span>
          <h1 className="hero-massive-title">Comparable market context for the report.</h1>
          <p className="hero-sub">
            Use this page to build a comparison set of similar homes. These market records help explain whether a listing looks low, fair, or high.
          </p>
        </div>
      </section>

      <section className="premium-filter-panel">
        <div className="filter-header">
          <span className="eyebrow">Market filters</span>
          <h2>Build your comparison set</h2>
          <p>Choose a location and property size. HomeScope will summarize similar records in that market.</p>
        </div>
        <div className="premium-filter-groups">
          <div className="premium-filter-group">
            <h3>Location</h3>
            <div className="premium-inputs">
              <label className="premium-input-wrapper">
                <span>State</span>
                <select value={filters.state} onChange={(event) => updateFilter("state", event.target.value)}>
                  {(options.states || ["All"]).map((state) => <option key={state} value={state}>{state}</option>)}
                </select>
              </label>
              <label className="premium-input-wrapper">
                <span>City</span>
                <select value={filters.city} onChange={(event) => updateFilter("city", event.target.value)}>
                  {(options.cities || ["All"]).map((city) => <option key={city} value={city}>{city}</option>)}
                </select>
              </label>
            </div>
          </div>
          <div className="premium-filter-group">
            <h3>Property profile</h3>
            <div className="premium-inputs four">
              <label className="premium-input-wrapper">
                <span>Minimum beds</span>
                <input type="number" min="1" value={filters.min_beds} onChange={(event) => updateFilter("min_beds", event.target.value)} />
              </label>
              <label className="premium-input-wrapper">
                <span>Minimum baths</span>
                <input type="number" min="1" value={filters.min_baths} onChange={(event) => updateFilter("min_baths", event.target.value)} />
              </label>
              <label className="premium-input-wrapper">
                <span>Minimum sq ft</span>
                <input type="number" min="0" value={filters.min_sqft} onChange={(event) => updateFilter("min_sqft", event.target.value)} />
              </label>
              <label className="premium-input-wrapper">
                <span>Maximum sq ft</span>
                <input type="number" min="0" value={filters.max_sqft} onChange={(event) => updateFilter("max_sqft", event.target.value)} />
              </label>
            </div>
          </div>
        </div>
        <div className="premium-filter-footer">
          <div className="glass-tags">
            <span className="glass-tag">{filters.state === "All" ? "All states" : filters.state}</span>
            <span className="glass-tag">{filters.city === "All" ? "All cities" : filters.city}</span>
            <span className="glass-tag">{filters.min_beds}+ beds</span>
            <span className="glass-tag">{filters.min_baths}+ baths</span>
            <span className="glass-tag">{integer.format(filters.min_sqft)}+ sq ft</span>
          </div>
          <div className="live-count">
            <span className="pulse-dot"></span>
            <strong>{integer.format(matchingCount)}</strong> active records
          </div>
        </div>
      </section>

      {error ? <div className="error-panel">{error}</div> : null}
      {loading ? <div className="loading-panel">Loading market data...</div> : null}

      <section className="section-stack">
        <div className="section-label">
          <span>Market Snapshot</span>
          <p>A simple read of the current comparison set.</p>
        </div>
        <div className="bento-grid">
          <div className="premium-bento metric-bento">
            <MetricCard label="Records in comparison set" value={integer.format(matchingCount)} detail="Similar records in scope" />
          </div>
          <div className="premium-bento metric-bento glow-gold">
            <MetricCard label="Average price" value={currency.format(pick(market, ["average_price", "avg_price"]))} detail="Mean across selected records" />
          </div>
          <div className="premium-bento metric-bento glow-sage">
            <MetricCard label="Median price" value={currency.format(pick(market, ["median_price"]))} detail="Less sensitive to outliers" />
          </div>
          <div className="premium-bento metric-bento glow-blue">
            <MetricCard label="Average $ / sq ft" value={currency.format(pick(market, ["average_price_per_sqft", "avg_price_per_sqft"]))} detail="Size-adjusted market context" />
          </div>
        </div>
      </section>

      <section className="section-stack">
        <div className="section-label">
          <span>Market Evidence</span>
          <p>Use these views as background for the report. They explain the comparison set; they are not a replacement for an appraisal.</p>
        </div>
        <div className="bento-grid">
          <div className="premium-bento span-2-col">
            <ChartCard title="Price distribution" description="Shows how many similar homes fall into each price range. Large gaps can happen when listings cluster around certain price levels.">
              <PriceDistributionChart data={histogram} />
            </ChartCard>
          </div>
          <div className="premium-bento span-2-col">
            <ChartCard title="Price vs. living space" description="Shows how home size relates to price. Points far away from the group may be unusual listings.">
              <ScatterChart data={scatter} xLabel="Living space" yLabel="Price" />
            </ChartCard>
          </div>
          <div className="premium-bento span-4-col">
            <ChartCard title="National trend context" description="Shows broad U.S. home price movement over time. This is market background, not a direct appraisal input.">
              <LineChart data={trend} yLabel="U.S. median sale price" />
            </ChartCard>
          </div>
        </div>
      </section>

      <div className="action-row">
        <button type="button" className="primary-button" onClick={() => setActivePage("predict")}>Generate Valuation Report</button>
        <button type="button" className="secondary-button" onClick={() => setActivePage("model")}>Review Model Evidence</button>
      </div>
    </div>
  );
}

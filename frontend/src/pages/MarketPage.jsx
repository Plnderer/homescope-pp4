import { useEffect, useMemo, useState } from "react";
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
  if (Math.abs(number) >= 1000000) return "$" + (number / 1000000).toFixed(1) + "M";
  if (Math.abs(number) >= 1000) return "$" + Math.round(number / 1000) + "K";
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
  return compactCurrency(low) + "-" + compactCurrency(high);
}

const defaultFilters = {
  state: "All",
  city: "All",
  min_beds: 1,
  min_baths: 1,
  min_sqft: 500,
  max_sqft: "",
};

export default function MarketPage({ setActivePage, marketFilters }) {
  const [filters, setFilters] = useState(() => ({ ...defaultFilters, ...(marketFilters || {}) }));
  const [options, setOptions] = useState({ states: ["All"], cities: ["All"] });
  const [market, setMarket] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (marketFilters) {
      setFilters((current) => ({ ...current, ...marketFilters }));
    }
  }, [marketFilters]);

  useEffect(() => {
    getFilters(filters.state)
      .then(setOptions)
      .catch(() => setError("Could not load area filters from the backend."));
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
      .catch(() => setError("Could not load area prices. Confirm the backend is running on port 8000."))
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
          <span className="eyebrow" style={{justifyContent: "center"}}>Market</span>
          <h1 className="hero-massive-title">See prices in this area.</h1>
          <p className="hero-sub">
            Use this page to compare similar homes near the listing.
          </p>
        </div>
      </section>

      <section className="premium-filter-panel">
        <div className="filter-header">
          <span className="eyebrow">Area filters</span>
          <h2>Choose homes to compare</h2>
          <p>Pick the location and home size. If you came from Check Price, HomeScope starts with that home's details.</p>
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
            <h3>Home details</h3>
            <div className="premium-inputs four">
              <label className="premium-input-wrapper">
                <span>Minimum beds</span>
                <input type="number" min="0" value={filters.min_beds} onChange={(event) => updateFilter("min_beds", event.target.value)} />
              </label>
              <label className="premium-input-wrapper">
                <span>Minimum baths</span>
                <input type="number" min="0" value={filters.min_baths} onChange={(event) => updateFilter("min_baths", event.target.value)} />
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
            <strong>{integer.format(matchingCount)}</strong> Homes used
          </div>
        </div>
      </section>

      {error ? <div className="error-panel">{error}</div> : null}
      {loading ? <div className="loading-panel">Loading area prices...</div> : null}

      <section className="section-stack">
        <div className="section-label">
          <span>Area snapshot</span>
          <p>The core numbers from the homes currently selected.</p>
        </div>
        <div className="bento-grid">
          <div className="premium-bento metric-bento">
            <MetricCard label="Homes compared" value={integer.format(matchingCount)} detail="Homes in this area and size range" />
          </div>
          <div className="premium-bento metric-bento glow-gold">
            <MetricCard label="Average home price" value={currency.format(pick(market, ["average_price", "avg_price"]))} detail="Typical price across the homes used" />
          </div>
          <div className="premium-bento metric-bento glow-sage">
            <MetricCard label="Middle home price" value={currency.format(pick(market, ["median_price"]))} detail="Half the homes cost more, half cost less" />
          </div>
          <div className="premium-bento metric-bento glow-blue">
            <MetricCard label="Average price per square foot" value={currency.format(pick(market, ["average_price_per_sqft", "avg_price_per_sqft"]))} detail="Useful for comparing different home sizes" />
          </div>
        </div>
      </section>

      <section className="section-stack">
        <div className="section-label">
          <span>Area context</span>
          <p>Use these views only if you want more background behind the price check.</p>
        </div>
        <div className="bento-grid">
          <div className="premium-bento span-2-col">
            <ChartCard title="Price ranges" description="Shows how many similar homes fall into each asking-price range.">
              <PriceDistributionChart data={histogram} />
            </ChartCard>
          </div>
          <div className="premium-bento span-2-col">
            <ChartCard title="Price compared with home size" description="Shows how home size relates to price. Isolated points may be unusual listings.">
              <ScatterChart data={scatter} xLabel="Living space" yLabel="Price" />
            </ChartCard>
          </div>
          <div className="premium-bento span-4-col">
            <ChartCard title="U.S. average sales price" description="ASPUS tracks broad U.S. average sales price movement over time. It is background context, not an appraisal input.">
              <LineChart data={trend} yLabel="U.S. average sales price" />
            </ChartCard>
          </div>
        </div>
      </section>

      <div className="action-row">
        <button type="button" className="primary-button" onClick={() => setActivePage("predict")}>Check This Price</button>
        <button type="button" className="secondary-button" onClick={() => setActivePage("model")}>How It Works</button>
      </div>
    </div>
  );
}

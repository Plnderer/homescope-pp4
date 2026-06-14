import { useEffect, useState } from 'react';
import BarChart from '../components/BarChart.jsx';
import ChartCard from '../components/ChartCard.jsx';
import FilterPanel from '../components/FilterPanel.jsx';
import LineChart from '../components/LineChart.jsx';
import MetricCard from '../components/MetricCard.jsx';
import PageHeader from '../components/PageHeader.jsx';
import ScatterChart from '../components/ScatterChart.jsx';
import { getFilters, getMarket } from '../services/api.js';
import { formatCompactCurrency, formatCurrency } from '../utils/formatters.js';

const defaultFilters = {
  state: 'All',
  city: 'All',
  minBeds: 1,
  minBaths: 1,
  minSqft: 500,
  maxSqft: 6000,
};

export default function MarketPage({ onNavigate }) {
  const [filters, setFilters] = useState(defaultFilters);
  const [options, setOptions] = useState({ states: ['All'], cities: ['All'] });
  const [marketData, setMarketData] = useState(null);
  const [status, setStatus] = useState({ loading: true, error: '' });

  useEffect(() => {
    let active = true;

    getFilters(filters.state)
      .then((payload) => {
        if (!active) return;
        setOptions(payload);
        if (!payload.cities.includes(filters.city)) {
          setFilters((current) => ({ ...current, city: 'All' }));
        }
      })
      .catch(() => {
        if (!active) return;
        setStatus({ loading: false, error: 'Market filters are unavailable until the backend is running.' });
      });

    return () => {
      active = false;
    };
  }, [filters.state, filters.city]);

  useEffect(() => {
    let active = true;
    setStatus({ loading: true, error: '' });

    getMarket(filters)
      .then((payload) => {
        if (!active) return;
        setMarketData(payload);
        setStatus({ loading: false, error: '' });
      })
      .catch(() => {
        if (!active) return;
        setMarketData(null);
        setStatus({ loading: false, error: 'Start the FastAPI backend to load market dashboard data.' });
      });

    return () => {
      active = false;
    };
  }, [filters]);

  const updateFilters = (nextFilters) => {
    if (nextFilters.state !== filters.state) {
      setFilters({ ...nextFilters, city: 'All' });
      return;
    }
    setFilters(nextFilters);
  };

  return (
    <main>
      <PageHeader
        eyebrow="Market Dashboard"
        title="Read the selected market through simple metrics."
        copy="Filter housing records and review the market through metric cards, distribution charts, city comparisons, and national price context."
      />

      <FilterPanel filters={filters} options={options} onChange={updateFilters} />

      {status.loading ? <section className="status-card">Loading market data...</section> : null}
      {status.error ? <section className="status-card error">{status.error}</section> : null}

      <section className="metrics-grid section-gap">
        <MetricCard label="Matching listings" value={(marketData?.matching_count ?? 0).toLocaleString()} tone="teal" />
        <MetricCard label="Average price" value={formatCompactCurrency(marketData?.average_price ?? 0)} tone="blue" />
        <MetricCard label="Median price" value={formatCompactCurrency(marketData?.median_price ?? 0)} tone="yellow" />
        <MetricCard label="Avg $ / sq ft" value={formatCurrency(marketData?.average_price_per_sqft ?? 0)} tone="teal" />
      </section>

      <section className="insight-card">
        <strong>Why this matters:</strong> price alone can be misleading. HomeScope starts with market size,
        average price, median price, and price per square foot so the user has context before reviewing a model estimate.
      </section>

      <section className="chart-grid">
        <ChartCard title="Price Distribution" note="Shows how home prices are spread in the selected market.">
          <BarChart data={marketData?.price_distribution?.length ? marketData.price_distribution : [{ label: 'No data', value: 1 }]} />
        </ChartCard>

        <ChartCard title="Price vs. Living Space" note="Shows the relationship between home size and price.">
          <ScatterChart records={marketData?.price_vs_living_space ?? []} />
        </ChartCard>

        <ChartCard title="Average Price by City" note="Compares city averages inside the current filter.">
          <BarChart data={marketData?.city_averages?.length ? marketData.city_averages : [{ label: 'No data', value: 1 }]} valueKey="value" />
        </ChartCard>

        <ChartCard title="National Trend Context" note="Shows broader U.S. average sales price movement.">
          <LineChart data={marketData?.aspus_trend ?? []} />
        </ChartCard>
      </section>

      <div className="action-row">
        <button className="secondary-button" onClick={() => onNavigate('Model')}>View Model Evidence</button>
        <button onClick={() => onNavigate('Predict')}>Predict Fair Value</button>
      </div>
    </main>
  );
}

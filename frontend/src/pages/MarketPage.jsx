import { useMemo, useState } from 'react';
import BarChart from '../components/BarChart.jsx';
import ChartCard from '../components/ChartCard.jsx';
import FilterPanel from '../components/FilterPanel.jsx';
import LineChart from '../components/LineChart.jsx';
import MetricCard from '../components/MetricCard.jsx';
import PageHeader from '../components/PageHeader.jsx';
import ScatterChart from '../components/ScatterChart.jsx';
import { nationalTrend, priceBuckets } from '../data/homeScopeData.js';
import { formatCompactCurrency, formatCurrency } from '../utils/formatters.js';

const defaultFilters = {
  state: 'All',
  city: 'All',
  minBeds: 1,
  minBaths: 1,
  minSqft: 500,
  maxSqft: 6000,
};

export default function MarketPage({ records, onNavigate }) {
  const [filters, setFilters] = useState(defaultFilters);

  const options = useMemo(() => {
    const stateFiltered = filters.state === 'All'
      ? records
      : records.filter((record) => record.state === filters.state);

    return {
      states: ['All', ...Array.from(new Set(records.map((record) => record.state))).sort()],
      cities: ['All', ...Array.from(new Set(stateFiltered.map((record) => record.city))).sort()],
    };
  }, [records, filters.state]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const stateMatch = filters.state === 'All' || record.state === filters.state;
      const cityMatch = filters.city === 'All' || record.city === filters.city;
      const bedMatch = record.beds >= filters.minBeds;
      const bathMatch = record.baths >= filters.minBaths;
      const sqftMatch = record.sqft >= filters.minSqft && record.sqft <= filters.maxSqft;
      return stateMatch && cityMatch && bedMatch && bathMatch && sqftMatch;
    });
  }, [records, filters]);

  const marketStats = useMemo(() => {
    if (!filteredRecords.length) {
      return { averagePrice: 0, medianPrice: 0, averageSqft: 0 };
    }

    const prices = filteredRecords.map((record) => record.price).sort((a, b) => a - b);
    const middle = Math.floor(prices.length / 2);
    const medianPrice = prices.length % 2 ? prices[middle] : (prices[middle - 1] + prices[middle]) / 2;
    const averagePrice = filteredRecords.reduce((sum, record) => sum + record.price, 0) / filteredRecords.length;
    const averageSqft = filteredRecords.reduce((sum, record) => sum + record.priceSqft, 0) / filteredRecords.length;

    return { averagePrice, medianPrice, averageSqft };
  }, [filteredRecords]);

  const cityAverages = useMemo(() => {
    const cityMap = new Map();

    filteredRecords.forEach((record) => {
      const current = cityMap.get(record.city) ?? { label: record.city, total: 0, count: 0 };
      current.total += record.price;
      current.count += 1;
      cityMap.set(record.city, current);
    });

    return Array.from(cityMap.values())
      .map((item) => ({ label: item.label, value: Math.round(item.total / item.count) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filteredRecords]);

  return (
    <main>
      <PageHeader
        eyebrow="Market Dashboard"
        title="Read the selected market through simple metrics."
        copy="Filter housing records and review the market through metric cards, distribution charts, city comparisons, and national price context."
      />

      <FilterPanel filters={filters} options={options} onChange={setFilters} />

      <section className="metrics-grid section-gap">
        <MetricCard label="Matching listings" value={filteredRecords.length.toLocaleString()} tone="teal" />
        <MetricCard label="Average price" value={formatCompactCurrency(marketStats.averagePrice)} tone="blue" />
        <MetricCard label="Median price" value={formatCompactCurrency(marketStats.medianPrice)} tone="yellow" />
        <MetricCard label="Avg $ / sq ft" value={formatCurrency(marketStats.averageSqft)} tone="teal" />
      </section>

      <section className="insight-card">
        <strong>Why this matters:</strong> price alone can be misleading. HomeScope starts with market size,
        average price, median price, and price per square foot so the user has context before reviewing a model estimate.
      </section>

      <section className="chart-grid">
        <ChartCard title="Price Distribution" note="Shows how home prices are spread in the selected market.">
          <BarChart data={priceBuckets} />
        </ChartCard>

        <ChartCard title="Price vs. Living Space" note="Shows the relationship between home size and price.">
          <ScatterChart records={filteredRecords.length ? filteredRecords : records} />
        </ChartCard>

        <ChartCard title="Average Price by City" note="Compares city averages inside the current filter.">
          <BarChart data={cityAverages.length ? cityAverages : [{ label: 'No data', value: 1 }]} valueKey="value" />
        </ChartCard>

        <ChartCard title="National Trend Context" note="Shows broader U.S. average sales price movement.">
          <LineChart data={nationalTrend} />
        </ChartCard>
      </section>

      <div className="action-row">
        <button className="secondary-button" onClick={() => onNavigate('Model')}>View Model Evidence</button>
        <button onClick={() => onNavigate('Predict')}>Predict Fair Value</button>
      </div>
    </main>
  );
}

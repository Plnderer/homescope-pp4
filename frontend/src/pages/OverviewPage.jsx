import { useEffect, useState } from 'react';
import InfoCard from '../components/InfoCard.jsx';
import MetricCard from '../components/MetricCard.jsx';
import { getSummary } from '../services/api.js';
import { formatCompactCurrency } from '../utils/formatters.js';

export default function OverviewPage({ onNavigate }) {
  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState({ loading: true, error: '' });

  useEffect(() => {
    let active = true;

    getSummary()
      .then((payload) => {
        if (!active) return;
        setSummary(payload);
        setStatus({ loading: false, error: '' });
      })
      .catch(() => {
        if (!active) return;
        setStatus({
          loading: false,
          error: 'Connect the FastAPI backend to load live HomeScope market data.',
        });
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main>
      <section className="hero-grid">
        <div className="hero-card">
          <p className="eyebrow">AI-Powered American House Price Dashboard</p>
          <h1>Understand housing prices with market context.</h1>
          <p>
            HomeScope helps users explore housing records, compare market averages,
            review model evidence, and estimate a fair-value signal for a sample listing.
          </p>
          <div className="hero-actions">
            <button onClick={() => onNavigate('Market')}>Explore Market</button>
            <button className="secondary-button" onClick={() => onNavigate('Predict')}>Predict Fair Value</button>
          </div>
        </div>

        <aside className="flow-card">
          <h2>User Flow</h2>
          <div className="flow-step"><span>01</span> Explore market averages</div>
          <div className="flow-step"><span>02</span> Compare listing context</div>
          <div className="flow-step"><span>03</span> Review model evidence</div>
          <div className="flow-step"><span>04</span> Predict fair value</div>
        </aside>
      </section>

      {status.loading ? <section className="status-card">Loading live market summary...</section> : null}
      {status.error ? <section className="status-card error">{status.error}</section> : null}

      <section className="metrics-grid">
        <MetricCard label="Total records" value={(summary?.total_records ?? 0).toLocaleString()} tone="teal" />
        <MetricCard label="Average price" value={formatCompactCurrency(summary?.average_price ?? 0)} tone="blue" />
        <MetricCard label="States" value={(summary?.state_count ?? 0).toLocaleString()} tone="yellow" />
        <MetricCard label="Cities" value={(summary?.city_count ?? 0).toLocaleString()} tone="teal" />
      </section>

      <section className="section-block">
        <p className="eyebrow">Product Goals</p>
        <h2>A focused MVP built around three user tasks.</h2>
        <p>
          The React/Vite interface follows the Figma prototype direction while keeping the Python data and model work available as the technical foundation.
        </p>
      </section>

      <section className="cards-grid">
        <InfoCard
          title="Explore Market Averages"
          copy="Filter by state, city, beds, baths, and living space to understand average price, median price, and price per square foot."
          tone="teal"
        />
        <InfoCard
          title="Compare a Listing"
          copy="Enter a listing price and see how it compares against an estimated fair value and the selected market."
          tone="blue"
        />
        <InfoCard
          title="Predict Fair Value"
          copy="Use model evidence to estimate fair value and translate the result into a plain-language market label."
          tone="yellow"
        />
      </section>
    </main>
  );
}

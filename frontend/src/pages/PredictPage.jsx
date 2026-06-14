import { useEffect, useState } from 'react';
import BarChart from '../components/BarChart.jsx';
import ChartCard from '../components/ChartCard.jsx';
import MetricCard from '../components/MetricCard.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { getFilters, predictFairValue } from '../services/api.js';
import { formatCompactCurrency } from '../utils/formatters.js';

export default function PredictPage() {
  const [form, setForm] = useState({
    state: '',
    city: '',
    county: '',
    beds: 3,
    baths: 2,
    livingSpace: 1800,
    listingPrice: 725000,
  });
  const [options, setOptions] = useState({ states: [], cities: [] });
  const [status, setStatus] = useState({ loading: true, predicting: false, error: '' });
  const [result, setResult] = useState(null);

  useEffect(() => {
    let active = true;

    getFilters()
      .then((payload) => {
        if (!active) return;
        const states = payload.states.filter((state) => state !== 'All');
        const defaultState = states.includes('New York') ? 'New York' : states[0] ?? '';
        setOptions({ states, cities: [] });
        setForm((current) => ({ ...current, state: defaultState }));
      })
      .catch(() => {
        if (!active) return;
        setStatus({ loading: false, predicting: false, error: 'Prediction filters are unavailable until the backend is running.' });
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!form.state) return;
    let active = true;

    getFilters(form.state)
      .then((payload) => {
        if (!active) return;
        const cities = payload.cities.filter((city) => city !== 'All');
        const defaultCity = cities.includes('New York') ? 'New York' : cities[0] ?? '';
        setOptions((current) => ({ ...current, cities }));
        setForm((current) => ({
          ...current,
          city: cities.includes(current.city) ? current.city : defaultCity,
        }));
        setStatus((current) => ({ ...current, loading: false, error: '' }));
      })
      .catch(() => {
        if (!active) return;
        setStatus({ loading: false, predicting: false, error: 'Prediction cities are unavailable until the backend is running.' });
      });

    return () => {
      active = false;
    };
  }, [form.state]);

  const update = (key, value) => {
    if (key === 'state') {
      setForm({ ...form, state: value, city: '' });
      return;
    }

    setForm({ ...form, [key]: value });
  };

  const runPrediction = async (event) => {
    event.preventDefault();

    setStatus({ loading: false, predicting: true, error: '' });
    setResult(null);

    try {
      const payload = await predictFairValue({
        state: form.state,
        city: form.city,
        county: form.county || null,
        beds: form.beds,
        baths: form.baths,
        living_space: form.livingSpace,
        listing_price: form.listingPrice,
      });
      setResult(payload);
      setStatus({ loading: false, predicting: false, error: '' });
    } catch {
      setStatus({
        loading: false,
        predicting: false,
        error: 'Start the FastAPI backend and make sure the model artifact or training fallback is available.',
      });
    }
  };

  return (
    <main>
      <PageHeader
        eyebrow="Predict Fair Value"
        title="Compare a sample listing against the selected model."
        copy="The React form now calls the Python model service and compares the model estimate against a user-entered listing price."
      />

      <form className="prediction-form" onSubmit={runPrediction}>
        <label>
          State
          <select value={form.state} onChange={(event) => update('state', event.target.value)}>
            {options.states.map((state) => <option key={state}>{state}</option>)}
          </select>
        </label>

        <label>
          City
          <select value={form.city} onChange={(event) => update('city', event.target.value)}>
            {options.cities.map((city) => <option key={city}>{city}</option>)}
          </select>
        </label>

        <label>
          County optional
          <input value={form.county} onChange={(event) => update('county', event.target.value)} placeholder="Use city median county" />
        </label>

        <label>
          Beds
          <input type="number" min="0" value={form.beds} onChange={(event) => update('beds', Number(event.target.value))} />
        </label>

        <label>
          Baths
          <input type="number" min="0" value={form.baths} onChange={(event) => update('baths', Number(event.target.value))} />
        </label>

        <label>
          Living Space
          <input type="number" min="300" step="50" value={form.livingSpace} onChange={(event) => update('livingSpace', Number(event.target.value))} />
        </label>

        <label>
          Listing Price
          <input type="number" min="10000" step="5000" value={form.listingPrice} onChange={(event) => update('listingPrice', Number(event.target.value))} />
        </label>

        <button type="submit" disabled={status.loading || status.predicting || !form.state || !form.city}>
          {status.predicting ? 'Predicting...' : 'Predict Fair Value'}
        </button>
      </form>

      {status.loading ? <section className="status-card">Loading prediction filters...</section> : null}
      {status.error ? <section className="status-card error">{status.error}</section> : null}

      {result ? (
        <section className="prediction-results">
          <div className="metrics-grid three-columns">
            <MetricCard label="Predicted fair value" value={formatCompactCurrency(result.predicted_fair_value)} tone="teal" />
            <MetricCard label="Listing price" value={formatCompactCurrency(form.listingPrice)} tone="blue" />
            <MetricCard label="Market label" value={result.market_label} tone={result.difference > 0 ? 'danger' : 'yellow'} />
          </div>

          <section className="insight-card">
            <strong>Result explanation:</strong> The listing is {Math.abs(result.percent_difference).toFixed(1)}% {result.difference > 0 ? 'above' : 'below'} the estimated fair value from {result.selected_model_name}. This is a model estimate, not a final appraisal.
            {' '}Hidden fields used {result.assumptions.source} for {result.assumptions.county} County.
          </section>

          <ChartCard title="Predicted Value vs. Listing Price" note="This comparison translates the estimate into a simple visual result.">
            <BarChart
              data={[
                { label: 'Predicted', value: result.predicted_fair_value },
                { label: 'Listing', value: form.listingPrice },
              ]}
              tone="mixed"
            />
          </ChartCard>

          {result.limitations?.length ? (
            <section className="insight-card">
              <strong>Model limitations:</strong> {result.limitations.join(' ')}
            </section>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}

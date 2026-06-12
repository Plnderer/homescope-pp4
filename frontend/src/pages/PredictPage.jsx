import { useMemo, useState } from 'react';
import BarChart from '../components/BarChart.jsx';
import ChartCard from '../components/ChartCard.jsx';
import MetricCard from '../components/MetricCard.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { formatCompactCurrency } from '../utils/formatters.js';

const cityMultipliers = {
  'Los Angeles': 1.28,
  'San Diego': 1.22,
  'San Francisco': 1.65,
  Austin: 0.95,
  Dallas: 0.87,
  Houston: 0.82,
  Miami: 1.12,
  Orlando: 0.9,
  'New York': 1.55,
  Buffalo: 0.62,
  'Oklahoma City': 0.68,
  Tulsa: 0.65,
  Seattle: 1.23,
  Tacoma: 0.92,
  Atlanta: 0.88,
  Phoenix: 0.92,
  Denver: 1.05,
};

function estimateFairValue({ city, beds, baths, sqft }) {
  const base = sqft * 215;
  const bedAdjustment = beds * 28000;
  const bathAdjustment = baths * 22000;
  const locationMultiplier = cityMultipliers[city] ?? 1;
  return Math.round((base + bedAdjustment + bathAdjustment) * locationMultiplier);
}

export default function PredictPage({ records }) {
  const [form, setForm] = useState({
    state: 'CA',
    city: 'Los Angeles',
    beds: 3,
    baths: 2,
    sqft: 1800,
    listingPrice: 725000,
  });
  const [result, setResult] = useState(null);

  const states = useMemo(() => Array.from(new Set(records.map((record) => record.state))).sort(), [records]);
  const cities = useMemo(() => {
    return Array.from(new Set(records.filter((record) => record.state === form.state).map((record) => record.city))).sort();
  }, [records, form.state]);

  const update = (key, value) => {
    if (key === 'state') {
      const cityForState = records.find((record) => record.state === value)?.city ?? 'All';
      setForm({ ...form, state: value, city: cityForState });
      return;
    }

    setForm({ ...form, [key]: value });
  };

  const runPrediction = (event) => {
    event.preventDefault();
    const predictedValue = estimateFairValue(form);
    const difference = form.listingPrice - predictedValue;
    const percentDifference = predictedValue ? difference / predictedValue : 0;
    let label = 'Near expected range';

    if (percentDifference > 0.1) label = 'Above market estimate';
    if (percentDifference < -0.1) label = 'Below market estimate';

    setResult({ predictedValue, difference, percentDifference, label });
  };

  return (
    <main>
      <PageHeader
        eyebrow="Predict Fair Value"
        title="Compare a sample listing against the selected model."
        copy="The Week 2 UI uses the same prediction workflow from the proof-of-concept, represented here as a React interface ready to connect to the Python model service."
      />

      <form className="prediction-form" onSubmit={runPrediction}>
        <label>
          State
          <select value={form.state} onChange={(event) => update('state', event.target.value)}>
            {states.map((state) => <option key={state}>{state}</option>)}
          </select>
        </label>

        <label>
          City
          <select value={form.city} onChange={(event) => update('city', event.target.value)}>
            {cities.map((city) => <option key={city}>{city}</option>)}
          </select>
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
          <input type="number" min="300" step="50" value={form.sqft} onChange={(event) => update('sqft', Number(event.target.value))} />
        </label>

        <label>
          Listing Price
          <input type="number" min="10000" step="5000" value={form.listingPrice} onChange={(event) => update('listingPrice', Number(event.target.value))} />
        </label>

        <button type="submit">Predict Fair Value</button>
      </form>

      {result ? (
        <section className="prediction-results">
          <div className="metrics-grid three-columns">
            <MetricCard label="Predicted fair value" value={formatCompactCurrency(result.predictedValue)} tone="teal" />
            <MetricCard label="Listing price" value={formatCompactCurrency(form.listingPrice)} tone="blue" />
            <MetricCard label="Market label" value={result.label} tone={result.difference > 0 ? 'danger' : 'yellow'} />
          </div>

          <section className="insight-card">
            <strong>Result explanation:</strong> The listing is {Math.abs(result.percentDifference * 100).toFixed(1)}% {result.difference > 0 ? 'above' : 'below'} the estimated fair value. This is a model signal, not a final appraisal.
          </section>

          <ChartCard title="Predicted Value vs. Listing Price" note="This comparison translates the estimate into a simple visual result.">
            <BarChart
              data={[
                { label: 'Predicted', value: result.predictedValue },
                { label: 'Listing', value: form.listingPrice },
              ]}
              tone="mixed"
            />
          </ChartCard>
        </section>
      ) : null}
    </main>
  );
}

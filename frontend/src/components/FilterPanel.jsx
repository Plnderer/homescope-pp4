export default function FilterPanel({ filters, options, onChange }) {
  const update = (key, value) => onChange({ ...filters, [key]: value });

  return (
    <section className="filter-panel">
      <div>
        <h3>Market Filters</h3>
        <p>Narrow the records before reviewing averages and charts.</p>
      </div>

      <div className="filter-grid">
        <label>
          State
          <select value={filters.state} onChange={(event) => update('state', event.target.value)}>
            {options.states.map((state) => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </label>

        <label>
          City
          <select value={filters.city} onChange={(event) => update('city', event.target.value)}>
            {options.cities.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </label>

        <label>
          Minimum Beds
          <input
            type="number"
            min="0"
            value={filters.minBeds}
            onChange={(event) => update('minBeds', Number(event.target.value))}
          />
        </label>

        <label>
          Minimum Baths
          <input
            type="number"
            min="0"
            value={filters.minBaths}
            onChange={(event) => update('minBaths', Number(event.target.value))}
          />
        </label>

        <label>
          Minimum Living Space
          <input
            type="number"
            min="0"
            step="100"
            value={filters.minSqft}
            onChange={(event) => update('minSqft', Number(event.target.value))}
          />
        </label>

        <label>
          Maximum Living Space
          <input
            type="number"
            min="500"
            step="100"
            value={filters.maxSqft}
            onChange={(event) => update('maxSqft', Number(event.target.value))}
          />
        </label>
      </div>
    </section>
  );
}

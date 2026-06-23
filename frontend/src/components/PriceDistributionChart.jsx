import { useState } from "react";

const integer = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export default function PriceDistributionChart({ data = [] }) {
  const [active, setActive] = useState(null);
  const rows = data.filter((item) => Number(item.value) > 0).slice(0, 8);

  if (!rows.length) {
    return <div className="empty-visual">No price distribution data available.</div>;
  }

  const max = Math.max(...rows.map((item) => Number(item.value) || 0), 1);
  const total = rows.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const selected = active || rows.reduce((largest, item) => (
    Number(item.value) > Number(largest.value) ? item : largest
  ), rows[0]);

  return (
    <div className="price-distribution-chart" role="img" aria-label="Price distribution by range">
      <div className="distribution-summary">
        <span>Most common range</span>
        <strong>{selected.label}</strong>
        <p>{integer.format(selected.value)} of {integer.format(total)} records are in this visible distribution.</p>
      </div>

      <div className="distribution-rows">
        {rows.map((item, index) => {
          const value = Number(item.value) || 0;
          const width = `${Math.max(5, (value / max) * 100)}%`;
          const share = total ? Math.round((value / total) * 100) : 0;
          const isActive = active?.label === item.label;

          return (
            <button
              type="button"
              className={`distribution-row ${isActive ? "active" : ""}`}
              key={`${item.label}-${index}`}
              onMouseEnter={() => setActive(item)}
              onFocus={() => setActive(item)}
            >
              <span className="distribution-label">{item.label}</span>
              <span className="distribution-track" aria-hidden="true">
                <span className="distribution-fill" style={{ width }} />
              </span>
              <span className="distribution-count">
                <strong>{integer.format(value)}</strong>
                <small>{share}%</small>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

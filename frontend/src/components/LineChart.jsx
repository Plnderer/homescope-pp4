import { useState } from "react";

function compact(value) {
  const number = Number(value) || 0;
  if (Math.abs(number) >= 1000000) return `$${(number / 1000000).toFixed(1)}M`;
  if (Math.abs(number) >= 1000) return `$${Math.round(number / 1000)}K`;
  return Number.isInteger(number) ? `${number}` : number.toFixed(1);
}

export default function LineChart({ data = [] }) {
  const [active, setActive] = useState(null);
  const rows = data
    .map((item) => ({ label: item.label || item.date || item.period, value: Number(item.value ?? item.price) }))
    .filter((item) => Number.isFinite(item.value))
    .slice(-48);

  if (rows.length < 2) {
    return <div className="empty-visual">No trend data available.</div>;
  }

  const width = 640;
  const height = 240;
  const pad = 34;
  const values = rows.map((item) => item.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || 1;
  const step = (width - pad * 2) / (rows.length - 1);
  const points = rows.map((item, index) => {
    const x = pad + index * step;
    const y = height - pad - ((item.value - min) / spread) * (height - pad * 2);
    return { ...item, x, y };
  });
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const tickEvery = Math.max(1, Math.ceil(points.length / 5));

  return (
    <div className="interactive-chart">
      <div className="chart-readout">
        <span>{active?.label || "Hover trend"}</span>
        <strong>{active ? compact(active.value) : "Inspect points"}</strong>
      </div>
      <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Trend line chart">
        {[0.25, 0.5, 0.75].map((tick) => (
          <line key={tick} className="grid-line" x1={pad} x2={width - pad} y1={pad + tick * (height - pad * 2)} y2={pad + tick * (height - pad * 2)} />
        ))}
        <line className="axis" x1={pad} x2={width - pad} y1={height - pad} y2={height - pad} />
        <line className="axis" x1={pad} x2={pad} y1={pad} y2={height - pad} />
        <path className="line-path" d={path} />
        {active ? <line className="hover-line" x1={active.x} x2={active.x} y1={pad} y2={height - pad} /> : null}
        {points.map((point, index) => (
          <circle
            key={`${point.label}-${index}`}
            className={`line-dot ${active?.label === point.label ? "active" : ""}`}
            cx={point.x}
            cy={point.y}
            r={active?.label === point.label ? 5 : index === points.length - 1 ? 4 : 2.5}
            onMouseEnter={() => setActive(point)}
          />
        ))}
        {points.map((point, index) => (
          <circle key={`hit-${point.label}-${index}`} className="hit-dot" cx={point.x} cy={point.y} r="10" onMouseEnter={() => setActive(point)} />
        ))}
        {points.map((point, index) => index % tickEvery === 0 || index === points.length - 1 ? (
          <text key={`tick-${point.label}-${index}`} className="tick-label" x={point.x} y={height - 8} textAnchor="middle">
            {String(point.label || "").slice(0, 4)}
          </text>
        ) : null)}
      </svg>
    </div>
  );
}

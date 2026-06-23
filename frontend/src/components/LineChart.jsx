import { useState } from "react";

function compact(value) {
  const number = Number(value) || 0;
  if (Math.abs(number) >= 1000000) return `$${(number / 1000000).toFixed(1)}M`;
  if (Math.abs(number) >= 1000) return `$${Math.round(number / 1000)}K`;
  return Number.isInteger(number) ? `${number}` : number.toFixed(1);
}

export default function LineChart({ data = [], yLabel = "Value" }) {
  const [active, setActive] = useState(null);
  const rows = data
    .map((item) => ({ label: item.label || item.date || item.period, value: Number(item.value ?? item.price) }))
    .filter((item) => Number.isFinite(item.value))
    .slice(-48);

  if (rows.length < 2) {
    return <div className="empty-visual">No trend data available.</div>;
  }

  const width = 640;
  const height = 270;
  const pad = 46;
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
  const yTicks = [min, min + spread / 2, max];

  return (
    <div className="interactive-chart">
      <div className="chart-readout">
        <span>{active?.label || "Point to the line for the value"}</span>
        <strong>{active ? compact(active.value) : `${rows.length} periods shown`}</strong>
      </div>
      <svg className="line-chart premium-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Trend line chart">
        {yTicks.map((tick) => {
          const y = height - pad - ((tick - min) / spread) * (height - pad * 2);
          return (
            <g key={`y-${tick}`}>
              <line className="grid-line" x1={pad} x2={width - pad} y1={y} y2={y} />
              <text className="tick-label" x={pad - 10} y={y + 4} textAnchor="end">{compact(tick)}</text>
            </g>
          );
        })}
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
            r={active?.label === point.label ? 5 : index === points.length - 1 ? 4 : 2}
            onMouseEnter={() => setActive(point)}
          />
        ))}
        {points.map((point, index) => (
          <circle key={`hit-${point.label}-${index}`} className="hit-dot" cx={point.x} cy={point.y} r="10" onMouseEnter={() => setActive(point)} />
        ))}
        {points.map((point, index) => index % tickEvery === 0 || index === points.length - 1 ? (
          <text key={`tick-${point.label}-${index}`} className="tick-label" x={point.x} y={height - 16} textAnchor="middle">
            {String(point.label || "").slice(0, 4)}
          </text>
        ) : null)}
        <text className="axis-label" x={pad} y={22}>{yLabel}</text>
      </svg>
    </div>
  );
}

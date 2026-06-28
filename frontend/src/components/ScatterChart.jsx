import { useState } from "react";

function compact(value, format = "currency") {
  const number = Number(value) || 0;
  const prefix = format === "currency" ? "$" : "";
  if (Math.abs(number) >= 1000000) return `${prefix}${(number / 1000000).toFixed(1)}M`;
  if (Math.abs(number) >= 1000) return `${prefix}${Math.round(number / 1000)}K`;
  return Number.isInteger(number) ? `${number}` : number.toFixed(1);
}

function formatReadout(point, residual) {
  if (!point) return { x: residual ? "Point to a dot to read the error" : "Point to a dot to read the listing", y: "Up to 80 records shown" };
  if (residual) return { x: "Checked price " + compact(point.x), y: "Mistake " + compact(point.y) };
  return { x: `${compact(point.x, "number")} sq ft`, y: compact(point.y) };
}

export default function ScatterChart({ data = [], residual = false, xLabel, yLabel }) {
  const [active, setActive] = useState(null);
  const readout = formatReadout(active, residual);
  const rows = data
    .map((item) => ({
      x: Number(item.x ?? item.sqft ?? item.living_space ?? item.predicted_price ?? item.predicted),
      y: Number(item.y ?? item.price ?? item.residual),
    }))
    .filter((item) => Number.isFinite(item.x) && Number.isFinite(item.y))
    .slice(0, 80);

  if (!rows.length) {
    return <div className="empty-visual">No scatter data available.</div>;
  }

  const width = 640;
  const height = 280;
  const pad = 48;
  const minX = Math.min(...rows.map((item) => item.x));
  const maxX = Math.max(...rows.map((item) => item.x));
  const minY = residual ? Math.min(...rows.map((item) => item.y), 0) : Math.min(...rows.map((item) => item.y));
  const maxY = residual ? Math.max(...rows.map((item) => item.y), 0) : Math.max(...rows.map((item) => item.y));
  const spreadX = maxX - minX || 1;
  const spreadY = maxY - minY || 1;

  const mapX = (value) => pad + ((value - minX) / spreadX) * (width - pad * 2);
  const mapY = (value) => height - pad - ((value - minY) / spreadY) * (height - pad * 2);
  const zeroY = mapY(0);
  const xTicks = [minX, minX + spreadX / 2, maxX];
  const yTicks = [minY, minY + spreadY / 2, maxY];
  const finalXLabel = xLabel || (residual ? "Checked price" : "Living space");
  const finalYLabel = yLabel || (residual ? "Mistake" : "Price");

  return (
    <div className="interactive-chart">
      <div className="chart-readout">
        <span>{readout.x}</span>
        <strong>{readout.y}</strong>
      </div>
      <svg className="scatter-chart premium-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={residual ? "Prediction mistakes plot" : "Scatter plot"}>
        {yTicks.map((tick) => (
          <g key={`y-${tick}`}>
            <line className="grid-line" x1={pad} x2={width - pad} y1={mapY(tick)} y2={mapY(tick)} />
            <text className="tick-label" x={pad - 10} y={mapY(tick) + 4} textAnchor="end">{compact(tick)}</text>
          </g>
        ))}
        {xTicks.map((tick) => (
          <text key={`x-${tick}`} className="tick-label" x={mapX(tick)} y={height - 16} textAnchor="middle">
            {residual ? compact(tick) : compact(tick, "number")}
          </text>
        ))}
        <line className="axis" x1={pad} x2={width - pad} y1={height - pad} y2={height - pad} />
        <line className="axis" x1={pad} x2={pad} y1={pad} y2={height - pad} />
        {residual ? (
          <line className="zero-line" x1={pad} x2={width - pad} y1={zeroY} y2={zeroY} />
        ) : null}
        {rows.map((point, index) => {
          const isActive = active?.x === point.x && active?.y === point.y;
          return (
            <circle
              key={`${point.x}-${point.y}-${index}`}
              className={`${residual ? "residual-dot" : "scatter-dot"} ${isActive ? "active" : ""}`}
              cx={mapX(point.x)}
              cy={mapY(point.y)}
              r={isActive ? 6 : residual ? 4 : 3.5}
              onMouseEnter={() => setActive(point)}
            />
          );
        })}
        {rows.map((point, index) => (
          <circle key={`hit-${point.x}-${point.y}-${index}`} className="hit-dot" cx={mapX(point.x)} cy={mapY(point.y)} r="9" onMouseEnter={() => setActive(point)} />
        ))}
        <text className="axis-label" x={width - pad} y={height - 2} textAnchor="end">
          {finalXLabel}
        </text>
        <text className="axis-label" x={pad} y={22}>
          {finalYLabel}
        </text>
      </svg>
    </div>
  );
}

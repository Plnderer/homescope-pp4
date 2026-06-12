export default function ScatterChart({ records }) {
  const width = 520;
  const height = 220;
  const padding = 28;
  const sqftValues = records.map((record) => record.sqft);
  const priceValues = records.map((record) => record.price);
  const minSqft = Math.min(...sqftValues);
  const maxSqft = Math.max(...sqftValues);
  const minPrice = Math.min(...priceValues);
  const maxPrice = Math.max(...priceValues);
  const sqftSpread = Math.max(maxSqft - minSqft, 1);
  const priceSpread = Math.max(maxPrice - minPrice, 1);

  const points = records.slice(0, 16).map((record) => ({
    x: padding + ((record.sqft - minSqft) / sqftSpread) * (width - padding * 2),
    y: height - padding - ((record.price - minPrice) / priceSpread) * (height - padding * 2),
  }));

  return (
    <svg className="scatter-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Scatter plot visualization">
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} className="axis" />
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} className="axis" />
      <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} className="grid" />
      <line x1={padding} y1={height - padding - 10} x2={width - padding} y2={padding + 12} className="trend" />
      {points.map((point, index) => (
        <circle
          key={`${point.x}-${point.y}-${index}`}
          cx={point.x}
          cy={point.y}
          r="5"
          className={index % 4 === 0 ? 'scatter-dot alternate' : 'scatter-dot'}
        />
      ))}
      <text x={padding} y="18" className="axis-label">Price</text>
      <text x={width - padding} y={height - 8} textAnchor="end" className="axis-label">Living space</text>
    </svg>
  );
}

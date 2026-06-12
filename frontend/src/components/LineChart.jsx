export default function LineChart({ data }) {
  const width = 520;
  const height = 220;
  const padding = 28;
  const values = data.map((item) => item.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(max - min, 1);

  const points = data.map((item, index) => {
    const x = padding + (index / Math.max(data.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - ((item.value - min) / spread) * (height - padding * 2);
    return { ...item, x, y };
  });

  const polylinePoints = points.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Line chart visualization">
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} className="axis" />
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} className="axis" />
      <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} className="grid" />
      <polyline points={polylinePoints} className="line" />
      {points.map((point) => (
        <g key={point.label}>
          <circle cx={point.x} cy={point.y} r="5" className="line-dot" />
          <text x={point.x} y={height - 8} textAnchor="middle" className="axis-label">{point.label}</text>
        </g>
      ))}
    </svg>
  );
}

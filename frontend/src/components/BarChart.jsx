export default function BarChart({ data, valueKey = 'value', labelKey = 'label', tone = 'mixed' }) {
  const maxValue = Math.max(...data.map((item) => item[valueKey]), 1);
  const tones = ['teal', 'blue', 'yellow', 'blue', 'teal'];

  return (
    <div className="bar-chart" role="img" aria-label="Bar chart visualization">
      <div className="chart-grid-lines">
        <span />
        <span />
        <span />
      </div>

      <div className="bars">
        {data.map((item, index) => {
          const height = Math.max((item[valueKey] / maxValue) * 100, 8);
          const barTone = tone === 'mixed' ? tones[index % tones.length] : tone;

          return (
            <div className="bar-item" key={`${item[labelKey]}-${index}`}>
              <div className={`bar bar-${barTone}`} style={{ height: `${height}%` }} />
              <span>{item[labelKey]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

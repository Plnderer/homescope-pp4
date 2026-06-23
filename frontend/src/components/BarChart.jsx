import { useState } from "react";

function compact(value, format = "currency") {
  const number = Number(value) || 0;
  const prefix = format === "currency" ? "$" : "";
  if (Math.abs(number) >= 1000000) return `${prefix}${(number / 1000000).toFixed(1)}M`;
  if (Math.abs(number) >= 1000) return `${prefix}${Math.round(number / 1000)}K`;
  return Number.isInteger(number) ? `${number}` : number.toFixed(1);
}

function cleanLabel(label) {
  const text = String(label || "");
  return text.length > 24 ? `${text.slice(0, 21)}...` : text;
}

function visibleValue(value, format, valueLabel) {
  const formatted = compact(value, format);
  return valueLabel ? `${formatted} ${valueLabel}` : formatted;
}

export default function BarChart({ data = [], tone = "mixed", layout = "vertical", format = "currency", valueLabel = "" }) {
  const [active, setActive] = useState(null);
  const rows = data.filter((item) => Number(item.value) > 0).slice(0, 8);

  if (!rows.length) {
    return <div className="empty-visual">No chart data available.</div>;
  }

  const max = Math.max(...rows.map((item) => Number(item.value) || 0), 1);
  const colors = ["teal", "gold", "teal", "gold"];
  const useList = layout === "horizontal";

  if (useList) {
    return (
      <div className="interactive-chart">
        <div className="chart-readout">
          <span>{active?.label || "Point to a bar for the exact value"}</span>
          <strong>{active ? visibleValue(active.value, format, valueLabel) : `${rows.length} groups shown`}</strong>
        </div>
        <div className="bar-list" role="img" aria-label="Horizontal bar chart">
        {rows.map((item, index) => {
          const width = `${Math.max(4, ((Number(item.value) || 0) / max) * 100)}%`;
          const color = tone === "mixed" ? colors[index % colors.length] : tone;
          return (
            <div
              className={`bar-list-row ${active?.label === item.label ? "active" : ""}`}
              key={`${item.label}-${index}`}
              onMouseEnter={() => setActive(item)}
              onFocus={() => setActive(item)}
              tabIndex="0"
            >
              <span className="bar-list-label" title={item.label}>{cleanLabel(item.label)}</span>
              <div className="bar-list-track">
                <span className={`bar-list-fill ${color}`} style={{ width }} />
              </div>
              <strong>{visibleValue(item.value, format, valueLabel)}</strong>
            </div>
          );
        })}
        </div>
      </div>
    );
  }

  return (
    <div className="interactive-chart">
      <div className="chart-readout">
        <span>{active?.label || "Point to a bar for the exact value"}</span>
        <strong>{active ? visibleValue(active.value, format, valueLabel) : `${rows.length} groups shown`}</strong>
      </div>
      <div className="bar-chart" role="img" aria-label="Vertical bar chart">
        {rows.map((item, index) => {
          const height = `${Math.max(8, ((Number(item.value) || 0) / max) * 100)}%`;
          const color = tone === "mixed" ? colors[index % colors.length] : tone;
          return (
            <div
              className={`bar-column ${active?.label === item.label ? "active" : ""}`}
              key={`${item.label}-${index}`}
              onMouseEnter={() => setActive(item)}
              onFocus={() => setActive(item)}
              tabIndex="0"
            >
              <div className="bar-stage">
                <strong className="bar-value">{visibleValue(item.value, format, valueLabel)}</strong>
                <span className={`bar ${color}`} style={{ height }} />
              </div>
              <span title={item.label}>{cleanLabel(item.label)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import BarChart from '../components/BarChart.jsx';
import ChartCard from '../components/ChartCard.jsx';
import MetricCard from '../components/MetricCard.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { getModels } from '../services/api.js';
import { formatCompactCurrency, formatCurrency } from '../utils/formatters.js';

function ResidualPlot({ points }) {
  const width = 640;
  const height = 260;
  const padding = 34;
  const safePoints = points.length ? points : [{ predicted_price: 0, residual: 0 }];
  const xValues = safePoints.map((point) => point.predicted_price);
  const yValues = safePoints.map((point) => point.residual);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  const xSpread = Math.max(maxX - minX, 1);
  const ySpread = Math.max(maxY - minY, 1);

  const chartPoints = safePoints.map((point) => ({
    x: padding + ((point.predicted_price - minX) / xSpread) * (width - padding * 2),
    y: height - padding - ((point.residual - minY) / ySpread) * (height - padding * 2),
  }));

  return (
    <svg className="residual-chart" viewBox={`0 0 ${width} ${height}`}>
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} className="axis" />
      <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} className="zero-line" />
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} className="axis" />
      {chartPoints.map((point, index) => (
        <circle key={`${point.x}-${point.y}-${index}`} cx={point.x} cy={point.y} r="5" className="residual-dot" />
      ))}
      <text x={padding} y="20" className="axis-label">Residual</text>
      <text x={width - padding} y={height - 8} textAnchor="end" className="axis-label">Predicted price</text>
    </svg>
  );
}

export default function ModelPage({ onNavigate }) {
  const [modelData, setModelData] = useState(null);
  const [status, setStatus] = useState({ loading: true, error: '' });

  useEffect(() => {
    let active = true;

    getModels()
      .then((payload) => {
        if (!active) return;
        setModelData(payload);
        setStatus({ loading: false, error: '' });
      })
      .catch(() => {
        if (!active) return;
        setStatus({
          loading: false,
          error: 'Start the FastAPI backend to load model comparison results.',
        });
      });

    return () => {
      active = false;
    };
  }, []);

  const metrics = modelData?.models ?? [];
  const linear = metrics.find((metric) => metric.model.includes('Linear')) ?? { mae: 0 };
  const forest = metrics.find((metric) => metric.model.includes('Random')) ?? { mae: 0 };
  const selectedModel = modelData?.best_model_name ?? 'Unavailable';
  const selectedMetricData = metrics.map((metric) => ({
    label: metric.model.replace(' Regressor', ''),
    value: metric.mae,
  }));

  return (
    <main>
      <PageHeader
        eyebrow="Model Evaluation"
        title="Compare model performance before trusting the prediction."
        copy="HomeScope keeps the model evidence visible by showing the baseline model, tree-based model, evaluation metrics, and residual review."
      />

      {status.loading ? <section className="status-card">Loading model evidence...</section> : null}
      {status.error ? <section className="status-card error">{status.error}</section> : null}

      <section className="metrics-grid three-columns">
        <MetricCard label="Linear Regression MAE" value={formatCompactCurrency(linear.mae)} tone="blue" />
        <MetricCard label="Random Forest MAE" value={formatCompactCurrency(forest.mae)} tone="teal" />
        <MetricCard label="Selected model" value={selectedModel.replace(' Regressor', '')} tone="yellow" />
      </section>

      <section className="model-table-card">
        <h2>Model Comparison</h2>
        <div className="model-table">
          <div className="table-row table-head">
            <span>Model</span>
            <span>MAE</span>
            <span>RMSE</span>
            <span>R²</span>
          </div>
          {metrics.map((metric) => (
            <div className="table-row" key={metric.model}>
              <span>{metric.model}</span>
              <span>{formatCurrency(metric.mae)}</span>
              <span>{formatCurrency(metric.rmse)}</span>
              <span>{metric.r2.toFixed(3)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="insight-card">
        <strong>Metric guide:</strong> MAE is the average dollar error, RMSE punishes larger misses more heavily,
        and R² gives a general view of how much pricing variation the model explains.
        {modelData?.metadata?.trained_at ? ` Saved model trained at ${modelData.metadata.trained_at}.` : ''}
      </section>

      <ChartCard title="MAE by Model" note="Lower MAE means a lower average dollar error on the held-out sample.">
        <BarChart data={selectedMetricData.length ? selectedMetricData : [{ label: 'No data', value: 1 }]} tone="mixed" />
      </ChartCard>

      <ChartCard title="Residual Plot for Best Model" note="Residuals near zero are better. Wider spread means the model struggles more with certain price ranges.">
        <ResidualPlot points={modelData?.residual_points ?? []} />
      </ChartCard>

      {modelData?.limitations?.length ? (
        <section className="insight-card">
          <strong>Model limitations:</strong> {modelData.limitations.join(' ')}
        </section>
      ) : null}

      <div className="action-row">
        <button className="secondary-button" onClick={() => onNavigate('Market')}>Back to Dashboard</button>
        <button onClick={() => onNavigate('Predict')}>Open Prediction Form</button>
      </div>
    </main>
  );
}

import { useEffect, useMemo, useState } from "react";
import BarChart from "../components/BarChart";
import ChartCard from "../components/ChartCard";
import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
import ScatterChart from "../components/ScatterChart";
import { getModels } from "../services/api";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function pick(data, keys, fallback = undefined) {
  for (const key of keys) {
    if (data && data[key] !== undefined && data[key] !== null) return data[key];
  }
  return fallback;
}

function normalizeMetrics(models) {
  const raw = pick(models, ["metrics", "model_metrics", "models"], {}) || {};
  if (Array.isArray(raw)) {
    return raw.map((item) => ({
      name: item.name || item.model || item.model_name,
      mae: item.mae ?? item.MAE,
      rmse: item.rmse ?? item.RMSE,
      r2: item.r2 ?? item.R2,
    }));
  }

  return Object.entries(raw)
    .filter(([, metrics]) => metrics && typeof metrics === "object" && !Array.isArray(metrics))
    .map(([name, metrics]) => ({
      name: metrics.name || metrics.model || metrics.model_name || name,
      mae: metrics.mae ?? metrics.MAE,
      rmse: metrics.rmse ?? metrics.RMSE,
      r2: metrics.r2 ?? metrics.R2,
    }))
    .filter((item) => item.mae !== undefined || item.rmse !== undefined || item.r2 !== undefined);
}

export default function ModelPage({ setActivePage }) {
  const [modelData, setModelData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getModels()
      .then((data) => {
        setModelData(data);
        setError("");
      })
      .catch(() => setError("Could not load model evidence. Confirm the backend is running on port 8000."))
      .finally(() => setLoading(false));
  }, []);

  const metrics = useMemo(() => normalizeMetrics(modelData), [modelData]);
  const bestModel = pick(modelData, ["best_model_name", "selected_model", "model_name"], "Not available");
  const artifact = pick(modelData, ["artifact_metadata", "metadata"], {});
  const residuals = pick(modelData, ["residual_sample_points", "residual_points", "residuals"], []);
  const linear = metrics.find((item) => String(item.name || "").toLowerCase().includes("linear")) || {};
  const forest = metrics.find((item) => String(item.name || "").toLowerCase().includes("forest")) || metrics[1] || {};
  const maeBars = metrics.map((item) => ({ label: item.name || item.model || "Model", value: item.mae ?? item.MAE }));

  return (
    <div className="screen-stack">
      <PageHeader
        eyebrow="Model evidence"
        title="Show the error profile before showing the prediction."
        copy="This page keeps model performance, artifact metadata, feature assumptions, and limitations visible so the estimate is framed as research support rather than an appraisal."
        aside={<button type="button" className="primary-button" onClick={() => setActivePage("predict")}>Use selected model</button>}
      />

      {error ? <div className="error-panel">{error}</div> : null}
      {loading ? <div className="loading-panel">Loading model evidence...</div> : null}

      <section className="metric-grid">
        <MetricCard label="Linear Regression MAE" value={currency.format(linear.mae ?? linear.MAE ?? 0)} tone="blue" />
        <MetricCard label="Random Forest MAE" value={currency.format(forest.mae ?? forest.MAE ?? 0)} />
        <MetricCard label="Selected model" value={bestModel} tone="gold" />
        <MetricCard label="Artifact" value={artifact?.trained_at ? "Saved" : "Fallback"} detail={artifact?.trained_at || "In-memory model available"} tone="green" />
      </section>

      <section className="panel model-table-card">
        <div className="panel-heading">
          <span>Comparison</span>
          <h2>Model metrics</h2>
        </div>
        {metrics.length ? (
          <div className="model-table">
            <div className="model-row header">
              <span>Model</span>
              <span>MAE</span>
              <span>RMSE</span>
              <span>R2</span>
            </div>
            {metrics.map((item) => (
              <div className="model-row" key={item.name}>
                <span>{item.name}</span>
                <span>{currency.format(item.mae ?? 0)}</span>
                <span>{currency.format(item.rmse ?? 0)}</span>
                <span>{Number(item.r2 ?? 0).toFixed(3)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-visual">No model metrics were returned by the backend.</div>
        )}
      </section>

      <section className="chart-grid">
        <ChartCard title="MAE by model" description="Lower MAE means the model made smaller average dollar errors on the test split.">
          <BarChart data={maeBars} tone="mixed" layout="horizontal" />
        </ChartCard>
        <ChartCard title="Residual plot" description="Residuals near zero are better; wide spread flags higher uncertainty.">
          <ScatterChart data={residuals} residual />
        </ChartCard>
      </section>

      <section className="panel limitations-panel">
        <div className="panel-heading">
          <span>Limitations</span>
          <h2>Use the estimate carefully.</h2>
        </div>
        <ul>
          {(pick(modelData, ["limitation_notes", "limitations"], []) || [
            "This is a research estimate, not a real appraisal.",
            "Outliers and local location effects can increase prediction error.",
            "National ASPUS trend context is not used as a listing-level prediction input.",
          ]).map((note) => <li key={note}>{note}</li>)}
        </ul>
      </section>
    </div>
  );
}

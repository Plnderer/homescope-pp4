import { useEffect, useMemo, useState } from "react";
import BarChart from "../components/BarChart";
import ChartCard from "../components/ChartCard";
import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";
import ScatterChart from "../components/ScatterChart";
import { getModels } from "../services/api";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });

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

function formatDate(value) {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatExample(example) {
  const actual = currency.format(example.actual_price || 0);
  const predicted = currency.format(example.predicted_price || 0);
  const error = currency.format(Math.abs(example.residual || 0));
  return `${actual} actual vs ${predicted} predicted (${error} error)`;
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
  const selectedModel = pick(modelData, ["selected_model"], {});
  const modelDetail = pick(modelData, ["model_detail"], {});
  const featureImportance = pick(modelData, ["feature_importance"], []);
  const errorByRange = pick(modelData, ["error_by_price_range"], []);
  const examples = pick(modelData, ["prediction_examples"], {});
  const bestMae = selectedModel?.best_mae ?? modelDetail?.best_mae;
  const maeBars = metrics.map((item) => ({ label: item.name || item.model || "Model", value: item.mae ?? item.MAE }));
  const errorBars = errorByRange.map((item) => ({ label: item.label, value: item.mae }));

  return (
    <div className="screen-stack">
      <PageHeader
        eyebrow="Model evidence"
        title="The technical support behind the report."
        copy="This page is for checking the selected model, error context, residuals, and important inputs behind HomeScope's valuation report."
        aside={<button type="button" className="primary-button" onClick={() => setActivePage("predict")}>Generate Report</button>}
      />

      {error ? <div className="error-panel">{error}</div> : null}
      {loading ? <div className="loading-panel">Loading model evidence...</div> : null}

      <section className="metric-grid">
        <MetricCard label="Selected model" value={bestModel} tone="gold" />
        <MetricCard label="Best MAE" value={currency.format(bestMae ?? 0)} detail="Average dollar error on test listings" />
        <MetricCard label="Rows trained" value={(modelDetail?.rows_trained ?? artifact?.dataset_row_count_after_cleaning ?? 0).toLocaleString()} tone="blue" />
        <MetricCard label="Features used" value={modelDetail?.features_used ?? (pick(modelData, ["feature_columns"], []) || []).length} detail={formatDate(modelDetail?.trained_at || artifact?.trained_at)} />
      </section>

      <section className="panel selected-model-panel">
        <div className="panel-heading">
          <span>Selected model</span>
          <h2>{selectedModel?.name || bestModel}</h2>
          <p>{selectedModel?.reason || "The backend did not return a selected-model explanation."}</p>
        </div>
        <div className="selected-model-badge">Active prediction model</div>
        <div className="model-detail-grid">
            <div>
              <span>Artifact</span>
              <strong>{modelDetail?.artifact_loaded || artifact?.artifact_loaded ? "Saved model loaded" : "In-memory fallback"}</strong>
            </div>
            <div>
              <span>Source</span>
              <strong>{modelDetail?.source || artifact?.source || "Unknown"}</strong>
            </div>
            <div>
              <span>Best MAE</span>
              <strong>{currency.format(bestMae ?? 0)}</strong>
            </div>
            <div>
              <span>Feature count</span>
              <strong>{modelDetail?.features_used ?? (pick(modelData, ["feature_columns"], []) || []).length}</strong>
            </div>
        </div>
      </section>

      <details className="panel metric-guide-panel">
        <summary>
          <span>Plain-language guide</span>
          How to read model error
        </summary>
        <div className="metric-guide-grid">
          <p><strong>MAE</strong> is the average dollar gap between predicted and actual prices. Lower is better.</p>
          <p><strong>RMSE</strong> penalizes large misses more heavily, making outlier errors easier to spot.</p>
          <p><strong>R²</strong> shows how much price movement the model explains. Closer to 1 is stronger.</p>
          <p><strong>Residual plot</strong> shows prediction misses around zero. Wider spread means more uncertainty.</p>
          <p><strong>Feature importance</strong> shows which inputs most influenced the selected model.</p>
        </div>
      </details>

      <section className="model-comparison-grid">
        {metrics.length ? metrics.map((item) => {
          const isSelected = item.name === bestModel;
          return (
            <article className={`model-comparison-card ${isSelected ? "selected" : ""}`} key={item.name}>
              <div>
                <span>{isSelected ? "Selected model" : "Candidate model"}</span>
                <h3>{item.name}</h3>
                {isSelected ? <p className="selected-model-note">Used by the valuation report.</p> : null}
              </div>
              <dl>
                <div>
                  <dt>MAE</dt>
                  <dd>{currency.format(item.mae ?? 0)}</dd>
                </div>
                <div>
                  <dt>RMSE</dt>
                  <dd>{currency.format(item.rmse ?? 0)}</dd>
                </div>
                <div>
                  <dt>R²</dt>
                  <dd>{Number(item.r2 ?? 0).toFixed(3)}</dd>
                </div>
              </dl>
            </article>
          );
        }) : <div className="empty-visual">No model metrics were returned by the backend.</div>}
      </section>

      <section className="model-evidence-layout">

        <article className="panel feature-importance-panel">
          <div className="panel-heading">
            <span>Feature importance</span>
            <h2>What drives the selected model</h2>
            <p>Higher values indicate stronger influence on the model's prediction behavior.</p>
          </div>
          {featureImportance.length ? (
            <div className="importance-list">
              {featureImportance.map((item) => (
                <div className="importance-row" key={item.label}>
                  <span>{item.label}</span>
                  <div><i style={{ width: `${Math.max(4, Number(item.value || 0) * 100)}%` }} /></div>
                  <strong>{percent.format(item.value || 0)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-visual">Feature importance is available when the selected model exposes importance scores.</div>
          )}
        </article>
      </section>

      <section className="panel model-table-card">
        <div className="panel-heading">
          <span>Full comparison</span>
          <h2>MAE, RMSE, and R²</h2>
        </div>
        {metrics.length ? (
          <div className="model-table">
            <div className="model-row header">
              <span>Model</span>
              <span>MAE</span>
              <span>RMSE</span>
              <span>R²</span>
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
        <ChartCard title="MAE by model" description="Lower MAE means smaller average dollar misses on the test split.">
          <BarChart data={maeBars} tone="mixed" layout="horizontal" />
        </ChartCard>
        <ChartCard title="Error by price range" description="Shows where the model tends to be less precise across lower and higher price bands.">
          <BarChart data={errorBars} tone="coral" layout="horizontal" />
        </ChartCard>
      </section>

      <section className="chart-grid">
        <ChartCard title="Residual plot" description="Residuals near zero are better. A wide spread means the valuation report should be read with more caution.">
          <ScatterChart data={residuals} residual />
        </ChartCard>
        <article className="panel prediction-examples-panel">
          <div className="panel-heading">
            <span>Prediction examples</span>
            <h2>Close, too high, and too low</h2>
          </div>
          <div className="example-columns">
            {[
              ["Close", examples.close || []],
              ["Predicted too high", examples.too_high || []],
              ["Predicted too low", examples.too_low || []],
            ].map(([label, rows]) => (
              <div key={label}>
                <strong>{label}</strong>
                {rows.length ? (
                  <ul>
                    {rows.slice(0, 3).map((item) => <li key={`${label}-${item.actual_price}-${item.predicted_price}`}>{formatExample(item)}</li>)}
                  </ul>
                ) : (
                  <p>No examples in the current residual sample.</p>
                )}
              </div>
            ))}
          </div>
        </article>
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

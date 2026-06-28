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
  return actual + " actual vs " + predicted + " checked price (" + error + " mistake)";
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
      .catch(() => setError("Could not load the method details. Confirm the backend is running on port 8000."))
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
  const averageModelError = selectedModel?.best_mae ?? modelDetail?.best_mae;
  const trainingRecords = modelDetail?.rows_trained ?? artifact?.dataset_row_count_after_cleaning ?? 0;
  const inputCount = modelDetail?.features_used ?? (pick(modelData, ["feature_columns"], []) || []).length;
  const errorBars = metrics.map((item) => ({ label: item.name || item.model || "Checker", value: item.mae ?? item.MAE }));
  const rangeBars = errorByRange.map((item) => ({ label: item.label, value: item.mae }));

  return (
    <div className="screen-stack">
      <PageHeader
        eyebrow="How It Works"
        title="How HomeScope checks a price."
        aside={<button type="button" className="primary-button" onClick={() => setActivePage("predict")}>Check This Price</button>}
      />

      {error ? <div className="error-panel">{error}</div> : null}
      {loading ? <div className="loading-panel">Loading method details...</div> : null}

      <section className="panel optional-evidence-banner">
        <span className="eyebrow">Optional explanation</span>
        <p>This page is only for users who want to understand how the price check was made. The Check Price page gives the main answer.</p>
      </section>

      <section className="metric-grid">
        <MetricCard label="Best-performing price checker" value="HomeScope selected checker" detail={"Technical name: " + bestModel} tone="gold" />
        <MetricCard label="Average error" value={currency.format(averageModelError ?? 0)} detail="Average miss during testing" />
        <MetricCard label="Homes learned from" value={trainingRecords.toLocaleString()} tone="blue" />
        <MetricCard label="Inputs reviewed" value={inputCount} detail={formatDate(modelDetail?.trained_at || artifact?.trained_at)} />
      </section>

      <section className="panel selected-model-panel">
        <div className="panel-heading">
          <span>Plain-English summary</span>
          <h2>HomeScope used its best-performing price checker.</h2>
          <p>{selectedModel?.reason || "HomeScope compares tested price checkers and uses the one with the smallest average error."}</p>
        </div>
        <div className="selected-model-badge">Technical name: {bestModel}</div>
        <div className="model-detail-grid">
          <div>
            <span>Saved checker status</span>
            <strong>{modelDetail?.artifact_loaded || artifact?.artifact_loaded ? "Saved checker loaded" : "Fallback checker loaded"}</strong>
          </div>
          <div>
            <span>Data source</span>
            <strong>{modelDetail?.source || artifact?.source || "Unknown"}</strong>
          </div>
          <div>
            <span>Average error</span>
            <strong>{currency.format(averageModelError ?? 0)}</strong>
          </div>
          <div>
            <span>Inputs reviewed</span>
            <strong>{inputCount}</strong>
          </div>
        </div>
      </section>

      <section className="panel metric-guide-panel">
        <div className="panel-heading">
          <span>Key terms</span>
        </div>
        <div className="metric-guide-grid">
          <p><strong>Average error</strong> means the typical dollar miss during testing. Lower is better.</p>
          <p><strong>Large-error check</strong> puts more weight on big misses, so it helps show outlier risk.</p>
          <p><strong>Price pattern score</strong> shows how much of the price pattern the checker captured. Higher is stronger.</p>
          <p><strong>Prediction mistakes</strong> are examples where the checked price was above or below the real price.</p>
          <p><strong>What affected the estimate most</strong> shows which inputs mattered most to the checker.</p>
          <p><strong>Random Forest Regressor</strong> is the technical name for HomeScope's best-performing price checker when that checker is selected.</p>
        </div>
      </section>

      <div className="section-label">
        <span>Checker comparison</span>
      </div>
      <section className="model-comparison-grid">
        {metrics.length ? metrics.map((item) => {
          const isSelected = item.name === bestModel;
          return (
            <article className={"model-comparison-card " + (isSelected ? "selected" : "")} key={item.name}>
              <div>
                <span>{isSelected ? "Selected checker" : "Candidate checker"}</span>
                <h3>{item.name}</h3>
              </div>
              <dl>
                <div>
                  <dt>Average error</dt>
                  <dd>{currency.format(item.mae ?? 0)}</dd>
                </div>
                <div>
                  <dt>Large-error check</dt>
                  <dd>{currency.format(item.rmse ?? 0)}</dd>
                </div>
                <div>
                  <dt>Price pattern score</dt>
                  <dd>{Number(item.r2 ?? 0).toFixed(3)}</dd>
                </div>
              </dl>
            </article>
          );
        }) : <div className="empty-visual">No checker scores were returned by the backend.</div>}
      </section>



      <details className="panel feature-importance-panel">
        <summary>
          <span>What affected the estimate most</span>
          &mdash; Inputs with the most influence
        </summary>
        <div className="details-content">
          <p className="details-intro">Higher values mean that input had more influence on the checker during testing.</p>
          {featureImportance.length ? (
            <div className="importance-list">
              {featureImportance.map((item) => (
                <div className="importance-row" key={item.label}>
                  <span>{item.label}</span>
                  <div><i style={{ width: Math.max(4, Number(item.value || 0) * 100) + "%" }} /></div>
                  <strong>{percent.format(item.value || 0)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-visual">This is available when the selected checker exposes influence scores.</div>
          )}
        </div>
      </details>

      <details className="panel error-analysis-panel">
        <summary>
          <span>Prediction mistakes</span>
          &mdash; Where checks are more or less precise
        </summary>
        <div className="details-content">
          <section className="chart-grid">
            <ChartCard title="Average error by checker" description="Lower values mean smaller average dollar misses during testing.">
              <BarChart data={errorBars} tone="mixed" layout="horizontal" />
            </ChartCard>
            <ChartCard title="Average error by price range" description="Shows where the checker tends to be less precise across lower and higher price bands.">
              <BarChart data={rangeBars} tone="coral" layout="horizontal" />
            </ChartCard>
          </section>
          <section className="chart-grid">
            <ChartCard title="Prediction mistakes plot" description="Dots near zero are better. A wide spread means the price check should be read with more caution.">
              <ScatterChart data={residuals} residual />
            </ChartCard>
            <article className="panel prediction-examples-panel">
              <div className="panel-heading">
                <span>Example checks</span>
                <h2>Close, too high, and too low</h2>
              </div>
              <div className="example-columns">
                {[
                  ["Close", examples.close || []],
                  ["Checked too high", examples.too_high || []],
                  ["Checked too low", examples.too_low || []],
                ].map(([label, rows]) => (
                  <div key={label}>
                    <strong>{label}</strong>
                    {rows.length ? (
                      <ul>
                        {rows.slice(0, 3).map((item) => <li key={label + "-" + item.actual_price + "-" + item.predicted_price}>{formatExample(item)}</li>)}
                      </ul>
                    ) : (
                      <p>No examples in the current mistake sample.</p>
                    )}
                  </div>
                ))}
              </div>
            </article>
          </section>
        </div>
      </details>

      <details className="panel limitations-panel">
        <summary>
          <span>Limitations</span>
          &mdash; Use the estimate carefully
        </summary>
        <div className="details-content">
          <ul>
            {(pick(modelData, ["limitation_notes", "limitations"], []) || [
              "This is a research estimate, not a real appraisal.",
              "Unusual listings and local location effects can increase prediction error.",
              "National trend context is market background, not a direct listing-level appraisal input.",
            ]).map((note) => <li key={note}>{note}</li>)}
          </ul>
        </div>
      </details>
    </div>
  );
}

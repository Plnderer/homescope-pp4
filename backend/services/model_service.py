from __future__ import annotations

from functools import lru_cache
from pathlib import Path
import json
import sys

import joblib
import pandas as pd

from backend.services import data_service

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from model_utils import classify_listing, make_prediction_input, train_models


MODEL_PATH = ROOT / "models" / "homescope_model.joblib"
METADATA_PATH = ROOT / "models" / "homescope_metadata.json"

LIMITATION_NOTES = [
    "This is a research estimate, not a real appraisal.",
    "Outliers and local location effects can increase prediction error.",
    "ASPUS is national trend context and is not used as a listing-level prediction input.",
]


def _metric_row(name: str, result: dict) -> dict:
    return {
        "model": name,
        "mae": float(result["MAE"]),
        "rmse": float(result["RMSE"]),
        "r2": float(result["R2"]),
    }


def _residual_points(result: dict, limit: int = 120) -> list[dict]:
    y_test = pd.Series(result.get("y_test", []), dtype="float64")
    predictions = pd.Series(result.get("predictions", []), dtype="float64")
    if y_test.empty or predictions.empty:
        return []
    sample = pd.DataFrame({"actual": y_test, "predicted": predictions})
    sample["residual"] = sample["actual"] - sample["predicted"]
    sample = sample.sample(min(len(sample), limit), random_state=42)
    return [
        {
            "predicted_price": float(row["predicted"]),
            "actual_price": float(row["actual"]),
            "residual": float(row["residual"]),
        }
        for _, row in sample.iterrows()
    ]


def model_metrics_from_bundle(bundle: dict) -> list[dict]:
    results = bundle.get("results", {})
    return [_metric_row(name, result) for name, result in results.items()]


def residuals_from_bundle(bundle: dict) -> list[dict]:
    best_name = bundle.get("best_model_name")
    best_result = bundle.get("results", {}).get(best_name, {})
    return _residual_points(best_result)


def _best_metric(models: list[dict], best_name: str | None) -> dict | None:
    if not models:
        return None
    for model in models:
        if model.get("model") == best_name:
            return model
    return min(models, key=lambda item: item.get("mae", float("inf")))


def _selected_model_summary(models: list[dict], best_name: str | None) -> dict:
    best = _best_metric(models, best_name)
    if not best:
        return {
            "name": best_name or "Not available",
            "reason": "No comparison metrics were returned for this run.",
            "best_mae": None,
        }

    ranked = sorted(models, key=lambda item: item.get("mae", float("inf")))
    runner_up = ranked[1] if len(ranked) > 1 else None
    reason = f"{best['model']} has the lowest MAE in the current comparison."
    if runner_up and runner_up.get("mae"):
        improvement = runner_up["mae"] - best["mae"]
        if improvement > 0:
            reason = (
                f"{best['model']} has the lowest MAE in the current comparison, "
                f"beating the next model by about ${improvement:,.0f}."
            )

    return {
        "name": best["model"],
        "reason": reason,
        "best_mae": best.get("mae"),
        "rmse": best.get("rmse"),
        "r2": best.get("r2"),
    }


def _model_detail(metadata: dict, feature_columns: list[str], best_metric: dict | None) -> dict:
    return {
        "rows_trained": metadata.get("dataset_row_count_after_cleaning"),
        "features_used": len(feature_columns),
        "trained_at": metadata.get("trained_at"),
        "best_mae": best_metric.get("mae") if best_metric else None,
        "artifact_loaded": bool(metadata.get("artifact_loaded")),
        "source": metadata.get("source", "unknown"),
    }


def _error_by_price_range(residual_points: list[dict]) -> list[dict]:
    if not residual_points:
        return []

    frame = pd.DataFrame(residual_points)
    if frame.empty or "actual_price" not in frame or "residual" not in frame:
        return []

    bins = [0, 300_000, 500_000, 750_000, 1_000_000, float("inf")]
    labels = ["<$300K", "$300K-$500K", "$500K-$750K", "$750K-$1M", "$1M+"]
    frame["bucket"] = pd.cut(frame["actual_price"], bins=bins, labels=labels, include_lowest=True)
    frame["absolute_error"] = frame["residual"].abs()
    grouped = (
        frame.dropna(subset=["bucket"])
        .groupby("bucket", observed=True)
        .agg(mae=("absolute_error", "mean"), count=("absolute_error", "count"))
        .reset_index()
    )

    return [
        {
            "label": str(row["bucket"]),
            "mae": float(row["mae"]),
            "count": int(row["count"]),
        }
        for _, row in grouped.iterrows()
    ]


def _format_prediction_example(row: pd.Series, label: str) -> dict:
    return {
        "label": label,
        "actual_price": float(row["actual_price"]),
        "predicted_price": float(row["predicted_price"]),
        "residual": float(row["residual"]),
        "absolute_error": float(abs(row["residual"])),
    }


def _prediction_examples(residual_points: list[dict]) -> dict:
    empty = {"close": [], "too_high": [], "too_low": []}
    if not residual_points:
        return empty

    frame = pd.DataFrame(residual_points)
    if frame.empty or not {"actual_price", "predicted_price", "residual"} <= set(frame.columns):
        return empty

    frame["absolute_error"] = frame["residual"].abs()
    close = frame.nsmallest(3, "absolute_error")
    too_high = frame[frame["residual"] < 0].nsmallest(3, "residual")
    too_low = frame[frame["residual"] > 0].nlargest(3, "residual")

    return {
        "close": [_format_prediction_example(row, "Close prediction") for _, row in close.iterrows()],
        "too_high": [_format_prediction_example(row, "Predicted too high") for _, row in too_high.iterrows()],
        "too_low": [_format_prediction_example(row, "Predicted too low") for _, row in too_low.iterrows()],
    }


def _feature_importance_from_pipeline(pipeline, feature_columns: list[str]) -> list[dict]:
    estimator = getattr(pipeline, "named_steps", {}).get("model") if pipeline is not None else None
    importances = getattr(estimator, "feature_importances_", None)
    if importances is None:
        return []

    preprocessor = getattr(pipeline, "named_steps", {}).get("preprocessor")
    try:
        transformed_names = list(preprocessor.get_feature_names_out())
    except Exception:
        transformed_names = list(feature_columns)

    feature_scores: dict[str, float] = {}
    sorted_columns = sorted(feature_columns, key=len, reverse=True)
    for raw_name, score in zip(transformed_names, importances):
        cleaned = str(raw_name).split("__", 1)[-1]
        feature = next(
            (
                column
                for column in sorted_columns
                if cleaned == column or cleaned.startswith(f"{column}_")
            ),
            cleaned,
        )
        feature_scores[feature] = feature_scores.get(feature, 0.0) + float(score)

    total = sum(feature_scores.values()) or 1.0
    ranked = sorted(feature_scores.items(), key=lambda item: item[1], reverse=True)
    return [
        {
            "label": feature,
            "value": float(score / total),
        }
        for feature, score in ranked
    ]


def _result_explanation(difference: float, mae: float | None) -> str:
    if mae and abs(difference) <= mae:
        return "The listing price is within the model's average error band, so treat the estimate as roughly fair."
    if difference > 0:
        return "This listing is priced above the selected model's estimate for similar homes."
    if difference < 0:
        return "This listing is priced below the selected model's estimate for similar homes."
    return "The listing price matches the selected model's point estimate."


@lru_cache(maxsize=1)
def get_model_metadata() -> dict:
    if not METADATA_PATH.exists():
        return {"artifact_loaded": False, "source": "trained_in_memory"}
    with METADATA_PATH.open("r", encoding="utf-8") as file:
        metadata = json.load(file)
    metadata["artifact_loaded"] = MODEL_PATH.exists()
    metadata["source"] = "saved_artifact" if MODEL_PATH.exists() else "metadata_only"
    return metadata


@lru_cache(maxsize=1)
def get_model_bundle() -> dict:
    metadata = get_model_metadata()
    if MODEL_PATH.exists():
        pipeline = joblib.load(MODEL_PATH)
        return {
            "results": {},
            "best_model_name": metadata.get("best_model_name", "Saved model"),
            "best_pipeline": pipeline,
            "feature_columns": metadata.get("feature_columns", []),
            "metadata": metadata,
            "artifact_loaded": True,
        }

    clean_df = data_service.get_housing_data()
    bundle = train_models(clean_df)
    bundle["metadata"] = metadata
    bundle["artifact_loaded"] = False
    return bundle


def get_model_payload() -> dict:
    bundle = get_model_bundle()
    metadata = get_model_metadata()

    models = model_metrics_from_bundle(bundle)
    residual_points = residuals_from_bundle(bundle)

    if not models:
        models = metadata.get("model_metrics", [])
    if not residual_points:
        residual_points = metadata.get("residual_points", [])

    feature_columns = bundle.get("feature_columns", metadata.get("feature_columns", []))
    best_metric = _best_metric(models, bundle.get("best_model_name"))

    return {
        "models": models,
        "best_model_name": bundle.get("best_model_name"),
        "selected_model": _selected_model_summary(models, bundle.get("best_model_name")),
        "feature_columns": feature_columns,
        "feature_importance": metadata.get("feature_importance")
        or _feature_importance_from_pipeline(bundle.get("best_pipeline"), feature_columns),
        "residual_points": residual_points,
        "error_by_price_range": _error_by_price_range(residual_points),
        "prediction_examples": _prediction_examples(residual_points),
        "model_detail": _model_detail(metadata, feature_columns, best_metric),
        "metadata": metadata,
        "limitations": metadata.get("limitations", LIMITATION_NOTES),
    }


def predict_price(
    *,
    state: str,
    city: str,
    county: str,
    beds: int,
    baths: int,
    living_space: int,
    listing_price: float,
    defaults: dict,
) -> dict:
    bundle = get_model_bundle()
    prediction_row = make_prediction_input(
        beds=int(beds),
        baths=int(baths),
        living_space=int(living_space),
        city=city,
        state=state,
        county=county,
        zip_population=float(defaults["zip_population"]),
        zip_density=float(defaults["zip_density"]),
        median_income=float(defaults["median_income"]),
        latitude=float(defaults["latitude"]),
        longitude=float(defaults["longitude"]),
    )
    predicted = float(bundle["best_pipeline"].predict(prediction_row)[0])
    difference = float(listing_price - predicted)
    percent_difference = float((difference / predicted) * 100) if predicted else 0.0
    metadata = get_model_metadata()
    models = model_metrics_from_bundle(bundle) or metadata.get("model_metrics", [])
    best_metric = _best_metric(models, bundle.get("best_model_name"))
    model_mae = float(best_metric["mae"]) if best_metric and best_metric.get("mae") is not None else None
    fair_value_range = {
        "low": max(0.0, predicted - model_mae) if model_mae is not None else predicted,
        "high": predicted + model_mae if model_mae is not None else predicted,
    }
    signal = classify_listing(float(listing_price), predicted)
    return {
        "predicted_fair_value": predicted,
        "listing_price": float(listing_price),
        "difference": difference,
        "percent_difference": percent_difference,
        "selected_model_name": bundle["best_model_name"],
        "model_mae": model_mae,
        "fair_value_range": fair_value_range,
        "signal": signal,
        "result_explanation": _result_explanation(difference, model_mae),
        "model_error_context": (
            f"Selected model average error is about ${model_mae:,.0f} MAE on the test split."
            if model_mae is not None
            else "No MAE was available for the selected model."
        ),
        "market_label": signal,
        "assumptions": defaults,
        "limitations": LIMITATION_NOTES,
    }

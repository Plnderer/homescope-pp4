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

    return {
        "models": models,
        "best_model_name": bundle.get("best_model_name"),
        "feature_columns": bundle.get("feature_columns", metadata.get("feature_columns", [])),
        "residual_points": residual_points,
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
    return {
        "predicted_fair_value": predicted,
        "listing_price": float(listing_price),
        "difference": difference,
        "percent_difference": percent_difference,
        "selected_model_name": bundle["best_model_name"],
        "market_label": classify_listing(float(listing_price), predicted),
        "assumptions": defaults,
        "limitations": LIMITATION_NOTES,
    }

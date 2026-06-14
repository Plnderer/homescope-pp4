from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import json
import sys

import joblib

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from data_utils import clean_housing_data, load_housing_data
from model_utils import train_models


HOUSING_PATH = ROOT / "data" / "American_Housing_Data_20231209.csv"
MODEL_DIR = ROOT / "models"
MODEL_PATH = MODEL_DIR / "homescope_model.joblib"
METADATA_PATH = MODEL_DIR / "homescope_metadata.json"

LIMITATIONS = [
    "This is a research estimate, not a real appraisal.",
    "Outliers and local location effects can increase prediction error.",
    "ASPUS is national trend context and is not used as a listing-level prediction input.",
]


def _metrics(bundle: dict) -> list[dict]:
    return [
        {
            "model": name,
            "mae": float(result["MAE"]),
            "rmse": float(result["RMSE"]),
            "r2": float(result["R2"]),
        }
        for name, result in bundle["results"].items()
    ]


def _residual_points(bundle: dict, limit: int = 120) -> list[dict]:
    best = bundle["results"][bundle["best_model_name"]]
    sample = best["y_test"].to_frame(name="actual")
    sample["predicted"] = best["predictions"]
    sample["residual"] = sample["actual"] - sample["predicted"]
    sample = sample.sample(min(len(sample), limit), random_state=42)
    return [
        {
            "actual_price": float(row["actual"]),
            "predicted_price": float(row["predicted"]),
            "residual": float(row["residual"]),
        }
        for _, row in sample.iterrows()
    ]


def main() -> None:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    clean_df = clean_housing_data(load_housing_data(HOUSING_PATH))
    bundle = train_models(clean_df)

    joblib.dump(bundle["best_pipeline"], MODEL_PATH)
    metadata = {
        "best_model_name": bundle["best_model_name"],
        "model_metrics": _metrics(bundle),
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "feature_columns": bundle["feature_columns"],
        "feature_assumptions": [
            "User-entered beds, baths, living space, state, city, optional county, and listing price drive the prediction.",
            "Hidden demographic and location fields are filled from selected city medians by the API.",
            "The saved artifact stores only the selected best pipeline; comparison metrics are stored in metadata.",
        ],
        "dataset_row_count_after_cleaning": int(len(clean_df)),
        "residual_points": _residual_points(bundle),
        "limitations": LIMITATIONS,
    }
    METADATA_PATH.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(f"Saved model artifact: {MODEL_PATH}")
    print(f"Saved model metadata: {METADATA_PATH}")
    print(f"Best model by MAE: {bundle['best_model_name']}")


if __name__ == "__main__":
    main()

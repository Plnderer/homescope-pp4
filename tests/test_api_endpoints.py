from __future__ import annotations

from pathlib import Path
import sys

import pandas as pd
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend import main


client = TestClient(main.app)


class DummyPipeline:
    def predict(self, row):
        return [420000.0]


def fake_model_bundle():
    return {
        "results": {
            "Linear Regression": {
                "MAE": 190000.0,
                "RMSE": 250000.0,
                "R2": 0.71,
                "y_test": pd.Series([350000.0, 450000.0]),
                "predictions": pd.Series([340000.0, 460000.0]),
            },
            "Random Forest Regressor": {
                "MAE": 145000.0,
                "RMSE": 210000.0,
                "R2": 0.79,
                "y_test": pd.Series([350000.0, 450000.0]),
                "predictions": pd.Series([360000.0, 430000.0]),
            },
        },
        "best_model_name": "Random Forest Regressor",
        "best_pipeline": DummyPipeline(),
        "feature_columns": ["Beds", "Baths", "Living Space", "City", "State", "County"],
    }


def test_core_api_endpoints_return_live_payloads(monkeypatch):
    monkeypatch.setattr(main.model_service, "get_model_bundle", fake_model_bundle)
    monkeypatch.setattr(
        main.model_service,
        "get_model_metadata",
        lambda: {"artifact_loaded": False, "source": "test"},
    )

    health = client.get("/api/health")
    summary = client.get("/api/summary")
    market = client.get("/api/market", params={"state": "All", "city": "All", "min_beds": 1, "min_baths": 1})
    models = client.get("/api/models")
    predict = client.post(
        "/api/predict",
        json={
            "state": "New York",
            "city": "New York",
            "beds": 3,
            "baths": 2,
            "living_space": 1800,
            "listing_price": 475000,
        },
    )

    assert health.status_code == 200
    assert health.json()["status"] == "ok"

    assert summary.status_code == 200
    assert summary.json()["total_records"] > 0

    assert market.status_code == 200
    assert market.json()["matching_count"] > 0

    assert models.status_code == 200
    assert models.json()["best_model_name"] == "Random Forest Regressor"

    assert predict.status_code == 200
    prediction = predict.json()
    assert prediction["predicted_fair_value"] == 420000.0
    assert prediction["fair_value_range"]["low"] < prediction["predicted_fair_value"]
    assert prediction["signal"]


def test_market_max_sqft_zero_means_no_upper_limit():
    without_max = client.get(
        "/api/market",
        params={"state": "All", "city": "All", "min_beds": 1, "min_baths": 1, "min_sqft": 1850},
    )
    zero_max = client.get(
        "/api/market",
        params={"state": "All", "city": "All", "min_beds": 1, "min_baths": 1, "min_sqft": 1850, "max_sqft": 0},
    )

    assert without_max.status_code == 200
    assert zero_max.status_code == 200
    assert without_max.json()["matching_count"] > 0
    assert zero_max.json()["matching_count"] == without_max.json()["matching_count"]


def test_predict_rejects_non_positive_living_space_and_listing_price():
    invalid_living_space = client.post(
        "/api/predict",
        json={
            "state": "New York",
            "city": "New York",
            "beds": 3,
            "baths": 2,
            "living_space": 0,
            "listing_price": 475000,
        },
    )
    invalid_listing_price = client.post(
        "/api/predict",
        json={
            "state": "New York",
            "city": "New York",
            "beds": 3,
            "baths": 2,
            "living_space": 1800,
            "listing_price": 0,
        },
    )

    assert invalid_living_space.status_code == 422
    assert invalid_listing_price.status_code == 422

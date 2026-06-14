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
        return [400000.0]


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


def test_summary_and_filters_use_cleaned_dataset():
    summary = client.get("/api/summary").json()

    assert summary["total_records"] > 0
    assert "New York" in summary["states"]
    assert summary["average_price"] > 0
    assert summary["average_price_per_sqft"] > 0

    filters = client.get("/api/filters", params={"state": "New York"}).json()

    assert filters["states"][0] == "All"
    assert "New York" in filters["cities"]


def test_market_endpoint_returns_dashboard_chart_payloads():
    response = client.get(
        "/api/market",
        params={"state": "New York", "city": "New York", "min_beds": 1, "min_sqft": 300},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["matching_count"] > 0
    assert payload["average_price"] > 0
    assert payload["price_distribution"]
    assert {"label", "value"} <= set(payload["price_distribution"][0])
    assert payload["price_vs_living_space"]
    assert {"sqft", "price"} <= set(payload["price_vs_living_space"][0])
    assert payload["aspus_trend"]
    assert {"label", "value"} <= set(payload["aspus_trend"][0])


def test_models_endpoint_returns_comparison_and_residuals(monkeypatch):
    monkeypatch.setattr(main.model_service, "get_model_bundle", fake_model_bundle)
    monkeypatch.setattr(
        main.model_service,
        "get_model_metadata",
        lambda: {"artifact_loaded": False, "source": "trained_in_memory"},
    )

    response = client.get("/api/models")

    assert response.status_code == 200
    payload = response.json()
    assert payload["best_model_name"] == "Random Forest Regressor"
    assert len(payload["models"]) == 2
    assert payload["models"][0]["mae"] > 0
    assert payload["residual_points"]
    assert {"predicted_price", "residual"} <= set(payload["residual_points"][0])
    assert "research estimate" in payload["limitations"][0].lower()


def test_predict_endpoint_uses_model_and_market_defaults(monkeypatch):
    monkeypatch.setattr(main.model_service, "get_model_bundle", fake_model_bundle)

    response = client.post(
        "/api/predict",
        json={
            "state": "New York",
            "city": "New York",
            "beds": 2,
            "baths": 2,
            "living_space": 1200,
            "listing_price": 440000,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["predicted_fair_value"] == 400000.0
    assert payload["listing_price"] == 440000.0
    assert payload["difference"] == 40000.0
    assert payload["percent_difference"] == 10.0
    assert payload["selected_model_name"] == "Random Forest Regressor"
    assert payload["market_label"]
    assert payload["assumptions"]["county"]

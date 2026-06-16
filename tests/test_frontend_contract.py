from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_prediction_positive_number_inputs_match_backend_validation():
    source = (ROOT / "frontend" / "src" / "pages" / "PredictPage.jsx").read_text(encoding="utf-8")

    assert '<input type="number" min="1" value={form.living_space}' in source
    assert '<input type="number" min="1" value={form.listing_price}' in source

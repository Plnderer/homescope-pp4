from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read_frontend(path: str) -> str:
    return (ROOT / "frontend" / "src" / path).read_text(encoding="utf-8")


def test_prediction_positive_number_inputs_match_backend_validation():
    source = read_frontend("pages/PredictPage.jsx")

    assert '<input type="number" min="1" value={form.living_space}' in source
    assert '<input type="number" min="1" value={form.listing_price}' in source


def test_main_navigation_prioritizes_check_price_and_how_it_works():
    source = read_frontend("App.jsx")

    assert '{ id: "predict", label: "Check Price" }' in source
    assert '{ id: "model", label: "How It Works" }' in source
    assert "Check Home Price" in source
    assert 'label: "Predict"' not in source
    assert "Model Evidence" not in source


def test_check_price_result_answers_in_plain_english_before_technical_details():
    source = read_frontend("pages/PredictPage.jsx")

    assert "This looks like a good price." in source
    assert "This looks fair." in source
    assert "This looks high." in source
    assert "Not enough confidence." in source
    assert "This listing is about" in source
    assert '"below" : "above"' in source
    assert "the model estimate" in source
    assert "HomeScope used its best-performing price checker." in source
    assert "Technical name:" in source
    assert "Difference from fair value" not in source
    assert "Model used for this report" not in source


def test_result_guides_user_to_next_pages_and_editing():
    source = read_frontend("pages/PredictPage.jsx")

    assert "See Area Prices" in source
    assert "How It Works" in source
    assert "Edit Details" in source
    assert "setMarketFilters" in source


def test_market_page_uses_plain_english_labels_and_aspus_label():
    source = read_frontend("pages/MarketPage.jsx")

    expected = [
        "Homes compared",
        "Homes used",
        "Average home price",
        "Middle home price",
        "Half the homes cost more, half cost less",
        "Average price per square foot",
        "Price ranges",
        "Price compared with home size",
        "See prices in this area",
        "U.S. average sales price",
    ]
    for text in expected:
        assert text in source

    forbidden = [
        "Records in comparison set",
        "active records",
        "Average $ / sq ft",
        "Less sensitive to outliers",
        "Price distribution",
        "Price vs. living space",
        "Comparable market context for the report",
        "U.S. median sale price",
    ]
    for text in forbidden:
        assert text not in source


def test_how_it_works_replaces_model_evidence_and_explains_terms():
    source = read_frontend("pages/ModelPage.jsx")

    assert 'eyebrow="How It Works"' in source
    assert "You do not need this page to use HomeScope." in source
    assert "This page is only for users who want to understand how the price check was made." in source
    assert "Best-performing price checker" in source
    assert "Technical name" in source
    assert "Average error" in source
    assert "Large-error check" in source
    assert "Price pattern score" in source
    assert "Prediction mistakes" in source
    assert "What affected the estimate most" in source
    assert "Model Evidence" not in source

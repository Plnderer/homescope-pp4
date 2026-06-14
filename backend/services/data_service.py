from __future__ import annotations

from functools import lru_cache
from pathlib import Path
import sys

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from data_utils import clean_housing_data, filter_market_data, load_aspus_data, load_housing_data


HOUSING_PATH = ROOT / "data" / "American_Housing_Data_20231209.csv"
ASPUS_PATH = ROOT / "data" / "ASPUS.csv"


@lru_cache(maxsize=1)
def get_housing_data() -> pd.DataFrame:
    raw = load_housing_data(HOUSING_PATH)
    return clean_housing_data(raw)


@lru_cache(maxsize=1)
def get_aspus_data() -> pd.DataFrame:
    return load_aspus_data(ASPUS_PATH)


def _safe_float(value: float | int | np.floating | None) -> float:
    if value is None or pd.isna(value):
        return 0.0
    return float(value)


def get_filters(state: str | None = None) -> dict:
    df = get_housing_data()
    states = ["All"] + sorted(df["State"].dropna().unique().tolist())

    if state and state != "All":
        city_df = df[df["State"] == state]
    else:
        city_df = df

    cities = ["All"] + sorted(city_df["City"].dropna().unique().tolist())
    return {"states": states, "cities": cities}


def get_summary() -> dict:
    df = get_housing_data()
    return {
        "total_records": int(len(df)),
        "states": sorted(df["State"].dropna().unique().tolist()),
        "cities": sorted(df["City"].dropna().unique().tolist()),
        "state_count": int(df["State"].nunique()),
        "city_count": int(df["City"].nunique()),
        "average_price": _safe_float(df["Price"].mean()),
        "median_price": _safe_float(df["Price"].median()),
        "average_price_per_sqft": _safe_float(df["Price Per Sqft"].mean()),
    }


def _price_distribution(df: pd.DataFrame) -> list[dict]:
    bins = [0, 300_000, 500_000, 700_000, 900_000, float("inf")]
    labels = ["<$300K", "$300K-$500K", "$500K-$700K", "$700K-$900K", "$900K+"]
    bucketed = pd.cut(df["Price"], bins=bins, labels=labels, include_lowest=True)
    counts = bucketed.value_counts(sort=False)
    return [{"label": str(label), "value": int(counts.get(label, 0))} for label in labels]


def _scatter_points(df: pd.DataFrame, limit: int = 120) -> list[dict]:
    if df.empty:
        return []
    sample = df.sample(min(len(df), limit), random_state=42)
    return [
        {
            "sqft": _safe_float(row["Living Space"]),
            "price": _safe_float(row["Price"]),
            "city": row["City"],
            "state": row["State"],
            "beds": _safe_float(row["Beds"]),
            "baths": _safe_float(row["Baths"]),
        }
        for _, row in sample.iterrows()
    ]


def _city_averages(df: pd.DataFrame, limit: int = 8) -> list[dict]:
    if df.empty:
        return []
    grouped = (
        df.groupby(["State", "City"], as_index=False)
        .agg(avg_price=("Price", "mean"), median_price=("Price", "median"), listings=("Price", "count"))
        .sort_values("avg_price", ascending=False)
        .head(limit)
    )
    return [
        {
            "label": f"{row['City']}, {row['State']}",
            "city": row["City"],
            "state": row["State"],
            "value": _safe_float(row["avg_price"]),
            "average_price": _safe_float(row["avg_price"]),
            "median_price": _safe_float(row["median_price"]),
            "listings": int(row["listings"]),
        }
        for _, row in grouped.iterrows()
    ]


def _aspus_trend(limit: int = 40) -> list[dict]:
    aspus = get_aspus_data().tail(limit)
    return [
        {
            "label": row["observation_date"].strftime("%Y Q") + str(((row["observation_date"].month - 1) // 3) + 1),
            "date": row["observation_date"].date().isoformat(),
            "value": _safe_float(row["ASPUS"]),
        }
        for _, row in aspus.iterrows()
    ]


def get_market(
    state: str | None = None,
    city: str | None = None,
    min_beds: int = 0,
    min_baths: int = 0,
    min_sqft: int = 0,
    max_sqft: int | None = None,
) -> dict:
    df = get_housing_data()
    filtered = filter_market_data(
        df,
        state=state or "All",
        city=city or "All",
        min_beds=min_beds or 0,
        min_baths=min_baths or 0,
        min_sqft=min_sqft or 0,
        max_sqft=max_sqft,
    )

    return {
        "matching_count": int(len(filtered)),
        "average_price": _safe_float(filtered["Price"].mean()) if not filtered.empty else 0.0,
        "median_price": _safe_float(filtered["Price"].median()) if not filtered.empty else 0.0,
        "average_price_per_sqft": _safe_float(filtered["Price Per Sqft"].mean()) if not filtered.empty else 0.0,
        "price_distribution": _price_distribution(filtered) if not filtered.empty else [],
        "price_vs_living_space": _scatter_points(filtered),
        "city_averages": _city_averages(filtered),
        "aspus_trend": _aspus_trend(),
    }


def get_prediction_defaults(state: str, city: str, county: str | None = None) -> dict:
    df = get_housing_data()
    selected = df[(df["State"] == state) & (df["City"] == city)].copy()
    source = "selected city medians"

    if selected.empty:
        selected = df[df["State"] == state].copy()
        source = "selected state medians"

    if selected.empty:
        selected = df.copy()
        source = "national dataset medians"

    if county:
        resolved_county = county
    else:
        county_mode = selected["County"].dropna().mode()
        resolved_county = str(county_mode.iloc[0]) if not county_mode.empty else "Unknown"

    return {
        "county": resolved_county,
        "zip_population": _safe_float(selected["Zip Code Population"].median()),
        "zip_density": _safe_float(selected["Zip Code Density"].median()),
        "median_income": _safe_float(selected["Median Household Income"].median()),
        "latitude": _safe_float(selected["Latitude"].median()),
        "longitude": _safe_float(selected["Longitude"].median()),
        "source": source,
    }

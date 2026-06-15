from __future__ import annotations

from pathlib import Path
import numpy as np
import pandas as pd

REQUIRED_HOUSING_COLUMNS = [
    "Zip Code", "Price", "Beds", "Baths", "Living Space", "Address", "City", "State",
    "Zip Code Population", "Zip Code Density", "County", "Median Household Income",
    "Latitude", "Longitude",
]


def load_housing_data(path: str | Path) -> pd.DataFrame:
    """Load the American housing CSV and normalize column types."""
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Housing dataset not found: {path}")

    df = pd.read_csv(path)
    missing = [col for col in REQUIRED_HOUSING_COLUMNS if col not in df.columns]
    if missing:
        raise ValueError(f"Housing dataset is missing columns: {missing}")

    # Keep only columns needed for the R&D demo.
    df = df[REQUIRED_HOUSING_COLUMNS].copy()

    numeric_cols = [
        "Zip Code", "Price", "Beds", "Baths", "Living Space", "Zip Code Population",
        "Zip Code Density", "Median Household Income", "Latitude", "Longitude",
    ]
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    text_cols = ["Address", "City", "State", "County"]
    for col in text_cols:
        df[col] = df[col].astype(str).str.strip()

    return df


def clean_housing_data(df: pd.DataFrame) -> pd.DataFrame:
    """Clean records for dashboarding and regression modeling."""
    clean = df.copy()

    required = ["Price", "Beds", "Baths", "Living Space", "City", "State", "County"]
    clean = clean.dropna(subset=required)

    # Remove impossible or extremely suspicious values before percentile capping.
    clean = clean[
        (clean["Price"] > 10_000)
        & (clean["Beds"] > 0)
        & (clean["Baths"] > 0)
        & (clean["Living Space"] > 100)
    ].copy()

    # Reduce duplicate listing rows while keeping a reproducible dataset.
    clean = clean.drop_duplicates(subset=["Address", "City", "State", "Price", "Beds", "Baths", "Living Space"])

    # Cap major outliers using percentiles so charts and models are less distorted.
    for col in ["Price", "Living Space", "Zip Code Population", "Zip Code Density", "Median Household Income"]:
        if col in clean.columns:
            low = clean[col].quantile(0.01)
            high = clean[col].quantile(0.99)
            clean[col] = clean[col].clip(low, high)

    return add_features(clean)


def add_features(df: pd.DataFrame) -> pd.DataFrame:
    """Create non-leaking features for modeling and useful calculated fields for the UI."""
    featured = df.copy()

    featured["Price Per Sqft"] = featured["Price"] / featured["Living Space"].replace(0, np.nan)
    featured["Bed Bath Ratio"] = featured["Beds"] / featured["Baths"].replace(0, 1)
    featured["Income Density Ratio"] = featured["Median Household Income"] / featured["Zip Code Density"].replace(0, np.nan)
    featured["Log Living Space"] = np.log1p(featured["Living Space"])

    # Fill engineered numerical gaps caused by divide-by-zero or missing supplemental fields.
    engineered_cols = ["Price Per Sqft", "Bed Bath Ratio", "Income Density Ratio", "Log Living Space"]
    for col in engineered_cols:
        featured[col] = featured[col].replace([np.inf, -np.inf], np.nan)
        featured[col] = featured[col].fillna(featured[col].median())

    return featured


def load_aspus_data(path: str | Path) -> pd.DataFrame:
    """Load national average sales price trend data from FRED ASPUS CSV."""
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"ASPUS dataset not found: {path}")

    df = pd.read_csv(path)
    df["observation_date"] = pd.to_datetime(df["observation_date"], errors="coerce")
    df["ASPUS"] = pd.to_numeric(df["ASPUS"], errors="coerce")
    return df.dropna(subset=["observation_date", "ASPUS"]).sort_values("observation_date")


def filter_market_data(
    df: pd.DataFrame,
    state: str = "All",
    city: str = "All",
    min_beds: int = 0,
    min_baths: int = 0,
    min_sqft: int = 0,
    max_sqft: int | None = None,
) -> pd.DataFrame:
    """Filter the cleaned housing dataset based on user controls."""
    result = df.copy()
    if state != "All":
        result = result[result["State"] == state]
    if city != "All":
        result = result[result["City"] == city]

    result = result[(result["Beds"] >= min_beds) & (result["Baths"] >= min_baths)]
    result = result[result["Living Space"] >= min_sqft]
    if max_sqft is not None:
        result = result[result["Living Space"] <= max_sqft]

    return result

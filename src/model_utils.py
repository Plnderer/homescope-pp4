from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

MODEL_FEATURES = [
    "Beds", "Baths", "Living Space", "Zip Code Population", "Zip Code Density",
    "Median Household Income", "Latitude", "Longitude", "Bed Bath Ratio",
    "Income Density Ratio", "Log Living Space", "City", "State", "County",
]
TARGET = "Price"


def _make_one_hot_encoder() -> OneHotEncoder:
    """Support both newer and older scikit-learn versions."""
    try:
        return OneHotEncoder(handle_unknown="ignore", sparse_output=False, max_categories=40)
    except TypeError:
        return OneHotEncoder(handle_unknown="ignore", sparse=False)


def build_preprocessor() -> ColumnTransformer:
    numeric_features = [
        "Beds", "Baths", "Living Space", "Zip Code Population", "Zip Code Density",
        "Median Household Income", "Latitude", "Longitude", "Bed Bath Ratio",
        "Income Density Ratio", "Log Living Space",
    ]
    categorical_features = ["City", "State", "County"]

    numeric_pipe = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    categorical_pipe = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", _make_one_hot_encoder()),
        ]
    )

    return ColumnTransformer(
        transformers=[
            ("num", numeric_pipe, numeric_features),
            ("cat", categorical_pipe, categorical_features),
        ]
    )


def train_models(df: pd.DataFrame, sample_size: int = 8000, random_state: int = 42) -> dict:
    """Train baseline and tree-based models for the HomeScope R&D demo."""
    model_df = df.dropna(subset=MODEL_FEATURES + [TARGET]).copy()

    # Keep the demo responsive while still using enough data to prove the pipeline.
    if len(model_df) > sample_size:
        model_df = model_df.sample(sample_size, random_state=random_state)

    X = model_df[MODEL_FEATURES]
    y = model_df[TARGET]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=random_state
    )

    models = {
        "Linear Regression": LinearRegression(),
        "Random Forest Regressor": RandomForestRegressor(
            n_estimators=60,
            max_depth=14,
            random_state=random_state,
            n_jobs=-1,
        ),
    }

    results = {}
    for name, estimator in models.items():
        pipeline = Pipeline(
            steps=[
                ("preprocessor", build_preprocessor()),
                ("model", estimator),
            ]
        )
        pipeline.fit(X_train, y_train)
        predictions = pipeline.predict(X_test)

        mse = mean_squared_error(y_test, predictions)
        results[name] = {
            "pipeline": pipeline,
            "MAE": mean_absolute_error(y_test, predictions),
            "RMSE": float(np.sqrt(mse)),
            "R2": r2_score(y_test, predictions),
            "y_test": y_test.reset_index(drop=True),
            "predictions": pd.Series(predictions).reset_index(drop=True),
        }

    best_model_name = min(results, key=lambda key: results[key]["MAE"])
    return {
        "results": results,
        "best_model_name": best_model_name,
        "best_pipeline": results[best_model_name]["pipeline"],
        "feature_columns": MODEL_FEATURES,
    }


def make_prediction_input(
    beds: int,
    baths: int,
    living_space: int,
    city: str,
    state: str,
    county: str,
    zip_population: float,
    zip_density: float,
    median_income: float,
    latitude: float,
    longitude: float,
) -> pd.DataFrame:
    """Create a one-row DataFrame matching MODEL_FEATURES."""
    bed_bath_ratio = beds / baths if baths else beds
    income_density_ratio = median_income / zip_density if zip_density else median_income
    log_living_space = np.log1p(living_space)

    row = {
        "Beds": beds,
        "Baths": baths,
        "Living Space": living_space,
        "Zip Code Population": zip_population,
        "Zip Code Density": zip_density,
        "Median Household Income": median_income,
        "Latitude": latitude,
        "Longitude": longitude,
        "Bed Bath Ratio": bed_bath_ratio,
        "Income Density Ratio": income_density_ratio,
        "Log Living Space": log_living_space,
        "City": city,
        "State": state,
        "County": county,
    }
    return pd.DataFrame([row], columns=MODEL_FEATURES)


def classify_listing(listing_price: float, predicted_price: float) -> str:
    """Return a simple market label based on listing price vs. model estimate."""
    if predicted_price <= 0:
        return "Not enough data"

    diff_pct = (listing_price - predicted_price) / predicted_price
    if diff_pct <= -0.10:
        return "Below average / possible value"
    if -0.10 < diff_pct <= 0.10:
        return "Near average / fair range"
    if 0.10 < diff_pct <= 0.25:
        return "Above average"
    return "High risk overpriced"

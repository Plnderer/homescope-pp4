# HomeScope Backend

This folder contains the FastAPI backend for HomeScope. It loads the cleaned housing data, serves market summaries, exposes model evidence, and powers the fair-value prediction workflow used by the React app.

## Run the API

From the project root:

```bash
uvicorn backend.main:app --reload --port 8000
```

The API base URL is:

```text
http://localhost:8000/api
```

## Data and Model Files

The backend reads:

- `data/American_Housing_Data_20231209.csv`
- `data/ASPUS.csv`
- `models/homescope_model.joblib`
- `models/homescope_metadata.json`

Housing records are loaded, cleaned, and filtered through `src/data_utils.py`. Model training and prediction helpers live in `src/model_utils.py`.

If the saved model files exist, the backend loads them at runtime. If the artifact is missing, the backend can train a model in memory so the API still works during local development. It does not retrain on every request.

To create or refresh the saved model files:

```bash
python scripts/train_model.py
```

## Endpoints

### `GET /api/health`

Returns a small service check:

```json
{
  "status": "ok",
  "service": "homescope-backend"
}
```

### `GET /api/summary`

Returns the dataset summary used by the Overview page, including record count, state count, city count, average price, median price, and average price per square foot.

### `GET /api/filters`

Returns state and city options for the frontend filters.

Optional query parameter:

- `state`

When `state` is provided, city options are limited to that state. When it is missing or set to `All`, city options come from the full cleaned dataset.

### `GET /api/market`

Returns market-level values and chart data for the selected filters:

- matching listing count
- average price
- median price
- average price per square foot
- price distribution
- price vs. living space sample points
- top city averages
- ASPUS national trend context

Supported query parameters:

- `state`
- `city`
- `min_beds`
- `min_baths`
- `min_sqft`
- `max_sqft`

### `GET /api/models`

Returns the model evidence shown on the Model page:

- model comparison metrics for MAE, RMSE, and R2
- selected model name and why it was selected
- feature columns
- feature importance when available
- residual sample points
- error by price range
- close, too-high, and too-low prediction examples
- training detail such as rows trained, features used, training date, and best MAE
- limitation notes

### `POST /api/predict`

Accepts a sample listing and returns a model-backed fair-value estimate.

Example body:

```json
{
  "state": "New York",
  "city": "New York",
  "beds": 3,
  "baths": 2,
  "living_space": 1800,
  "listing_price": 725000
}
```

The backend fills hidden model fields from medians for the selected market, including county, ZIP population, ZIP density, median income, latitude, and longitude.

The response includes:

- predicted fair value
- fair-value range based on model MAE
- listing price
- dollar and percent difference
- comparison signal
- plain-language result explanation
- selected model name
- model error context
- market assumptions used for hidden fields
- limitation notes

## Development Checks

From the project root:

```bash
python -m compileall -q src backend scripts tests
python -m pytest tests -q
```

Run the smoke check while the backend is running:

```bash
python scripts/smoke_check.py
```

## Prediction Note

HomeScope predictions are model-backed estimates for research and comparison. They are not appraisals and should not be used as real financial advice.

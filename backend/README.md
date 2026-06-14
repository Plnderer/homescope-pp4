# HomeScope Backend

This folder contains the FastAPI backend for HomeScope. The backend exposes the cleaned housing data, market summaries, model evidence, and prediction workflow used by the React frontend.

## Run the API

From the project root:

```bash
uvicorn backend.main:app --reload --port 8000
```

The API base URL is:

```text
http://localhost:8000/api
```

## Data Sources

The backend loads:

- `data/American_Housing_Data_20231209.csv`
- `data/ASPUS.csv`

Housing records are cleaned through `src/data_utils.py`. Model training and prediction helpers come from `src/model_utils.py`.

## Model Artifact Behavior

The backend looks for:

- `models/homescope_model.joblib`
- `models/homescope_metadata.json`

If both files exist, the backend loads the saved model artifact and metadata. If either file is missing, it trains a model once in memory as a fallback. It does not retrain on every request.

To create or refresh the saved model files:

```bash
python scripts/train_model.py
```

## Endpoints

### `GET /api/health`

Returns a simple service check:

```json
{
  "status": "ok",
  "service": "homescope-backend"
}
```

### `GET /api/summary`

Returns high-level dataset values for the Overview page, including record count, states, cities, average price, median price, and price per square foot.

### `GET /api/filters`

Returns state and city options for frontend filters.

If a state is provided, cities are filtered to that state. If the state is missing or `All`, cities come from the full cleaned dataset.

### `GET /api/market`

Returns market-level values for the selected filters:

- matching listing count
- average price
- median price
- average price per square foot
- price histogram data
- price vs. living space sample points
- top city averages
- ASPUS trend context

Supported query parameters:

- `state`
- `city`
- `min_beds`
- `min_baths`
- `min_sqft`
- `max_sqft`

### `GET /api/models`

Returns model evidence for the Model page:

- Linear Regression metrics
- Random Forest metrics
- selected best model
- residual sample points
- feature columns
- saved artifact metadata when available
- limitation notes

### `POST /api/predict`

Accepts a sample listing and returns a model-backed fair-value estimate.

Example body:

```json
{
  "state": "New York",
  "city": "New York",
  "county": "",
  "beds": 3,
  "baths": 2,
  "living_space": 1800,
  "listing_price": 725000
}
```

The backend fills hidden model fields from medians for the selected market. If county is missing, it uses the most common county for that market.

The response includes:

- predicted fair value
- listing price
- dollar difference
- percent difference
- selected model name
- market label
- assumptions used
- limitation notes

## Development Checks

From the project root:

```bash
python -m compileall -q src backend scripts tests
python scripts/train_model.py
python -m pytest tests -q
```

Run `scripts/smoke_check.py` while the backend is running to check the main API endpoints.

## Important Note

HomeScope predictions are model estimates for a portfolio project. They are not appraisals and should not be used for real financial decisions.

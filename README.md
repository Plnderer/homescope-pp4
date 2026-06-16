# HomeScope

HomeScope is a housing intelligence app for exploring market context, reviewing model evidence, and estimating a listing's fair value. The project uses a Python data and modeling pipeline, a FastAPI backend, and a React/Vite frontend.

The main flow is simple: look at the market, review how the model performs, then compare a sample listing against the selected model.

## What It Does

- Loads and cleans U.S. housing records from the project data files.
- Shows market summaries by state, city, bedrooms, bathrooms, and living space.
- Compares average price, median price, price per square foot, price distribution, city averages, and national ASPUS trend context.
- Trains Linear Regression, Random Forest, and Gradient Boosting models.
- Selects the best model by MAE and saves the model artifact for repeatable predictions.
- Shows model evidence, including MAE, RMSE, R2, residuals, feature importance, error by price range, and prediction examples.
- Predicts a fair-value estimate for a sample listing and explains the result, fair-value range, assumptions, and limitations.

## Project Structure

```text
app/
  homescope_app.py          Legacy Streamlit app for quick local exploration
backend/
  main.py                   FastAPI app and API routes
  schemas.py                Request and response models
  services/                 Data and model service layer
data/
  American_Housing_Data_20231209.csv
  ASPUS.csv
frontend/
  src/                      React/Vite frontend
models/
  homescope_model.joblib    Saved selected model artifact
  homescope_metadata.json   Training metadata, metrics, and model notes
scripts/
  train_model.py            Trains, compares, and saves the selected model
  smoke_check.py            Lightweight backend endpoint check
src/
  data_utils.py             Data loading, cleaning, filtering, and feature utilities
  model_utils.py            Model training and prediction utilities
tests/
  test_backend_api.py
  test_data_utils.py
  test_smoke_check.py
```

## Setup

Create and activate a Python environment, then install the backend and modeling dependencies:

```bash
pip install -r requirements.txt
```

Install frontend dependencies from the frontend folder:

```bash
cd frontend
npm install
```

If you are working in WSL, install and run frontend dependencies from the same environment you plan to use for `npm run dev` and `npm run build`. Mixing Windows and WSL Node packages can cause native dependency errors.

## Train the Model

From the project root:

```bash
python scripts/train_model.py
```

This creates or refreshes:

- `models/homescope_model.joblib`
- `models/homescope_metadata.json`

The metadata file stores the selected model, comparison metrics, training time, feature columns, feature importance when available, residual samples, row count, and limitation notes.

## Run the Backend

From the project root:

```bash
uvicorn backend.main:app --reload --port 8000
```

The API is available at:

```text
http://localhost:8000/api
```

## Run the Frontend

In another terminal:

```bash
cd frontend
npm run dev
```

Vite usually serves the app at:

```text
http://localhost:5173
```

The frontend uses `VITE_API_BASE_URL` when it is set. Otherwise, it defaults to:

```text
http://127.0.0.1:8000/api
```

## API Overview

- `GET /api/health` checks that the backend is running.
- `GET /api/summary` returns high-level dataset values for the Overview page.
- `GET /api/filters` returns state and city filter options.
- `GET /api/market` returns market summaries and chart data for the selected filters.
- `GET /api/models` returns model comparison, selected model details, residuals, feature importance, and error context.
- `POST /api/predict` returns a fair-value estimate, comparison signal, model error context, assumptions, and limitation notes.

## Quality Checks

Run these checks before handing off changes:

```bash
python -m compileall -q src backend scripts tests
python -m pytest tests -q
```

Refresh the saved model when model features or training behavior change:

```bash
python scripts/train_model.py
```

Build the frontend from the frontend folder:

```bash
cd frontend
npm run build
```

For a full manual check, run the backend and frontend together, then click through Overview, Market, Model, and Predict.

## Prediction Note

HomeScope provides model-backed research estimates, not appraisals. Local conditions, outliers, data quality, and missing property details can all affect prediction accuracy.

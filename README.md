# HomeScope

HomeScope is a housing price analytics app built for Project & Portfolio IV. It started as a Streamlit proof of concept and now includes a FastAPI backend, saved model workflow, and a redesigned React/Vite frontend.

The app helps a user move through a simple question: what does the market say about this listing before I trust a model estimate?

## What the App Does

- Loads and cleans U.S. housing records from the project data files.
- Shows market summaries by state, city, bedrooms, bathrooms, and living space.
- Compares average price, median price, price per square foot, price distribution, city averages, and national ASPUS trend context.
- Trains and evaluates Linear Regression and Random Forest models.
- Saves the best model artifact and metadata for repeatable backend predictions.
- Predicts a fair-value estimate for a sample listing and explains the assumptions used.
- Presents the React app as a portfolio-ready product experience with a landing-style overview, interactive charts, and cleaner page flows.

## Project Structure

```text
app/
  homescope_app.py          Streamlit proof of concept from Iteration 1
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
  homescope_model.joblib    Saved best model artifact
  homescope_metadata.json   Training metadata and model notes
scripts/
  train_model.py            Trains and saves the best model
  smoke_check.py            Lightweight backend endpoint check
src/
  data_utils.py             Data loading and cleaning utilities
  model_utils.py            Model training and prediction utilities
tests/
  test_smoke_check.py
```

## Iterations

### Iteration 1: Streamlit Proof of Concept

The original app lives in `app/homescope_app.py`. It uses the Python utilities in `src/` to explore the data and model workflow quickly. This version is still kept in the repo as the proof-of-concept baseline.

Run it with:

```bash
streamlit run app/homescope_app.py
```

### Iteration 2: FastAPI Backend and React Integration

The second iteration added a real backend and connected the React frontend to live data instead of static JavaScript fixtures.

Backend highlights:

- `GET /api/health`
- `GET /api/summary`
- `GET /api/filters`
- `GET /api/market`
- `GET /api/models`
- `POST /api/predict`

The backend reuses `src/data_utils.py` and `src/model_utils.py`, loads the housing and ASPUS data, caches cleaned data/model state in memory, and falls back to in-memory training if a saved artifact is missing.

### Iteration 3: Product UI and UX Revamp

The third iteration focused on making the React app feel more like a polished product:

- New app shell and navigation.
- Landing-style Overview page with hero content and a product preview.
- Redesigned Market, Model, and Predict workflows.
- Cleaner metric cards, panels, forms, and responsive layouts.
- Interactive chart hover states for bars, line charts, scatter plots, and residual plots.
- Better error and loading states when the backend is offline.

## Setup

Create and activate your Python environment, then install the Python dependencies:

```bash
pip install -r requirements.txt
```

Install frontend dependencies from the frontend folder:

```bash
cd frontend
npm install
```

If you are using WSL, install and run frontend dependencies from the WSL terminal so native Linux packages are used.

## Train the Saved Model

Run:

```bash
python scripts/train_model.py
```

This creates:

- `models/homescope_model.joblib`
- `models/homescope_metadata.json`

The metadata file stores the selected model name, metrics, training time, feature columns, assumptions, row count, and limitation notes.

## Run the Backend

From the project root:

```bash
uvicorn backend.main:app --reload --port 8000
```

The API will be available at:

```text
http://localhost:8000/api
```

## Run the Frontend

In another terminal:

```bash
cd frontend
npm run dev
```

Vite will start the React app, usually at:

```text
http://localhost:5173
```

The frontend uses `VITE_API_BASE_URL` when provided. If it is not set, it defaults to the local FastAPI backend.

## Checks Before Committing

Use these checks after changing backend or frontend code:

```bash
python -m compileall -q src backend scripts tests
python scripts/train_model.py
python -m pytest tests -q
```

For the frontend:

```bash
cd frontend
npm run build
```

Then run the app and click through Overview, Market, Model, and Predict with the backend running.

## Notes

HomeScope is a research and portfolio project. The model estimate is not a real appraisal. Local conditions, outliers, data quality, and missing location detail can all affect prediction accuracy.

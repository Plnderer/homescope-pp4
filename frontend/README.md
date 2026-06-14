# HomeScope Frontend

This is the React/Vite interface for HomeScope. It calls the FastAPI backend for live housing summaries, market filters, model evidence, and fair-value predictions.

## What Changed in Phase 3

The frontend was redesigned to feel more like a finished product instead of a static dashboard:

- Landing-style Overview page with hero content, product preview, and clear calls to action.
- Sidebar app shell for the analytical pages.
- Redesigned Market, Model, and Predict pages.
- Cleaner metric cards, panels, forms, and responsive layouts.
- Interactive chart hover states for bars, line charts, scatter plots, and residual plots.
- Friendly loading and error states when the backend is offline.

## Run Locally

Install dependencies:

```bash
npm install
```

Start Vite:

```bash
npm run dev
```

The app usually runs at:

```text
http://localhost:5173
```

## API Configuration

The frontend uses:

```text
VITE_API_BASE_URL
```

If the variable is not set, the app defaults to:

```text
http://127.0.0.1:8000/api
```

For local development, start the backend first:

```bash
uvicorn backend.main:app --reload --port 8000
```

Then start the frontend from this folder:

```bash
npm run dev
```

## Page to Endpoint Mapping

- Overview calls `GET /api/summary`
- Market calls `GET /api/filters` and `GET /api/market`
- Model calls `GET /api/models`
- Predict calls `GET /api/filters` and `POST /api/predict`

## WSL Note

If you are running the project in WSL, run `npm install`, `npm run build`, and `npm run dev` from the WSL terminal. Mixing Windows-installed Node packages with WSL can cause platform-specific dependency errors.

## Build Check

Before committing frontend changes:

```bash
npm run build
```

Then open the app and check:

- Overview hero and metric strip render cleanly.
- Market filters update charts.
- Model page shows metrics and residuals.
- Predict form returns a result when the backend is running.
- Charts respond to hover or focus.

# HomeScope Frontend

This folder contains the React/Vite interface for HomeScope. The frontend calls the FastAPI backend for live housing summaries, market filters, model evidence, and fair-value predictions.

## Product Flow

HomeScope is organized around four main pages:

- **Overview** introduces the product and shows high-level housing dataset metrics.
- **Market** lets users filter the cleaned housing records and compare market averages, distribution, city averages, living-space relationships, and national trend context.
- **Model** presents the selected model as evidence, including model comparisons, residuals, feature importance, error by price range, and example predictions.
- **Predict** compares a sample listing against the selected model and returns a fair-value estimate, range, signal, assumptions, and limitation notes.

## Run Locally

Install dependencies from this folder:

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

For local development, start the backend from the project root first:

```bash
uvicorn backend.main:app --reload --port 8000
```

## API Configuration

The frontend uses this environment variable when it is available:

```text
VITE_API_BASE_URL
```

If it is not set, the app defaults to:

```text
http://127.0.0.1:8000/api
```

## Page to Endpoint Mapping

- Overview calls `GET /api/summary`
- Market calls `GET /api/filters` and `GET /api/market`
- Model calls `GET /api/models`
- Predict calls `GET /api/filters` and `POST /api/predict`

## Build Check

Before handing off frontend changes:

```bash
npm run build
```

Then run the app with the backend active and check:

- Overview metrics load from the backend.
- Market filters update the metric cards and charts.
- Model shows comparison metrics, selected model details, residuals, and feature importance.
- Predict returns a fair-value result with a range, signal, assumptions, and model context.
- Empty, loading, and backend-offline states are readable.
- Desktop and mobile layouts do not overlap or waste large blocks of space.

## WSL Note

If you are running the project in WSL, use the same environment for `npm install`, `npm run dev`, and `npm run build`. Mixing Windows-installed Node packages with WSL can cause platform-specific dependency errors.

# HomeScope FastAPI Backend

The backend exposes the HomeScope Python data and model workflow to the React/Vite frontend.

## Run

From the repository root:

```bash
uvicorn backend.main:app --reload --port 8000
```

The React frontend can call the API through the Vite `/api` proxy or through `VITE_API_BASE_URL`.

## Endpoints

- `GET /api/health` returns backend status.
- `GET /api/summary` returns dataset counts and headline price metrics.
- `GET /api/filters?state=New York` returns available states and cities.
- `GET /api/market` returns filtered market metrics, distribution data, scatter samples, city averages, and ASPUS trend context.
- `GET /api/models` returns model comparison metrics, selected model, residual samples, metadata, and limitation notes.
- `POST /api/predict` returns a model estimate, listing comparison, market label, assumptions, and limitation notes.

## Model Artifacts

Run the training script to create saved artifacts:

```bash
python scripts/train_model.py
```

The script writes:

- `models/homescope_model.joblib`
- `models/homescope_metadata.json`

When the artifact exists, the backend loads it instead of retraining. If it is missing, the backend trains once in memory and caches the result for the process lifetime.

## Prediction Assumptions

The user provides state, city, optional county, beds, baths, living space, and listing price. The backend fills hidden demographic and location fields from the selected city medians. If a city has no records, it falls back to state medians, then national medians.

This is a research estimate, not a real appraisal. Outliers and local location effects can increase error, and ASPUS is national trend context rather than a listing-level prediction input.

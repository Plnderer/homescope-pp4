# HomeScope React Frontend

The React/Vite frontend is the product-style interface for HomeScope Iteration 2. It calls the FastAPI backend for live market data, model metrics, and predictions.

## Run

```bash
cd frontend
npm install
npm run dev
```

The default Vite dev server is `http://localhost:5173`.

## API Base URL

For local development, Vite proxies `/api` to `http://localhost:8000`.

To call the backend directly, create a local `.env` file:

```bash
VITE_API_BASE_URL=http://localhost:8000/api
```

## Page Data

- Overview calls `GET /api/summary`.
- Market calls `GET /api/filters` and `GET /api/market`.
- Model calls `GET /api/models`.
- Predict calls `GET /api/filters` and `POST /api/predict`.

If the backend is down, pages show a focused error message instead of crashing.

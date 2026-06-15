from __future__ import annotations

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from backend.schemas import PredictionRequest, PredictionResponse
from backend.services import data_service, model_service


app = FastAPI(title="HomeScope API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "service": "homescope-backend"}


@app.get("/api/summary")
def summary() -> dict:
    return data_service.get_summary()


@app.get("/api/filters")
def filters(state: str | None = Query(default=None)) -> dict:
    return data_service.get_filters(state)


@app.get("/api/market")
def market(
    state: str | None = Query(default="All"),
    city: str | None = Query(default="All"),
    min_beds: int = Query(default=0, ge=0),
    min_baths: int = Query(default=0, ge=0),
    min_sqft: int = Query(default=0, ge=0),
    max_sqft: int | None = Query(default=None, ge=0),
) -> dict:
    return data_service.get_market(
        state=state,
        city=city,
        min_beds=min_beds,
        min_baths=min_baths,
        min_sqft=min_sqft,
        max_sqft=max_sqft,
    )


@app.get("/api/models")
def models() -> dict:
    return model_service.get_model_payload()


@app.post("/api/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest) -> dict:
    defaults = data_service.get_prediction_defaults(
        state=request.state,
        city=request.city,
        county=request.county,
    )
    return model_service.predict_price(
        state=request.state,
        city=request.city,
        county=defaults["county"],
        beds=request.beds,
        baths=request.baths,
        living_space=request.living_space,
        listing_price=request.listing_price,
        defaults=defaults,
    )

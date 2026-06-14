from __future__ import annotations

from pydantic import BaseModel, Field


class PredictionRequest(BaseModel):
    state: str
    city: str
    county: str | None = None
    beds: int = Field(ge=0)
    baths: int = Field(ge=0)
    living_space: int = Field(gt=0)
    listing_price: float = Field(gt=0)


class PredictionAssumptions(BaseModel):
    county: str
    zip_population: float
    zip_density: float
    median_income: float
    latitude: float
    longitude: float
    source: str


class PredictionResponse(BaseModel):
    predicted_fair_value: float
    listing_price: float
    difference: float
    percent_difference: float
    selected_model_name: str
    market_label: str
    assumptions: PredictionAssumptions
    limitations: list[str]

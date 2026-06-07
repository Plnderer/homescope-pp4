from __future__ import annotations

from pathlib import Path
import sys

import pandas as pd
import plotly.express as px
import streamlit as st

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.append(str(SRC))

from data_utils import clean_housing_data, filter_market_data, load_aspus_data, load_housing_data
from model_utils import classify_listing, make_prediction_input, train_models

HOUSING_PATH = ROOT / "data" / "American_Housing_Data_20231209.csv"
ASPUS_PATH = ROOT / "data" / "ASPUS.csv"

st.set_page_config(page_title="HomeScope R&D Demo", page_icon="🏠", layout="wide")


@st.cache_data(show_spinner="Loading and cleaning housing dataset...")
def get_clean_housing_data() -> pd.DataFrame:
    raw = load_housing_data(HOUSING_PATH)
    return clean_housing_data(raw)


@st.cache_data(show_spinner="Loading national ASPUS trend data...")
def get_aspus_data() -> pd.DataFrame:
    return load_aspus_data(ASPUS_PATH)


@st.cache_resource(show_spinner="Training baseline and tree-based models...")
def get_trained_models(clean_df: pd.DataFrame) -> dict:
    return train_models(clean_df)


def dollars(value: float) -> str:
    return f"${value:,.0f}"


st.title("HomeScope: AI-Powered American House Price Dashboard")
st.caption(
    "Assignment 2 R&D demonstrator: dataset loading, cleaning, filtering, charts, model training, "
    "model comparison, and user-driven price prediction."
)

try:
    housing_df = get_clean_housing_data()
except Exception as exc:
    st.error(f"Could not load the housing dataset. Check the data folder. Error: {exc}")
    st.stop()

with st.sidebar:
    st.header("Market Filters")
    states = ["All"] + sorted(housing_df["State"].dropna().unique().tolist())
    selected_state = st.selectbox("State", states)

    city_options_df = housing_df if selected_state == "All" else housing_df[housing_df["State"] == selected_state]
    cities = ["All"] + sorted(city_options_df["City"].dropna().unique().tolist())
    selected_city = st.selectbox("City", cities)

    min_beds = st.slider("Minimum beds", 0, 8, 1)
    min_baths = st.slider("Minimum baths", 0, 8, 1)
    min_sqft = st.number_input("Minimum living space", min_value=0, value=500, step=100)
    max_sqft = st.number_input("Maximum living space", min_value=500, value=6000, step=250)

filtered_df = filter_market_data(
    housing_df,
    state=selected_state,
    city=selected_city,
    min_beds=min_beds,
    min_baths=min_baths,
    min_sqft=int(min_sqft),
    max_sqft=int(max_sqft),
)

st.subheader("1. Market Snapshot")
if filtered_df.empty:
    st.warning("No records match the current filters. Loosen the filters to continue.")
    st.stop()

col1, col2, col3, col4 = st.columns(4)
col1.metric("Matching Listings", f"{len(filtered_df):,}")
col2.metric("Average Price", dollars(filtered_df["Price"].mean()))
col3.metric("Median Price", dollars(filtered_df["Price"].median()))
col4.metric("Avg Price / Sqft", dollars(filtered_df["Price Per Sqft"].mean()))

chart_col1, chart_col2 = st.columns(2)
with chart_col1:
    fig = px.histogram(
        filtered_df,
        x="Price",
        nbins=40,
        title="Price Distribution",
        labels={"Price": "Home Price"},
    )
    st.plotly_chart(fig, use_container_width=True)

with chart_col2:
    sample_scatter = filtered_df.sample(min(len(filtered_df), 2500), random_state=42)
    fig = px.scatter(
        sample_scatter,
        x="Living Space",
        y="Price",
        hover_data=["City", "State", "Beds", "Baths"],
        title="Price vs. Living Space",
        labels={"Living Space": "Living Space (sqft)", "Price": "Home Price"},
    )
    st.plotly_chart(fig, use_container_width=True)

st.subheader("2. City and National Trend Context")
city_avg = (
    filtered_df.groupby(["State", "City"], as_index=False)
    .agg(avg_price=("Price", "mean"), median_price=("Price", "median"), listings=("Price", "count"))
    .sort_values("avg_price", ascending=False)
    .head(15)
)
fig = px.bar(
    city_avg,
    x="City",
    y="avg_price",
    color="State",
    title="Top Average Prices in Current Filter",
    hover_data=["median_price", "listings"],
)
st.plotly_chart(fig, use_container_width=True)

try:
    aspus_df = get_aspus_data()
    fig = px.line(
        aspus_df,
        x="observation_date",
        y="ASPUS",
        title="U.S. Average Sales Price Trend",
        labels={"observation_date": "Date", "ASPUS": "Average Sales Price"},
    )
    st.plotly_chart(fig, use_container_width=True)
except Exception as exc:
    st.info(f"ASPUS trend chart skipped: {exc}")

st.subheader("3. Model Training and Evaluation")
model_bundle = get_trained_models(housing_df)
results = model_bundle["results"]

metrics_rows = []
for name, result in results.items():
    metrics_rows.append(
        {
            "Model": name,
            "MAE": result["MAE"],
            "RMSE": result["RMSE"],
            "R²": result["R2"],
        }
    )
metrics_df = pd.DataFrame(metrics_rows)
st.dataframe(
    metrics_df.style.format({"MAE": "${:,.0f}", "RMSE": "${:,.0f}", "R²": "{:.3f}"}),
    use_container_width=True,
)
st.success(f"Best model by MAE: {model_bundle['best_model_name']}")
st.info(
    "The model comparison shows which approach has the lowest average prediction error. "
    "For this run, the best model is selected by MAE because MAE is easier to explain as average dollar error."
)

best_result = results[model_bundle["best_model_name"]]
error_df = pd.DataFrame(
    {
        "Actual Price": best_result["y_test"],
        "Predicted Price": best_result["predictions"],
    }
)
error_df["Residual"] = error_df["Actual Price"] - error_df["Predicted Price"]

fig = px.scatter(
    error_df.sample(min(len(error_df), 1200), random_state=42),
    x="Predicted Price",
    y="Residual",
    title="Residual Plot for Best Model",
)
st.plotly_chart(fig, use_container_width=True)

st.subheader("4. User-Driven Price Prediction")
st.write("Enter a sample property and compare a listing price against the trained model estimate.")

form_col1, form_col2, form_col3 = st.columns(3)
with form_col1:
    pred_state = st.selectbox("Prediction State", sorted(housing_df["State"].unique()))
    pred_city_options = sorted(housing_df[housing_df["State"] == pred_state]["City"].unique())
    pred_city = st.selectbox("Prediction City", pred_city_options)

    location_rows = housing_df[(housing_df["State"] == pred_state) & (housing_df["City"] == pred_city)]
    county_options = sorted(location_rows["County"].dropna().unique())
    pred_county = st.selectbox("County", county_options if county_options else ["Unknown"])

with form_col2:
    pred_beds = st.number_input("Beds", min_value=0, max_value=12, value=3, step=1)
    pred_baths = st.number_input("Baths", min_value=0, max_value=12, value=2, step=1)
    pred_sqft = st.number_input("Living Space", min_value=300, max_value=15000, value=1800, step=50)

with form_col3:
    default_listing = int(location_rows["Price"].median()) if not location_rows.empty else 350000
    listing_price = st.number_input("Listing Price to Compare", min_value=10000, value=default_listing, step=5000)

# Use medians from the selected city so the form stays simple and realistic.
zip_population = float(location_rows["Zip Code Population"].median())
zip_density = float(location_rows["Zip Code Density"].median())
median_income = float(location_rows["Median Household Income"].median())
latitude = float(location_rows["Latitude"].median())
longitude = float(location_rows["Longitude"].median())

if st.button("Predict Fair Value"):
    prediction_row = make_prediction_input(
        beds=int(pred_beds),
        baths=int(pred_baths),
        living_space=int(pred_sqft),
        city=pred_city,
        state=pred_state,
        county=pred_county,
        zip_population=zip_population,
        zip_density=zip_density,
        median_income=median_income,
        latitude=latitude,
        longitude=longitude,
    )
    
    predicted_price = float(model_bundle["best_pipeline"].predict(prediction_row)[0])
    label = classify_listing(float(listing_price), predicted_price)

    out1, out2 = st.columns(2)
    out1.metric("Predicted Fair Value", dollars(predicted_price))
    out2.metric("Listing Price", dollars(listing_price))

    st.markdown("### Market Label")
    if "below" in label.lower():
        st.success(label)
    elif "above" in label.lower() or "overpriced" in label.lower():
        st.warning(label)
    else:
        st.info(label)

    compare_df = pd.DataFrame(
        {
            "Category": ["Predicted Fair Value", "Listing Price"],
            "Price": [predicted_price, listing_price],
        }
    )
    fig = px.bar(compare_df, x="Category", y="Price", title="Prediction vs. Listing Price")
    st.plotly_chart(fig, use_container_width=True)

st.divider()
st.caption(
    "R&D scope note: This demo intentionally focuses on meaningful HomeScope interactions: filters, charts, "
    "data cleaning, model comparison, and prediction."
)

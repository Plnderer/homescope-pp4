from __future__ import annotations

import pandas as pd

from src.data_utils import clean_housing_data


def test_clean_housing_data_removes_zero_bed_or_bath_rows():
    raw = pd.DataFrame(
        [
            {
                "Zip Code": 10001,
                "Price": 250000,
                "Beds": 0,
                "Baths": 1,
                "Living Space": 900,
                "Address": "0 Bed Row",
                "City": "New York",
                "State": "New York",
                "Zip Code Population": 10000,
                "Zip Code Density": 12000,
                "County": "New York",
                "Median Household Income": 90000,
                "Latitude": 40.7,
                "Longitude": -73.9,
            },
            {
                "Zip Code": 10001,
                "Price": 260000,
                "Beds": 1,
                "Baths": 0,
                "Living Space": 850,
                "Address": "0 Bath Row",
                "City": "New York",
                "State": "New York",
                "Zip Code Population": 10000,
                "Zip Code Density": 12000,
                "County": "New York",
                "Median Household Income": 90000,
                "Latitude": 40.7,
                "Longitude": -73.9,
            },
            {
                "Zip Code": 10001,
                "Price": 300000,
                "Beds": 2,
                "Baths": 1,
                "Living Space": 1000,
                "Address": "Normal Row",
                "City": "New York",
                "State": "New York",
                "Zip Code Population": 10000,
                "Zip Code Density": 12000,
                "County": "New York",
                "Median Household Income": 90000,
                "Latitude": 40.7,
                "Longitude": -73.9,
            },
        ]
    )

    clean = clean_housing_data(raw)

    assert len(clean) == 1
    assert clean.iloc[0]["Address"] == "Normal Row"
    assert clean["Beds"].min() >= 1
    assert clean["Baths"].min() >= 1

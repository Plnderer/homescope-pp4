# HomeScope R&D Demo

HomeScope is an Assignment 2 research and development demonstrator for an AI-powered American house price dashboard.

## What this demo proves

- Loads real housing data from CSV.
- Cleans missing, duplicate, invalid, and extreme records.
- Creates useful features for analysis and modeling.
- Provides user-driven filters.
- Displays dashboard metrics and Plotly charts.
- Trains two Scikit-learn regression models.
- Compares MAE, RMSE, and R².
- Predicts a fair value from user-entered property details.
- Labels a listing as below average, near average, above average, or high risk overpriced.

## Folder Structure

```text
homescope-rd/
├── app/
│   └── homescope_app.py
├── data/
│   ├── American_Housing_Data_20231209.csv
│   └── ASPUS.csv
├── models/
├── notebooks/
├── reports/
│   ├── feature_lists.md
│   └── technical_rd_document_draft.md
├── src/
│   ├── data_utils.py
│   └── model_utils.py
├── .gitignore
├── README.md
└── requirements.txt
```

## Setup

Activate the virtual environment first.

Windows PowerShell:

```bash
.venv\Scripts\activate
```

Mac/Linux/WSL:

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

## Run the app

```bash
streamlit run app/homescope_app.py
```

## Iteration 2: React + FastAPI Direction

Iteration 1 remains the Streamlit proof-of-concept. It proves local CSV loading, data cleaning, dashboard metrics, charts, model comparison, and prediction workflow.

Iteration 2 starts the migration toward the planned product architecture:

- `frontend/` is the React/Vite product interface.
- `backend/` is the FastAPI service that exposes the Python data and model workflow.
- `src/data_utils.py` and `src/model_utils.py` remain the shared technical foundation.
- `scripts/train_model.py` saves the selected best model to `models/homescope_model.joblib` with metadata in `models/homescope_metadata.json`.

Run the backend:

```bash
uvicorn backend.main:app --reload --port 8000
```

Run the frontend:

```bash
cd frontend
npm install
npm run dev
```

The second iteration connects React pages to real backend endpoints, and saved model artifacts improve consistency by avoiding retraining on every request. Future work can improve model quality, add feature importance, prepare deployment, build a map view, and support saved comparisons.

## Assignment Notes

The app intentionally focuses on meaningful HomeScope interactions. It does not include login screens, settings menus, or dark mode because those do not prove the unique housing dashboard technology chain.



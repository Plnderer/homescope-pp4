import { useState } from "react";
import OverviewPage from "./pages/OverviewPage";
import MarketPage from "./pages/MarketPage";
import ModelPage from "./pages/ModelPage";
import PredictPage from "./pages/PredictPage";
import "./styles.css";

const pages = [
  { id: "overview", label: "Overview" },
  { id: "market", label: "Market" },
  { id: "predict", label: "Predict" },
  { id: "model", label: "Model Evidence" },
];

const pageComponents = {
  overview: OverviewPage,
  market: MarketPage,
  model: ModelPage,
  predict: PredictPage,
};

export default function App() {
  const [activePage, setActivePage] = useState("overview");
  const ActivePage = pageComponents[activePage];

  return (
    <div className="app-shell">
      <header className="site-header">
        <button type="button" className="brand-block" onClick={() => setActivePage("overview")}>
          <img src="/logo.jpg" alt="HomeScope logo" className="brand-image" />
          <span className="brand-copy">
            <strong>HomeScope</strong>
            <small>Market valuation reports</small>
          </span>
        </button>

        <nav className="top-nav" aria-label="Primary navigation">
          {pages.map((page) => (
            <button
              key={page.id}
              type="button"
              className={page.id === activePage ? "active" : ""}
              onClick={() => setActivePage(page.id)}
            >
              {page.label}
            </button>
          ))}
        </nav>

        <button type="button" className="primary-button header-cta" onClick={() => setActivePage("predict")}>
          Generate Valuation Report
        </button>
      </header>

      <main className="workspace-main">
        <ActivePage setActivePage={setActivePage} />
      </main>
    </div>
  );
}

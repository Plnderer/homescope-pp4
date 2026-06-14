import { useState } from "react";
import OverviewPage from "./pages/OverviewPage";
import MarketPage from "./pages/MarketPage";
import ModelPage from "./pages/ModelPage";
import PredictPage from "./pages/PredictPage";
import "./styles.css";

const pages = [
  { id: "overview", label: "Overview", kicker: "Portfolio", title: "HomeScope" },
  { id: "market", label: "Market", kicker: "Explore", title: "Market analysis" },
  { id: "model", label: "Model", kicker: "Evidence", title: "Model review" },
  { id: "predict", label: "Predict", kicker: "Estimate", title: "Fair value" },
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
  const currentPage = pages.find((page) => page.id === activePage);

  return (
    <div className={`app-shell ${activePage === "overview" ? "landing-mode" : ""}`}>
      <aside className="sidebar" aria-label="HomeScope navigation">
        <div className="brand-block">
          <div className="brand-mark">HS</div>
          <div>
            <p>HomeScope</p>
            <span>Housing intelligence</span>
          </div>
        </div>

        <nav className="side-nav">
          {pages.map((page) => (
            <button
              key={page.id}
              type="button"
              className={page.id === activePage ? "active" : ""}
              onClick={() => setActivePage(page.id)}
            >
              <span>{page.kicker}</span>
              {page.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-note">
          <span>Iteration 3</span>
          <p>FastAPI data, saved model artifact, and React interface in one focused demo.</p>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          {activePage === "overview" ? (
            <div className="landing-nav-brand">
              <div className="brand-mark">HS</div>
              <strong>HomeScope</strong>
            </div>
          ) : null}
          <div>
            <span>{currentPage.kicker}</span>
            <h1>{currentPage.title}</h1>
          </div>
          <nav className="mobile-tabs" aria-label="Page tabs">
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
        </header>

        <main className="workspace-main">
          <ActivePage setActivePage={setActivePage} />
        </main>
      </div>
    </div>
  );
}

import { useState } from 'react';
import Header from './components/Header.jsx';
import MarketPage from './pages/MarketPage.jsx';
import ModelPage from './pages/ModelPage.jsx';
import OverviewPage from './pages/OverviewPage.jsx';
import PredictPage from './pages/PredictPage.jsx';

export default function App() {
  const [activePage, setActivePage] = useState('Overview');

  return (
    <div className="app-shell">
      <Header activePage={activePage} onNavigate={setActivePage} />

      {activePage === 'Overview' && <OverviewPage onNavigate={setActivePage} />}
      {activePage === 'Market' && <MarketPage onNavigate={setActivePage} />}
      {activePage === 'Model' && <ModelPage onNavigate={setActivePage} />}
      {activePage === 'Predict' && <PredictPage />}
    </div>
  );
}

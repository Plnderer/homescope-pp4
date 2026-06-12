import { useState } from 'react';
import Header from './components/Header.jsx';
import { marketRecords } from './data/homeScopeData.js';
import MarketPage from './pages/MarketPage.jsx';
import ModelPage from './pages/ModelPage.jsx';
import OverviewPage from './pages/OverviewPage.jsx';
import PredictPage from './pages/PredictPage.jsx';

export default function App() {
  const [activePage, setActivePage] = useState('Overview');

  return (
    <div className="app-shell">
      <Header activePage={activePage} onNavigate={setActivePage} />

      {activePage === 'Overview' && <OverviewPage records={marketRecords} onNavigate={setActivePage} />}
      {activePage === 'Market' && <MarketPage records={marketRecords} onNavigate={setActivePage} />}
      {activePage === 'Model' && <ModelPage onNavigate={setActivePage} />}
      {activePage === 'Predict' && <PredictPage records={marketRecords} />}
    </div>
  );
}


import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import ClanDailyTracking from './components/ClanDailyTracking';
import GroupedPlayersManager from './components/GroupedPlayersManager';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex space-x-8">
                <Link
                  to="/"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-blue-600 border-b-2 border-transparent hover:border-blue-600"
                >
                  Main Tracking
                </Link>
                <Link
                  to="/groups"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-blue-600 border-b-2 border-transparent hover:border-blue-600"
                >
                  Grouped Players
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<ClanDailyTracking clanTag="PPLCV9G2" />} />
          <Route path="/groups" element={<GroupedPlayersManager clanTag="PPLCV9G2" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
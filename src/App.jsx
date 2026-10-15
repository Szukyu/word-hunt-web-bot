import { useState, useEffect } from 'react';
import './App.css';
import Navbar from './components/Navbar/Navbar.jsx';
import Option from './components/Option/Option.jsx';
import Auth from './components/Auth/Auth.jsx';
import Stats from './components/Stats/Stats.jsx';
import ThemePage from './components/ThemePage/ThemePage.jsx';
import Daily from './components/Daily/Daily.jsx';
import Leaderboard from './components/Leaderboard/Leaderboard.jsx';
import Multiplayer from './components/Multiplayer/Multiplayer.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ThemeProvider } from './themes/ThemeContext.jsx';
import { ensureTodaysDailyPuzzles } from './lib/daily.js';

const AppContent = () => {
  const { user, signOut } = useAuth();
  const [resetKey, setResetKey] = useState(0);
  const [showAuth, setShowAuth] = useState(false);
  const [view, setView] = useState('option');

  const resetOption = () => {
    setResetKey(prev => prev + 1);
  };

  const handleLogin = () => {
    setShowAuth(true);
  };

  const handleCloseAuth = () => {
    setShowAuth(false);
    setView('option');
  };

  const handleSignOut = () => {
    signOut();
    setView('option');
    resetOption();
  };

  const handleReset = () => {
    setShowAuth(false);
    setView('option');
    resetOption();
  };

  const handleViewStats = () => {
    setView('stats');
  };

  const handleViewThemes = () => {
    setShowAuth(false);
    setView('themes');
  };

  const handleBackToOption = () => {
    setView('option');
  };

  const handleViewDaily = () => {
    setShowAuth(false);
    setView('daily');
    if (window.location.pathname !== '/daily') window.history.pushState({}, '', '/daily');
  };

  const handleViewLeaderboard = () => {
    setShowAuth(false);
    setView('leaderboard');
    if (window.location.pathname !== '/leaderboard') window.history.pushState({}, '', '/leaderboard');
  };

  const handleViewMultiplayer = (mode = 'casual', boardType = null, gameTime = null) => {
    setShowAuth(false);
    setView('multiplayer');
    // Pass mode via sessionStorage for the Multiplayer component to read
    sessionStorage.setItem('multiplayer_mode', mode)
    if (boardType) sessionStorage.setItem('multiplayer_boardType', String(boardType))
    if (gameTime) sessionStorage.setItem('multiplayer_gameTime', String(gameTime))
    if (window.location.pathname !== '/multiplayer') window.history.pushState({}, '', '/multiplayer');
  };

  // Ensure today's daily puzzle exists even if user never opens Daily view (first app load creates it)
  useEffect(() => {
    ensureTodaysDailyPuzzles().catch(() => {})
  }, [])

  // Deep-link support: /daily, /leaderboard, /multiplayer
  useEffect(() => {
    if (window.location.pathname === '/daily') setView('daily');
    if (window.location.pathname === '/leaderboard') setView('leaderboard');
    if (window.location.pathname === '/multiplayer') setView('multiplayer');
    const onPop = () => {
      if (window.location.pathname === '/daily') setView('daily');
      else if (window.location.pathname === '/leaderboard') setView('leaderboard');
      else if (window.location.pathname === '/multiplayer') setView('multiplayer');
      else if ((view === 'daily' || view === 'leaderboard' || view === 'multiplayer') && !['/daily','/leaderboard','/multiplayer'].includes(window.location.pathname)) setView('option');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [view]);

  const renderView = () => {
    if (showAuth) return <Auth onClose={handleCloseAuth} />;
    if (view === 'stats') return <Stats onBack={handleBackToOption} />;
    if (view === 'themes') return <ThemePage onBack={handleBackToOption} />;
    if (view === 'daily') return <Daily />;
    if (view === 'leaderboard') return <Leaderboard onBack={handleBackToOption} />;
    if (view === 'multiplayer') {
      // Read mode params from sessionStorage
      const mode = sessionStorage.getItem('multiplayer_mode') || 'casual'
      const boardType = sessionStorage.getItem('multiplayer_boardType') ? parseInt(sessionStorage.getItem('multiplayer_boardType'), 10) : null
      const gameTime = sessionStorage.getItem('multiplayer_gameTime') ? parseInt(sessionStorage.getItem('multiplayer_gameTime'), 10) : null
      // Clear after reading
      sessionStorage.removeItem('multiplayer_mode')
      sessionStorage.removeItem('multiplayer_boardType')
      sessionStorage.removeItem('multiplayer_gameTime')
      return <Multiplayer onBack={handleBackToOption} initialMode={mode} initialBoardType={boardType} initialGameTime={gameTime} />
    }
    return <Option key={resetKey} />;
  };

  return (
    <div className="App">
      <Navbar 
        onReset={handleReset} 
        onViewThemes={handleViewThemes}
        onLogin={handleLogin}
        user={user}
        onSignOut={handleSignOut}
        onViewStats={handleViewStats}
        onViewDaily={handleViewDaily}
        onViewLeaderboard={handleViewLeaderboard}
        onViewMultiplayer={handleViewMultiplayer}
      />
      {renderView()}
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

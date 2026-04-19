import { useState, useEffect } from 'react';
import './App.css';
import Navbar from './components/Navbar/Navbar.jsx';
import Option from './components/Option/Option.jsx';
import Auth from './components/Auth/Auth.jsx';
import Stats from './components/Stats/Stats.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';

const AppContent = () => {
  const { user, signOut } = useAuth();
  const [resetKey, setResetKey] = useState(0);
  const [showAuth, setShowAuth] = useState(false);
  const [view, setView] = useState('option');
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark';
    return localStorage.getItem('theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const resetOption = () => {
    setResetKey(prev => prev + 1);
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
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

  return (
    <div className="App">
      <Navbar 
        onReset={handleReset} 
        theme={theme} 
        onToggleTheme={toggleTheme}
        onLogin={handleLogin}
        user={user}
        onSignOut={handleSignOut}
        onViewStats={handleViewStats}
      />
      {showAuth ? <Auth onClose={handleCloseAuth} /> : view === 'stats' ? <Stats /> : <Option key={resetKey} />}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

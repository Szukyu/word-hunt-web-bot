import { useState, useEffect } from 'react';
import './App.css';
import Navbar from './components/Navbar/Navbar.jsx';
import Option from './components/Option/Option.jsx';
import Auth from './components/Auth/Auth.jsx';

const AppContent = () => {
  const [resetKey, setResetKey] = useState(0);
  const [showAuth, setShowAuth] = useState(false);
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
  };

  const handleReset = () => {
    setShowAuth(false);
    resetOption();
  };

  return (
    <div className="App">
      <Navbar 
        onReset={handleReset} 
        theme={theme} 
        onToggleTheme={toggleTheme}
        onLogin={handleLogin}
      />
      {showAuth ? <Auth onClose={handleCloseAuth} /> : <Option key={resetKey} />}
    </div>
  );
};

function App() {
  return <AppContent />;
}

export default App;

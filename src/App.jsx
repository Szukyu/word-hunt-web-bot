import { useState, useEffect } from 'react';
import './App.css';
import Navbar from './components/Navbar/Navbar.jsx';
import Option from './components/Option/Option.jsx';

function App() {
  const [resetKey, setResetKey] = useState(0);
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

  return (
    <div className="App">
      <Navbar onReset={resetOption} theme={theme} onToggleTheme={toggleTheme} />
      <Option key={resetKey} />
    </div>
  );
}

export default App;

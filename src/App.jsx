import { useState, useEffect } from 'react';
import './App.css';
import Navbar from './components/Navbar/Navbar.jsx';
import Option from './components/Option/Option.jsx';
import Auth from './components/Auth/Auth.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';

const AppContent = () => {
  const { user, loading, signOut } = useAuth()
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

  if (loading) {
    return <div className="App">Loading...</div>
  }

  return (
    <div className="App">
      <Navbar 
        onReset={resetOption} 
        theme={theme} 
        onToggleTheme={toggleTheme}
        user={user}
        onSignOut={signOut}
      />
      {user ? <Option key={resetKey} /> : <Auth />}
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

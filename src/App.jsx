import { useState } from 'react';
import './App.css';
import Navbar from './components/Navbar/Navbar.jsx';
import Option from './components/Option/Option.jsx';
import Auth from './components/Auth/Auth.jsx';
import Stats from './components/Stats/Stats.jsx';
import ThemePage from './components/ThemePage/ThemePage.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ThemeProvider } from './themes/ThemeContext.jsx';

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

  const renderView = () => {
    if (showAuth) return <Auth onClose={handleCloseAuth} />;
    if (view === 'stats') return <Stats />;
    if (view === 'themes') return <ThemePage onBack={handleBackToOption} />;
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

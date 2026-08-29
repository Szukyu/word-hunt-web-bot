import { IoPersonOutline, IoLogOutOutline } from 'react-icons/io5';
import './Navbar.css';

const Navbar = ({ onReset, onOpenTheme, onViewThemes, onLogin, user, onSignOut, onViewStats }) => {
  const handleThemeClick = onViewThemes || onOpenTheme;
  const handleProfileClick = () => {
    if (user) onViewStats?.();
    else onLogin();
  };
  return (
    <nav className="navbar" aria-label="Primary navigation">
      <div className="nav-content">
        <button className="nav-title" onClick={onReset} aria-label="Home">
          <span className="brand-mark">WH</span>
          <span className="brand-title">Word Hunt</span>
        </button>

        <div className="nav-actions">
          <button className="nav-pill" type="button" onClick={handleThemeClick} aria-label="Open themes">
            <span className="nav-pill-dot" aria-hidden />
            Themes
          </button>
          <button className="nav-icon" onClick={handleProfileClick} aria-label={user ? 'View stats' : 'Sign in'}>
            <IoPersonOutline />
          </button>
          {user && (
            <button className="nav-icon subtle" onClick={onSignOut} aria-label="Sign out" title="Sign out">
              <IoLogOutOutline />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

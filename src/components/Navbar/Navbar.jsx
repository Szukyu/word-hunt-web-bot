import { IoMoon, IoSunny, IoLogOut, IoPersonOutline } from 'react-icons/io5';
import './Navbar.css';

const Navbar = ({ onReset, theme = 'dark', onToggleTheme, user, onSignOut, onLogin }) => {
  return (
    <nav className="navbar" aria-label="Primary navigation">
      <div className="nav-content">
        <button className="nav-title" onClick={onReset}>
          <span className="brand-title">Word Hunt</span>
        </button>

        <div className="nav-actions">
          {onToggleTheme && (
            <button
              className="theme-toggle"
              type="button"
              onClick={onToggleTheme}
              aria-label="Toggle color theme"
            >
              {theme === 'dark' ? (
                <IoSunny className="theme-icon" />
              ) : (
                <IoMoon className="theme-icon" />
              )}
              <span className="theme-text">
                {theme === 'dark' ? 'Light' : 'Dark'}
              </span>
            </button>
          )}
          {user ? (
            <button className="nav-link" onClick={onSignOut}>
              <IoLogOut className="nav-link-icon" />
              Sign Out
            </button>
          ) : (
            <button className="profile-button" onClick={onLogin} aria-label="Login">
              <IoPersonOutline className="profile-icon" />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

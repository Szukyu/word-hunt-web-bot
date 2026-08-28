import { IoPersonOutline, IoLogOutOutline } from 'react-icons/io5';
import './Navbar.css';

const Navbar = ({ onReset, onOpenTheme, onViewThemes, onLogin, user, onSignOut, onViewStats }) => {
  const handleThemeClick = onViewThemes || onOpenTheme;
  const handleProfileClick = () => {
    if (user) {
      onViewStats?.();
    } else {
      onLogin();
    }
  };
  return (
    <nav className="navbar" aria-label="Primary navigation">
      <div className="nav-content">
        <button className="nav-title" onClick={onReset}>
          <span className="brand-title">Word Hunt</span>
        </button>

        <div className="nav-actions">
          <button
            className="theme-toggle"
            type="button"
            onClick={handleThemeClick}
            aria-label="Open theme page"
          >
            <span className="theme-text">Theme</span>
          </button>
          <button className="profile-button" onClick={handleProfileClick} aria-label="Profile">
            <IoPersonOutline className="profile-icon" />
          </button>
          {user && (
            <button className="signout-button" onClick={onSignOut} aria-label="Sign out">
              <IoLogOutOutline className="signout-icon" />
              <span className="signout-text">Sign Out</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

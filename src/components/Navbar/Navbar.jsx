import { IoMoon, IoSunny, IoLogoGithub } from 'react-icons/io5';
import './Navbar.css';

const Navbar = ({ onReset, theme = 'dark', onToggleTheme }) => {
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
          <a
            href="https://github.com/Szukyu/word-hunt-web-bot"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link"
          >
            <IoLogoGithub className="nav-link-icon" />
            GitHub
          </a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

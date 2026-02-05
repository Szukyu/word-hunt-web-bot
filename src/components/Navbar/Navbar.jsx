import './Navbar.css'

const Navbar = ({ onReset }) => {
  return (
    <nav className="navbar">
      <div className="nav-content">
        <button className="nav-title" onClick={onReset}>
          Word Hunt
        </button>
        <a 
          href="https://github.com/Szukyu/word-hunt-web-bot" 
          target="_blank" 
          rel="noopener noreferrer"
          className="nav-link"
        >
          GitHub
        </a>
      </div>
    </nav>
  )
}

export default Navbar

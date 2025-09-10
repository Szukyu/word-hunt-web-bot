import './Navbar.css'

const Navbar = ({ onReset }) => {
  return (
    <nav>
      <h1>
        <button onClick={onReset}>
          Word Hunt
        </button>
      </h1>
      <a href="https://github.com/Szukyu/word-hunt-web-bot" target="_blank" rel="noopener noreferrer" >
        GitHub
      </a>
    </nav>
  )
}

export default Navbar;

import { useState }from 'react';
import './App.css';
import Navbar from './components/Navbar/Navbar.jsx';
import Option from './components/Option/Option.jsx';

function App() {
  const [resetKey, setResetKey] = useState(0);

  const resetOption = () => {
    setResetKey(prev => prev + 1);
  };

  return (
    <div className="App">
      <Navbar onReset={resetOption} />
      <Option key={resetKey} />
    </div>
  );
}

export default App;

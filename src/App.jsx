import { useState } from 'react';
import Input from './components/Input/Input.jsx';
import './App.css';

function App() {
  const [contentVisible, setContentVisible] = useState(true);

  const resetAppContent = () => {
    setContentVisible(true);
  };

  return (
    <div className="App">
      {contentVisible ? (
        <Input setContentVisible={setContentVisible} />
      ) : (
        <div>
          <p>Content disappeared!</p>
          <button onClick={resetAppContent}>Start Over</button>
        </div>
      )}
    </div>
  );
}

export default App;

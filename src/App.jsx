import { useState } from 'react';
import './App.css';

function App() {
  const [inputValue, setInputValue] = useState('');
  const [wordList, setWordList] = useState([]);
  const [contentVisible, setContentVisible] = useState(true);

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      if (inputValue.trim() !== '') {
        setWordList([...wordList, inputValue.trim()]);
      }

      setInputValue('');
      setContentVisible(false);
    }
  };

  const resetContent = () => {
    setInputValue('');
    setWordList([]);
    setContentVisible(true);
  };

  return (
    <div className="App">
      {contentVisible ? (
        <>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type something and press Enter to make it disappear..."
          />
          {wordList.length > 0 && (
            <div>
              <h2>Your Words:</h2>
              <ul>
                {wordList.map((word, index) => (
                  <li key={index}>{word}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <div>
          <p>Content disappeared!</p>
          <button onClick={resetContent}>Start Over</button>
        </div>
      )}
    </div>
  );
}

export default App;

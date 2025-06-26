import { useState } from 'react';
import search from '../../hooks/search';
import './Input.css';

function Input() {
  const [contentVisible, setContentVisible] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const { foundWords, searchError, searchWords } = search();

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      const trimmedLetters = inputValue.trim().toLowerCase();
      if (trimmedLetters.length === 16 || trimmedLetters.length === 20 || trimmedLetters.length === 25) {
        searchWords(trimmedLetters);
        setContentVisible(false);
      } else {
        alert("Please enter 16, 20, or 25 letters for the board.");
      }
      setInputValue('');
    }
  };

  return (
    <>
      { contentVisible && (
        <div className="input-wrapper">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Enter Letters "
          />
        </div>
      )}

      {searchError && <p className="error-message">Error: {searchError}</p>}

      {foundWords.length > 0 && (
        <div id="output">
          <h2>{foundWords.length} words were found.</h2>
          <ul>
            {foundWords.map((entry, index) => (
              <li key={index}>{index + 1}: {entry.word}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

export default Input;

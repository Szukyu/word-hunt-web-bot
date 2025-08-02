import { useState } from 'react';
import useSearch from '../../hooks/search';
import useLoad from '../../hooks/load';
import Board from '../Board/Board.jsx';
import './Input.css';

function Input() {
  const [contentVisible, setContentVisible] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [boardLetters, setBoardLetters] = useState('');

  const { englishWords, wordStarts } = useLoad();
  const { foundWords, isSearching, searchError, searchWords } = useSearch(englishWords, wordStarts);

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      const trimmedLetters = inputValue.trim().toLowerCase();

      if (trimmedLetters.length === 16 || trimmedLetters.length === 20 || trimmedLetters.length === 25) {
        searchWords(trimmedLetters);
        setBoardLetters(trimmedLetters);
        setContentVisible(false);
      } else {
        alert("Please enter 16, 20, or 25 letters for the board.");
      }
      setInputValue('');
    }
  };

  return (
    <>
      {contentVisible && (
        <div className="input-wrapper">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Enter Letters (16, 20, or 25)"
            disabled={isSearching}
          />
          {isSearching && <p>Searching...</p>}
        </div>
      )}

      {searchError && <p className="error-message">Error: {searchError}</p>}

      {foundWords.length > 0 && (
        <div id="output">
          <div className="left">
            {/* Pass the boardLetters to the Board component */}
            <Board letters={boardLetters}></Board>
          </div>
          <div className="right">
            <h2>{foundWords.length} words were found.</h2>
            <div className="word-list-container"> {/* New container for scrollbar */}
              <ul>
                {foundWords.map((entry, index) => (
                  <li key={index}>{entry.word}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Input;

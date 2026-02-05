import { useState, useEffect } from 'react';
import useSearch from '../../hooks/search';
import useLoad from '../../hooks/load';
import './Input.css';

function Input() {
  const [contentVisible, setContentVisible] = useState(true);
  const [inputValue, setInputValue] = useState('');

  const { englishWords, wordStarts, loading, error: loadError } = useLoad();
  const { foundWords, isSearching, searchError, searchWords } = useSearch(englishWords, wordStarts);

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      const trimmedLetters = inputValue.trim().toLowerCase();

      if (loading) {
        alert("Please wait, word list is still loading.");
        return;
      }
      if (loadError) {
        alert(`Error loading word list: ${loadError.message}`);
        return;
      }

      if (trimmedLetters.length === 16 || trimmedLetters.length === 20 || trimmedLetters.length === 25) {
        searchWords(trimmedLetters);
        setContentVisible(false);
      } else {
        alert("Please enter 16, 20, or 25 letters for the board.");
      }
      setInputValue('');
    }
  };

  if (loading) {
    return <div className="input-wrapper">Loading word dictionary...</div>;
  }

  if (loadError) {
    return <div className="input-wrapper error-message">Error loading word dictionary: {loadError.message}</div>;
  }

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
            disabled={isSearching} // Disable input while searching
          />
          {isSearching && <p>Searching...</p>}
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

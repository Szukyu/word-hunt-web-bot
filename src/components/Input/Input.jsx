import { useState } from 'react';

function Input({ setContentVisible }) {
  const [inputValue, setInputValue] = useState('');
  const [wordList, setWordList] = useState([]);

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

  return (
    <>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
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
  );
}

export default Input;


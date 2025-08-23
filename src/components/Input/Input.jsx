import { useState } from 'react';
import useSearch from '../../hooks/search';
import useLoad from '../../hooks/load';
import Board from '../Board/Board.jsx';
import Boarder from '../Boarder/Boarder.jsx';
import List from '../List/List.jsx';
import './Input.css';

function Input() {
  const [contentVisible, setContentVisible] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [boardSize, setBoardSize] = useState(null);
  const [listSize, setListSize] = useState(0);
  const [boardLetters, setBoardLetters] = useState('');
  const [boardPositions, setBoardPositions] = useState([]);
  const { englishWords, wordStarts } = useLoad();
  const { foundWords, isSearching, searchWords } = useSearch(englishWords, wordStarts);

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      const trimmedLetters = inputValue.trim().toLowerCase();
      if (trimmedLetters.length === 16 || trimmedLetters.length === 20 || trimmedLetters.length === 25) {
        setBoardLetters(trimmedLetters);
        searchWords(trimmedLetters);
        setContentVisible(false);

        if (trimmedLetters.length === 16) {
          setBoardSize('four');
          setListSize(320);
        } else {
          setBoardSize('five');
          setListSize(402);
        }

      } else {
        alert("Please enter 16, 20, or 25 letters for the board.");
      }
      setInputValue('');
    }
  };

  const render = () => {
    if (boardLetters.length === 16) {
      return <Board letters={boardLetters} positions={boardPositions}> </Board>
    } else if (boardLetters.length === 25) {
      return <Boarder letters={boardLetters} positions={boardPositions}> </Boarder>
    }
    // Other Boards go Here
  } 

  return (
    <>
      {contentVisible && (
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Enter Letters (16, 20, or 25)"
          disabled={isSearching}
        />
      )}

      {foundWords.length > 0 && (
        <div id="output">
          <div className={`container ${boardSize}`}>
            <div className="left">
              { render() }
            </div>
            <div className="right">
              <List
                items={foundWords}
                onItemHover={(item, _) => setBoardPositions(item.pos)}
                showGradients={true}
                enableArrowNavigation={true}
                displayScrollbar={true}
                listSize={listSize}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Input;

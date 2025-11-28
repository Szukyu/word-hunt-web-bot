import { useMemo, useState } from 'react';
import useSearch from '../../hooks/search';
import Board from '../Boards/Board.jsx';
import Boarder from '../Boards/Boarder.jsx';
import Donut from '../Boards/Donut.jsx';
import X from '../Boards/X.jsx';
import List from '../List/List.jsx';
import './Input.css';

const BOARD_META = {
  16: { sizeClass: 'four', listHeight: 320, label: '4×4 Classic' },
  20: { sizeClass: 'five', listHeight: 402, label: 'Donut Ring' },
  21: {sizeClass: 'five', listHeight: 402, label: 'X Shape' },
  25: { sizeClass: 'five', listHeight: 402, label: '5×5 Grid' },
};

function Input({ englishWords, wordStarts }) {
  const [inputValue, setInputValue] = useState('');
  const [boardSize, setBoardSize] = useState(null);
  const [listSize, setListSize] = useState(0);
  const [boardLetters, setBoardLetters] = useState('');
  const [boardPositions, setBoardPositions] = useState([]);
  const [inputError, setInputError] = useState('');
  const [boardLabel, setBoardLabel] = useState('');
  const { foundWords, isSearching, searchError, searchWords } = useSearch(englishWords, wordStarts);

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
    if (inputError) {
      setInputError('');
    }
  };

  const solveBoard = () => {
    const trimmedLetters = inputValue.trim().toLowerCase();
    const meta = BOARD_META[trimmedLetters.length];

    if (!meta) {
      setInputError('Enter 16, 20, 21, or 25 letters to match a supported board shape.');
      return;
    }

    setBoardLetters(trimmedLetters);
    setBoardSize(meta.sizeClass);
    setListSize(meta.listHeight);
    setBoardPositions([]);
    setBoardLabel(meta.label);
    setInputError('');
    searchWords(trimmedLetters);
    setInputValue('');
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      solveBoard();
    }
  };

  const boardComponent = useMemo(() => {
    if (boardLetters.length === 16) return <Board letters={boardLetters} positions={boardPositions} />;
    if (boardLetters.length === 25) return <Boarder letters={boardLetters} positions={boardPositions} />;
    if (boardLetters.length === 20) return <Donut letters={boardLetters} positions={boardPositions} />;
    if (boardLetters.length === 21) return <X letters={boardLetters} positions={boardPositions} />;
    return null;
  }, [boardLetters, boardPositions]);

  const hasResults = foundWords.length > 0;

  return (
    <section className="solver-shell">
      <div className="solver-panel">
        <div className="solver-header">
          <div className="solver-title">
            <span className="eyebrow">Solver</span>
            <h2>Enter your letters to find all words</h2>
          </div>
          <p className="solver-description">
            Type the Board Row-by-Row. Hover over any Word or use Arrow keys to Preview Path.
          </p>
        </div>

        <div className="input-group">
          <div className="input-wrapper">
            <input
              id="board-input"
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={isSearching}
              autoFocus
            />
            <button 
              className={`solve-button ${isSearching ? 'loading' : ''}`} 
              onClick={solveBoard} 
              disabled={isSearching}
            >
              {isSearching ? (
                <>
                  <div className="button-spinner"></div>
                  Searching...
                </>
              ) : (
                'Solve Board'
              )}
            </button>
          </div>
          
          <div className="input-footer">
            <span className="hint">Supports 16 / 20 / 21 / 25 letters exactly</span>
            {(inputError || searchError) && (
              <span className="error">{inputError || searchError}</span>
            )}
          </div>
        </div>

        {hasResults && (
          <div className="results-header">
            <div className="results-meta">
              <span className="count">{foundWords.length} words</span>
              <span className="divider">•</span>
              <span className="board-type">{boardLabel}</span>
            </div>
          </div>
        )}
      </div>

      {hasResults && (
        <div className="solver-results">
          <div className={`results-container ${boardSize || ''}`}>
            <div className="board-section">
              <div className="board-container">
                {boardComponent}
              </div>
            </div>
            
            <div className="words-section">
              <div className="words-header">
                <div className="words-title">
                  <span className="eyebrow">Word List</span>
                </div>
              </div>
              
              <div className="words-list">
                <List
                  items={foundWords}
                  onItemHover={(item) => setBoardPositions(item.pos)}
                  showGradients={true}
                  enableArrowNavigation={true}
                  displayScrollbar={true}
                  listSize={listSize || 360}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default Input;

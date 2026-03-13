import { useState, useEffect, useCallback, useMemo } from 'react';
import Board from '../Boards/Board';
import Boarder from '../Boards/Boarder';
import Donut from '../Boards/Donut';
import X from '../Boards/X';
import List from '../List/List';
import { IoTimeOutline, IoCheckmarkCircle, IoArrowBack, IoRefresh, IoClose } from 'react-icons/io5';
import useTimer from '../../hooks/timer';
import './Play.css';

const BOARD_CONFIG = {
  16: { name: '4×4 Grid', component: Board },
  20: { name: 'Donut Ring', component: Donut },
  21: { name: 'X Shape', component: X },
  25: { name: '5×5 Grid', component: Boarder },
};

const Play = ({ boardType, gameTime, onBack, englishWords }) => {
  const { secondsLeft, isRunning, start, pause } = useTimer();
  const [boardLetters, setBoardLetters] = useState('');
  const [selectedTiles, setSelectedTiles] = useState([]);
  const [foundWords, setFoundWords] = useState([]);
  const [currentWord, setCurrentWord] = useState('');
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  const boardConfig = BOARD_CONFIG[boardLetters.length];
  const BoardComponent = boardConfig?.component;

  useEffect(() => {
    if (boardLetters.length > 0 && !gameOver) {
      start(gameTime);
    }
    return () => pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardLetters]);

  useEffect(() => {
    if (secondsLeft === 0 && boardLetters.length > 0 && !gameOver) {
      setGameOver(true);
      pause();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  const generateRandomBoard = useCallback(() => {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const length = boardType;
    let board = '';
    for (let i = 0; i < length; i++) {
      board += letters[Math.floor(Math.random() * letters.length)];
    }
    setBoardLetters(board);
    setSelectedTiles([]);
    setCurrentWord('');
    setFoundWords([]);
    setScore(0);
    setGameOver(false);
    setMessage(null);
  }, [boardType]);

  useEffect(() => {
    generateRandomBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTileClick = (index) => {
    if (gameOver || !isRunning) return;
    
    const letter = boardLetters[index].toUpperCase();
    
    if (selectedTiles.includes(index)) {
      if (selectedTiles[selectedTiles.length - 1] === index) {
        setSelectedTiles(prev => prev.slice(0, -1));
        setCurrentWord(prev => prev.slice(0, -1));
      }
      return;
    }

    if (selectedTiles.length > 0) {
      const lastTile = selectedTiles[selectedTiles.length - 1];
      const rowDiff = Math.floor(index / Math.sqrt(boardLetters.length)) - Math.floor(lastTile / Math.sqrt(boardLetters.length));
      const colDiff = index % Math.sqrt(boardLetters.length) - lastTile % Math.sqrt(boardLetters.length);
      const distance = Math.max(Math.abs(rowDiff), Math.abs(colDiff));
      
      if (distance > 1) return;
    }

    setSelectedTiles(prev => [...prev, index]);
    setCurrentWord(prev => prev + letter);
    setMessage(null);
  };

  const handleSubmit = useCallback(() => {
    if (!currentWord || currentWord.length < 3) {
      setMessage({ type: 'error', text: 'Word must be at least 3 letters' });
      return;
    }

    if (foundWords.some(w => w.word.toLowerCase() === currentWord.toLowerCase())) {
      setMessage({ type: 'error', text: 'Word already found' });
      setSelectedTiles([]);
      setCurrentWord('');
      return;
    }

    setIsValidating(true);
    
    setTimeout(() => {
      const wordLower = currentWord.toLowerCase();
      if (englishWords.has(wordLower)) {
        const wordScore = calculateScore(wordLower.length);
        setFoundWords(prev => [...prev, { word: currentWord.toUpperCase(), pos: [...selectedTiles], score: wordScore }]);
        setScore(prev => prev + wordScore);
        setMessage({ type: 'success', text: `+${wordScore} points!` });
      } else {
        setMessage({ type: 'error', text: 'Not a valid word' });
      }
      setSelectedTiles([]);
      setCurrentWord('');
      setIsValidating(false);
    }, 100);
  }, [currentWord, foundWords, selectedTiles, englishWords]);

  const calculateScore = (length) => {
    if (length === 3) return 1;
    if (length === 4) return 2;
    if (length === 5) return 3;
    if (length === 6) return 5;
    if (length === 7) return 8;
    if (length >= 8) return 11;
    return 0;
  };

  const handleClear = useCallback(() => {
    setSelectedTiles([]);
    setCurrentWord('');
    setMessage(null);
  }, []);

  const handleKeyDown = useCallback((event) => {
    if (gameOver || !isRunning) return;
    
    const key = event.key.toLowerCase();
    
    if (key === 'enter') {
      event.preventDefault();
      handleSubmit();
      return;
    }
    
    if (key === 'backspace') {
      event.preventDefault();
      if (selectedTiles.length > 0) {
        setSelectedTiles(prev => prev.slice(0, -1));
        setCurrentWord(prev => prev.slice(0, -1));
      }
      return;
    }
    
    if (key === 'escape') {
      handleClear();
      return;
    }
    
    if (!/^[a-z]$/.test(key)) return;
    
    const letter = key.toUpperCase();
    const boardArray = boardLetters.split('');
    
    let foundIndex = -1;
    for (let i = 0; i < boardArray.length; i++) {
      if (boardArray[i].toUpperCase() === letter && !selectedTiles.includes(i)) {
        if (selectedTiles.length === 0) {
          foundIndex = i;
          break;
        } else {
          const lastTile = selectedTiles[selectedTiles.length - 1];
          const rowDiff = Math.floor(i / Math.sqrt(boardLetters.length)) - Math.floor(lastTile / Math.sqrt(boardLetters.length));
          const colDiff = i % Math.sqrt(boardLetters.length) - lastTile % Math.sqrt(boardLetters.length);
          const distance = Math.max(Math.abs(rowDiff), Math.abs(colDiff));
          
          if (distance <= 1) {
            foundIndex = i;
            break;
          }
        }
      }
    }
    
    if (foundIndex !== -1) {
      setSelectedTiles(prev => [...prev, foundIndex]);
      setCurrentWord(prev => prev + letter);
      setMessage(null);
    }
  }, [boardLetters, selectedTiles, gameOver, isRunning, handleSubmit, handleClear]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handlePlayAgain = () => {
    generateRandomBoard();
  };

  const formatTime = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  const renderInteractiveBoard = () => {
    if (!boardLetters) return null;
    
    const letters = boardLetters.split('').map(l => l.toUpperCase());
    const size = Math.sqrt(letters.length);
    
    const rows = [];
    for (let i = 0; i < size; i++) {
      const rowTiles = [];
      for (let j = 0; j < size; j++) {
        const index = i * size + j;
        const isSelected = selectedTiles.includes(index);
        rowTiles.push(
          <button
            key={index}
            className={`play-tile ${isSelected ? 'selected' : ''}`}
            onClick={() => handleTileClick(index)}
            disabled={gameOver || !isRunning}
          >
            {letters[index]}
          </button>
        );
      }
      rows.push(
        <div key={i} className="board-row">
          {rowTiles}
        </div>
      );
    }
    
    return (
      <div className="board-container">
        {rows}
      </div>
    );
  };

  const sortedFoundWords = useMemo(() => {
    return [...foundWords].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.word.localeCompare(b.word);
    });
  }, [foundWords]);

  return (
    <section className="play-area">
      <div className="play-header">
        <button className="back-button" onClick={onBack}>
          <IoArrowBack />
        </button>
        <div className="play-stats">
          <div className="stat">
            <IoTimeOutline className="stat-icon" />
            <span className={secondsLeft <= 10 ? 'urgent' : ''}>{formatTime(secondsLeft)}</span>
          </div>
          <div className="stat">
            <IoCheckmarkCircle className="stat-icon" />
            <span>{score} pts</span>
          </div>
        </div>
        <button className="refresh-button" onClick={handlePlayAgain}>
          <IoRefresh />
        </button>
      </div>

      <div className="play-content">
        <div className="play-main">
          <div className="current-word-display">
            <div className={`current-word ${message?.type || ''}`}>
              {currentWord || 'Type letters to form a word'}
            </div>
            {message && (
              <div className={`message ${message.type}`}>
                {message.text}
              </div>
            )}
          </div>

          <div className="play-board">
            {renderInteractiveBoard()}
          </div>

          <div className="play-controls">
            <button 
              className="control-button clear" 
              onClick={handleClear}
              disabled={selectedTiles.length === 0 || gameOver}
            >
              <IoClose /> Clear
            </button>
            <button 
              className="control-button submit" 
              onClick={handleSubmit}
              disabled={currentWord.length < 3 || gameOver || isValidating}
            >
              Submit
            </button>
          </div>
        </div>

        <div className="play-sidebar">
          <div className="found-words-header">
            <h3>Found Words</h3>
            <span className="word-count">{foundWords.length}</span>
          </div>
          <div className="found-words-list">
            {sortedFoundWords.length > 0 ? (
              <List
                items={sortedFoundWords}
                onItemHover={() => {}}
                showGradients={false}
                enableArrowNavigation={false}
                listSize={400}
              />
            ) : (
              <div className="empty-words">
                <p>No words found yet</p>
                <span>Find words with 3+ letters</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {gameOver && (
        <div className="game-over-overlay">
          <div className="game-over-modal">
            <h2>Time's Up!</h2>
            <div className="final-score">
              <span className="score-label">Final Score</span>
              <span className="score-value">{score}</span>
            </div>
            <div className="words-found">
              <span>{foundWords.length} words found</span>
            </div>
            <button className="play-again-button" onClick={handlePlayAgain}>
              <IoRefresh /> Play Again
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default Play;

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { POINTS } from '../../data/points';
import Board from '../Boards/Board';
import Boarder from '../Boards/Boarder';
import Donut from '../Boards/Donut';
import X from '../Boards/X';
import List from '../List/List';
import { IoTimeOutline, IoCheckmarkCircle, IoArrowBack, IoRefresh, IoClose } from 'react-icons/io5';
import useTimer from '../../hooks/timer';
import { useBoard } from '../../hooks/board.js';
import { useKeyboardInput } from '../../hooks/keyboardInput.js';
import './Play.css';

const BOARD_CONFIG = {
  16: { name: '4×4 Grid', component: Board },
  20: { name: 'Donut Ring', component: Donut },
  21: { name: 'X Shape', component: X },
  25: { name: '5×5 Grid', component: Boarder },
};

const Play = ({ boardType, gameTime, onBack, onGameEnd, englishWords }) => {
  const { secondsLeft, isRunning, start, pause } = useTimer();
  const [selectedTiles, setSelectedTiles] = useState([]);
  const [foundWords, setFoundWords] = useState([]);
  const [currentWord, setCurrentWord] = useState('');
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [allPossibleWords, setAllPossibleWords] = useState([]);
  const [totalPossibleScore, setTotalPossibleScore] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const englishWordsRef = useRef(englishWords);
  useEffect(() => {
    englishWordsRef.current = englishWords;
  }, [englishWords]);

  const { boardLetters, adjacencyMap, generateRandomBoard, getValidWords } = useBoard(boardType, englishWords);

  // Timer control
  useEffect(() => {
    if (boardLetters && !gameOver) {
      start(gameTime);
    }
    return () => pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardLetters, gameOver]);

	// Game Over
  useEffect(() => {
    if (secondsLeft === 0 && boardLetters && !gameOver) {
      setGameOver(true);
      pause();

      const allWords = getValidWords();
      const wordsWithScores = allWords
        .map(word => ({ word, score: calculateScore(word.length) }))
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return a.word.localeCompare(b.word);
        });

      const total = wordsWithScores.reduce((sum, w) => sum + w.score, 0);
      setAllPossibleWords(wordsWithScores);
      setTotalPossibleScore(total);

      onGameEnd?.({
        score,
        foundWords,
        allPossibleWords: wordsWithScores,
        totalPossibleScore: total
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  const calculateScore = (length) => {
    if (length < 3 || length > 10) return 0;
    return POINTS[length - 3];
  };

  const handleClear = useCallback(() => {
    setSelectedTiles([]);
    setCurrentWord('');
    setMessage(null);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!currentWord || currentWord.length < 3) {
      setMessage({ type: 'error', text: 'Word must be at least 3 letters' });
      return;
    }
    if (foundWords.some(w => w.word.toLowerCase() === currentWord.toLowerCase())) {
      setMessage({ type: 'error', text: 'Word already found' });
      handleClear();
      return;
    }
    setIsValidating(true);
    setTimeout(() => {
      const wordLower = currentWord.toLowerCase();
      if (englishWordsRef.current.has(wordLower)) {
        const wordScore = calculateScore(wordLower.length);
        setFoundWords(prev => [
          ...prev,
          { word: currentWord.toUpperCase(), pos: [...selectedTiles], score: wordScore }
        ]);
        setScore(prev => prev + wordScore);
        setMessage({ type: 'success', text: `+${wordScore} points!` });
      } else {
        setMessage({ type: 'error', text: 'Not a valid word' });
      }
      handleClear();
      setIsValidating(false);
    }, 100);
  }, [currentWord, foundWords, selectedTiles, handleClear]);

  const handleMouseUp = useCallback(() => {
    if (isDragging && currentWord.length >= 3) {
      handleSubmit();
    } else if (isDragging) {
      handleClear();
    }
    setIsDragging(false);
  }, [isDragging, currentWord, handleSubmit, handleClear]);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  const isAdjacent = (lastTile, newTile) =>
    adjacencyMap[lastTile]?.includes(newTile) ?? false;

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
    if (selectedTiles.length > 0 && !isAdjacent(selectedTiles[selectedTiles.length - 1], index)) return;

    setSelectedTiles(prev => [...prev, index]);
    setCurrentWord(prev => prev + letter);
    setMessage(null);
  };

  const handleTileMouseDown = (index) => {
    if (gameOver || !isRunning) return;
    setIsDragging(true);
    setSelectedTiles([index]);
    setCurrentWord(boardLetters[index].toUpperCase());
    setMessage(null);
  };

  const handleTileMouseEnter = (index) => {
    if (gameOver || !isRunning || !isDragging) return;

    if (selectedTiles.includes(index)) {
      const tileIndex = selectedTiles.indexOf(index);
      const lastSelectedIndex = selectedTiles[selectedTiles.length - 1];
      if (tileIndex === lastSelectedIndex - 1) {
        setSelectedTiles(prev => prev.slice(0, -1));
        setCurrentWord(prev => prev.slice(0, -1));
      }
      return;
    }

    const lastTile = selectedTiles[selectedTiles.length - 1];
    if (!isAdjacent(lastTile, index)) return;

    setSelectedTiles(prev => [...prev, index]);
    setCurrentWord(prev => prev + boardLetters[index].toUpperCase());
  };

  useKeyboardInput({
    boardLetters,
    adjacencyMap,
    selectedTiles,
    currentWord,
    setSelectedTiles,
    setCurrentWord,
    setMessage,
    gameOver,
    isRunning,
    onSubmit: handleSubmit,
    onClear: handleClear
  });

  const handlePlayAgain = () => {
    generateRandomBoard();
    setSelectedTiles([]);
    setCurrentWord('');
    setFoundWords([]);
    setScore(0);
    setGameOver(false);
    setMessage(null);
  };

  const formatTime = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  const renderInteractiveBoard = () => {
    if (!boardLetters) return null;
    const BoardComponent = BOARD_CONFIG[boardLetters.length]?.component;

    if (!BoardComponent) {
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
              onMouseDown={() => handleTileMouseDown(index)}
              onMouseEnter={() => handleTileMouseEnter(index)}
              disabled={gameOver || !isRunning}
            >
              {letters[index]}
            </button>
          );
        }
        rows.push(<div key={i} className="board-row">{rowTiles}</div>);
      }
      return <div className="board-container">{rows}</div>;
    }

    return (
      <BoardComponent
        letters={boardLetters}
        positions={selectedTiles}
        onTileClick={handleTileClick}
        onTileMouseDown={handleTileMouseDown}
        onTileMouseEnter={handleTileMouseEnter}
      />
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
              {currentWord}
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
    </section>
  );
};

export default Play;

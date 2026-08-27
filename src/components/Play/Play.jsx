import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { POINTS } from '../../data/points';
import Board from '../Boards/Board';
import Boarder from '../Boards/Boarder';
import Donut from '../Boards/Donut';
import X from '../Boards/X';
import List from '../List/List';
import { IoTimeOutline, IoCheckmarkCircle, IoArrowBack, IoRefresh, IoClose } from 'react-icons/io5';
import useTimer from '../../hooks/timer';
import { useBoard } from '../../hooks/board';
import { useKeyboardInput } from '../../hooks/keyboardInput';
import './Play.css';

const BOARD_CONFIG = {
  16: { name: '4×4 Grid', component: Board },
  20: { name: 'Donut Ring', component: Donut },
  21: { name: 'X Shape', component: X },
  25: { name: '5×5 Grid', component: Boarder },
};

const Play = ({ boardType, gameTime, onBack, onGameEnd, englishWords }) => {
  const { secondsLeft, isRunning, start, pause } = useTimer();
  const isRunningRef = useRef(isRunning);
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
  // Submission Guard
  const submittingRef = useRef(false);

  // Refs for touch handlers (avoids stale closure in window event listeners)
  const isDraggingRef = useRef(isDragging);
  const selectedTilesRef = useRef(selectedTiles);
  const currentWordRef = useRef(currentWord);
  const foundWordsRef = useRef(foundWords);
  const gameOverRef = useRef(gameOver);

  useEffect(() => { isDraggingRef.current = isDragging; }, [isDragging]);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
  useEffect(() => { selectedTilesRef.current = selectedTiles; }, [selectedTiles]);
  useEffect(() => { currentWordRef.current = currentWord; }, [currentWord]);
  useEffect(() => { foundWordsRef.current = foundWords; }, [foundWords]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);

  useEffect(() => {
    englishWordsRef.current = englishWords;
  }, [englishWords]);

  const { boardLetters, adjacencyMap, generateRandomBoard, getValidWords } = useBoard(boardType, englishWords);

  const adjacencyMapRef = useRef(adjacencyMap);
  const boardLettersRef = useRef(boardLetters);

  useEffect(() => { adjacencyMapRef.current = adjacencyMap; }, [adjacencyMap]);
  useEffect(() => { boardLettersRef.current = boardLetters; }, [boardLetters]);

  // Generate Board on Mount
  useEffect(() => {
    generateRandomBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Clear Message on New Word
  useEffect(() => {
    if (currentWord.length > 0 && message) {
      setMessage(null);
    }
  }, [currentWord, message]);

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
    const word = currentWordRef.current;
    const tiles = selectedTilesRef.current;

    if (submittingRef.current) return;
    if (!word || word.length === 0) return;

    if (word.length < 3) {
      setMessage({ type: 'error', text: 'Too Short' });
      setSelectedTiles([]);
      setCurrentWord('');
      setTimeout(() => setMessage(null), 1200);
      return;
    }

    if (foundWordsRef.current.some(w => w.word.toLowerCase() === word.toLowerCase())) {
      setMessage({ type: 'error', text: 'Already Found' });
      setSelectedTiles([]);
      setCurrentWord('');
      setTimeout(() => setMessage(null), 1200);
      return;
    }

    submittingRef.current = true;
    setIsValidating(true);

    setTimeout(() => {
      const wordLower = word.toLowerCase();
      if (englishWordsRef.current.has(wordLower)) {
        const wordScore = calculateScore(wordLower.length);
        setFoundWords(prev => [
          ...prev,
          { word: word.toUpperCase(), pos: [...tiles], score: wordScore }
        ]);
        setScore(prev => prev + wordScore);
        setMessage({ type: 'success', text: `+${wordScore} points!` });
      } else {
        setMessage({ type: 'error', text: 'Invalid word' });
      }

      setSelectedTiles([]);
      setCurrentWord('');
      setIsValidating(false);
      submittingRef.current = false;

      setTimeout(() => setMessage(null), 1200);
    }, 100);
  }, []);

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

  const handleTileMouseDown = (index, e) => {
    if (e) e.preventDefault();
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
      if (tileIndex !== selectedTiles.length - 1) {
        setSelectedTiles(prev => prev.slice(0, tileIndex + 1));
        setCurrentWord(prev => prev.slice(0, tileIndex + 1));
      }
      return;
    }

    const lastTile = selectedTiles[selectedTiles.length - 1];
    if (!isAdjacent(lastTile, index)) return;

    setSelectedTiles(prev => [...prev, index]);
    setCurrentWord(prev => prev + boardLetters[index].toUpperCase());
  };

  const handleTileTouchStart = (index, e) => {
    e.preventDefault();
    if (gameOver || !isRunning) return;
    setIsDragging(true);
    setSelectedTiles([index]);
    setCurrentWord(boardLetters[index].toUpperCase());
    setMessage(null);
  };

  const processTileMove = useCallback((tileIndex) => {
    const currentSelected = selectedTilesRef.current;
    const currentWordStr = currentWordRef.current;
    const adjMap = adjacencyMapRef.current;
    const letters = boardLettersRef.current;

    if (currentSelected.includes(tileIndex)) {
      const idx = currentSelected.indexOf(tileIndex);
      if (idx !== currentSelected.length - 1) {
        setSelectedTiles(currentSelected.slice(0, idx + 1));
        setCurrentWord(currentWordStr.slice(0, idx + 1));
      }
      return;
    }

    const lastTile = currentSelected[currentSelected.length - 1];
    if (!adjMap[lastTile]?.includes(tileIndex)) return;

    setSelectedTiles([...currentSelected, tileIndex]);
    setCurrentWord(currentWordStr + letters[tileIndex].toUpperCase());
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isDraggingRef.current || gameOverRef.current || !isRunningRef.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!element) return;
    const tileEl = element.closest('[data-index]');
    if (!tileEl) return;
    const index = parseInt(tileEl.dataset.index, 10);
    if (isNaN(index)) return;
    processTileMove(index);
  }, [processTileMove]);

  const handleTouchEnd = useCallback((e) => {
    e.preventDefault();
    if (isDraggingRef.current && currentWordRef.current.length >= 3) {
      handleSubmit();
    } else if (isDraggingRef.current) {
      handleClear();
    }
    setIsDragging(false);
  }, [handleSubmit, handleClear]);

  useEffect(() => {
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchMove, handleTouchEnd]);

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
    onClear: handleClear,
    submittingRef
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
              onMouseDown={(e) => {
                e.preventDefault();
                handleTileMouseDown(index, e);
              }}
              onMouseEnter={() => handleTileMouseEnter(index)}
              onTouchStart={(e) => handleTileTouchStart(index, e)}
              onDragStart={(e) => e.preventDefault()}
              draggable={false}
              data-index={index}
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
        onTileTouchStart={handleTileTouchStart}
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
              {message ? message.text : currentWord}
            </div>
          </div>

          <div className="play-board" onDragStart={(e) => e.preventDefault()}>
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

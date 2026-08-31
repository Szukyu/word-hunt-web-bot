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

const Play = ({ boardType, gameTime, onBack, onGameEnd, englishWords, initialLetters = null, disableRegenerate = false }) => {
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

  const { boardLetters, adjacencyMap, generateRandomBoard, getValidWords, setBoard } = useBoard(boardType, englishWords, initialLetters);

  const adjacencyMapRef = useRef(adjacencyMap);
  const boardLettersRef = useRef(boardLetters);

  useEffect(() => { adjacencyMapRef.current = adjacencyMap; }, [adjacencyMap]);
  useEffect(() => { boardLettersRef.current = boardLetters; }, [boardLetters]);

  // Generate / set board on mount
  useEffect(() => {
    if (initialLetters) {
      setBoard(initialLetters);
    } else {
      generateRandomBoard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLetters]);

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
    selectedTilesRef.current = [];
    currentWordRef.current = '';
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
      selectedTilesRef.current = [];
      currentWordRef.current = '';
      setSelectedTiles([]);
      setCurrentWord('');
      setTimeout(() => setMessage(null), 1200);
      return;
    }

    if (foundWordsRef.current.some(w => w.word.toLowerCase() === word.toLowerCase())) {
      setMessage({ type: 'error', text: 'Already Found' });
      selectedTilesRef.current = [];
      currentWordRef.current = '';
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

      selectedTilesRef.current = [];
      currentWordRef.current = '';
      setSelectedTiles([]);
      setCurrentWord('');
      setIsValidating(false);
      submittingRef.current = false;

      setTimeout(() => setMessage(null), 1200);
    }, 100);
  }, []);

  // Unified adjacency check via ref (avoids stale closure)
  const isAdjacent = useCallback(
    (lastTile, newTile) => adjacencyMapRef.current[lastTile]?.includes(newTile) ?? false,
    []
  );

  const handleTileClick = useCallback((index) => {
    if (gameOverRef.current || !isRunningRef.current) return;
    const letters = boardLettersRef.current;
    if (!letters) return;
    const letter = letters[index]?.toUpperCase();
    if (!letter) return;
    const currentSelected = selectedTilesRef.current;

    if (currentSelected.includes(index)) {
      if (currentSelected[currentSelected.length - 1] === index) {
        const nextTiles = currentSelected.slice(0, -1);
        const nextWord = currentWordRef.current.slice(0, -1);
        selectedTilesRef.current = nextTiles;
        currentWordRef.current = nextWord;
        setSelectedTiles(nextTiles);
        setCurrentWord(nextWord);
      }
      return;
    }
    if (currentSelected.length > 0 && !isAdjacent(currentSelected[currentSelected.length - 1], index)) return;
    const nextTiles = [...currentSelected, index];
    const nextWord = currentWordRef.current + letter;
    selectedTilesRef.current = nextTiles;
    currentWordRef.current = nextWord;
    setSelectedTiles(nextTiles);
    setCurrentWord(nextWord);
    setMessage(null);
  }, [isAdjacent]);

  const processTileMove = useCallback((tileIndex) => {
    const currentSelected = selectedTilesRef.current;
    const currentWordStr = currentWordRef.current;
    const adjMap = adjacencyMapRef.current;
    const letters = boardLettersRef.current;
    if (!letters || tileIndex < 0 || tileIndex >= letters.length) return;

    if (currentSelected.includes(tileIndex)) {
      const idx = currentSelected.indexOf(tileIndex);
      if (idx !== currentSelected.length - 1) {
        const nextTiles = currentSelected.slice(0, idx + 1);
        const nextWord = currentWordStr.slice(0, idx + 1);
        selectedTilesRef.current = nextTiles;
        currentWordRef.current = nextWord;
        setSelectedTiles(nextTiles);
        setCurrentWord(nextWord);
      }
      return;
    }

    const lastTile = currentSelected[currentSelected.length - 1];
    // Allow start if no tile selected (should not happen via move but handle)
    if (currentSelected.length > 0 && !adjMap[lastTile]?.includes(tileIndex)) return;

    const nextTiles = [...currentSelected, tileIndex];
    const nextWord = currentWordStr + letters[tileIndex].toUpperCase();
    selectedTilesRef.current = nextTiles;
    currentWordRef.current = nextWord;
    setSelectedTiles(nextTiles);
    setCurrentWord(nextWord);
  }, []);

  // Unified drag start - uses refs + pointer capture + immediate ref sync
  const startDrag = useCallback((index, e) => {
    if (e) {
      // prevent text selection / native drag
      e.preventDefault?.();
      try { e.currentTarget?.setPointerCapture?.(e.pointerId); } catch (_e) { void _e; }
    }
    if (gameOverRef.current || !isRunningRef.current) return;
    const letters = boardLettersRef.current;
    if (!letters || index < 0 || index >= letters.length) return;
    const letter = letters[index].toUpperCase();
    const nextTiles = [index];
    const nextWord = letter;
    // Sync refs immediately so subsequent pointermove sees correct state before React re-render
    isDraggingRef.current = true;
    selectedTilesRef.current = nextTiles;
    currentWordRef.current = nextWord;
    setIsDragging(true);
    setSelectedTiles(nextTiles);
    setCurrentWord(nextWord);
    setMessage(null);
  }, []);

  const handleTileMouseDown = useCallback((index, e) => startDrag(index, e), [startDrag]);
  const handleTilePointerDown = useCallback((index, e) => startDrag(index, e), [startDrag]);
  const handleTileTouchStart = useCallback((index, e) => startDrag(index, e), [startDrag]);

  // MouseEnter is fallback; delegate to ref-driven processTileMove for stale-safety
  const handleTileMouseEnter = useCallback((index) => {
    if (!isDraggingRef.current || gameOverRef.current || !isRunningRef.current) return;
    processTileMove(index);
  }, [processTileMove]);

  // Global move helper - uses elementFromPoint so gaps and fast drags don't miss tiles
  const handleGlobalMove = useCallback((clientX, clientY) => {
    if (!isDraggingRef.current || gameOverRef.current || !isRunningRef.current) return;
    const element = document.elementFromPoint(clientX, clientY);
    if (!element) return;
    const tileEl = element.closest('[data-index]');
    if (!tileEl) return;
    const idx = parseInt(tileEl.dataset.index, 10);
    if (Number.isNaN(idx)) return;
    processTileMove(idx);
  }, [processTileMove]);

  const handleMouseMove = useCallback((e) => {
    if (!isDraggingRef.current) return;
    // If no buttons pressed, treat as drag end (pointer left window)
    if (e.buttons === 0) return;
    handleGlobalMove(e.clientX, e.clientY);
  }, [handleGlobalMove]);

  const handlePointerMove = useCallback((e) => {
    if (!isDraggingRef.current) return;
    handleGlobalMove(e.clientX, e.clientY);
  }, [handleGlobalMove]);

  const handleTouchMove = useCallback((e) => {
    if (!isDraggingRef.current || gameOverRef.current || !isRunningRef.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;
    handleGlobalMove(touch.clientX, touch.clientY);
  }, [handleGlobalMove]);

  const handleDragEnd = useCallback((e) => {
    if (e) e.preventDefault?.();
    if (!isDraggingRef.current) return;
    // Capture state via refs before clearing
    isDraggingRef.current = false;
    setIsDragging(false);
    if (currentWordRef.current.length >= 3) {
      handleSubmit();
    } else {
      handleClear();
    }
  }, [handleSubmit, handleClear]);

  const handleMouseUp = useCallback((e) => handleDragEnd(e), [handleDragEnd]);
  const handleTouchEnd = useCallback((e) => handleDragEnd(e), [handleDragEnd]);
  const handlePointerUp = useCallback((e) => handleDragEnd(e), [handleDragEnd]);

  // Global listeners: mouse / pointer / touch move + end
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, [handleMouseMove, handlePointerMove]);

  useEffect(() => {
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });
    // also handle touchcancel as end
    window.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchMove, handleTouchEnd]);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [handleMouseUp, handlePointerUp]);

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
    if (initialLetters && !disableRegenerate) {
      setBoard(initialLetters);
    } else if (!initialLetters) {
      generateRandomBoard();
    } else {
      // daily replay — keep same board
      setBoard(initialLetters);
    }
    selectedTilesRef.current = [];
    currentWordRef.current = '';
    isDraggingRef.current = false;
    gameOverRef.current = false;
    setSelectedTiles([]);
    setCurrentWord('');
    setFoundWords([]);
    setScore(0);
    setGameOver(false);
    setMessage(null);
    setIsDragging(false);
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
              onPointerDown={(e) => handleTilePointerDown(index, e)}
              onMouseDown={(e) => {
                e.preventDefault();
                handleTileMouseDown(index, e);
              }}
              onPointerEnter={() => handleTileMouseEnter(index)}
              onMouseEnter={() => handleTileMouseEnter(index)}
              onTouchStart={(e) => handleTileTouchStart(index, e)}
              onDragStart={(e) => e.preventDefault()}
              draggable={false}
              data-index={index}
              disabled={gameOver || !isRunning}
              style={{ touchAction: 'none' }}
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
        onTilePointerDown={handleTilePointerDown}
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

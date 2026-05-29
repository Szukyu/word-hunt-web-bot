import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FREQ } from '../../data/freq';
import { POINTS } from '../../data/points';
import Board from '../Boards/Board';
import Boarder from '../Boards/Boarder';
import Donut from '../Boards/Donut';
import X from '../Boards/X';
import List from '../List/List';
import { IoTimeOutline, IoCheckmarkCircle, IoArrowBack, IoRefresh, IoClose } from 'react-icons/io5';
import useTimer from '../../hooks/timer';
import { Letter, MAX_LENGTH, DIRECTIONS, Board as BoardClass, Boarder as BoarderClass, Donut as DonutClass, X as XClass } from '../../utils/Board.jsx';
import './Play.css';

const BOARD_CONFIG = {
  16: { name: '4×4 Grid', component: Board },
  20: { name: 'Donut Ring', component: Donut },
  21: { name: 'X Shape', component: X },
  25: { name: '5×5 Grid', component: Boarder },
};

// Build a robust adjacency map using the board classes' own visitDirection logic
const buildAdjacencyMap = (letters) => {
  const length = letters.length;
  const adj = {};
  for (let i = 0; i < length; i++) adj[i] = [];

  // Helper to create the board and the mapping between compact indices and grid positions
  let board;
  let compactToGrid; // function: compact index -> grid position
  let gridToCompact; // object: grid position -> compact index

  if (length === 16) {
    compactToGrid = (i) => i;
    gridToCompact = {};
    for (let i = 0; i < 16; i++) gridToCompact[i] = i;
    const lettersArr = letters.split('').map((ch, i) => new Letter(ch, i));
    board = new BoardClass(lettersArr);
  } else if (length === 25) {
    compactToGrid = (i) => i;
    gridToCompact = {};
    for (let i = 0; i < 25; i++) gridToCompact[i] = i;
    const lettersArr = letters.split('').map((ch, i) => new Letter(ch, i));
    board = new BoarderClass(lettersArr);
  } else if (length === 20) {
    // Donut: valid grid positions (1,2,3,5,6,7,8,9,10,11,13,14,15,16,17,18,19,21,22,23)
    const donutPositions = [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23];
    compactToGrid = (i) => donutPositions[i];
    gridToCompact = {};
    donutPositions.forEach((gp, i) => { gridToCompact[gp] = i; });
    const grid = new Array(25).fill(null);
    donutPositions.forEach((gp, i) => { grid[gp] = new Letter(letters[i], gp); });
    board = new DonutClass(grid);
  } else if (length === 21) {
    // X shape: holes at corners (0,4,20,24)
    const holePositions = [0, 4, 20, 24];
    const validGridPositions = [];
    for (let g = 0; g < 25; g++) {
      if (!holePositions.includes(g)) validGridPositions.push(g);
    }
    compactToGrid = (i) => validGridPositions[i];
    gridToCompact = {};
    validGridPositions.forEach((gp, i) => { gridToCompact[gp] = i; });
    const grid = new Array(25).fill(null);
    validGridPositions.forEach((gp, i) => { grid[gp] = new Letter(letters[i], gp); });
    board = new XClass(grid);
  } else {
    // Generic square board (e.g. 9, 36) – simple 8‑direction adjacency
    const size = Math.sqrt(length);
    if (Number.isInteger(size) && size > 0) {
      for (let i = 0; i < length; i++) {
        const row = Math.floor(i / size);
        const col = i % size;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = row + dr;
            const nc = col + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
              adj[i].push(nr * size + nc);
            }
          }
        }
      }
    }
    return adj;
  }

  // Now compute adjacency using the board's own movement rules
  for (let i = 0; i < length; i++) {
    const gp = compactToGrid(i);
    // Use a fresh copy of the board to avoid state leakage between tiles
    const freshBoard = board.copyBoard();
    // Mark the starting tile visited so we don't step on it again
    freshBoard.lb[gp].markVisited();

    for (const dir of DIRECTIONS) {
      const neighbor = freshBoard.visitDirection(gp, dir);
      if (neighbor !== -1 && neighbor !== undefined) {
        const neighborCompact = gridToCompact[neighbor.pos];
        if (neighborCompact !== undefined) {
          adj[i].push(neighborCompact);
        }
      }
    }
  }

  return adj;
};

// Recursive DFS that finds a contiguous path matching `word` (lowercase)
const findPath = (word, adjacencyMap, letters) => {
  const lowerWord = word.toLowerCase();
  const length = letters.length;
  const used = new Array(length).fill(false);
  const path = [];

  const dfs = (pos, idx) => {
    if (idx === lowerWord.length) return true;
    // For the first step, try all tiles; otherwise only neighbours
    const candidates = idx === 0 ? Array.from({ length }, (_, i) => i) : adjacencyMap[pos];
    for (const nextIdx of candidates) {
      if (used[nextIdx]) continue;
      if (letters[nextIdx].toLowerCase() !== lowerWord[idx]) continue;
      used[nextIdx] = true;
      path.push(nextIdx);
      if (dfs(nextIdx, idx + 1)) return true;
      path.pop();
      used[nextIdx] = false;
    }
    return false;
  };

  // Try every possible starting tile
  for (let i = 0; i < length; i++) {
    if (letters[i].toLowerCase() === lowerWord[0]) {
      used[i] = true;
      path.push(i);
      if (dfs(i, 1)) return path;
      path.pop();
      used[i] = false;
    }
  }
  return null;
};

const Play = ({ boardType, gameTime, onBack, onGameEnd, englishWords }) => {
  const { secondsLeft, isRunning, start, pause } = useTimer();
  const [boardLetters, setBoardLetters] = useState('');
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

  const boardConfig = BOARD_CONFIG[boardLetters.length];
  const BoardComponent = boardConfig?.component;

  // Build adjacency map once per board
  const adjacencyMap = useMemo(() => {
    if (!boardLetters) return {};
    return buildAdjacencyMap(boardLetters);
  }, [boardLetters]);

  // Path finder using compact indices
  const findWordPath = useCallback((word) => {
    return findPath(word, adjacencyMap, boardLetters);
  }, [adjacencyMap, boardLetters]);

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

      const allWords = findAllValidWords(boardLetters);
      const wordsWithScores = allWords.map(word => ({
        word,
        score: calculateScore(word.length)
      })).sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.word.localeCompare(b.word);
      });

      const total = wordsWithScores.reduce((sum, w) => sum + w.score, 0);
      setAllPossibleWords(wordsWithScores);
      setTotalPossibleScore(total);

      if (onGameEnd) {
        onGameEnd({
          score,
          foundWords,
          allPossibleWords: wordsWithScores,
          totalPossibleScore: total
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  const generateRandomBoard = useCallback(() => {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const cumulativeWeights = [];
    let sum = 0;
    for (const freq of FREQ) {
      sum += freq;
      cumulativeWeights.push(sum);
    }
    const random = () => {
      const r = Math.random() * cumulativeWeights[cumulativeWeights.length - 1];
      return cumulativeWeights.findIndex(w => r <= w);
    };
    let board = '';
    for (let i = 0; i < boardType; i++) {
      board += letters[random()];
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

  useEffect(() => {
    englishWordsRef.current = englishWords;
  }, [englishWords]);

  const findAllValidWords = useCallback((letters) => {
    const validWords = new Set();
    let board;
    let lettersArr;

    if (letters.length === 16) {
      lettersArr = letters.split('').map((char, i) => new Letter(char, i));
      board = new BoardClass(lettersArr);
    } else if (letters.length === 25) {
      lettersArr = letters.split('').map((char, i) => new Letter(char, i));
      board = new BoarderClass(lettersArr);
    } else if (letters.length === 20) {
      const donutPositions = [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23];
      lettersArr = Array(25).fill(null).map((_, i) => {
        const letterIndex = donutPositions.indexOf(i);
        if (letterIndex !== -1) return new Letter(letters[letterIndex], i);
        return null;
      });
      board = new DonutClass(lettersArr);
    } else if (letters.length === 21) {
      lettersArr = letters.split('').map((char, i) => new Letter(char, i));
      board = new XClass(lettersArr);
    } else {
      return [];
    }

    const findValidFrom = (board, word, letter, length, positions) => {
      if (englishWordsRef.current.has(word) && !validWords.has(word)) {
        validWords.add(word.toUpperCase());
      }
      if (length >= MAX_LENGTH) return;
      positions.push(letter.pos);
      for (const dir of DIRECTIONS) {
        const copyBoard = board.copyBoard();
        const neighborLetter = copyBoard.visitDirection(letter.pos, dir);
        if (neighborLetter !== -1) {
          findValidFrom(copyBoard, word + neighborLetter.char, neighborLetter, length + 1, [...positions]);
        }
      }
    };

    board.lb.forEach(letter => {
      if (!letter) return;
      letter.markVisited();
      findValidFrom(board, letter.char, letter, 1, [letter.pos]);
      letter.visited = false;
    });

    return Array.from(validWords);
  }, []);

  // Simple adjacency check using the precomputed map
  const isAdjacent = (lastTile, newTile) => {
    return adjacencyMap[lastTile]?.includes(newTile) || false;
  };

  const handleTileClick = (index) => {
    if (gameOver || !isRunning) return;
    const letter = boardLetters[index].toUpperCase();

    // Clicking the last tile again removes it (backspace)
    if (selectedTiles.includes(index)) {
      if (selectedTiles[selectedTiles.length - 1] === index) {
        setSelectedTiles(prev => prev.slice(0, -1));
        setCurrentWord(prev => prev.slice(0, -1));
      }
      return;
    }

    if (selectedTiles.length > 0) {
      const lastTile = selectedTiles[selectedTiles.length - 1];
      if (!isAdjacent(lastTile, index)) return;
    }

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

    // Dragging back over the previous tile removes it
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

    const letter = boardLetters[index].toUpperCase();
    setSelectedTiles(prev => [...prev, index]);
    setCurrentWord(prev => prev + letter);
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

  const handleMouseUp = useCallback(() => {
    if (isDragging && currentWord.length >= 3) {
      handleSubmit();
    } else if (isDragging) {
      setSelectedTiles([]);
      setCurrentWord('');
    }
    setIsDragging(false);
  }, [isDragging, currentWord, handleSubmit]);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  const calculateScore = (length) => {
    if (length < 3 || length > 10) return 0;
    return POINTS[length - 3];
  };

  const handleClear = useCallback(() => {
    setSelectedTiles([]);
    setCurrentWord('');
    setMessage(null);
  }, []);

  // Keyboard handler: tries to extend the current path, otherwise finds a new one
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

    const newLetter = key.toUpperCase();

    // First letter
    if (selectedTiles.length === 0) {
      const path = findWordPath(key);
      if (path) {
        setSelectedTiles(path);
        setCurrentWord(newLetter);
        setMessage(null);
      }
      return;
    }

    // Try to extend the current selection
    const lastTile = selectedTiles[selectedTiles.length - 1];
    for (const neighbor of adjacencyMap[lastTile] || []) {
      if (!selectedTiles.includes(neighbor) && boardLetters[neighbor].toLowerCase() === key) {
        setSelectedTiles(prev => [...prev, neighbor]);
        setCurrentWord(prev => prev + newLetter);
        setMessage(null);
        return;
      }
    }

    // Couldn't extend – search for a completely new path for the full typed word
    const attemptedWord = currentWord + newLetter;
    const newPath = findWordPath(attemptedWord.toLowerCase());
    if (newPath) {
      setSelectedTiles(newPath);
      setCurrentWord(attemptedWord);
      setMessage(null);
    }
    // If no path exists, the key is ignored
  }, [
    gameOver, isRunning, selectedTiles, currentWord,
    adjacencyMap, boardLetters, findWordPath, handleSubmit, handleClear
  ]);

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
    const BoardComponent = {
      16: Board,
      20: Donut,
      21: X,
      25: Boarder,
    }[boardLetters.length];

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

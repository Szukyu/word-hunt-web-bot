import { useState, useMemo } from "react";
import Play from "../Play/Play";
import Results from "../Results/Results";
import Board from "../Boards/Board";
import Boarder from "../Boards/Boarder";
import Donut from "../Boards/Donut";
import X from "../Boards/X";
import { getPreviewMetrics } from "../../utils/boardPreview.js";
import { saveGame } from "../../lib/stats.js";
import './Setup.css';

const Setup = ({ englishWords, wordStarts }) => {
  const [selectedBoard, setSelectedBoard] = useState(0);
  const [gameTime, setGameTime] = useState(30);
  const [customTime, setCustomTime] = useState('');
  const [isZen, setIsZen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameResult, setGameResult] = useState(null);

  const boardOptions = [
    { 
      name: '4×4 Grid', 
      component: 'Board', 
      letters: 'abcdefghijklmnop',
      size: 16
    },
    { 
      name: '5×5 Grid', 
      component: 'Boarder', 
      letters: 'abcdefghijklmnopqrstuvwxy',
      size: 25
    },
    { 
      name: 'Donut Ring', 
      component: 'Donut', 
      letters: 'abcdefghijklmnopqrst',
      size: 20
    },
    { 
      name: 'X Shape', 
      component: 'X', 
      letters: 'abcdefghijklmnopqrstu',
      size: 21
    }
  ];

  const timeOptions = [10, 15, 30, 60, 90, 120, 180];

  const renderBoard = (option) => {
    const props = { letters: option.letters, positions: [] };
    switch(option.component) {
      case 'Board': return <Board {...props} />;
      case 'Boarder': return <Boarder {...props} />;
      case 'Donut': return <Donut {...props} />;
      case 'X': return <X {...props} />;
      default: return null;
    }
  };

  const selectBoard = (index) => {
    setSelectedBoard(index);
  };

  const formatTime = (sec) => {
    return `${sec}s`;
  };

  const applyCustomTime = () => {
    const parsed = parseInt(customTime, 10);
    if (Number.isNaN(parsed)) return;
    // Clamp custom durations to a sane range (10s-10min)
    const clamped = Math.min(600, Math.max(10, parsed));
    setGameTime(clamped);
    setIsZen(false);
    setCustomTime('');
  };

  const startGame = () => {
    setIsPlaying(true);
  };

  const handleBackToSetup = () => {
    setIsPlaying(false);
  };

  const handleGameEnd = async (result) => {
    setGameResult(result);
    setIsPlaying(false);
    // Zen games report elapsed seconds; clamp to >= 1 to satisfy games.game_time > 0
    const effectiveTime = Math.max(1, result.gameTime ?? (isZen ? 1 : gameTime));
    // Persist to Supabase for global leaderboards (all-time / weekly / per board)
    try {
      await saveGame({
        boardType: result.boardType ?? activeBoard.size,
        boardLetters: result.boardLetters ?? activeBoard.letters,
        gameTime: effectiveTime,
        score: result.score,
        foundWords: result.foundWords,
        totalPossibleScore: result.totalPossibleScore,
        totalPossibleWords: result.allPossibleWords?.length ?? 0,
        isDaily: false,
        puzzleDate: null,
      });
    } catch (e) {
      // non-fatal: leaderboard may stay empty until retry
      console.warn('[setup] saveGame failed', e?.message);
    }
  };

  const handlePlayAgain = () => {
    setGameResult(null);
    setIsPlaying(true);
  };

  const activeBoard = boardOptions[selectedBoard];
  const previewMetrics = useMemo(() => getPreviewMetrics(activeBoard.size), [activeBoard.size]);

  if (gameResult) {
    return (
      <Results
        score={gameResult.score}
        foundWords={gameResult.foundWords}
        allPossibleWords={gameResult.allPossibleWords}
        totalPossibleScore={gameResult.totalPossibleScore}
        onPlayAgain={handlePlayAgain}
        onBack={() => setGameResult(null)}
      />
    );
  }

  if (isPlaying) {
    return (
      <Play 
        boardType={activeBoard.size}
        gameTime={isZen ? 0 : gameTime}
        onBack={handleBackToSetup}
        onGameEnd={handleGameEnd}
        englishWords={englishWords}
        wordStarts={wordStarts}
      />
    );
  }

  return (
    <section className="setup-area">
      <div className="setup-header">
        <div className="setup-title">
          <span className="eyebrow">Practice</span>
          <h1>Choose Your Board and Time</h1>
        </div>
        <button className="start-button" onClick={startGame}>
          {isZen ? 'Start Zen' : 'Start Practice'}
        </button>
      </div>

      <div className="setup-content">
        <div className="preview-section">
          <div className="preview-card">
            <div className="preview-header">
              <div>
                <span className="preview-label">Current Board</span>
                <h2>{activeBoard.name}</h2>
              </div>
              <div className="preview-meta">
                <span>{activeBoard.letters.length} letters</span>
                <span>{isZen ? '∞ zen' : formatTime(gameTime)}</span>
              </div>
            </div>
            <div
              className="board-preview"
              data-size={activeBoard.size}
              style={{
                '--tile-size': `${previewMetrics.tileSize}px`,
                '--tile-gap': `${previewMetrics.gap}px`,
              }}
            >
              {renderBoard(activeBoard)}
            </div>
          </div>
        </div>

        <div className="controls-section">
          <div className="control-group">
            <div className="control-header">
              <h3>Board Style</h3>
            </div>
            <div className="board-options">
              {boardOptions.map((option, index) => (
                <button
                  key={option.name}
                  className={`board-option ${selectedBoard === index ? 'active' : ''}`}
                  onClick={() => selectBoard(index)}
                >
                  <span className="option-name">{option.name}</span>
                  <span className="option-meta">{option.letters.length} letters</span>
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <div className="control-header">
              <h3>Game Duration</h3>
            </div>
            <div className="timer-controls">
              <div className="timer-display">{isZen ? '∞ zen' : formatTime(gameTime)}</div>
              <div className="timer-presets">
                {timeOptions.map((time) => (
                  <button
                    key={time}
                    className={`timer-preset ${!isZen && gameTime === time ? 'active' : ''}`}
                    onClick={() => { setGameTime(time); setIsZen(false); }}
                  >
                    {time}s
                  </button>
                ))}
                <button
                  className={`timer-preset zen ${isZen ? 'active' : ''}`}
                  onClick={() => setIsZen((v) => !v)}
                  title="Untimed practice — finish manually, aim for 100%"
                >
                  ∞ zen
                </button>
              </div>
              <div className="timer-custom-row">
                <input
                  className="timer-custom-input"
                  type="number"
                  min={10}
                  max={600}
                  step={5}
                  placeholder="Custom seconds (10–600)"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') applyCustomTime(); }}
                  aria-label="Custom game duration in seconds"
                />
                <button className="timer-custom-apply" onClick={applyCustomTime} disabled={!customTime}>
                  Set
                </button>
              </div>
              {isZen && (
                <span className="zen-hint">No timer — play until you hit 100%, then Finish.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Setup;

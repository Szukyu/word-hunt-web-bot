import { useState } from "react";
import Play from "../Play/Play";
import Results from "../Results/Results";
import Board from "../Boards/Board";
import Boarder from "../Boards/Boarder";
import Donut from "../Boards/Donut";
import X from "../Boards/X";
import './Setup.css';

const Setup = ({ englishWords, wordStarts }) => {
  const [selectedBoard, setSelectedBoard] = useState(0);
  const [gameTime, setGameTime] = useState(30);
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

  const timeOptions = [10, 15, 30, 60, 90, 120];

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

  const startGame = () => {
    setIsPlaying(true);
  };

  const handleBackToSetup = () => {
    setIsPlaying(false);
  };

  const handleGameEnd = (result) => {
    setGameResult(result);
    setIsPlaying(false);
  };

  const handlePlayAgain = () => {
    setGameResult(null);
    setIsPlaying(true);
  };

  const activeBoard = boardOptions[selectedBoard];

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
        gameTime={gameTime}
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
          Start Practice
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
                <span>{formatTime(gameTime)}</span>
              </div>
            </div>
            <div className="board-preview">
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
              <div className="timer-display">{formatTime(gameTime)}</div>
              <div className="timer-presets">
                {timeOptions.map((time) => (
                  <button
                    key={time}
                    className={`timer-preset ${gameTime === time ? 'active' : ''}`}
                    onClick={() => setGameTime(time)}
                  >
                    {time}s
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Setup;

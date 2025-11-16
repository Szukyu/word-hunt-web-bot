import { useState, useEffect } from "react";
import Board from "../Boards/Board";
import Boarder from "../Boards/Boarder";
import Donut from "../Boards/Donut";
import X from "../Boards/X";
import './Setup.css';

const Setup = ({ englishWords, wordStarts }) => {
  const [selectedBoard, setSelectedBoard] = useState(0);
  const [gameTime, setGameTime] = useState(30);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  const MIN_WIDTH = 970;
  const MIN_HEIGHT = 660;

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const boardOptions = [
    { 
      name: '4x4 Grid', 
      component: 'Board', 
      letters: 'abcdefghijklmnop'
    },
    { 
      name: '5x5 Grid', 
      component: 'Boarder', 
      letters: 'abcdefghijklmnopqrstuvwxy'
    },
    { 
      name: 'Donut Ring', 
      component: 'Donut', 
      letters: 'abcdefghijklmnopqrst'
    },
    { 
      name: 'X Shape', 
      component: 'X', 
      letters: 'abcdefghijklmnopqrstu'
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
    return `${sec} seconds`;
  };

  const startGame = () => {
    // TEMP
  };

  // Window Size Check
  if (windowSize.width < MIN_WIDTH || windowSize.height < MIN_HEIGHT) {
    return (
      <div className="size-warning-container">
        <div className="size-warning-content">
          <div className="warning-icon">📱</div>
          <h1 className="warning-title">Screen Too Small</h1>
          <p className="warning-message">
            Please resize your window to at least {MIN_WIDTH} × {MIN_HEIGHT} pixels 
            to play the game comfortably.
          </p>
          <div className="current-size">
            Current: {windowSize.width} × {windowSize.height}
          </div>
          <div className="required-size">
            Required: {MIN_WIDTH} × {MIN_HEIGHT} or larger
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="setup-container">
      <div className="setup-content">
        <h1 className="setup-title">Choose Your Arena</h1>

        <div className="setup-grid">
          {/* Board Preview */}
          <div className="preview-section">
            <div className="preview-wrapper">
              <div className="preview-container">
                {renderBoard(boardOptions[selectedBoard])}
              </div>
            </div>
          </div>

          {/* Controls Section */}
          <div className="controls-section">
            {/* Board Selection */}
            <div className="controls-group">
              <h3 className="controls-title">Board Type</h3>
              <div className="board-grid">
                {boardOptions.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => selectBoard(index)}
                    className={`board-btn ${selectedBoard === index ? 'selected' : ''}`}
                  >
                    <span className="board-name">{option.name}</span>
                    <span className="board-letters">{option.letters.length} letters</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Time Selection */}
            <div className="controls-group">
              <h3 className="controls-title">Game Duration</h3>
              <div className="time-controls">
                <div className="time-slider-container">
                  <input
                    type="range"
                    min="0"
                    max={timeOptions.length - 1}
                    value={timeOptions.indexOf(gameTime)}
                    onChange={(e) => setGameTime(timeOptions[parseInt(e.target.value)])}
                    className="time-slider"
                  />
                </div>
                <div className="time-display">
                  {formatTime(gameTime)}
                </div>
              </div>
            </div>

            {/* Start Button */}
            <button onClick={startGame} className="start-btn">
              <span>Launch Game</span>
              <span className="arrow">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Setup;

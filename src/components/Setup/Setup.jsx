import { useState } from "react";
import Board from "../Boards/Board";
import Boarder from "../Boards/Boarder";
import Donut from "../Boards/Donut";
import X from "../Boards/X";
import './Setup.css';

const Setup = ({ englishWords, wordStarts }) => {
  const [selectedBoard, setSelectedBoard] = useState(0);
  const [gameTime, setGameTime] = useState(30); // 30 Seconds Default

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

  const handleTimeChange = (e) => {
    // Pass to Timer Hook
  };

  const formatTime = (sec) => {
    return `${sec} seconds`;
  };

  const startGame = () => {
    // TEMP
  };

  return (
    <div className="setup-container">
      <div className="setup-content">
        <h1 className="setup-title">Choose Your Arena</h1>

        <div className="main-layout">
          {/* Left side - Board Preview */}
          <div className="preview-section">
            <div className="preview-container">
              {renderBoard(boardOptions[selectedBoard])}
            </div>
          </div>

          {/* Right side - Board Options and Timer */}
          <div className="options-section">
            <div className="board-options-grid">
              {boardOptions.map((option, index) => (
                <div 
                  key={index}
                  onClick={() => selectBoard(index)}
                  className={`board-option ${selectedBoard === index ? 'selected' : ''}`}
                >
                  <h3 className="board-name">{option.name}</h3>
                  <span className="letter-count">{option.letters.length} letters</span>
                </div>
              ))}
            </div>

            <div className="time-section">
              <h3 className="time-title">Game Duration</h3>
              <div className="time-slider-container">
                <input
                  type="range"
                  min="0"
                  max={timeOptions.length - 1}
                  value={timeOptions.indexOf(gameTime)}
                  onChange={(e) => setGameTime(timeOptions[parseInt(e.target.value)])}
                  className="time-slider"
                />
                <div className="time-display">
                  {formatTime(gameTime)}
                </div>
              </div>
            </div>

            <button onClick={startGame} className="start-button">
              <span className="button-text">Launch Game</span>
              <span className="button-arrow">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Setup;

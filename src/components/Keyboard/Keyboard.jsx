import { useState, useEffect } from 'react';
import './Keyboard.css';

const Keyboard = ({ activeKey = '', onKeyPress, showKeyboard = true }) => {
  const [pressedKeys, setPressedKeys] = useState(new Set());

  const keyboardLayout = [
    [
      { value: 'Q', display: 'Q' },
      { value: 'W', display: 'W' },
      { value: 'E', display: 'E' },
      { value: 'R', display: 'R' },
      { value: 'T', display: 'T' },
      { value: 'Y', display: 'Y' },
      { value: 'U', display: 'U' },
      { value: 'I', display: 'I' },
      { value: 'O', display: 'O' },
      { value: 'P', display: 'P' }
    ],
    [
      { value: 'A', display: 'A' },
      { value: 'S', display: 'S' },
      { value: 'D', display: 'D' },
      { value: 'F', display: 'F' },
      { value: 'G', display: 'G' },
      { value: 'H', display: 'H' },
      { value: 'J', display: 'J' },
      { value: 'K', display: 'K' },
      { value: 'L', display: 'L' }
    ],
    [
      { value: 'Z', display: 'Z' },
      { value: 'X', display: 'X' },
      { value: 'C', display: 'C' },
      { value: 'V', display: 'V' },
      { value: 'B', display: 'B' },
      { value: 'N', display: 'N' },
      { value: 'M', display: 'M' }
    ],
    [
      { value: 'Space', display: '' },
      { value: 'Enter', display: 'Enter' },
    ]
  ];

  useEffect(() => {
    const handleKeyDown = (event) => {
      let key = event.key.toUpperCase();
      if (key === ' ') key = 'Space';
      if (key === 'ENTER') key = 'Enter';
      
      setPressedKeys(prev => new Set([...prev, key]));
    };

    const handleKeyUp = (event) => {
      let key = event.key.toUpperCase();
      if (key === ' ') key = 'Space';
      if (key === 'ENTER') key = 'Enter';
      
      setPressedKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleKeyClick = (key) => {
    if (onKeyPress) {
      onKeyPress(key);
    }
  };

  const getKeyClass = (keyValue) => {
    let classes = 'key';
    
    if (keyValue === 'Space') classes += ' key-space';
    else if (keyValue === 'Enter') classes += ' key-enter';
    else classes += ' key-letter';
    
    if (activeKey === keyValue) classes += ' key-active';
    if (pressedKeys.has(keyValue)) classes += ' key-pressed';
    
    return classes;
  };

  if (!showKeyboard) return null;

  return (
    <div className="keyboard">
      {keyboardLayout.map((row, rowIndex) => (
        <div key={rowIndex} className="row">
          {row.map((key) => (
            <button
              key={key.value}
              className={getKeyClass(key.value)}
              onClick={() => handleKeyClick(key.value)}
              data-key={key.value}
            >
              {key.display || key.value}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
};

export default Keyboard;

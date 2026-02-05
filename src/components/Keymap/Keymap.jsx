import { useState, useEffect, useCallback } from 'react';
import './Keymap.css'

const Keymap = () => {
  const [flashingKeys, setFlashingKeys] = useState(new Set());

  const layoutData = {
    row1: [
      ['q', 'Q'], ['w', 'W'], ['e', 'E'], ['r', 'R'], ['t', 'T'], ['y', 'Y'],
      ['u', 'U'], ['i', 'I'], ['o', 'O'], ['p', 'P']
    ],
    row2: [
      ['a', 'A'], ['s', 'S'], ['d', 'D'], ['f', 'F'], ['g', 'G'], ['h', 'H'],
      ['j', 'J'], ['k', 'K'], ['l', 'L']
    ],
    row3: [
      ['z', 'Z'], ['x', 'X'], ['c', 'C'], ['v', 'V'], ['b', 'B'], ['n', 'N'],
      ['m', 'M']
    ],
    row4: [['Enter', 'Enter']]
  };

  const keyCodeMap = {
    'KeyQ': 'q', 'KeyW': 'w', 'KeyE': 'e', 'KeyR': 'r', 'KeyT': 't',
    'KeyY': 'y', 'KeyU': 'u', 'KeyI': 'i', 'KeyO': 'o', 'KeyP': 'p',
    'KeyA': 'a', 'KeyS': 's', 'KeyD': 'd', 'KeyF': 'f', 'KeyG': 'g',
    'KeyH': 'h', 'KeyJ': 'j', 'KeyK': 'k', 'KeyL': 'l',
    'KeyZ': 'z', 'KeyX': 'x', 'KeyC': 'c', 'KeyV': 'v', 'KeyB': 'b',
    'KeyN': 'n', 'KeyM': 'm',
    'Enter': 'Enter'
  };

  const flashKey = useCallback((key) => {
    setFlashingKeys(prev => new Set([...prev, key]));
    setTimeout(() => {
      setFlashingKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }, 100);
  }, []);

  const handleKeyDown = useCallback((e) => {
    const key = keyCodeMap[e.code];
    if (key) {
      flashKey(key);
    }
  }, [flashKey]);

  const handleKeyUp = useCallback((e) => {
    const key = keyCodeMap[e.code];
    if (key) {
      setFlashingKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  const renderKey = (keyData, index, isEnter = false) => {
    const [lowerCase, upperCase] = keyData;
    const isFlashing = flashingKeys.has(lowerCase);
    const hasBump = (lowerCase === 'f' || lowerCase === 'j');

    let keyClasses = 'keymap-key';
    if (isEnter) {
      keyClasses += ' enter';
    }

    if (isFlashing) {
      keyClasses += ' flashing';
    }

    return (
      <div key={index} className={keyClasses}>
        <span>{isEnter ? 'Enter' : (upperCase || lowerCase)}</span>
        {hasBump && <div className="bump"></div>}
      </div>
    );
  };

  const renderRow = (rowData, rowIndex) => {
    const rowClasses = `keymap-row ${rowIndex === 3 ? 'bottom-row' : ''}`;
    return (
      <div key={rowIndex} className={rowClasses}>
        {rowData.map((keyData, keyIndex) => {
          if (rowIndex === 3) {
            const isEnter = keyData[0] === 'Enter';
            return renderKey(keyData, keyIndex, isEnter);
          }
          return renderKey(keyData, keyIndex);
        })}
      </div>
    );
  };

  return (
    <div className="keymap-layout">
      {renderRow(layoutData.row1, 0)}
      {renderRow(layoutData.row2, 1)}
      {renderRow(layoutData.row3, 2)}
      {renderRow(layoutData.row4, 3)}
    </div>
  );
};

export default Keymap;

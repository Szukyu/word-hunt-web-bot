import './Key.css';

const Key = ({ keyValue, displayText, isActive, isPressed, onClick }) => {
  const getKeyClass = () => {
    let classes = 'keyboard-key';
    
    if (keyValue === 'Space') classes += ' key-space';
    else if (keyValue === 'Enter') classes += ' key-enter';
    else if (keyValue === 'Backspace') classes += ' key-backspace';
    else classes += ' key-letter';
    
    if (isActive) classes += ' key-active';
    if (isPressed) classes += ' key-pressed';
    
    return classes;
  };

  return (
    <button
      className={getKeyClass()}
      onClick={onClick}
      data-key={keyValue}
    >
      {displayText || keyValue}
    </button>
  );
};

export default Key;

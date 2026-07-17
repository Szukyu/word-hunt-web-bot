import './Tile.css'

const Tile = ({ value, part, onClick, onMouseDown, onMouseEnter, onTouchStart, index }) => {
  return (
    <div
      className={`tile ${part ? 'highlight' : ''}`}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onTouchStart={onTouchStart}
      data-index={index}
    >
      {value}
    </div>
  );
};

export default Tile;

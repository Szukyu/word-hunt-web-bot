import './Tile.css'

const Tile = ({ value, part, onClick, onMouseDown, onMouseEnter, onTouchStart, index }) => {
  return (
    <div
      className={`tile ${part ? 'highlight' : ''}`}
      onClick={onClick}
      onMouseDown={(e) => {
        e.preventDefault();
        onMouseDown?.(e);
      }}
      onMouseEnter={onMouseEnter}
      onTouchStart={onTouchStart}
      onDragStart={(e) => e.preventDefault()}
      draggable={false}
      data-index={index}
    >
      {value}
    </div>
  );
};

export default Tile;

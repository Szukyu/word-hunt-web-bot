import './Tile.css'

const Tile = ({ value, part, onClick, onMouseDown, onMouseEnter, onTouchStart, onPointerDown, index }) => {
  return (
    <div
      className={`tile ${part ? 'highlight' : ''}`}
      onClick={() => onClick?.(index)}
      onMouseDown={(e) => {
        e.preventDefault();
        onMouseDown?.(index, e);
      }}
      onPointerDown={(e) => {
        try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch (_e) { void _e; }
        if (onPointerDown) onPointerDown(index, e);
        else onMouseDown?.(index, e);
      }}
      onPointerEnter={() => onMouseEnter?.(index)}
      onMouseEnter={() => onMouseEnter?.(index)}
      onTouchStart={(e) => onTouchStart?.(index, e)}
      onDragStart={(e) => e.preventDefault()}
      draggable={false}
      data-index={index}
    >
      {value}
    </div>
  );
};

export default Tile;

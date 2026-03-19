import './Tile.css' 

const Tile = ({ value, part, onClick, onMouseDown, onMouseEnter }) => {
  return (
    <div 
      className={`tile ${part ? 'highlight' : ''}`} 
      onClick={onClick}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
    >
      {value}
    </div>
  );
};

export default Tile;

import './Tile.css' 

const Tile = ({ value, part, onClick }) => {
  return (
    <div className={`tile ${part ? 'highlight' : ''}`} onClick={onClick}>
      {value}
    </div>
  );
};

export default Tile;

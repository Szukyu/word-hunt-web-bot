import './Tile.css' 

const Tile = ({ value, part }) => {
  return (
    <div className={`tile ${part ? 'highlight' : ''}`}>
      {value}
    </div>
  );
};

export default Tile;

import './Tile.css' 

const Tile = ({ value, part }) => {
  return (
    <div className={`tile ${part ? 'part' : ''}`}>
      {value}
    </div>
  );
};

export default Tile;

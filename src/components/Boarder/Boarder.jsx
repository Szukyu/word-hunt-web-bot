import { useState, useEffect } from 'react';
import Tile from "../Tile/Tile.jsx";

const Boarder = ({ letters = '', positions = [] }) => {
  const initializeTiles = () => {
    if (letters && letters.length === 25) {
      return letters.split('').map(letter => letter.toUpperCase());
    }
    return Array(25).fill(null);
  };

  const [tiles, setTiles] = useState(initializeTiles());

  useEffect(() => {
    setTiles(initializeTiles());
  }, [letters]);

  const renderTile = (i) => {
    const isPart = positions.includes(i);
    return (
      <Tile key={i} value={tiles[i]} part={isPart} />
    );
  };

  const rows = [];
  for (let i = 0; i < 5; i++) {
    const rowTiles = [];
    for (let j = 0; j < 5; j++) {
      const tileIndex = i * 5 + j;
      rowTiles.push(renderTile(tileIndex));
    }
    rows.push(
      <div key={i} className="board-row">
        {rowTiles}
      </div>
    );
  }

  return (
    <div className="app" style={{ backgroundColor: '#080A18' }}>
      <div className="board-container">
        {rows}
      </div>
    </div>
  );
};

export default Boarder;


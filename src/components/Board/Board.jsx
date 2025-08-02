import React, { useState } from 'react';
import Tile from "../Tile/Tile.jsx"

const Board = ({ letters = '' }) => {
  const initializeTiles = () => {
    if (letters && letters.length >= 16) {
      return letters.slice(0, 16).split('').map(letter => letter.toUpperCase());
    }
    return Array(16).fill(null);
  };
  
  const [tiles, setTiles] = useState(initializeTiles());
  
  React.useEffect(() => {
    setTiles(initializeTiles());
  }, [letters]);
  
  const renderTile = (i) => {
    return (
      <Tile
        key={i}
        value={tiles[i]}
      />
    );
  };
  
  const rows = [];
  for (let i = 0; i < 4; i++) {
    const rowTiles = [];
    for (let j = 0; j < 4; j++) {
      const tileIndex = i * 4 + j;
      rowTiles.push(renderTile(tileIndex));
    }
    rows.push(
      <div key={i} className="board-row">
        {rowTiles}
      </div>
    );
  }
  
  return (
    <div className="app" style={{backgroundColor: '#080A18'}}>
      <div className="board-container">
        {rows}
      </div>
    </div>
  );
};

export default Board;

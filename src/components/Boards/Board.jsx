import { useState, useEffect } from 'react';
import Tile from "../Tile/Tile.jsx";

const Board = ({ letters = '', positions = [], onTileClick, onTileMouseDown, onTileMouseEnter, onTileTouchStart }) => {
  const initializeTiles = () => {
    if (letters && letters.length === 16) {
      return letters.split('').map(letter => letter.toUpperCase());
    }
    return Array(16).fill(null);
  };

  const [tiles, setTiles] = useState(initializeTiles());

  useEffect(() => {
    setTiles(initializeTiles());
  }, [letters]);

  const renderTile = (i) => {
    const isPart = positions.includes(i);
    return (
      <Tile
        key={i}
        value={tiles[i]}
        part={isPart}
        index={i}
        onClick={() => onTileClick?.(i)}
        onMouseDown={() => onTileMouseDown?.(i)}
        onMouseEnter={() => onTileMouseEnter?.(i)}
        onTouchStart={(e) => onTileTouchStart?.(i, e)}
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
    <div className="app" style={{ backgroundColor: '#080A18' }} onDragStart={(e) => e.preventDefault()}>
      <div className="board-container" onDragStart={(e) => e.preventDefault()}>
        {rows}
      </div>
    </div>
  );
};

export default Board;

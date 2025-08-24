import { useState, useEffect } from 'react';
import Tile from "../Tile/Tile.jsx";
import InvisibleTile from "../InvisibleTile/InvisibleTile.jsx"

const Donut = ({ letters = '', positions = [] }) => {
  const initializeTiles = () => {
    if (letters && letters.length === 20) {
      return letters.split('').map(letter => letter.toUpperCase());
    }
    return Array(20).fill(null);
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
  
  const renderInvis = () => {
    return (
      <InvisibleTile />
    );
  };

  const rows = [];
  let tileIndex = 0;
  let i = 0;
  let rowTiles = [];
  rowTiles.push(renderInvis());
  rowTiles.push(renderTile(tileIndex));
  tileIndex++;
  rowTiles.push(renderTile(tileIndex));
  tileIndex++;
  rowTiles.push(renderTile(tileIndex));
  tileIndex++;
  rowTiles.push(renderInvis());
  rows.push(
    <div key={i} className="board-row">
      {rowTiles}
    </div>
  );
  i++;
  rowTiles = [];
  rowTiles.push(renderTile(tileIndex));
  tileIndex++;
  rowTiles.push(renderTile(tileIndex));
  tileIndex++;
  rowTiles.push(renderTile(tileIndex));
  tileIndex++; 
  rowTiles.push(renderTile(tileIndex));
  tileIndex++;
  rowTiles.push(renderTile(tileIndex));
  tileIndex++;
  rows.push(
    <div key={i} className="board-row">
      {rowTiles}
    </div>
  );
  i++
  rowTiles = [];
  rowTiles.push(renderTile(tileIndex));
  tileIndex++;
  rowTiles.push(renderTile(tileIndex));
  tileIndex++;
  rowTiles.push(renderInvis());
  rowTiles.push(renderTile(tileIndex));
  tileIndex++;
  rowTiles.push(renderTile(tileIndex));
  tileIndex++;
  rows.push(
    <div key={i} className="board-row">
      {rowTiles}
    </div>
  );
  i++
  rowTiles = [];
  rowTiles.push(renderTile(tileIndex));
  tileIndex++;
  rowTiles.push(renderTile(tileIndex));
  tileIndex++;
  rowTiles.push(renderTile(tileIndex));
  tileIndex++; 
  rowTiles.push(renderTile(tileIndex));
  tileIndex++;
  rowTiles.push(renderTile(tileIndex));
  tileIndex++;
  rows.push(
    <div key={i} className="board-row">
      {rowTiles}
    </div>
  );
  i++;
  rowTiles = [];
  rowTiles.push(renderInvis());
  rowTiles.push(renderTile(tileIndex));
  tileIndex++;
  rowTiles.push(renderTile(tileIndex));
  tileIndex++;
  rowTiles.push(renderTile(tileIndex));
  tileIndex++;
  rowTiles.push(renderInvis());
  rows.push(
    <div key={i} className="board-row">
      {rowTiles}
    </div>
  );

  return (
    <div className="app" style={{ backgroundColor: '#080A18' }}>
      <div className="board-container">
        {rows}
      </div>
    </div>
  );
};

export default Donut;

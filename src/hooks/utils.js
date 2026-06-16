import { Letter, MAX_LENGTH, DIRECTIONS, Board as BoardClass, Boarder as BoarderClass, Donut as DonutClass, X as XClass } from '../utils/Board.jsx'

export const buildAdjacencyMap = (letters) => {
  const length = letters.length;
  const adj = {};
  for (let i = 0; i < length; i++) adj[i] = [];

  let board;
  let compactToGrid; // (compactIndex) => gridIndex
  let gridToCompact; // { [gridIndex]: compactIndex }

  if (length === 16) {
    compactToGrid = (i) => i;
    gridToCompact = {};
    for (let i = 0; i < 16; i++) gridToCompact[i] = i;
    const arr = letters.split('').map((ch, i) => new Letter(ch, i));
    board = new BoardClass(arr);
  } else if (length === 25) {
    compactToGrid = (i) => i;
    gridToCompact = {};
    for (let i = 0; i < 25; i++) gridToCompact[i] = i;
    const arr = letters.split('').map((ch, i) => new Letter(ch, i));
    board = new BoarderClass(arr);
  } else if (length === 20) {
		// Donut
    const donutPositions = [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23];
    compactToGrid = (i) => donutPositions[i];
    gridToCompact = {};
    donutPositions.forEach((gp, i) => { gridToCompact[gp] = i; });
    const grid = new Array(25).fill(null);
    donutPositions.forEach((gp, i) => { grid[gp] = new Letter(letters[i], gp); });
    board = new DonutClass(grid);
  } else if (length === 21) {
		// X
    const holes = [0, 4, 20, 24];
    const valid = [];
    for (let g = 0; g < 25; g++) {
      if (!holes.includes(g)) valid.push(g);
    }
    compactToGrid = (i) => valid[i];
    gridToCompact = {};
    valid.forEach((gp, i) => { gridToCompact[gp] = i; });
    const grid = new Array(25).fill(null);
    valid.forEach((gp, i) => { grid[gp] = new Letter(letters[i], gp); });
    board = new XClass(grid);
  } else {
		// Square Board 4x4 and 5x5
    const size = Math.sqrt(length);
    if (Number.isInteger(size) && size > 0) {
      for (let i = 0; i < length; i++) {
        const row = Math.floor(i / size);
        const col = i % size;
        const neighbours = [];
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = row + dr;
            const nc = col + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
              neighbours.push(nr * size + nc);
            }
          }
        }
        adj[i] = neighbours;
      }
    }
    return adj;
  }

	// Neighbor Logic
  for (let i = 0; i < length; i++) {
    const gp = compactToGrid(i);
    const freshBoard = board.copyBoard();
    freshBoard.lb[gp].markVisited(); // prevent stepping on itself

    for (const dir of DIRECTIONS) {
      const neighbour = freshBoard.visitDirection(gp, dir);
      if (neighbour !== -1 && neighbour !== undefined) {
        const neighbourCompact = gridToCompact[neighbour.pos];
        if (neighbourCompact !== undefined) {
          adj[i].push(neighbourCompact);
        }
      }
    }
  }

  return adj;
};

// Recursive DFS to find Path
export const findPath = (word, adjacencyMap, letters) => {
  const lowerWord = word.toLowerCase();
  const length = letters.length;
  const used = new Array(length).fill(false);
  const path = [];

  const dfs = (pos, idx) => {
    if (idx === lowerWord.length) return true;
    const candidates = idx === 0 ? Array.from({ length }, (_, i) => i) : adjacencyMap[pos];
    for (const nextIdx of candidates) {
      if (used[nextIdx]) continue;
      if (letters[nextIdx].toLowerCase() !== lowerWord[idx]) continue;
      used[nextIdx] = true;
      path.push(nextIdx);
      if (dfs(nextIdx, idx + 1)) return true;
      path.pop();
      used[nextIdx] = false;
    }
    return false;
  };

  for (let i = 0; i < length; i++) {
    if (letters[i].toLowerCase() === lowerWord[0]) {
      used[i] = true;
      path.push(i);
      if (dfs(i, 1)) return path;
      path.pop();
      used[i] = false;
    }
  }
  return null;
};

export const findAllValidWords = (letters, dict) => {
  const validWords = new Set();
  let board;
  let lettersArr;

  if (letters.length === 16) {
    lettersArr = letters.split('').map((ch, i) => new Letter(ch, i));
    board = new BoardClass(lettersArr);
  } else if (letters.length === 25) {
    lettersArr = letters.split('').map((ch, i) => new Letter(ch, i));
    board = new BoarderClass(lettersArr);
  } else if (letters.length === 20) {
    const donutPositions = [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23];
    lettersArr = Array(25).fill(null).map((_, i) => {
      const idx = donutPositions.indexOf(i);
      if (idx !== -1) return new Letter(letters[idx], i);
      return null;
    });
    board = new DonutClass(lettersArr);
  } else if (letters.length === 21) {
    lettersArr = letters.split('').map((ch, i) => new Letter(ch, i));
    board = new XClass(lettersArr);
  } else {
    return [];
  }

  const findValidFrom = (b, word, letter, len, positions) => {
    if (dict.has(word) && !validWords.has(word)) {
      validWords.add(word.toUpperCase());
    }
    if (len >= MAX_LENGTH) return;

    positions.push(letter.pos);
    for (const dir of DIRECTIONS) {
      const copy = b.copyBoard();
      const next = copy.visitDirection(letter.pos, dir);
      if (next !== -1) {
        findValidFrom(copy, word + next.char, next, len + 1, [...positions]);
      }
    }
  };

  board.lb.forEach((letter) => {
    if (!letter) return;
    letter.markVisited();
    findValidFrom(board, letter.char, letter, 1, [letter.pos]);
    letter.visited = false;
  });

  return Array.from(validWords);
};

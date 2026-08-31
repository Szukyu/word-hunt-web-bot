// Constants
export const UPLEFT = 0;
export const UP = 1;
export const UPRIGHT = 2;
export const RIGHT = 3;
export const DOWNRIGHT = 4;
export const DOWN = 5;
export const DOWNLEFT = 6;
export const LEFT = 7;

export const DIRECTIONS = [UPLEFT, UP, UPRIGHT, RIGHT, DOWNRIGHT, DOWN, DOWNLEFT, LEFT];

export const MAX_LENGTH = 10;

// Letter Class
export class Letter {
  constructor(ch, index, visit = false) {
    this.char = ch;
    this.pos = index;
    this.visited = visit;
  }

  copyLetter() {
    return new Letter(this.char, this.pos, this.visited);
  }

  markVisited() {
    this.visited = true;
  }
}

// 4 X 4 Board Class
export class Board {
  constructor(lettersArr) {
    this.lb = lettersArr;
  }

  copyBoard() {
    const newArr = [];
    for (let i = 0; i < this.lb.length; i++) {
      newArr.push(this.lb[i].copyLetter());
    }
    return new Board(newArr);
  }

  peekUpperLeft(pos) {
    if (pos % 4 === 0 || pos <= 3) {
      return -1;
    }
    return this.lb[pos - 5];
  }

  peekUp(pos) {
    if (pos <= 3) {
      return -1;
    }
    return this.lb[pos - 4];
  }

  peekUpperRight(pos) {
    if (pos <= 3 || pos % 4 === 3) {
      return -1;
    }
    return this.lb[pos - 3];
  }

  peekRight(pos) {
    if (pos % 4 === 3) {
      return -1;
    }
    return this.lb[pos + 1];
  }

  peekLowerRight(pos) {
    if (pos >= 12 || pos % 4 === 3) {
      return -1;
    }
    return this.lb[pos + 5];
  }

  peekDown(pos) {
    if (pos >= 12) {
      return -1;
    }
    return this.lb[pos + 4];
  }

  peekLowerLeft(pos) {
    if (pos % 4 === 0 || pos >= 12) {
      return -1;
    }
    return this.lb[pos + 3];
  }

  peekLeft(pos) {
    if (pos % 4 === 0) {
      return -1;
    }
    return this.lb[pos - 1];
  }

  visitDirection(pos, dir) {
    const directionDict = {
      [UPLEFT]: this.peekUpperLeft.bind(this),
      [UP]: this.peekUp.bind(this),
      [UPRIGHT]: this.peekUpperRight.bind(this),
      [RIGHT]: this.peekRight.bind(this),
      [DOWNRIGHT]: this.peekLowerRight.bind(this),
      [DOWN]: this.peekDown.bind(this),
      [DOWNLEFT]: this.peekLowerLeft.bind(this),
      [LEFT]: this.peekLeft.bind(this)
    };

    const visitedLetter = directionDict[dir](pos);
    if (visitedLetter === -1 || visitedLetter.visited) {
      return -1;
    }
    visitedLetter.markVisited();
    return visitedLetter;
  }
}

// 5 x 5 Board Class
export class Boarder {
  constructor(lettersArr) {
    this.lb = lettersArr;
  }

  copyBoard() {
    const newArr = []
    for (let i = 0; i < this.lb.length; i++) {
      newArr.push(this.lb[i].copyLetter());
    }
    return new Boarder(newArr);
  }

  peekUpperLeft(pos) {
    if (pos % 5 === 0 || pos < 5) {
      return -1;
    }
    return this.lb[pos - 6];
  }

  peekUp(pos) {
    if (pos < 5) {
      return -1;
    }
    return this.lb[pos - 5];
  }

  peekUpperRight(pos) {
    if (pos < 5 || pos % 5 === 4) {
      return -1;
    }
    return this.lb[pos - 4];
  }

  peekRight(pos) {
    if (pos % 5 === 4) {
      return -1;
    }
    return this.lb[pos + 1];
  }

  peekLowerRight(pos) {
    if (pos >= 20 || pos % 5 === 4) {
      return -1;
    }
    return this.lb[pos + 6];
  }

  peekDown(pos) {
    if (pos >= 20) {
      return -1;
    }
    return this.lb[pos + 5];
  }

  peekLowerLeft(pos) {
    if (pos % 5 === 0 || pos >= 20) {
      return -1;
    }
    return this.lb[pos + 4];
  }

  peekLeft(pos) {
    if (pos % 5 === 0) {
      return -1;
    }
    return this.lb[pos - 1];
  }

  visitDirection(pos, dir) {
    const directionDict = {
      [UPLEFT]: this.peekUpperLeft.bind(this),
      [UP]: this.peekUp.bind(this),
      [UPRIGHT]: this.peekUpperRight.bind(this),
      [RIGHT]: this.peekRight.bind(this),
      [DOWNRIGHT]: this.peekLowerRight.bind(this),
      [DOWN]: this.peekDown.bind(this),
      [DOWNLEFT]: this.peekLowerLeft.bind(this),
      [LEFT]: this.peekLeft.bind(this)
    };

    const visitedLetter = directionDict[dir](pos);
    if (visitedLetter === -1 || visitedLetter.visited) {
      return -1;
    }
    visitedLetter.markVisited();
    return visitedLetter;
  }
}

// Donut Board Class — holes at 0,4,12,20,24 (5x5 grid)
export class Donut {
  constructor(lettersArr) {
    this.lb = lettersArr;
    this._valid = new Set([1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23]);
  }

  copyBoard() {
    const newArr = []
    for (let i = 0; i < this.lb.length; i++) {
      if (this.lb[i] !== null) {
        newArr.push(this.lb[i].copyLetter());
      } else {
        newArr.push(null);
      }
    }
    const c = new Donut(newArr);
    c._valid = this._valid;
    return c;
  }

  _neighbor(pos, dr, dc) {
    const r = Math.floor(pos / 5), c = pos % 5;
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nr >= 5 || nc < 0 || nc >= 5) return -1;
    const ngp = nr * 5 + nc;
    if (!this._valid.has(ngp)) return -1;
    const cell = this.lb[ngp];
    if (!cell) return -1;
    return cell;
  }

  peekUpperLeft(pos) { return this._neighbor(pos, -1, -1); }
  peekUp(pos) { return this._neighbor(pos, -1, 0); }
  peekUpperRight(pos) { return this._neighbor(pos, -1, 1); }
  peekRight(pos) { return this._neighbor(pos, 0, 1); }
  peekLowerRight(pos) { return this._neighbor(pos, 1, 1); }
  peekDown(pos) { return this._neighbor(pos, 1, 0); }
  peekLowerLeft(pos) { return this._neighbor(pos, 1, -1); }
  peekLeft(pos) { return this._neighbor(pos, 0, -1); }

  visitDirection(pos, dir) {
    const directionDict = {
      [UPLEFT]: this.peekUpperLeft.bind(this),
      [UP]: this.peekUp.bind(this),
      [UPRIGHT]: this.peekUpperRight.bind(this),
      [RIGHT]: this.peekRight.bind(this),
      [DOWNRIGHT]: this.peekLowerRight.bind(this),
      [DOWN]: this.peekDown.bind(this),
      [DOWNLEFT]: this.peekLowerLeft.bind(this),
      [LEFT]: this.peekLeft.bind(this)
    };
    const visitedLetter = directionDict[dir](pos);
    if (visitedLetter === -1 || !visitedLetter || visitedLetter.visited) return -1;
    visitedLetter.markVisited();
    return visitedLetter;
  }
}

// X Board Class — holes at 2,10,14,22 (matches Boards/X.jsx)
export class X {
  constructor(lettersArr) {
    this.lb = lettersArr;
    this._valid = new Set([0, 1, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 15, 16, 17, 18, 19, 20, 21, 23, 24]);
  }

  copyBoard() {
    const newArr = []
    for (let i = 0; i < this.lb.length; i++) {
      if (this.lb[i] !== null) {
        newArr.push(this.lb[i].copyLetter());
      } else {
        newArr.push(null);
      }
    }
    const c = new X(newArr);
    c._valid = this._valid;
    return c;
  }

  _neighbor(pos, dr, dc) {
    const r = Math.floor(pos / 5), c = pos % 5;
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nr >= 5 || nc < 0 || nc >= 5) return -1;
    const ngp = nr * 5 + nc;
    if (!this._valid.has(ngp)) return -1;
    const cell = this.lb[ngp];
    if (!cell) return -1;
    return cell;
  }

  peekUpperLeft(pos) { return this._neighbor(pos, -1, -1); }
  peekUp(pos) { return this._neighbor(pos, -1, 0); }
  peekUpperRight(pos) { return this._neighbor(pos, -1, 1); }
  peekRight(pos) { return this._neighbor(pos, 0, 1); }
  peekLowerRight(pos) { return this._neighbor(pos, 1, 1); }
  peekDown(pos) { return this._neighbor(pos, 1, 0); }
  peekLowerLeft(pos) { return this._neighbor(pos, 1, -1); }
  peekLeft(pos) { return this._neighbor(pos, 0, -1); }

  visitDirection(pos, dir) {
    const directionDict = {
      [UPLEFT]: this.peekUpperLeft.bind(this),
      [UP]: this.peekUp.bind(this),
      [UPRIGHT]: this.peekUpperRight.bind(this),
      [RIGHT]: this.peekRight.bind(this),
      [DOWNRIGHT]: this.peekLowerRight.bind(this),
      [DOWN]: this.peekDown.bind(this),
      [DOWNLEFT]: this.peekLowerLeft.bind(this),
      [LEFT]: this.peekLeft.bind(this)
    };
    const visitedLetter = directionDict[dir](pos);
    if (visitedLetter === -1 || !visitedLetter || visitedLetter.visited) return -1;
    visitedLetter.markVisited();
    return visitedLetter;
  }
}
